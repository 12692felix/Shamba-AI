from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.health import router as health_router
from app.api.v1.ndvi import router as ndvi_router
from pathlib import Path
import rasterio
import numpy as np
from PIL import Image
import io

app = FastAPI(title="SHAMBA AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base_dir = Path(__file__).resolve().parent.parent.parent
processed_dir = base_dir / "data" / "processed"

app.include_router(health_router, prefix="/api/v1")
app.include_router(ndvi_router, prefix="/api/v1")

# Hardcoded to Bungoma only
AVAILABLE_OBSERVATIONS = {
    "Jan 2024": "Bungoma_NDVI_4326.tif",
    "Jun 2024": "Bungoma_NDVI_4326_Jun2024.tif"
}

@app.get("/api/v1/observations")
def get_observations():
    return list(AVAILABLE_OBSERVATIONS.keys())

@app.get("/api/v1/ndvi-image")
def get_ndvi_image(date: str = "Jan 2024"):
    filename = AVAILABLE_OBSERVATIONS.get(date)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid date selected")
        
    file_path = processed_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File missing: {filename}")

    with rasterio.open(file_path) as src:
        data = src.read(1)
        data = np.nan_to_num(data, nan=0.0)
        
        height, width = data.shape
        rgba = np.zeros((height, width, 4), dtype=np.uint8)
        
        mask_red = data < 0.2
        mask_yellow = (data >= 0.2) & (data < 0.4)
        mask_light_green = (data >= 0.4) & (data < 0.6)
        mask_dark_green = data >= 0.6
        
        rgba[mask_red] = [215, 48, 39, 255]       
        rgba[mask_yellow] = [254, 224, 139, 255]  
        rgba[mask_light_green] = [217, 239, 139, 255] 
        rgba[mask_dark_green] = [26, 152, 80, 255]    
        
        img = Image.fromarray(rgba, 'RGBA')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        return Response(content=img_byte_arr.getvalue(), media_type="image/png")

@app.get("/api/v1/ndvi-statistics")
def get_ndvi_statistics(date: str = "Jan 2024"):
    filename = AVAILABLE_OBSERVATIONS.get(date)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid date")
        
    file_path = processed_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing")

    with rasterio.open(file_path) as src:
        data = src.read(1)
        valid_data = data[~np.isnan(data)]
        
        return {
            "mean": round(float(np.mean(valid_data)), 4),
            "min": round(float(np.min(valid_data)), 4),
            "max": round(float(np.max(valid_data)), 4),
            "std_dev": round(float(np.std(valid_data)), 4),
            "valid_percentage": round(float((valid_data.size / data.size) * 100), 2)
        }

@app.get("/api/v1/ndvi-anomaly")
def get_ndvi_anomaly():
    jan_file = processed_dir / "Bungoma_NDVI_4326.tif"
    jun_file = processed_dir / "Bungoma_NDVI_4326_Jun2024.tif"
    
    if not jan_file.exists() or not jun_file.exists():
        raise HTTPException(status_code=404, detail="Missing files for anomaly calculation")

    with rasterio.open(jan_file) as src_jan, rasterio.open(jun_file) as src_jun:
        jan_data = np.nan_to_num(src_jan.read(1), nan=0.0)
        jun_data = np.nan_to_num(src_jun.read(1), nan=0.0)
        
        delta = jun_data - jan_data
        rgba = np.zeros((delta.shape[0], delta.shape[1], 4), dtype=np.uint8)
        
        anomalies = delta < -0.15
        rgba[anomalies] = [255, 0, 0, 255] 
        
        img = Image.fromarray(rgba, 'RGBA')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        return Response(content=img_byte_arr.getvalue(), media_type="image/png")