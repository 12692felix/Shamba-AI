# Scientific Methodology

## 1. Data Acquisition
Satellite data was acquired for a pilot region in Bungoma County, Western Kenya. A bounding box (roughly 5km x 5km) was defined to keep processing lightweight. The least cloudy image within the January–March 2024 timeframe was selected.

## 2. Vegetation Index (NDVI)
The Normalized Difference Vegetation Index (NDVI) is used to quantify vegetation greenness. It is calculated as:
NDVI = (NIR - Red) / (NIR + Red)

*   **NIR:** Near-Infrared (Sentinel-2 Band 8, 10m resolution).
*   **Red:** Red visible light (Sentinel-2 Band 4, 10m resolution).
*   **Scale Factor:** Sentinel-2 surface reflectance values are stored as integers. A scale factor of `0.0001` was applied in Google Earth Engine to convert values to floating-point reflectance (0.0 to 1.0) before calculating NDVI.

## 3. Geospatial Processing (Backend)
1.  **Ingestion:** The B4 and B8 bands were downloaded as a 2-band GeoTIFF.
2.  **Calculation:** Python (`rasterio` and `numpy`) was used to calculate NDVI per pixel. Division-by-zero was handled by assigning `NaN` (Not a Number) to those pixels.
3.  **Reprojection:** The output was reprojected from UTM Zone 36S (EPSG:32636) to WGS 84 (EPSG:4326) to align with standard web mapping libraries.
4.  **Color Mapping:** NDVI values were mapped to four categories for visualization:
    *   `< 0.2`: Red (Stressed/Bare Soil)
    *   `0.2 - 0.4`: Yellow (Moderate Vegetation)
    *   `0.4 - 0.6`: Light Green (Healthy)
    *   `> 0.6`: Dark Green (Very Healthy/Dense Canopy)