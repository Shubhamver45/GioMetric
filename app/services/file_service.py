"""
File service layer.

Handles:
- Saving uploaded files to disk.
- Triggering geospatial processing.
- Persisting results to the database.
- Retrieving file and feature records.
"""
from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    FileNotFoundError,
    FileTooLargeError,
    FileProcessingError,
    UnsupportedFileTypeError,
)
from app.models.geo_models import FileStatus, GeoFeature, GeoFile
from app.services.geo_processor import parse_geospatial_file

logger = logging.getLogger(__name__)

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


# ---------------------------------------------------------------------------
# Upload & processing
# ---------------------------------------------------------------------------

async def save_uploaded_file(upload: UploadFile) -> Path:
    """
    Stream the uploaded file to disk, enforcing size limits.

    Returns the path to the saved file.
    Raises FileTooLargeError or UnsupportedFileTypeError.
    """
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in settings.ALLOWED_EXTENSIONS:
        raise UnsupportedFileTypeError(suffix)

    unique_name = f"{uuid.uuid4()}{suffix}"
    dest: Path = settings.UPLOAD_DIR / unique_name

    written = 0
    chunk_size = 64 * 1024  # 64 KB chunks

    with dest.open("wb") as fout:
        while True:
            chunk = await upload.read(chunk_size)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_BYTES:
                dest.unlink(missing_ok=True)
                raise FileTooLargeError(settings.MAX_FILE_SIZE_MB)
            fout.write(chunk)

    logger.info("Saved upload to %s (%d bytes)", dest, written)
    return dest, written


