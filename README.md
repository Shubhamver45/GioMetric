# GeoMetric Studio | Vector Measurements & GIS Intelligence Platform

An enterprise-grade, high-performance geospatial intelligence and measurement suite built with **FastAPI**, **GeoPandas / Fiona / Shapely**, **React 18 (Vite)**, **Leaflet.js**, **Turf.js**, and **Chart.js**.

GeoMetric Studio provides millimeter-accurate geodesic vector calculations, automated UTM reprojection, interactive map analytics, client-side geoprocessing, and multi-format reporting — **100% open-source and completely free of external API keys**.

---

## 🌟 Key Capabilities & Highlights

- **📐 SI Metric & Geodesic Accuracy**: Auto-detects optimal EPSG UTM projection zones to calculate true geodesic curvature-corrected polygon areas ($m^2$, $km^2$, acres, hectares) and line lengths ($m$, $km$, miles).
- **🗺️ Unobstructed Map Studio**: Dedicated external toolbar box housing basemap switchers (*Light Studio, OSM Streets, Satellite Imagery, Topographic*), polygon opacity sliders, choropleth area heatmaps, and city teleport navigation.
- **⚡ Turf.js Client-Side Spatial Toolkit**:
  - **Live Geodesic Ruler**: Click points anywhere on Earth to measure distances in real time.
  - **Interactive Area Polygon Drawer**: Trace custom boundaries directly on the canvas.
  - **Dynamic Buffer Envelopes**: Generate 100m–5km protective radius envelopes around features.
  - **Convex Hull Enclosures**: Instant minimal bounding polygon generation.
- **📊 Visual Spatial Intelligence (Chart.js)**:
  - Vector layer distribution donut charts with interactive hover inspection.
  - Dominant parcel area comparative bar charts.
- **📑 Multi-Format Export Suite**:
  - **GeoJSON**: 1-click download + clipboard copy.
  - **CSV Table**: Tabular export with bounding boxes, perimeters, and areas.
  - **Executive Printable PDF**: Multi-page report complete with metadata, metrics, and attribute inventories via `jsPDF`.
  - **High-Res Canvas Snapshot**: Crisp `.png` export for presentation slides.
- **🧪 Built-In & Custom Datasets**:
  - 4 pre-packaged datasets (Bangalore Urban, Yellowstone NP, California Farms, Singapore Marina).
  - Multi-file ESRI Shapefile `.zip` packages (`.shp`, `.shx`, `.dbf`, `.prj`) and Google Earth `.kml` XML files.

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────┐
│               Frontend: React 18 + Vite                │
│    Leaflet.js  •  Turf.js  •  Chart.js  •  jsPDF       │
└───────────────────────────┬────────────────────────────┘
                            │ RESTful JSON API
┌───────────────────────────▼────────────────────────────┐
│                  Backend: FastAPI Core                 │
│      AsyncIO  •  SQLAlchemy ORM  •  SQLite / Postgres  │
└───────────────────────────┬────────────────────────────┘
                            │ Geodesic Computation Engine
┌───────────────────────────▼────────────────────────────┐
│      Spatial Libraries: GeoPandas / Fiona / Shapely    │
│        pyproj (Automated UTM Reprojection Matrix)      │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Python 3.9+**
- **Node.js 18+** & **npm**

---

### 1. Backend Setup (FastAPI)

```bash
# Clone the repository
git clone https://github.com/Shubhamver45/GioMetric.git
cd GioMetric

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows

# Install Python dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

* API Docs (Swagger): `http://localhost:8000/docs`
* API Redoc: `http://localhost:8000/redoc`
* Health Check: `http://localhost:8000/health`

---

### 2. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev -- --host 0.0.0.0 --port 3000
```

* Frontend UI: **`http://localhost:3000/`**

---

### 3. Run Test Suite

```bash
# Run backend pytest suite
pytest -v
```

---

## 📡 API Reference & Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/files/` | Upload and process Shapefile `.zip` or `.kml` vector file |
| `GET` | `/api/files/` | List uploaded datasets with pagination |
| `GET` | `/api/files/{file_id}/` | Get processing status & summary metrics |
| `GET` | `/api/files/{file_id}/geojson/` | Stream GeoJSON FeatureCollection |
| `GET` | `/api/files/{file_id}/stats/` | Retrieve statistical breakdown & bounding box |
| `GET` | `/api/files/{file_id}/export/csv` | Download CSV measurement inventory |
| `POST` | `/api/files/sample/{type}` | Load pre-packaged sample (`urban`, `wildlife`, `agriculture`, `singapore`) |
| `DELETE` | `/api/files/{file_id}/` | Delete dataset and cascade associated geometries |

---

## 📂 Project Directory Structure

```
.
├── app/                        # FastAPI Backend Engine
│   ├── api/                    # API route definitions
│   ├── core/                   # Configuration and settings
│   ├── db/                     # Async SQLite / Postgres session setup
│   ├── models/                 # SQLAlchemy database models
│   ├── schemas/                # Pydantic request/response schemas
│   ├── services/               # Fiona/Shapely/UTM geoprocessing routines
│   └── main.py                 # ASGI application entrypoint
├── frontend/                   # React 18 Application (Vite)
│   ├── src/
│   │   ├── components/         # MapStudio, GisToolbox, Analytics, FeatureTable, etc.
│   │   ├── App.jsx             # Main application orchestrator
│   │   ├── index.css           # Design tokens & modern light styling
│   │   └── main.jsx            # React root mount
│   ├── package.json
│   └── vite.config.js
├── static_dist/                # Production frontend distribution
├── test_datasets/              # Sample KML and Shapefile ZIP datasets
├── tests/                      # Pytest automated test suite
├── requirements.txt            # Python dependencies
└── README.md                   # Documentation
```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
