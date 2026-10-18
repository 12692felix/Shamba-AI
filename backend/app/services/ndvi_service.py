import numpy as np
import rasterio

def calculate_ndvi_from_geotiff(input_path, output_path):
    """
    Read a 2-band GeoTIFF (B4=red, B8=NIR), compute NDVI, save as single-band Float32 GeoTIFF.
    Preserves CRS, transform, and dimensions from input.
    """
    with rasterio.open(input_path) as src:
        # Assume band 1 = B4 (red), band 2 = B8 (NIR)
        red = src.read(1).astype(np.float32)
        nir = src.read(2).astype(np.float32)

        # Avoid division by zero
        denominator = nir + red
        denominator[denominator == 0] = np.nan

        ndvi = (nir - red) / denominator

        # Update profile for single-band float output
        profile = src.profile.copy()
        profile.update(
            count=1,
            dtype=rasterio.float32,
            compress='lzw',
            nodata=np.nan
        )

        with rasterio.open(output_path, 'w', **profile) as dst:
            dst.write(ndvi.astype(np.float32), 1)

        # Compute statistics on valid pixels only
        valid = ndvi[~np.isnan(ndvi)]
        if len(valid) == 0:
            raise ValueError("No valid NDVI pixels computed (all NaN after division).")

        stats = {
            "valid_pixel_count": int(len(valid)),
            "total_pixel_count": int(ndvi.size),
            "valid_percentage": round(float(len(valid) / ndvi.size * 100), 2),
            "ndvi_min": round(float(valid.min()), 4),
            "ndvi_max": round(float(valid.max()), 4),
            "ndvi_mean": round(float(valid.mean()), 4),
            "ndvi_std": round(float(valid.std()), 4),
        }
        return stats