async def create_file_record(
    db: AsyncSession,
    original_filename: str,
    saved_path: Path,
    file_size: int,
) -> GeoFile:
    """Persist a new GeoFile record with PENDING status."""
    record = GeoFile(
        id=str(uuid.uuid4()),
        filename=saved_path.name,
        original_filename=original_filename,
        file_path=str(saved_path),
        file_size_bytes=file_size,
        status=FileStatus.PENDING,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def process_file(db: AsyncSession, file_record: GeoFile) -> None:
    """
    Parse the geospatial file and persist extracted features.

    Updates file_record status to COMPLETED or FAILED.
    """
    file_record.status = FileStatus.PROCESSING
    await db.commit()

    try:
        feature_records, crs_str, count = parse_geospatial_file(
            Path(file_record.file_path)
        )

        # Bulk-insert features
        features = [
            GeoFeature(file_id=file_record.id, **rec)
            for rec in feature_records
        ]
        db.add_all(features)

        file_record.crs = crs_str
        file_record.feature_count = count
        file_record.status = FileStatus.COMPLETED
        await db.commit()
        logger.info(
            "Processed file %s: %d features, CRS=%s", file_record.id, count, crs_str
        )

    except Exception as exc:
        logger.exception("Failed to process file %s: %s", file_record.id, exc)
        file_record.status = FileStatus.FAILED
        file_record.error_message = str(exc)
        await db.commit()
        raise FileProcessingError(str(exc)) from exc


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------

async def get_file_by_id(db: AsyncSession, file_id: str) -> GeoFile:
    """Fetch a GeoFile by ID or raise FileNotFoundError."""
    result = await db.execute(select(GeoFile).where(GeoFile.id == file_id))
    record = result.scalar_one_or_none()
    if record is None:
        raise FileNotFoundError(file_id)
    return record


async def list_files(
    db: AsyncSession, skip: int = 0, limit: int = 20
) -> tuple[int, list[GeoFile]]:
    """Return (total_count, page) of GeoFile records."""
    total_result = await db.execute(select(func.count()).select_from(GeoFile))
    total = total_result.scalar_one()

    result = await db.execute(
        select(GeoFile).order_by(GeoFile.created_at.desc()).offset(skip).limit(limit)
    )
    records = list(result.scalars().all())
    return total, records


async def get_features_by_file(
    db: AsyncSession,
    file_id: str,
    skip: int = 0,
    limit: int = 100,
) -> tuple[int, list[GeoFeature]]:
    """Return (total_count, page) of GeoFeature records for a file."""
    # Verify file exists
    await get_file_by_id(db, file_id)

    total_result = await db.execute(
        select(func.count())
        .select_from(GeoFeature)
        .where(GeoFeature.file_id == file_id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(GeoFeature)
        .where(GeoFeature.file_id == file_id)
        .order_by(GeoFeature.feature_index)
        .offset(skip)
        .limit(limit)
    )
    features = list(result.scalars().all())
    return total, features


async def get_all_features_by_file(
    db: AsyncSession,
    file_id: str,
) -> list[GeoFeature]:
    """Return all GeoFeature records for a file without pagination."""
    await get_file_by_id(db, file_id)
    result = await db.execute(
        select(GeoFeature)
        .where(GeoFeature.file_id == file_id)
        .order_by(GeoFeature.feature_index)
    )
    return list(result.scalars().all())


async def delete_file(db: AsyncSession, file_id: str) -> None:
    """Delete a GeoFile and its features and remove the uploaded file from disk."""
    record = await get_file_by_id(db, file_id)
    if record.file_path:
        path = Path(record.file_path)
        path.unlink(missing_ok=True)
    await db.delete(record)
    await db.commit()


async def get_file_geojson(db: AsyncSession, file_id: str) -> dict:
    """Return features formatted as a standard GeoJSON FeatureCollection."""
    import shapely.wkt
    from shapely.geometry import mapping
    from app.services.geo_processor import _reproject_geometry
    import json

    file_record = await get_file_by_id(db, file_id)
    features = await get_all_features_by_file(db, file_id)

    geojson_features = []
    for f in features:
        geom_dict = None
        if f.geometry_wkt:
            try:
                geom = shapely.wkt.loads(f.geometry_wkt)
                if f.crs and f.crs not in ("EPSG:4326", "WGS84", "UNKNOWN"):
                    try:
                        geom = _reproject_geometry(geom, f.crs, "EPSG:4326")
                    except Exception:
                        pass
                geom_dict = mapping(geom)
            except Exception as exc:
                logger.warning("Could not convert WKT to GeoJSON: %s", exc)

        props = {}
        if f.properties:
            if isinstance(f.properties, str):
                try:
                    props = json.loads(f.properties)
                except Exception:
                    props = {}
            elif isinstance(f.properties, dict):
                props = f.properties

        feature_dict = {
            "type": "Feature",
            "id": f.feature_index,
            "geometry": geom_dict,
            "properties": {
                "feature_index": f.feature_index,
                "geometry_type": f.geometry_type,
                "crs": f.crs,
                "area_m2": f.area_m2,
                "length_m": f.length_m,
                "measurement_error": f.measurement_error,
                **props,
            },
        }
        geojson_features.append(feature_dict)

    return {
        "type": "FeatureCollection",
        "file_id": file_record.id,
        "filename": file_record.original_filename,
        "crs": file_record.crs,
        "status": file_record.status.value,
        "feature_count": file_record.feature_count or len(geojson_features),
        "features": geojson_features,
    }


async def get_file_stats(db: AsyncSession, file_id: str) -> dict:
    """Calculate summary statistics and breakdown for a file's measurements."""
    file_record = await get_file_by_id(db, file_id)
    features = await get_all_features_by_file(db, file_id)

    total_area_m2 = 0.0
    total_length_m = 0.0
    poly_count = 0
    line_count = 0
    point_count = 0
    other_count = 0
    error_count = 0

    for f in features:
        if f.area_m2 is not None:
            total_area_m2 += f.area_m2
            poly_count += 1
        elif f.length_m is not None:
            total_length_m += f.length_m
            line_count += 1
        elif f.geometry_type in ("Point", "MultiPoint"):
            point_count += 1
        else:
            other_count += 1

        if f.measurement_error:
            error_count += 1

    return {
        "file_id": file_record.id,
        "filename": file_record.original_filename,
        "status": file_record.status.value,
        "crs": file_record.crs,
        "total_features": len(features),
        "total_area_m2": total_area_m2,
        "total_area_km2": total_area_m2 / 1_000_000,
        "total_area_acres": total_area_m2 * 0.000247105,
        "total_area_hectares": total_area_m2 * 0.0001,
        "total_length_m": total_length_m,
        "total_length_km": total_length_m / 1000,
        "total_length_miles": total_length_m * 0.000621371,
        "breakdown": {
            "polygons": poly_count,
            "lines": line_count,
            "points": point_count,
            "other": other_count,
            "errors": error_count,
        },
    }
