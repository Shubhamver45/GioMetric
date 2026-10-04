"""SQLAlchemy ORM models for geospatial file metadata and features."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class FileStatus(str, PyEnum):
    """Processing status of an uploaded file."""

    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class GeoFile(Base):
    """Stores metadata about an uploaded geospatial file."""

    __tablename__ = "geo_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    status = Column(Enum(FileStatus), default=FileStatus.PENDING, nullable=False)
    crs = Column(String(64), nullable=True)
    feature_count = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    features = relationship(
        "GeoFeature", back_populates="geo_file", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<GeoFile id={self.id} filename={self.filename} status={self.status}>"


class GeoFeature(Base):
    """Stores individual features extracted from a geospatial file."""

    __tablename__ = "geo_features"

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(String(36), ForeignKey("geo_files.id"), nullable=False, index=True)
    feature_index = Column(Integer, nullable=False)  # Index within the source file
    geometry_type = Column(String(64), nullable=True)
    geometry_wkt = Column(Text, nullable=True)        # WKT representation of geometry
    crs = Column(String(64), nullable=True)
    properties = Column(Text, nullable=True)          # JSON-serialised attribute dict

    # Measurements (null for unsupported types)
    area_m2 = Column(Float, nullable=True)            # Polygon area in m²
    length_m = Column(Float, nullable=True)           # LineString length in m
    measurement_error = Column(Text, nullable=True)   # Graceful error message if any

    # Relationships
    geo_file = relationship("GeoFile", back_populates="features")

    def __repr__(self) -> str:
        return (
            f"<GeoFeature id={self.id} file_id={self.file_id} "
            f"index={self.feature_index} type={self.geometry_type}>"
        )
