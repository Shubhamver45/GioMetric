"""
FastAPI application factory.

Wires together:
- Database initialization
- Exception handlers
- API routers
- OpenAPI customization
"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import GeoAPIException, geo_exception_handler
from app.api.routes import router as files_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle startup and shutdown events."""
    # --- startup ---
    logger.info("Starting %s v%s ...", settings.APP_NAME, settings.APP_VERSION)
    await init_db()
    logger.info("Database initialised.")

    yield  # app is running

    # --- shutdown ---
    logger.info("Shutting down.")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    """Construct and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "A production-quality REST API for uploading geospatial files "
            "(Shapefile ZIP / KML), extracting features, and computing area & length measurements."
        ),
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ------------------------------------------------------------------
    # Middleware
    # ------------------------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ------------------------------------------------------------------
    # Exception handlers
    # ------------------------------------------------------------------
    app.add_exception_handler(GeoAPIException, geo_exception_handler)

    # ------------------------------------------------------------------
    # Routers
    # ------------------------------------------------------------------
    app.include_router(files_router)

    # Health check
    @app.get("/health", tags=["Health"], include_in_schema=True)
    async def health() -> JSONResponse:
        return JSONResponse({"status": "ok", "version": settings.APP_VERSION})

    # ------------------------------------------------------------------
    # Web App Static Files & React Frontend Mount
    # ------------------------------------------------------------------
    from pathlib import Path
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    # Serve sample files
    samples_dir = Path("static/samples")
    if samples_dir.exists():
        app.mount("/static/samples", StaticFiles(directory=str(samples_dir)), name="samples")

    # Serve compiled React frontend
    dist_dir = Path("static_dist")
    if dist_dir.exists():
        assets_dir = dist_dir / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_react_app(full_path: str):
            if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
                return JSONResponse({"detail": "Not Found"}, status_code=404)
            index_path = dist_dir / "index.html"
            if index_path.exists():
                return FileResponse(index_path)
            return JSONResponse({"message": f"{settings.APP_NAME} API is running."})
    else:
        static_dir = Path("static")
        if static_dir.exists():
            app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

            @app.get("/", include_in_schema=False)
            async def root():
                index_path = static_dir / "index.html"
                if index_path.exists():
                    return FileResponse(index_path)
                return JSONResponse({"message": f"{settings.APP_NAME} API is running."})

    return app


app = create_app()
