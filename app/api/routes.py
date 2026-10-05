"""
API router for geospatial file endpoints.

Endpoints
---------
POST  /api/files/                  — Upload a geospatial file
GET   /api/files/                  — List all files
GET   /api/files/{id}/             — File metadata
GET   /api/files/{id}/features/    — All features with full geometry & properties
GET   /api/files/{id}/measurements/— Measurement summary per feature
"""
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.geo_schemas import (
    FeatureMeasurementResponse,
    GeoFeatureResponse,
    GeoFileListResponse,
    GeoFileResponse,
    MeasurementsListResponse,
    UploadResponse,
)
from app.services import file_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["Geospatial Files"])


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=UploadResponse,
    status_code=202,
    summary="Upload a geospatial file",
    description=(
        "Upload a `.zip` containing a Shapefile or a `.kml` file. "
        "Processing starts immediately and happens synchronously."
    ),
)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="A .zip (Shapefile) or .kml file"),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Upload and process a geospatial file."""
    # 1. Save to disk
    saved_path, file_size = await file_service.save_uploaded_file(file)

    # 2. Create DB record
    record = await file_service.create_file_record(
        db=db,
        original_filename=file.filename or "unknown",
        saved_path=saved_path,
        file_size=file_size,
    )

    # 3. Process in background so we can return 202 immediately
    background_tasks.add_task(
        _run_processing, record_id=record.id, file_path=str(saved_path)
    )

    return UploadResponse(
        id=record.id,
        filename=record.original_filename,
        status=record.status,
        message="File uploaded successfully. Processing has started in the background.",
    )


async def _run_processing(record_id: str, file_path: str) -> None:
    """Background task: open a fresh DB session and process the file."""
    from app.core.database import AsyncSessionLocal
    from pathlib import Path

    async with AsyncSessionLocal() as db:
        try:
            record = await file_service.get_file_by_id(db, record_id)
            await file_service.process_file(db, record)
        except Exception as exc:
            logger.exception("Background processing failed for %s: %s", record_id, exc)


# ---------------------------------------------------------------------------
# List files
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=GeoFileListResponse,
    summary="List all uploaded files",
)
async def list_files(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=200, description="Max records to return"),
    db: AsyncSession = Depends(get_db),
) -> GeoFileListResponse:
    total, records = await file_service.list_files(db, skip=skip, limit=limit)
    return GeoFileListResponse(
        total=total,
        items=[GeoFileResponse.model_validate(r) for r in records],
    )


# ---------------------------------------------------------------------------
# File info
# ---------------------------------------------------------------------------

@router.get(
    "/{file_id}/",
    response_model=GeoFileResponse,
    summary="Get file metadata",
)
async def get_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> GeoFileResponse:
    record = await file_service.get_file_by_id(db, file_id)
    return GeoFileResponse.model_validate(record)


# ---------------------------------------------------------------------------
# Features (full geometry + properties)
# ---------------------------------------------------------------------------

@router.get(
    "/{file_id}/features/",
    response_model=dict,
    summary="Get all features with geometry and properties",
)
async def get_features(
    file_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> dict:
    total, features = await file_service.get_features_by_file(
        db, file_id, skip=skip, limit=limit
    )
    return {
        "file_id": file_id,
        "total": total,
        "items": [GeoFeatureResponse.from_orm_feature(f) for f in features],
    }


# ---------------------------------------------------------------------------
# Measurements only
# ---------------------------------------------------------------------------

@router.get(
    "/{file_id}/measurements/",
    response_model=MeasurementsListResponse,
    summary="Get measurement results for all features",
    description=(
        "Returns area (m²) for Polygons, length (m) for LineStrings. "
        "Points have no measurement. Unsupported types report a graceful error."
    ),
)
async def get_measurements(
    file_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> MeasurementsListResponse:
    from app.schemas.geo_schemas import MeasurementInfo

    total, features = await file_service.get_features_by_file(
        db, file_id, skip=skip, limit=limit
    )
    items = [
        FeatureMeasurementResponse(
            feature_index=f.feature_index,
            geometry_type=f.geometry_type,
            measurements=MeasurementInfo(
                area_m2=f.area_m2,
                length_m=f.length_m,
                measurement_error=f.measurement_error,
            ),
        )
        for f in features
    ]
    return MeasurementsListResponse(
        file_id=file_id,
        total=total,
        items=items,
    )


# ---------------------------------------------------------------------------
# GeoJSON FeatureCollection
# ---------------------------------------------------------------------------

@router.get(
    "/{file_id}/geojson/",
    response_model=dict,
    summary="Get features as standard GeoJSON FeatureCollection",
)
async def get_geojson(
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await file_service.get_file_geojson(db, file_id)


# ---------------------------------------------------------------------------
# Summary Statistics
# ---------------------------------------------------------------------------

@router.get(
    "/{file_id}/stats/",
    response_model=dict,
    summary="Get aggregated statistics and geometry breakdown",
)
async def get_stats(
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await file_service.get_file_stats(db, file_id)


# ---------------------------------------------------------------------------
# Export Measurements to CSV
# ---------------------------------------------------------------------------

@router.get(
    "/{file_id}/export/csv",
    summary="Export feature measurements as CSV",
)
async def export_csv(
    file_id: str,
    db: AsyncSession = Depends(get_db),
):
    import csv
    import io
    from fastapi.responses import StreamingResponse

    features = await file_service.get_all_features_by_file(db, file_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "feature_index",
        "geometry_type",
        "area_m2",
        "area_km2",
        "area_acres",
        "area_hectares",
        "length_m",
        "length_km",
        "length_miles",
        "crs",
        "error",
    ])

    for f in features:
        writer.writerow([
            f.feature_index,
            f.geometry_type or "",
            f.area_m2 if f.area_m2 is not None else "",
            (f.area_m2 / 1_000_000) if f.area_m2 is not None else "",
            (f.area_m2 * 0.000247105) if f.area_m2 is not None else "",
            (f.area_m2 * 0.0001) if f.area_m2 is not None else "",
            f.length_m if f.length_m is not None else "",
            (f.length_m / 1000) if f.length_m is not None else "",
            (f.length_m * 0.000621371) if f.length_m is not None else "",
            f.crs or "",
            f.measurement_error or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=measurements_{file_id[:8]}.csv"},
    )


# ---------------------------------------------------------------------------
# Delete File
# ---------------------------------------------------------------------------

@router.delete(
    "/{file_id}/",
    summary="Delete an uploaded file and its measurements",
)
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    await file_service.delete_file(db, file_id)
    return {"status": "deleted", "id": file_id}


# ---------------------------------------------------------------------------
# Load Pre-packaged Sample
# ---------------------------------------------------------------------------

@router.post(
    "/sample/{sample_type}",
    response_model=UploadResponse,
    status_code=202,
    summary="Load a built-in demo sample (kml or shapefile)",
)
async def load_sample_file(
    sample_type: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    import shutil
    import uuid
    from pathlib import Path
    from app.core.config import settings
    from fastapi import HTTPException

    sample_map = {
        "kml": ("urban_survey.kml", "urban_survey_bangalore.kml"),
        "urban": ("urban_survey.kml", "urban_survey_bangalore.kml"),
        "wildlife": ("yellowstone_wildlife.kml", "yellowstone_wildlife_corridor.kml"),
        "shapefile": ("california_farms.zip", "california_farms.zip"),
        "agriculture": ("california_farms.zip", "california_farms.zip"),
        "singapore": ("singapore_cadastre.zip", "singapore_cadastre.zip"),
    }

    if sample_type not in sample_map:
        raise HTTPException(status_code=400, detail="Invalid sample type. Use 'urban', 'wildlife', 'agriculture', or 'singapore'.")

    src_filename, display_name = sample_map[sample_type]
    src_path = Path("static/samples") / src_filename
    if not src_path.exists():
        raise HTTPException(status_code=404, detail="Sample file not found on server.")

    unique_name = f"{uuid.uuid4()}{src_path.suffix}"
    dest_path = settings.UPLOAD_DIR / unique_name
    shutil.copyfile(src_path, dest_path)
    file_size = dest_path.stat().st_size

    record = await file_service.create_file_record(
        db=db,
        original_filename=display_name,
        saved_path=dest_path,
        file_size=file_size,
    )

    background_tasks.add_task(
        _run_processing, record_id=record.id, file_path=str(dest_path)
    )

    return UploadResponse(
        id=record.id,
        filename=record.original_filename,
        status=record.status,
        message=f"Sample '{display_name}' loaded. Processing started.",
    )

