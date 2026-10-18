from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check():
    return {"status": "ok", "service": "SHAMBA AI", "version": "0.1.0"}