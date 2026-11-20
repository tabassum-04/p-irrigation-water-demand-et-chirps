// =========================================================================
// Agricultural Irrigation Water Demand, Rajshahi District (Feb-Apr 2026)
// MODIS evapotranspiration, CHIRPS rainfall and cropland masking
//
// Code source: generated with Google Gemini (AI assistant) and run in the
// Google Earth Engine Code Editor.
//
// Run this whole file in the Code Editor, top to bottom, in one script.
//   Part 1: study area, MODIS evapotranspiration and CHIRPS rainfall
//   Part 2: cropland mask, effective rainfall, NIWR, cropland area and volume
//   Part 3: exact MCM calculation and Google Drive export
// =========================================================================


// #########################################################################
// PART 1: Evapotranspiration vs precipitation
// #########################################################################


// Evapotranspiration vs Precipitation
var districts = ee.FeatureCollection("FAO/GAUL/2015/level2");
var aoi = districts.filter(ee.Filter.eq('ADM2_NAME', 'Rajshahi'));
Map.centerObject(aoi, 9);

// 1. MODIS Gap-Filled 8-Day Evapotranspiration (MOD16A2GF - scale factor 0.1 mm)
var etCol2026 = ee.ImageCollection("MODIS/061/MOD16A2GF")
  .filterBounds(aoi)
  .filterDate('2026-02-01', '2026-04-30')
  .select('ET');

print('MOD16A2GF 2026 image count:', etCol2026.size());

// Fallback to 2025 if 2026 is empty/incomplete in MOD16A2GF
var etCol2025 = ee.ImageCollection("MODIS/061/MOD16A2GF")
  .filterBounds(aoi)
  .filterDate('2025-02-01', '2025-04-30')
  .select('ET');

var etCol = ee.ImageCollection(
  ee.Algorithms.If(etCol2026.size().gt(0), etCol2026, etCol2025)
);

// Ensure a valid image even if both are empty
var totalET = ee.Image(
  ee.Algorithms.If(
    etCol.size().gt(0),
    etCol.sum().multiply(0.1),
    ee.Image.constant(0)
  )
).clip(aoi).rename('Total_ET_mm');

// 2. CHIRPS Daily Precipitation (mm)
var rainCol = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
  .filterBounds(aoi)
  .filterDate('2026-02-01', '2026-04-30')
  .select('precipitation');

var totalRain = rainCol.sum().clip(aoi).rename('Total_Rain_mm');

// Calculate District Mean ET and Mean Rainfall (mm)
var meanET = totalET.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: aoi,
  scale: 500,
  maxPixels: 1e10
});

var meanRain = totalRain.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: aoi,
  scale: 5000,
  maxPixels: 1e10
});

print('Mean Total ET (mm):', meanET);
print('Mean Total Rainfall (Feb-Apr 2026, mm):', meanRain);

// Visualize ET & Rainfall
Map.addLayer(totalET, {min: 50, max: 350, palette: ['lightyellow', 'green', 'darkgreen']}, 'Total ET (mm)');
Map.addLayer(totalRain, {min: 0, max: 150, palette: ['white', 'skyblue', 'blue']}, 'Total Rainfall (mm)', false);


// #########################################################################
// PART 2: Cropland mask and NIWR
// #########################################################################


// ==========================================
// Cropland Mask & NIWR
// ==========================================

// 1. ESA WorldCover Cropland Mask (Class 40 = Cropland)
var worldcover = ee.Image("ESA/WorldCover/v200/2021").select('Map');
var croplandMask = worldcover.eq(40).clip(aoi);

// Apply cropland mask to ET and Rainfall
var cropET = totalET.updateMask(croplandMask).rename('Crop_ET_mm');
var cropRain = totalRain.updateMask(croplandMask).rename('Crop_Rain_mm');

// 2. Effective Rainfall (75% of total rainfall) & Net Irrigation Water Requirement (mm)
var effectiveRain = cropRain.multiply(0.75).rename('Effective_Rain_mm');
var niwr_mm = cropET.subtract(effectiveRain).max(0).rename('NIWR_mm');

// Mean values over Cropland
var cropStats = ee.Image.cat([cropET, cropRain, effectiveRain, niwr_mm]).reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: aoi,
  scale: 500,
  maxPixels: 1e10
});

print('Cropland Mean Stats (mm):', cropStats);

// 3. Cropland Area (sq. meters) & Total Irrigation Water Volume (MCM)
var cropArea_m2 = croplandMask.selfMask().multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: 100,
  maxPixels: 1e10
});

// Volume (m3) = NIWR (mm * 0.001 m/mm) * Pixel Area (m2)
var niwrVolume_m3 = niwr_mm.multiply(0.001).multiply(ee.Image.pixelArea());
var totalVolume_MCM = niwrVolume_m3.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: 100,
  maxPixels: 1e10
});

print('Total Cropland Area (m2):', cropArea_m2);
print('Total Net Irrigation Demand (MCM):', totalVolume_MCM);

// Visualize Cropland NIWR (mm)
Map.addLayer(
  niwr_mm,
  {min: 0, max: 150, palette: ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494']},
  'Cropland NIWR (mm)'
);


// #########################################################################
// PART 3: Exact MCM and Drive export
// #########################################################################


// ==========================================
// Exact MCM & Drive Export
// ==========================================

var totalVolume_MCM_exact = niwrVolume_m3.divide(1e6).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: 100,
  maxPixels: 1e10
});

print('Total Net Irrigation Demand (Exact MCM):', totalVolume_MCM_exact);

// Export Cropland NIWR (mm) to Google Drive
Export.image.toDrive({
  image: niwr_mm.unmask(-9999).toFloat(),
  description: 'irrigation-demand-estimation',
  folder: 'irrigation-demand-estimation',
  region: aoi.geometry(),
  scale: 100,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});
