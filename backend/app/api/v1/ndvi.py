from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from app.services.ndvi_service import calculate_ndvi_from_geotiff

router = APIRouter(tags=["ndvi"])

class NDVIRequest(BaseModel):
    input_path: str  # relative to data/raw/
    output_name: str

@router.post("/indices/ndvi")
def compute_ndvi(request: NDVIRequest):
    # We need to go up 5 levels from ndvi.py to reach the "Shamba AI" root folder
    # 1: v1 -> 2: api -> 3: app -> 4: backend -> 5: Shamba AI
    base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
    
    raw_dir = base_dir / "data" / "raw"
    processed_dir = base_dir / "data" / "processed"
    
    # Create the processed folder if it doesn't exist
    processed_dir.mkdir(exist_ok=True, parents=True)

    input_file = raw_dir / request.input_path
    if not input_file.exists():
        # This will show us the exact path Python is looking for
        raise HTTPException(status_code=404, detail=f"Input file not found at: {input_file}")

    output_file = processed_dir / f"{request.output_name}.tif"

    try:
        stats = calculate_ndvi_from_geotiff(input_file, output_file)
        return {
            "status": "success",
            "output_file": str(output_file),
            "statistics": stats
        }
    except Exception as e:
        # Print the error to the uvicorn terminal so we can debug it
        print(f"ERROR PROCESSING FILE: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))