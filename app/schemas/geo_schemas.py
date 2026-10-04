"""Pydantic schemas for request/response validation."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.geo_models import FileStatus


# ---------------------------------------------------------------------------
# File schemas
# ---------------------------------------------------------------------------

class GeoFileBase(BaseModel):
    """Shared properties."""
    filename: str
    crs: Optional[str] = None
    feature_count: Optional[int] = None
    status: FileStatus


class GeoFileCreate(BaseModel):
    """Internal schema used when persisting a new file record."""
    filename: str
    original_filename: str
    file_path: str
    file_size_bytes: Optional[int] = None


class GeoFileResponse(BaseModel):
    """Public response for a single uploaded file."""
    id: str
    filename: str
    crs: Optional[str] = None
    feature_count: Optional[int] = None
    status: FileStatus
    file_size_bytes: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GeoFileListResponse(BaseModel):
    """Paginated list of files."""
    total: int
    items: list[GeoFileResponse]


# ---------------------------------------------------------------------------
# Feature schemas
# ---------------------------------------------------------------------------

class MeasurementInfo(BaseModel):
    """Measurement results for a single feature."""
    area_m2: Optional[float] = Field(None, description="Area in square metres (Polygon only)")
    length_m: Optional[float] = Field(None, description="Length in metres (LineString only)")
    measurement_error: Optional[str] = Field(None, description="Error if measurement failed")


class GeoFeatureResponse(BaseModel):
    """Public response for a single feature."""
    id: int
    feature_index: int
    geometry_type: Optional[str] = None
    geometry_wkt: Optional[str] = None
    crs: Optional[str] = None
    properties: Optional[dict[str, Any]] = None
    measurements: MeasurementInfo

    model_config = {"from_attributes": True}

    @field_validator("properties", mode="before")
    @classmethod
    def parse_properties(cls, v: Any) -> Optional[dict]:
        """Deserialise JSON string from DB into dict."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return {}
        return v

    @classmethod
    def from_orm_feature(cls, feature) -> "GeoFeatureResponse":
        props = feature.properties
        if isinstance(props, str):
            try:
                props = json.loads(props)
            except (json.JSONDecodeError, ValueError):
                props = {}

        return cls(
            id=feature.id,
            feature_index=feature.feature_index,
            geometry_type=feature.geometry_type,
            geometry_wkt=feature.geometry_wkt,
            crs=feature.crs,
            properties=props,
            measurements=MeasurementInfo(
                area_m2=feature.area_m2,
                length_m=feature.length_m,
                measurement_error=feature.measurement_error,
            ),
        )


class FeatureMeasurementResponse(BaseModel):
    """Measurements-only view for a feature."""
    feature_index: int
    geometry_type: Optional[str] = None
    measurements: MeasurementInfo

    model_config = {"from_attributes": True}


class MeasurementsListResponse(BaseModel):
    """Paginated measurement results for a file."""
    file_id: str
    total: int
    items: list[FeatureMeasurementResponse]


class UploadResponse(BaseModel):
    """Immediate response after uploading a file."""
    id: str
    filename: str
    status: FileStatus
    message: str = "File uploaded and processing started."
