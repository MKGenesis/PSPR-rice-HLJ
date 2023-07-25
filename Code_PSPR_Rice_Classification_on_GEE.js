var HLJGrid4 = ee.FeatureCollection("users/studyroomGEE/A_Paper/PSPR/HLJGrid_4");
var HLJProvince = ee.FeatureCollection("users/studyroomGEE/A_Paper/PSPR/HLJProvince");
var roi2 = HLJProvince;
var roi = HLJGrid4;
Map.addLayer(roi2,{'color':'grey'},'HLJ');
Map.centerObject(roi,7);

// define year variable
var year = 2020;

var trainSample = ee.FeatureCollection('users/chengkangmk/A_PSPR/PSPRSampleGeneration/PSPRSampleGeneration'+year);
var trainSample = trainSample.randomColumn('random').limit(5000,'random');
/***************************************************************************
 * cropland mask
***************************************************************************/
var CAS_LULC_2018 = ee.Image("users/chengkangmk/Global-LULC-China/LULC_CAS/CAS_LULC_30m_2018");
var cropland = CAS_LULC_2018.eq(11).or(CAS_LULC_2018.eq(12)).clip(roi);
Map.addLayer(cropland.randomVisualizer(),null,'cropland',false); 

// Assign a common name to the sensor-specific bands.
var LC8_BANDS = ['B2',   'B3',    'B4',  'B5',  'B6',    'B7']; //Landsat 8
var LC7_BANDS = ['B1',   'B2',    'B3',  'B4',  'B5',    'B7']; //Landsat 7
var LC5_BANDS = ['B1',   'B2',    'B3',  'B4',  'B5',    'B7']; //Llandsat 5
var STD_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];

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

//dataset input
// landsat 8
var l8Col = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
           .map(rmL8Cloud)
           .filterBounds(roi)
           .filter(ee.Filter.calendarRange(year,year,'year'))
           .filter(ee.Filter.calendarRange(5,10,'month'))
            .select(LC8_BANDS, STD_NAMES); 
// landsat 7 
var l7Col = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
           .map(rmL457Cloud)
           .filterBounds(roi)
           .filter(ee.Filter.calendarRange(year,year,'year'))
           .filter(ee.Filter.calendarRange(5,10,'month'))
           .select(LC7_BANDS, STD_NAMES); 
// landsat 5  
var l5Col = ee.ImageCollection('LANDSAT/LT05/C01/T1_SR')
           .map(rmL457Cloud)
           .filterBounds(roi)
           .filter(ee.Filter.calendarRange(year,year,'year'))
           .filter(ee.Filter.calendarRange(5,10,'month'))
           .select(LC5_BANDS, STD_NAMES); 

var L578COl = ee.ImageCollection(l5Col.merge(l7Col).merge(l8Col)) //.merge(l7)
                .sort("system:time_start");

var riceMapCol = roi.toList(roi.size()).map(function(ROIFea){
  // set study area
  var roi = ee.FeatureCollection([ROIFea]);
  var ricemap = riceMap(roi);
  return ee.Image(ricemap);
});
print("riceMapCol",riceMapCol);
var riceResult = ee.ImageCollection.fromImages(riceMapCol).mosaic();
var riceMap = riceResult.gt(50).clip(roi2).rename("RiceMap");
// var riceMap = riceMap.where(cropland,0);
var riceMap = riceMap.updateMask(cropland);
Map.addLayer(riceMap.selfMask(), {'palette':'blue'}, 'riceMap');


/**************************************************************************
Export Results
**************************************************************************/
Export.image.toDrive({
  image:riceMap.unmask(0).clip(roi2).byte(),
  folder:'A_PSPR',
  description: "HLJRice_L578_Year_"+year+'v4',
  region: roi2.geometry(),
  scale: 30,
  maxPixels: 1e13,
  crs:'EPSG:32651',
});


