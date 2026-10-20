from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.health import router as health_router
from app.api.v1.ndvi import router as ndvi_router
from app.core.config import WESTERN_KENYA_COUNTIES
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

@app.get("/api/v1/counties")
def get_counties():
    response_data = []
    for name, data in WESTERN_KENYA_COUNTIES.items():
        response_data.append({
            "name": name,
            "center": data["center"],
            "bounds": data["bounds"],
            "available_dates": list(data["observations"].keys())
        })
    return response_data

def get_file_path(county: str, date: str) -> Path:
    if county not in WESTERN_KENYA_COUNTIES:
        raise HTTPException(status_code=404, detail=f"County '{county}' not supported")
    county_data = WESTERN_KENYA_COUNTIES[county]
    if date not in county_data["observations"]:
        raise HTTPException(status_code=404, detail=f"No data available for {county} on {date}")
    return processed_dir / county_data["observations"][date]

@app.get("/api/v1/ndvi-image")
def get_ndvi_image(county: str = "Bungoma", date: str = "Jan 2024"):
    file_path = get_file_path(county, date)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File missing on disk: {file_path.name}")

    with rasterio.open(file_path) as src:
        data = src.read(1)
        
        # 1. Identify valid pixels (where data is NOT NaN) BEFORE filling NaNs
        valid_mask = ~np.isnan(data)
        
        # 2. Fill NaNs with 0.0 just so the color mapping math doesn't crash
        data = np.nan_to_num(data, nan=0.0)
        
        height, width = data.shape
        rgba = np.zeros((height, width, 4), dtype=np.uint8)
        
        # 3. Map colors
        mask_red = data < 0.2
        mask_yellow = (data >= 0.2) & (data < 0.4)
        mask_light_green = (data >= 0.4) & (data < 0.6)
        mask_dark_green = data >= 0.6
        
        rgba[mask_red] = [215, 48, 39, 255]       
        rgba[mask_yellow] = [254, 224, 139, 255]  
        rgba[mask_light_green] = [217, 239, 139, 255] 
        rgba[mask_dark_green] = [26, 152, 80, 255]    
        
        # 4. CRITICAL FIX: Set all invalid/NoData pixels to completely transparent [0,0,0,0]
        rgba[~valid_mask] = [0, 0, 0, 0]
        
        img = Image.fromarray(rgba, 'RGBA')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        return Response(content=img_byte_arr.getvalue(), media_type="image/png")

@app.get("/api/v1/ndvi-statistics")
def get_ndvi_statistics(county: str = "Bungoma", date: str = "Jan 2024"):
    file_path = get_file_path(county, date)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")

    with rasterio.open(file_path) as src:
        data = src.read(1)
        # We only calculate statistics on valid (non-NaN) pixels
        valid_data = data[~np.isnan(data)]
        
        return {
            "mean": round(float(np.mean(valid_data)), 4),
            "min": round(float(np.min(valid_data)), 4),
            "max": round(float(np.max(valid_data)), 4),
            "std_dev": round(float(np.std(valid_data)), 4),
            "valid_percentage": round(float((valid_data.size / data.size) * 100), 2)
        }

@app.get("/api/v1/ndvi-anomaly")
def get_ndvi_anomaly(county: str = "Bungoma"):
    if county not in WESTERN_KENYA_COUNTIES:
        raise HTTPException(status_code=404, detail="County not supported")
    
    county_data = WESTERN_KENYA_COUNTIES[county]
    dates = list(county_data["observations"].keys())
    
    if len(dates) < 2:
        raise HTTPException(status_code=400, detail="Need at least two observation dates to calculate anomalies.")

    file1 = processed_dir / county_data["observations"][dates[0]]
    file2 = processed_dir / county_data["observations"][dates[1]]

    if not file1.exists() or not file2.exists():
        raise HTTPException(status_code=404, detail="Missing source files for anomaly calculation.")

    with rasterio.open(file1) as src1, rasterio.open(file2) as src2:
        data1 = src1.read(1)
        data2 = src2.read(1)
        
        # 1. Create a mask where BOTH dates have valid data
        valid_mask = ~np.isnan(data1) & ~np.isnan(data2)
        
        # 2. Fill NaNs with 0.0 for the math
        delta = np.nan_to_num(data2, nan=0.0) - np.nan_to_num(data1, nan=0.0)
        
        rgba = np.zeros((delta.shape[0], delta.shape[1], 4), dtype=np.uint8)
        
        # 3. Flag anomalies (drop of more than 0.15)
        anomalies = delta < -0.15
        rgba[anomalies] = [255, 0, 0, 255] # Red anomalies
        
        # 4. CRITICAL FIX: Make sure invalid pixels are transparent
        rgba[~valid_mask] = [0, 0, 0, 0]
        
        img = Image.fromarray(rgba, 'RGBA')
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)

        return Response(content=img_byte_arr.getvalue(), media_type="image/png")