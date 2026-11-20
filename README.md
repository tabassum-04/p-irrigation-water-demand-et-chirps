# Estimation of Agricultural Irrigation Water Demand Using Remote Sensing and Evapotranspiration Modeling: A Case Study of Rajshahi District

**Study area:** Rajshahi District, Barind / northwestern Bangladesh
**Irrigation window:** February 1 – April 30, 2026 (dry / Boro season)
**Platform:** Google Earth Engine (GEE)
**Author:** Tabassum Mahbub
**Type:** Independent, self-initiated study using open-access satellite data

![NIWR map](figures/irrigation-demand-estimation-map.png)

## Overview

This study uses satellite-derived evapotranspiration, daily precipitation estimates and land-cover cropland masking in Google Earth Engine to estimate agricultural irrigation water demand in Rajshahi District. It calculates district-wide and cropland-specific water balance metrics, the pixel-wise **Net Irrigation Water Requirement (NIWR)**, and the total irrigation water volume in **Million Cubic Meters (MCM)**.

## Key results

| Metric | Value |
| --- | --- |
| Mean total evapotranspiration (district) | 100.47 mm |
| Mean total rainfall (district) | 133.12 mm |
| Mean cropland evapotranspiration | 103.61 mm |
| Mean cropland rainfall | 132.99 mm |
| Mean effective rainfall (75 % of rainfall) | 99.75 mm |
| Mean cropland NIWR | **14.40 mm** |
| Cropland area (ESA WorldCover Class 40) | ~1,306.49 km² |
| Total net irrigation water volume | **18.84 MCM** |

> **Note:** MODIS MOD16A2GF returned 0 images for Feb 1 – Apr 30, 2026, so the script automatically used the same seasonal window of **2025** for evapotranspiration, while rainfall is from 2026. See the report for details.

## Repository structure

```
.
├── README.md
├── LICENSE
├── script/
│   └── irrigation-demand-estimation.js      GEE Code Editor script (Parts 1–3)
├── data/
│   └── irrigation-demand-estimation.tif     Cropland NIWR (mm)
├── figures/
│   └── irrigation-demand-estimation-map.png
└── report/
    ├── irrigation-demand-estimation-report.pdf
    └── irrigation-demand-estimation-report.docx
```

### Raster specifications (`data/irrigation-demand-estimation.tif`)

| Property | Value |
| --- | --- |
| Size | 741 × 670 pixels |
| Resolution | 100 m (≈ 0.0009°) |
| Data type | 32-bit float |
| Band | `NIWR_mm` (net irrigation water requirement, mm) |
| NoData value | −9999 (non-cropland and outside the district) |
| CRS | WGS 84 (EPSG:4326) |
| Approx. extent | 88.30°E – 88.96°E, 24.12°N – 24.72°N |

## Data sources

| Dataset | GEE collection / asset ID | Role |
| --- | --- | --- |
| FAO GAUL Level 2 | `FAO/GAUL/2015/level2` | Rajshahi District boundary (`ADM2_NAME == 'Rajshahi'`) |
| MODIS gap-filled ET (8-day) | `MODIS/061/MOD16A2GF` | Evapotranspiration (scale factor 0.1 to mm) |
| CHIRPS daily precipitation | `UCSB-CHG/CHIRPS/DAILY` | Rainfall (mm) |
| ESA WorldCover 2021 | `ESA/WorldCover/v200/2021` | Cropland mask (Class 40) |

## Methodology

1. **Evapotranspiration:** MOD16A2GF `ET` band, summed over the window and multiplied by 0.1 to get mm. Falls back to the 2025 window if 2026 has no images.
2. **Rainfall:** CHIRPS daily precipitation summed over Feb 1 – Apr 30, 2026.
3. **Cropland mask:** ESA WorldCover Class 40 applied to both ET and rainfall.
4. **Effective rainfall:** 75 % of cropland rainfall.
5. **NIWR (mm):**

   ```
   NIWR_mm = max(Crop_ET_mm - Effective_Rain_mm, 0)
   ```

6. **Volume:** `NIWR_mm × 0.001 × pixel area (m²)`, summed over cropland and divided by 10^6 to get MCM.

## How to reproduce

1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/) (a free Earth Engine account is required).
2. Paste the whole script `script/irrigation-demand-estimation.js` into a new file and click **Run**. It must run top to bottom, because later parts use variables from earlier ones.
3. Start the `irrigation-demand-estimation` export from the **Tasks** tab. The GeoTIFF is saved to the `irrigation-demand-estimation` folder in Google Drive.

## Limitations

- **Cross-year pairing:** 2025 ET is combined with 2026 rainfall.
- **Effective rainfall:** a uniform 75 % factor ignores soil moisture, rainfall intensity and infiltration.
- **Static land cover:** the 2021 WorldCover layer is not a 2026 Boro rice crop map.
- **Mixed scales:** ET at 500 m, CHIRPS at ~5 km, WorldCover at 10 m, area and volume at 100 m.
- **Net, not gross:** NIWR excludes conveyance and application losses and the split between groundwater and surface water.
- **Size of the ET values:** about 100 mm of ET over three months is low for the Boro season, and MOD16 can underestimate ET over irrigated cropland, so the NIWR is best read as a conservative screening estimate until compared with FAO-56 estimates or field data.

For full details, see `report/irrigation-demand-estimation-report.pdf`.

## Code attribution

The Google Earth Engine code used in this study was generated with Google Gemini (AI assistant) and run in the GEE Code Editor. The draft text of the technical report was also prepared with AI assistance (Gemini) and then formatted into the final document.

## License

Code is released under the MIT License (see `LICENSE`). The report and figures may be reused with attribution to the author.
