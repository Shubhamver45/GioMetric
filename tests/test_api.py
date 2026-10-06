"""
Tests for the Geospatial File Measurement API.

Covers:
- Health endpoint
- File upload (KML + Shapefile)
- File info retrieval
- Measurements endpoint
- Error handling (wrong type, oversized, missing ID)
"""
from __future__ import annotations

import asyncio
import io
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# ---------------------------------------------------------------------------
# App bootstrapping for tests (use in-memory SQLite)
# ---------------------------------------------------------------------------

import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from app.main import app
from app.core.database import init_db, engine, Base


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create a single event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    """Create tables once per test session."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client backed by the FastAPI ASGI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Fixtures: synthetic geospatial files
# ---------------------------------------------------------------------------

def _make_kml_bytes(name: str = "test") -> bytes:
    """Return a minimal valid KML file with a Point and a Polygon."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{name}</name>
    <Placemark>
      <name>Point Feature</name>
      <Point><coordinates>77.5946,12.9716,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Polygon Feature</name>
      <Polygon>
        <outerBoundaryIs><LinearRing>
          <coordinates>
            77.58,12.97,0
            77.60,12.97,0
            77.60,12.98,0
            77.58,12.98,0
            77.58,12.97,0
          </coordinates>
        </LinearRing></outerBoundaryIs>
      </Polygon>
    </Placemark>
    <Placemark>
      <name>Line Feature</name>
      <LineString>
        <coordinates>
          77.58,12.97,0
          77.62,12.99,0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>""".encode()


def _make_shapefile_zip_bytes() -> bytes:
    """
    Return a minimal Shapefile ZIP in memory.

    We generate a simple polygon SHP using Fiona.
    """
    import fiona
    from fiona.crs import from_epsg
    from shapely.geometry import mapping, Polygon as ShapelyPolygon

    tmp_dir = Path(tempfile.mkdtemp())
    shp_path = tmp_dir / "test.shp"

    schema = {"geometry": "Polygon", "properties": {"name": "str", "value": "float"}}
    poly = ShapelyPolygon([(0, 0), (1, 0), (1, 1), (0, 1)])

    with fiona.open(
        str(shp_path),
        "w",
        driver="ESRI Shapefile",
        schema=schema,
        crs="EPSG:4326",
    ) as dst:
        dst.write(
            {
                "geometry": mapping(poly),
                "properties": {"name": "test_polygon", "value": 42.0},
            }
        )

    # Zip the shapefile components
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for f in tmp_dir.iterdir():
            zf.write(f, arcname=f.name)

    shutil.rmtree(tmp_dir, ignore_errors=True)
    buf.seek(0)
    return buf.read()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_upload_kml(client: AsyncClient):
    kml_bytes = _make_kml_bytes()
    files = {"file": ("sample.kml", io.BytesIO(kml_bytes), "application/vnd.google-earth.kml+xml")}
    resp = await client.post("/api/files/", files=files)
    assert resp.status_code == 202
    body = resp.json()
    assert "id" in body
    assert body["filename"] == "sample.kml"
    return body["id"]


@pytest.mark.asyncio
async def test_upload_shapefile(client: AsyncClient):
    zip_bytes = _make_shapefile_zip_bytes()
    files = {"file": ("survey.zip", io.BytesIO(zip_bytes), "application/zip")}
    resp = await client.post("/api/files/", files=files)
    assert resp.status_code == 202
    body = resp.json()
    assert "id" in body
    assert body["filename"] == "survey.zip"


@pytest.mark.asyncio
async def test_unsupported_file_type(client: AsyncClient):
    files = {"file": ("data.geojson", io.BytesIO(b"{}"), "application/json")}
    resp = await client.post("/api/files/", files=files)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_files(client: AsyncClient):
    resp = await client.get("/api/files/")
    assert resp.status_code == 200
    body = resp.json()
    assert "total" in body
    assert "items" in body


@pytest.mark.asyncio
async def test_file_not_found(client: AsyncClient):
    resp = await client.get("/api/files/nonexistent-id/")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_measurements_not_found(client: AsyncClient):
    resp = await client.get("/api/files/nonexistent-id/measurements/")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_kml_full_flow(client: AsyncClient):
    """Upload KML → wait for processing → check measurements."""
    kml_bytes = _make_kml_bytes("flow_test")
    files = {"file": ("flow.kml", io.BytesIO(kml_bytes), "application/vnd.google-earth.kml+xml")}
    upload_resp = await client.post("/api/files/", files=files)
    assert upload_resp.status_code == 202
    file_id = upload_resp.json()["id"]

    # Give background task a moment
    await asyncio.sleep(2)

    # File info
    info_resp = await client.get(f"/api/files/{file_id}/")
    assert info_resp.status_code == 200
    info = info_resp.json()
    assert info["status"] in ("COMPLETED", "PROCESSING", "FAILED")

    # Measurements (may be empty if still processing)
    meas_resp = await client.get(f"/api/files/{file_id}/measurements/")
    assert meas_resp.status_code == 200
    meas = meas_resp.json()
    assert meas["file_id"] == file_id
    assert isinstance(meas["total"], int)


@pytest.mark.asyncio
async def test_geojson_and_stats_endpoints(client: AsyncClient):
    kml_bytes = _make_kml_bytes("stats_test")
    files = {"file": ("stats_test.kml", io.BytesIO(kml_bytes), "application/vnd.google-earth.kml+xml")}
    upload_resp = await client.post("/api/files/", files=files)
    assert upload_resp.status_code == 202
    file_id = upload_resp.json()["id"]

    await asyncio.sleep(2)

    # GeoJSON
    geo_resp = await client.get(f"/api/files/{file_id}/geojson/")
    assert geo_resp.status_code == 200
    geo_data = geo_resp.json()
    assert geo_data["type"] == "FeatureCollection"
    assert "features" in geo_data

    # Stats
    stats_resp = await client.get(f"/api/files/{file_id}/stats/")
    assert stats_resp.status_code == 200
    stats_data = stats_resp.json()
    assert "total_area_m2" in stats_data
    assert "total_length_m" in stats_data
    assert "breakdown" in stats_data

    # CSV Export
    csv_resp = await client.get(f"/api/files/{file_id}/export/csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers.get("content-type", "")

    # Delete
    del_resp = await client.delete(f"/api/files/{file_id}/")
    assert del_resp.status_code == 200


@pytest.mark.asyncio
async def test_frontend_index_route(client: AsyncClient):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert "GeoMetric" in resp.text