function riceMap(roiRegion){
  
  var roi = roiRegion;
  
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
    return image.updateMask(cloud.not()).updateMask(mask2).updateMask(mask3.not()).toDouble().divide(1e4)
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

  // compute and add the indices into the images
  function addIndex(image){
    // original bands
    var blue = image.select('blue'); 
    var red = image.select('red');
    var green  = image.select('green');
    var nir = image.select('nir');
    var swir1 = image.select('swir1');
    // derived features
    var ndvi = image.normalizedDifference(["nir", "red"]).rename("NDVI").toDouble();
    var lswi = image.normalizedDifference(["nir", "swir1"]).rename("LSWI").toDouble();
    var bsi = ((swir1.add(red)).subtract(nir).subtract(blue))
              .divide(swir1.add(red).add(nir).add(blue)).rename("BSI");
    var gcvi = (nir.divide(red)).subtract(1).rename("GCVI");
    var psri = (red.subtract(green)).divide(nir).rename('PSRI').toDouble();
    var ndti = image.normalizedDifference(["swir1", "swir2"]).rename("NDTI").toDouble();
    var ndsvi = image.normalizedDifference(["swir1", "red"]).rename("NDSVI").toDouble();
    var evi = image.expression(
      '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
        'NIR': nir,
        'RED': red,
        'BLUE':blue
    }).rename("EVI");
    return image.addBands(ndvi).addBands(evi).addBands(lswi).addBands(bsi)
                .addBands(gcvi).addBands(psri).addBands(ndti).addBands(ndsvi); 
  }
  
  //dataset input
  // landsat 8
  var l8Col = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
             .map(rmL8Cloud)
             .filterBounds(roi)
             .filterDate(year+'-04-01',year+'-11-01')
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
            
  //l8Col.merge(l7Col).merge(l5Col).merge(S2Col)
  // .merge(l7Col).merge(l8Col)
  var L578COl = ee.ImageCollection(l7Col.merge(l5Col).merge(l8Col)) //.merge(l7)
                  .sort("system:time_start")
                  .map(addIndex);
  
  var ricePoint_1 = trainSample.filter(ee.Filter.eq('landcover',1)).filterBounds(roi);
  var NonricePoint_1 = trainSample.filter(ee.Filter.eq('landcover',0)).filterBounds(roi);
  
  /**************************************************************************
  Generate monthly composite
  **************************************************************************/  
  var imageCol = ee.List.sequence(0, 1*5).map(function(n) {
    var start = ee.Date(year+'-05-01').advance(n, 'month');
    var end = start.advance(1, 'month');
    return L578COl.filterDate(start, end).mean().clip(roi);
  }).flatten();
  var sCol = imageCol;
  imageCol = null;
  
  /***************************************************************************
   * Extract neighboring samples
  ***************************************************************************/
  // define the neighbor radius and set to 5 in this case
  var neighbor_radius = 1;
  var neighbor_diameter = 2 * neighbor_radius + 1;
  var neighbor_window_area = Math.pow((2 * neighbor_radius + 1),2);
  // print("radius, diameter, windowArea", neighbor_radius, neighbor_diameter, neighbor_window_area);
  
   /***************************************************************************
   * use neighborhoodToArray to extract neighboring samples
  ***************************************************************************/
  function NeighborPixelCol(img, radius, feaCol ){
    var tmpImg = ee.Image(img).neighborhoodToArray(ee.Kernel.square(radius,'pixels',false));
    var tmpSamples = tmpImg.sample({
      region:ee.FeatureCollection(feaCol).geometry(),
      scale: 30, 
      tileScale:2, 
      geometries: true
    });
    return tmpSamples;
  }
  
  /*******************************************************************************************
  将单个像素邻域窗口内的每个像素值提取出来组成一个窗口大小的List，
  其中每个元素包含该像素的光谱值
  *******************************************************************************************/
  function NeighborSamples(feaCol,sBands,sBandsLength,neighbor_diameter,neighbor_window_area){
    // feaCol: the featureCollection, in which the neighbor pixels are extracted as the 2-D list (Array)
    // sBand: the image bands 
    // sBandsLength: the size of sBand
    // neighbor_diameter: the window size, 
    // neighbor_window_area: the window area, also the total pixels contained in the local window
    
    // var tmpFeaCol = ee.FeatureCollection(Col);
    // convert the images bands values into a list, stored in the "vec" item
    var tmpFeaCol = ee.FeatureCollection(feaCol).map(function(item){
      return ee.Feature(item.geometry(0.001), null).set('vec', item.toDictionary(sBands).values(sBands));
    });
    
    // define the array concat function
    function iter_function (num, list){
        var new_value = ee.Array(num).reshape([neighbor_diameter,neighbor_diameter,1]);
        return ee.Array.cat([ee.Array(list), new_value],2);
      }
      
    // 
    var tmpSampleCol = tmpFeaCol.map(function(fea){
      var tmpFea = ee.Feature(fea);
      var tmpList = ee.List(tmpFea.get('vec'));
      var first = ee.Array(tmpList.get(0)).reshape([neighbor_diameter,neighbor_diameter,1]);
      var concat_List = tmpList.slice(1).iterate(iter_function, first);
      var concat_List2 = ee.Array(concat_List).reshape([neighbor_window_area,sBandsLength]).toList();
      return ee.Feature(tmpFea.geometry(0.001), null).set('vec',concat_List2);
    });
    return tmpSampleCol;
  }
  
  // defien the probilitic RF models 
  var ls = ee.List([]);

  var riceClaCol = ee.List.sequence(0, 1*5).map(function(i){
    // get the image data
    var imageData = ee.Image(sCol.get(i));
    var s_bands = imageData.bandNames();
    var s_bandsLength = s_bands.length();
    
    /*********************************************************************************
    * Select the value that is closest to the mean values of 3×3 window
    **********************************************************************************/
    // print("ricePoint_1_1 first",ricePoint_1_1.first());
    var ricePoint_1_1 = NeighborPixelCol(imageData,neighbor_radius,ricePoint_1);
    var ricePoint_1_1_1 = NeighborSamples(ricePoint_1_1,s_bands,s_bandsLength,neighbor_diameter,neighbor_window_area);
    // ricePoint_1 = null;
    ricePoint_1_1 = null;
    // print("ricePoint_1_1 first",ricePoint_1_1.first());
    var ricePoint_1_1_1_1 = ricePoint_1_1_1.map(function(fea){
      var tmpFea = ee.Feature(fea);
      var tmpArray = ee.Array(tmpFea.get('vec'));
      var tmpMean = tmpArray.reduce(ee.Reducer.mean(),[0]).repeat(0,neighbor_window_area);
      var subMatrix = tmpArray.subtract(tmpMean);
      var subMatrixSquare = subMatrix.multiply(subMatrix);
      var subMatrixSquareSum = subMatrixSquare.reduce(ee.Reducer.sum(),[1]).toList().flatten();
      var subMatrixSquareMin = subMatrixSquareSum.reduce(ee.Reducer.min());
      var minIndex = subMatrixSquareSum.indexOf(subMatrixSquareMin);
      var keptValue = tmpArray.toList().get(ee.Number(minIndex).subtract(1));
      return ee.Feature(tmpFea.geometry(0.001), null).set(ee.Dictionary.fromLists(s_bands,keptValue))
                                                     .set('landcover',1);
      
    });
    ricePoint_1_1_1 = null;
  
    var NonricePoint_1_1 = NeighborPixelCol(imageData,neighbor_radius,NonricePoint_1);
    var NonricePoint_1_1_1 = NeighborSamples(NonricePoint_1_1,s_bands,s_bandsLength,neighbor_diameter,neighbor_window_area);
    // NonricePoint_1 = null;
    NonricePoint_1_1 = null;
    // print("NonricePoint_1_1_1 first",NonricePoint_1_1_1.first());
    var NonricePoint_1_1_1_1 = NonricePoint_1_1_1.map(function(fea){
      var tmpFea = ee.Feature(fea);
      var tmpArray = ee.Array(tmpFea.get('vec'));
      var tmpMean = tmpArray.reduce(ee.Reducer.mean(),[0]).repeat(0,neighbor_window_area);
      var subMatrix = tmpArray.subtract(tmpMean);
      var subMatrixSquare = subMatrix.multiply(subMatrix);
      var subMatrixSquareSum = subMatrixSquare.reduce(ee.Reducer.sum(),[1]).toList().flatten();
      var subMatrixSquareMin = subMatrixSquareSum.reduce(ee.Reducer.min());
      var minIndex = subMatrixSquareSum.indexOf(subMatrixSquareMin);
      var keptValue = tmpArray.toList().get(ee.Number(minIndex).subtract(1));
      return ee.Feature(tmpFea.geometry(0.001), null).set(ee.Dictionary.fromLists(s_bands,keptValue))
                                                     .set('landcover',0);
      
    });
    
    var trainingsample = ricePoint_1_1_1_1.merge(NonricePoint_1_1_1_1);
    NonricePoint_1_1_1 = null;
    ricePoint_1_1_1_1 = null;
    NonricePoint_1_1_1_1 = null;
  
    // -------------- Training classifier models -----------------
    var rfModel = ee.Classifier.smileRandomForest(200).setOutputMode('PROBABILITY')
                                    .train(trainingsample,'landcover',s_bands);
    
    var classified = imageData.classify(rfModel).rename('riceP');
    
    classified=classified.multiply(100);
    classified=classified.uint8();
    return classified;
  });
  
  var riceCol=ee.ImageCollection.fromImages(riceClaCol);
  var riceMean = riceCol.mean().rename("RiceMean");
  return riceMean;
}
