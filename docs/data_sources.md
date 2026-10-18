# Data Sources & Attribution

## Primary Dataset: Sentinel-2 Level-2A
*   **Source:** European Space Agency (ESA) via Google Earth Engine.
*   **Product:** `COPERNICUS/S2_SR_HARMONIZED` (Harmonized Surface Reflectance).
*   **Spatial Resolution:** 10 meters (Bands B4 and B8).
*   **Temporal Resolution:** ~5 days (combined Sentinel-2A and 2B).
*   **Licensing:** Copernicus data is free and open for all users.
*   **Cloud Masking:** Images were filtered for `< 20%` cloudy pixel percentage using the `CLOUDY_PIXEL_PERCENTAGE` metadata property in Earth Engine.

## Future Datasets (Planned for later phases)
*   **Rainfall:** Climate Hazards Group InfraRed Precipitation with Station data (CHIRPS). Spatial resolution: ~5.5 km.
*   **Administrative Boundaries:** Food and Agriculture Organization (FAO) GAUL (Global Administrative Unit Layers) or OpenStreetMap.