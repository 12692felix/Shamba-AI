# backend/app/core/config.py

WESTERN_KENYA_COUNTIES = {
    "Bungoma": {
        "center": [34.575, 0.575],
        "bounds": [[34.55, 0.60], [34.60, 0.60], [34.60, 0.55], [34.55, 0.55]],
        "observations": {
            "Jan 2024": "Bungoma_NDVI_4326.tif",
            "Jun 2024": "Bungoma_NDVI_4326_Jun2024.tif"
        }
    },
    "Kakamega": {
        "center": [34.75, 0.28],
        "bounds": [[34.70, 0.35], [34.80, 0.35], [34.80, 0.20], [34.70, 0.20]],
        "observations": {} # Empty until you process data
    },
    "Busia": {
        "center": [34.11, 0.46],
        "bounds": [[34.05, 0.50], [34.15, 0.50], [34.15, 0.40], [34.05, 0.40]],
        "observations": {} 
    },
    "Vihiga": {
        "center": [34.72, 0.05],
        "bounds": [[34.65, 0.10], [34.75, 0.10], [34.75, 0.00], [34.65, 0.00]],
        "observations": {} 
    },
    "Siaya": {
        "center": [34.28, 0.06],
        "bounds": [[34.20, 0.15], [34.35, 0.15], [34.35, -0.05], [34.20, -0.05]],
        "observations": {} 
    },
    "Kisumu": {
        "center": [34.76, -0.09],
        "bounds": [[34.65, 0.00], [34.85, 0.00], [34.85, -0.20], [34.65, -0.20]],
        "observations": {} 
    }
}