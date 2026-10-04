"""Custom exception classes and HTTP exception handlers."""
from fastapi import Request
from fastapi.responses import JSONResponse


class GeoAPIException(Exception):
    """Base exception for all API errors."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class FileNotFoundError(GeoAPIException):
    def __init__(self, file_id: str):
        super().__init__(f"File with id '{file_id}' not found.", status_code=404)


class UnsupportedFileTypeError(GeoAPIException):
    def __init__(self, extension: str):
        super().__init__(
            f"File type '{extension}' is not supported. Allowed: .zip (Shapefile), .kml",
            status_code=422,
        )


class FileTooLargeError(GeoAPIException):
    def __init__(self, max_mb: int):
        super().__init__(
            f"File exceeds the maximum allowed size of {max_mb} MB.",
            status_code=413,
        )


class FileProcessingError(GeoAPIException):
    def __init__(self, detail: str):
        super().__init__(f"Failed to process geospatial file: {detail}", status_code=422)


async def geo_exception_handler(request: Request, exc: GeoAPIException) -> JSONResponse:
    """Global handler for GeoAPIException subclasses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )
