"""
Geospatial file processor.

Responsibilities
----------------
1. Detect file type (Shapefile ZIP or KML).
2. Read features via GeoPandas/Fiona.
3. Extract CRS, geometry type, properties.
4. Reproject to a suitable projected CRS.
5. Calculate area (Polygon) and length (LineString).
6. Handle unsupported geometry types gracefully.

CRS Strategy
------------
We use a *UTM zone auto-selection* approach:
- Compute the centroid of each geometry's bounding box.
- Derive the UTM zone from the centroid longitude.
- If the source CRS is already projected, use it as-is for measurement
  (falling back to area/length directly from the projected units).
- If geographic (lat/lon), reproject to the auto-selected UTM zone.

This gives metre-accurate measurements globally without requiring the
caller to specify a target CRS.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Optional

import fiona
import geopandas as gpd
import pyproj
from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform

logger = logging.getLogger(__name__)

# Supported geometry types and whether they need measurement
GEOMETRY_SUPPORT = {
    "Point": "none",
    "MultiPoint": "none",
    "LineString": "length",
    "MultiLineString": "length",
    "Polygon": "area",
    "MultiPolygon": "area",
    "GeometryCollection": "unsupported",
}


# ---------------------------------------------------------------------------
# CRS helpers
# ---------------------------------------------------------------------------

def _is_geographic(crs_str: str) -> bool:
    """Return True if the CRS uses geographic (lat/lon) coordinates."""
    try:
        crs = pyproj.CRS.from_user_input(crs_str)
        return crs.is_geographic
    except Exception:
        return False


def _utm_epsg_for_lon_lat(lon: float, lat: float) -> str:
    """
    Return the EPSG code for the UTM zone that contains (lon, lat).

    Uses WGS 84 UTM zones (EPSG 326xx for N hemisphere, 327xx for S).
    """
    zone = int((lon + 180) / 6) + 1
    if lat >= 0:
        return f"EPSG:326{zone:02d}"
    return f"EPSG:327{zone:02d}"


def _reproject_geometry(geom, src_crs: str, dst_crs: str):
    """Reproject a Shapely geometry from src_crs to dst_crs."""
    transformer = Transformer.from_crs(src_crs, dst_crs, always_xy=True)
    return transform(transformer.transform, geom)


def _select_projected_crs(geom, src_crs: str) -> str:
    """
    Choose an appropriate projected CRS for measurement.

    If src_crs is already projected, return it unchanged.
    Otherwise, auto-select a UTM zone from the geometry centroid.
    """
    try:
        crs = pyproj.CRS.from_user_input(src_crs)
        if not crs.is_geographic:
            return src_crs  # already projected — use it directly
    except Exception:
        pass  # fall through to geographic handling

    # Determine centroid in (lon, lat) for UTM selection
    try:
        # If the source is geographic, centroid IS (lon, lat)
        centroid = geom.centroid
        lon, lat = centroid.x, centroid.y
    except Exception:
        lon, lat = 0.0, 0.0

    return _utm_epsg_for_lon_lat(lon, lat)


# ---------------------------------------------------------------------------
# Measurement functions
# ---------------------------------------------------------------------------

def _calculate_area_and_perimeter(geom, src_crs: str) -> tuple[Optional[float], Optional[float], Optional[str]]:
    """
    Return (area_m2, perimeter_m, error).

    Validates and projects the geometry to a UTM zone before computing area and perimeter.
    """
    try:
        from shapely.validation import make_valid
        if not geom.is_valid:
            geom = make_valid(geom)
        projected_crs = _select_projected_crs(geom, src_crs)
        if projected_crs != src_crs:
            proj_geom = _reproject_geometry(geom, src_crs, projected_crs)
        else:
            proj_geom = geom
        return proj_geom.area, proj_geom.length, None
    except Exception as exc:
        logger.warning("Area calculation failed: %s", exc)
        return None, None, str(exc)


def _calculate_length(geom, src_crs: str) -> tuple[Optional[float], Optional[str]]:
    """
    Return (length_m, error).

    Projects the geometry to a UTM zone before computing length.
    """
    try:
        projected_crs = _select_projected_crs(geom, src_crs)
        if projected_crs != src_crs:
            proj_geom = _reproject_geometry(geom, src_crs, projected_crs)
        else:
            proj_geom = geom
        return proj_geom.length, None
    except Exception as exc:
        logger.warning("Length calculation failed: %s", exc)
        return None, str(exc)


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def _geometry_wkt(geom) -> Optional[str]:
    """Return WKT string for a Shapely geometry, or None."""
    try:
        return geom.wkt if geom and not geom.is_empty else None
    except Exception:
        return None


def _safe_properties(raw: dict) -> str:
    """Serialise a feature property dict to a JSON string."""
    cleaned: dict[str, Any] = {}
    for k, v in (raw or {}).items():
        try:
            json.dumps(v)  # test serialisability
            cleaned[k] = v
        except (TypeError, ValueError):
            cleaned[k] = str(v)
    return json.dumps(cleaned)


def process_features(gdf: gpd.GeoDataFrame, crs_str: str) -> list[dict]:
    """
    Iterate over a GeoDataFrame and compute measurements for each feature.

    Returns a list of dicts ready for bulk ORM insertion.
    """
    records: list[dict] = []

    for idx, row in gdf.iterrows():
        geom = row.geometry
        geom_type = geom.geom_type if geom is not None and not geom.is_empty else None
        support = GEOMETRY_SUPPORT.get(geom_type, "unsupported") if geom_type else "none"

        area_m2: Optional[float] = None
        length_m: Optional[float] = None
        meas_error: Optional[str] = None

        if geom is not None and not geom.is_empty:
            if support == "area":
                area_m2, length_m, meas_error = _calculate_area_and_perimeter(geom, crs_str)
            elif support == "length":
                length_m, meas_error = _calculate_length(geom, crs_str)
            elif support == "unsupported":
                meas_error = (
                    f"Geometry type '{geom_type}' is not supported for measurement."
                )
            # "none" → Point/MultiPoint — no measurement needed

        # Properties: exclude the geometry column itself
        props = {k: v for k, v in row.items() if k != "geometry"}

        records.append(
            {
                "feature_index": int(idx),
                "geometry_type": geom_type,
                "geometry_wkt": _geometry_wkt(geom),
                "crs": crs_str,
                "properties": _safe_properties(props),
                "area_m2": area_m2,
                "length_m": length_m,
                "measurement_error": meas_error,
            }
        )

    return records


# ---------------------------------------------------------------------------
# File readers
# ---------------------------------------------------------------------------

def _normalise_crs(gdf: gpd.GeoDataFrame) -> str:
    """Extract a human-readable CRS string from a GeoDataFrame."""
    if gdf.crs is None:
        return "UNKNOWN"
    try:
        return gdf.crs.to_epsg() and f"EPSG:{gdf.crs.to_epsg()}" or gdf.crs.to_string()
    except Exception:
        return str(gdf.crs)


def read_shapefile_zip(zip_path: Path) -> tuple[gpd.GeoDataFrame, str]:
    """
    Extract a Shapefile ZIP and read it into a GeoDataFrame.

    Returns (GeoDataFrame, crs_string).
    """
    tmp_dir = tempfile.mkdtemp(prefix="geo_shp_")
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(tmp_dir)

        # Find the .shp file (may be nested in subdirectories)
        shp_files = list(Path(tmp_dir).rglob("*.shp"))
        if not shp_files:
            raise ValueError("No .shp file found inside the ZIP archive.")

        shp_path = shp_files[0]
        gdf = gpd.read_file(shp_path)
        crs_str = _normalise_crs(gdf)
        logger.info("Shapefile read: %d features, CRS=%s", len(gdf), crs_str)
        return gdf, crs_str
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _read_kml_fallback(kml_path: Path) -> gpd.GeoDataFrame:
    """Resilient XML parser for KML files when Fiona/GDAL encounters syntax or driver issues."""
    import re
    import xml.etree.ElementTree as ET
    from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point

    with open(kml_path, "r", encoding="utf-8", errors="ignore") as f:
        kml_content = f.read()

    # Sanitize unescaped ampersands commonly found in raw user KMLs
    clean_kml = re.sub(r"&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)", "&amp;", kml_content)
    root = ET.fromstring(clean_kml)

    # Strip XML namespaces for uniform querying
    for elem in root.iter():
        if "}" in elem.tag:
            elem.tag = elem.tag.split("}", 1)[1]

    features = []
    for placemark in root.iter("Placemark"):
        name = placemark.findtext("name", "")
        desc = placemark.findtext("description", "")
        props: dict[str, Any] = {}
        if name:
            props["name"] = name
        if desc:
            props["description"] = desc

        # Extract ExtendedData attributes
        for data in placemark.findall(".//Data"):
            key = data.get("name")
            val = data.findtext("value", "")
            if key:
                props[key] = val
        for sdata in placemark.findall(".//SimpleData"):
            key = sdata.get("name")
            val = sdata.text or ""
            if key:
                props[key] = val

        # Parse Geometries
        geom = None

        # 1. Polygon
        for poly in placemark.iter("Polygon"):
            coord_str = poly.findtext(".//coordinates", "")
            if coord_str:
                pts = []
                for c in coord_str.strip().split():
                    parts = c.split(",")
                    if len(parts) >= 2:
                        try:
                            pts.append((float(parts[0]), float(parts[1])))
                        except ValueError:
                            continue
                if len(pts) >= 3:
                    geom = Polygon(pts)
                    break

        # 2. LineString
        if geom is None:
            for ls in placemark.iter("LineString"):
                coord_str = ls.findtext(".//coordinates", "")
                if coord_str:
                    pts = []
                    for c in coord_str.strip().split():
                        parts = c.split(",")
                        if len(parts) >= 2:
                            try:
                                pts.append((float(parts[0]), float(parts[1])))
                            except ValueError:
                                continue
                    if len(pts) >= 2:
                        geom = LineString(pts)
                        break

        # 3. Point
        if geom is None:
            for pt in placemark.iter("Point"):
                coord_str = pt.findtext(".//coordinates", "")
                if coord_str:
                    parts = coord_str.strip().split(",")
                    if len(parts) >= 2:
                        try:
                            geom = Point(float(parts[0]), float(parts[1]))
                            break
                        except ValueError:
                            continue

        if geom is not None:
            props["geometry"] = geom
            features.append(props)

    if not features:
        raise ValueError("No recognizable vector geometries found in KML placemarks.")

    gdf = gpd.GeoDataFrame(features, geometry="geometry", crs="EPSG:4326")
    return gdf


def read_kml(kml_path: Path) -> tuple[gpd.GeoDataFrame, str]:
    """
    Read a KML file into a GeoDataFrame with robust fallback parsing.

    Returns (GeoDataFrame, crs_string).
    """
    try:
        # Enable KML driver in Fiona (disabled by default in some builds)
        fiona.drvsupport.supported_drivers["KML"] = "rw"
        fiona.drvsupport.supported_drivers["LIBKML"] = "rw"

        layers = fiona.listlayers(str(kml_path))
        gdfs: list[gpd.GeoDataFrame] = []

        for layer in layers:
            try:
                layer_gdf = gpd.read_file(str(kml_path), driver="KML", layer=layer)
                if not layer_gdf.empty:
                    gdfs.append(layer_gdf)
            except Exception as exc:
                logger.warning("Skipping KML layer '%s': %s", layer, exc)

        if gdfs:
            gdf = gpd.pd.concat(gdfs, ignore_index=True)
            if gdf.crs is None:
                gdf = gdf.set_crs("EPSG:4326")
            crs_str = _normalise_crs(gdf)
            logger.info("KML read via Fiona: %d features, CRS=%s", len(gdf), crs_str)
            return gdf, crs_str
    except Exception as fiona_err:
        logger.info("Fiona KML reading failed (%s); switching to resilient fallback parser.", fiona_err)

    # Resilient fallback parser
    gdf = _read_kml_fallback(kml_path)
    crs_str = _normalise_crs(gdf)
    logger.info("KML read via Fallback: %d features, CRS=%s", len(gdf), crs_str)
    return gdf, crs_str


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def parse_geospatial_file(file_path: Path) -> tuple[list[dict], str, int]:
    """
    Parse a geospatial file and return extracted feature data.

    Parameters
    ----------
    file_path : Path
        Path to the uploaded file (.zip or .kml).

    Returns
    -------
    (feature_records, crs_string, feature_count)
    """
    suffix = file_path.suffix.lower()

    if suffix == ".zip":
        gdf, crs_str = read_shapefile_zip(file_path)
    elif suffix == ".kml":
        gdf, crs_str = read_kml(file_path)
    else:
        raise ValueError(f"Unsupported file type: '{suffix}'")

    if gdf.empty:
        return [], crs_str, 0

    feature_records = process_features(gdf, crs_str)
    return feature_records, crs_str, len(feature_records)
