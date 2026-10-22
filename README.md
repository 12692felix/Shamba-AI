# 🌾 SHAMBA AI

**See Your Fields. Understand Your Crops. Act Earlier.**

SHAMBA AI is a full-stack, AI-powered geospatial intelligence platform designed to monitor agricultural crop health in Western Kenya. Using genuine Sentinel-2 satellite imagery, the system calculates vegetation indices, detects temporal anomalies, and provides interactive maps to support precision agriculture and decision-making.

---

## 📌 Project Overview
Farmers and agricultural stakeholders need timely information about changing crop conditions. Field inspections alone can be time-consuming. SHAMBA AI bridges this gap by using satellite remote sensing to observe vegetation changes, identify unusual field conditions, and flag areas that require field verification.

**This is a university capstone project built with a strong focus on scientific accuracy, transparent methodology, and full-stack software engineering.**

---

## 🚀 Key Features
*   **Satellite Data Ingestion:** Extracts cloud-masked Sentinel-2 Level-2A surface reflectance data via Google Earth Engine.
*   **NDVI Processing Pipeline:** Calculates the Normalized Difference Vegetation Index (NDVI) using Python, `rasterio`, and `numpy`, preserving geospatial metadata.
*   **Dynamic Map Visualization:** Interactive WebGL mapping using MapLibre GL JS, with custom color ramps for vegetation health (Red = Stressed, Green = Healthy).
*   **Temporal Change Detection:** Built to compare multiple observation dates (e.g., Jan 2024 vs. Jun 2024).
*   **Statistical Anomaly Detection:** Uses a transparent statistical baseline to flag areas where vegetation dropped by more than 0.15 NDVI, highlighting potential drought, pests, or land clearing.
*   **Geospatial Clipping:** Backend masking uses `geopandas` and `rasterio.mask` to clip satellite imagery perfectly to the jagged outlines of county boundaries.

---

## 🛠️ Technology Stack
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, MapLibre GL JS.
*   **Backend:** Python, FastAPI, Pydantic, Rasterio, NumPy, GeoPandas, Pillow.
*   **Data Source:** Google Earth Engine (Sentinel-2 `COPERNICUS/S2_SR_HARMONIZED`).

---

## 💻 Local Setup & Installation

### Prerequisites
*   Python 3.11+
*   Node.js 18+
*   Git

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload