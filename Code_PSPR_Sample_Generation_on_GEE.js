/*****************************************************************************************************
 * the GEE JavaScript code for sample generation used in the PSPR method
 * If you find this code helpful, please cite: Zhang C.K. et al., Phenology-assisted Supervised Paddy Rice 
 * Mapping with the Landsat Imagery on Google Earth Engine: Experiments in Heilongjiang Province of 
 * China from 1990 to 2020, Computers and Electronics in Agriculture, 2023.
 * Note that the shapefiles used in this code can be replaced by readers' own files
******************************************************************************************************/

var HLJGrid4 = ee.FeatureCollection("users/studyroomGEE/A_Paper/PSPR/HLJGrid_4");
var roi = HLJGrid4;
Map.addLayer(roi,{'color':'grey'},'roi',false);
Map.centerObject(roi,5);

var GridTest = GridRegion(HLJGrid4.geometry(),6,6).filterBounds(roi);
print("GridTest size:",GridTest.size());
var color = {'color':'0000FF','fillColor':'FF000000'};
Map.addLayer(GridTest.style(color),null,'GridTest');

/***************************************************************************
 * cropland mask
***************************************************************************/
var CAS_LULC_2018 = ee.Image("users/chengkangmk/Global-LULC-China/LULC_CAS/CAS_LULC_30m_2018");
var cropland = CAS_LULC_2018.eq(11).or(CAS_LULC_2018.eq(12)).clip(roi);
Map.addLayer(cropland.randomVisualizer(),null,'cropland',false);

/**************************************************************************
Define User-specific functions 
**************************************************************************/
// remove cloud for Landsat 4, 5 and 7
function rmL457Cloud(image) {
  var qa = image.select('pixel_qa');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  var mask3 = image.select("B1").gt(2000);
  return image.updateMask(cloud.not()).updateMask(mask2).updateMask(mask3.not())
              .toDouble().divide(1e4)
              .copyProperties(image)
              .copyProperties(image, ["system:time_start",'system:time_end']);
}

// reomove cloud for Landsat-8
function rmL8Cloud(image) { 
  var cloudShadowBitMask = (1 << 3); 
  var cloudsBitMask = (1 << 5); 
  var qa = image.select('pixel_qa'); 
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0) 
                 .and(qa.bitwiseAnd(cloudsBitMask).eq(0)); 
  var mask2 = image.select("B2").gt(2000);                 
  return image.updateMask(mask).updateMask(mask2.not()).toDouble().divide(1e4)
              .copyProperties(image)
              .copyProperties(image, ["system:time_start",'system:time_end']);
}

// remove cloud from Sentinel-2
function rmS2cloud(image) {
  var qa = image.select('QA60');
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  var mask2 = image.select("B2").lte(2000);
  return image.updateMask(mask).updateMask(mask2).toDouble().divide(1e4)
              .copyProperties(image)
              .copyProperties(image, ["system:time_start", "system:time_end"]);
}

// compute and add the indices into the images
function addIndex(image){
  // original bands
  var blue = image.select('blue'); 
  var red = image.select('red');
  var green  = image.select('green');
  var nir = image.select('nir');
  var swir1 = image.select('swir1');
  var ndvi = image.normalizedDifference(["nir", "red"]).rename("NDVI").toDouble();
  var lswi = image.normalizedDifference(["nir", "swir1"]).rename("LSWI").toDouble();
  var lswi2ndvi = lswi.subtract(ndvi).rename("LSWI2NDVI").toDouble();
  var evi = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': nir,
      'RED': red,
      'BLUE':blue
  }).rename("EVI");
  return image.addBands(ndvi).addBands(lswi).addBands(lswi2ndvi).addBands(evi);
}

// Assign a common name to the sensor-specific bands.
var LC8_BANDS = ['B2',   'B3',    'B4',  'B5',  'B6',    'B7']; //Landsat 8
var LC7_BANDS = ['B1',   'B2',    'B3',  'B4',  'B5',    'B7']; //Landsat 7
var LC5_BANDS = ['B1',   'B2',    'B3',  'B4',  'B5',    'B7']; //Llandsat 5
var S2_BANDS  = ['B2',   'B3',    'B4',  'B8',  'B11',   'B12']; // Sentinel-2
var STD_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']; // 

// define year variable
var year = '2015';
var th_lswi2NDVI = 0;
var pointNum = 1000;

//dataset input
// landsat 8
var l8Col = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
           .map(rmL8Cloud)
           .filterBounds(roi)
           .filterDate(year+'-04-01',year+'-11-01')
            // .filter(ee.Filter.lte('CLOUD_COVER',10))
            .select(LC8_BANDS, STD_NAMES); 
// landsat 7 
var l7Col = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
           .map(rmL457Cloud)
           .filterBounds(roi)
           .filterDate(year+'-04-01',year+'-11-01')
           .select(LC7_BANDS, STD_NAMES); 
// landsat 5  
var l5Col = ee.ImageCollection('LANDSAT/LT05/C01/T1_SR')
           .map(rmL457Cloud)
           .filterBounds(roi)
           .filterDate(year+'-04-01',year+'-11-01')
           .select(LC5_BANDS, STD_NAMES); 

var L578COl = ee.ImageCollection(l8Col.merge(l7Col).merge(l5Col))
                .sort("system:time_start")
                .map(addIndex);
print("L578COl",L578COl);

// define the time window for transplanting paddy rice
// please note that water class is extracted in this way 
// since it satisfies that LSWI is greater thant NDVI
var imgCol_flood = L578COl.filterDate(year+'-05-01',year+'-06-30') 
                          .filterBounds(roi);

/**************************************************************************
 * LSWI based rice mapping
**************************************************************************/
// define the palette for rice cnadidates
var palette1 = {min: 0, max: 1.0, palette: ['000000', '00FF00']};

// paddy rice candidates derived from LSWI-NDVI
// the name is named as "rice_0_lswi"
// as 0 indicates that rice is preliminarily obtained using the LSWI  
var rice_0_lswi =  imgCol_flood.select("LSWI2NDVI").map(function(image){
    return image.select("LSWI2NDVI").gt(th_lswi2NDVI);  
});
// use the max to obtain the max extent of rice samples 
// Here, we extracted rice points as long as there is one pixel during the flood stage meets the flood condition
var rice_0_lswi = rice_0_lswi.reduce(ee.Reducer.max()).clip(roi).updateMask(cropland);
Map.addLayer(rice_0_lswi, palette1, "rice_0_lswi candidates",false);

// define the time window for paddy rice growth stages
// Here, the growth stage starts when rice seedling have been transplated into paddy fileds
var imgCol_growth =  L578COl.filterDate(year+'-07-01',year+'-10-31')
                            .filterBounds(roi);

var PalettePanel = {bands:["swir1","nir","red"],min:0,max:0.3};
// Use the qualityMosaic to mosaic the image for two phases
var imgCol_flood_qmosaic = imgCol_flood.qualityMosaic('LSWI2NDVI').clip(roi);
Map.addLayer(imgCol_flood_qmosaic, PalettePanel, 'imgCol_flood_qmosaic');

var imgCol_growth_qmosaic = imgCol_growth.qualityMosaic('NDVI').clip(roi);
Map.addLayer(imgCol_growth_qmosaic, PalettePanel, 'imgCol_growth_qmosaic', false);

var rice_0_map = rice_0_lswi.unmask(0).clip(roi);
Map.addLayer(rice_0_map.selfMask(), {"palette":'#FF0000'}, "rice_0_map",false);

/**************************************************************************
 * CCVS based rice mapping
**************************************************************************/ 
var visParam = {
 min: -0.2,
 max: 0.8,
 palette: 'FFFFFF, CE7E45, DF923D, F1B555, FCD163, 99B718, 74A901, 66A000, 529400,' +
   '3E8601, 207401, 056201, 004C00, 023B01, 012E01, 011D01, 011301'
};

// Use the LSWI_max, LSWI_min, NDVI_max, NDVI_min to derive the RCLN,
// where RCLN implies Ratio of Change amplitude of LSWI to NDVI
var RCLE = imgCol_growth_qmosaic.select("LSWI").subtract(imgCol_flood_qmosaic.select('LSWI')).abs()
           .divide(imgCol_growth_qmosaic.select("EVI").subtract(imgCol_flood_qmosaic.select('EVI')).abs())
           .rename("RCLE");
Map.addLayer(RCLE, visParam,'RCLE', false);

var LSIW_min = imgCol_flood.select('LSWI').min().gt(0.1)
                           .clip(roi).updateMask(cropland);
Map.addLayer(LSIW_min.selfMask(), {"palette":'#FF0000'}, "LSIW_min",false);

var RCLE_rice = RCLE.updateMask(RCLE.gt(0))
                    .updateMask(LSIW_min)
                    .lt(0.6)
                    .unmask(0)
                    .clip(roi); 
Map.addLayer(RCLE_rice.selfMask(), {palette: 'green'}, "CCVS_rice",false);

var riceCombine = RCLE_rice.add(rice_0_map);

var stableMask = riceCombine.eq(0).or(riceCombine.eq(2));
var LULU_mutual = riceCombine.updateMask(stableMask)
                             .where(riceCombine.eq(2),1)
                             .rename("RiceMap").updateMask(cropland);
Map.addLayer(LULU_mutual,palette1,'LULU_mutual',false);

var riceMapCol = GridTest.toList(GridTest.size()).map(function(ROIFea){
  // set study area
  var roi = ee.FeatureCollection([ROIFea]);
  var ricemap = riceTrainData(roi);
  return ee.FeatureCollection(ricemap);
});
var samplePoint = ee.FeatureCollection(riceMapCol).flatten();
Map.addLayer(samplePoint,null,'samplePoint',false);

// check the generated sample data
print("samplePoint:",samplePoint.limit(10));

var ricePoint_1 = samplePoint.filter(ee.Filter.eq('landcover',1));
Map.addLayer(ricePoint_1,{'color':'#FFA500'},'ricePoint_1');
print("ricePoint_1 size",ricePoint_1.size());

var NonricePoint_1 = samplePoint.filter(ee.Filter.eq('landcover',0));
print("NonricePoint_1 size",NonricePoint_1.size());

Export.table.toAsset(samplePoint,"PSPRSampleGeneration"+year,"PSPRSampleGeneration"+year)

function riceTrainData(roiRegion){
  
  var roi = roiRegion;
  var LULU_mutual2 = LULU_mutual.clip(roi);
  /**********************************************************************
  *Define neighboor function
  * and generate the samples
  ***********************************************************************/
  function neighFun(img,kernalRadius,roi){
    var kernel = ee.Kernel.square(kernalRadius,'pixels',false);
    var kernelArea = (ee.Number(kernalRadius).multiply(2).add(1)).pow(2);
    var imgNeibor = ee.Image(img).convolve(kernel)
                      .eq(kernelArea)
                      .set("system:footprint",roi.geometry());
    return img.updateMask(imgNeibor);
  }
  var samplePoint = ee.List([]);
  for(var i=0;i<=1;i++){
    var class_Num = i;
    var class_i_mask = neighFun(LULU_mutual2.eq(class_Num),1,roi);
    var class_i = LULU_mutual2.updateMask(class_i_mask);
    samplePoint = samplePoint.add(class_i);
  }
  var samplePoint = ee.ImageCollection(samplePoint).mosaic().rename("landcover").updateMask(cropland);
  
  var pointSample =  samplePoint.stratifiedSample({
      numPoints:pointNum,
      classBand:"landcover",
      region:roi.geometry(),
      scale:30,
      seed:0,
      // tileScale:8,
      geometries:true
    });
    return pointSample;
}

/**************************************************************************
generate the grid
***************************************************************************/
function generateGrid(xmin, ymin, xmax, ymax, dx, dy) {

  var xx = ee.List.sequence(xmin, ee.Number(xmax).subtract(0.0001), dx);
  var yy = ee.List.sequence(ymin, ee.Number(ymax).subtract(0.0001), dy);
  
  var cells = xx.map(function(x) {
    return yy.map(function(y) {
      var x1 = ee.Number(x);
      var x2 = ee.Number(x).add(ee.Number(dx));
      var y1 = ee.Number(y);
      var y2 = ee.Number(y).add(ee.Number(dy));
      var coords = ee.List([x1, y1, x2, y2]);
      var rect = ee.Algorithms.GeometryConstructors.Rectangle(coords); 
      return ee.Feature(rect);
    });
  }).flatten(); 

  return ee.FeatureCollection(cells);
}

function GridRegion(roiRegion,xBlock,yBlock){
  //roiRegion: area of interest in the form of geometry
  // compute the coordinates
  var bounds = roiRegion.bounds();
  var coords = ee.List(bounds.coordinates().get(0));
  var xmin = ee.List(coords.get(0)).get(0);
  var ymin = ee.List(coords.get(0)).get(1);
  var xmax = ee.List(coords.get(2)).get(0);
  var ymax = ee.List(coords.get(2)).get(1);
  
  var dx = (ee.Number(xmax).subtract(xmin)).divide(xBlock); //4
  var dy = (ee.Number(ymax).subtract(ymin)).divide(yBlock);
  
  var grid = generateGrid(xmin, ymin, xmax, ymax, dx, dy);  
  grid = grid.filterBounds(roiRegion); 
  
  return grid;
}
