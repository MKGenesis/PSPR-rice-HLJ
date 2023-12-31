/*****************************************************************************************************
 * The GEE JavaScript code for checking the paddy rice maps in Heilongjiang Province from 1990 to 2020
 * If you find this code helpful, please cite: Zhang C.K. et al., Phenology-assisted Supervised Paddy Rice 
 * Mapping with the Landsat Imagery on Google Earth Engine: Experiments in Heilongjiang Province of 
 * China from 1990 to 2020, Computers and Electronics in Agriculture, 2023.
 * Note that the shapefiles used in this code can be replaced by readers' own files
******************************************************************************************************/
var HLJGrid4 = ee.FeatureCollection("users/studyroomGEE/A_Paper/PSPR/HLJGrid_4");
var HLJProvince = ee.FeatureCollection("users/studyroomGEE/A_Paper/PSPR/HLJProvince");
var roi2 = HLJProvince;
var roi = HLJGrid4;
Map.addLayer(roi2,{'color':'grey'},'HLJ');
Map.centerObject(roi,5);

var HLJRice1990 = ee.Image("users/chengkangmk/A_PSPR/v4/HLJRice_L578_Year_1990v4");
var HLJRice1995 = ee.Image("users/chengkangmk/A_PSPR/v4/HLJRice_L578_Year_1995v4");
var HLJRice2000 = ee.Image("users/chengkangmk/A_PSPR/v4/HLJRice_L578_Year_2000v4");
var HLJRice2005 = ee.Image("users/chengkangmk/A_PSPR/v4/HLJRice_L578_Year_2005v4");
var HLJRice2010 = ee.Image("users/chengkangmk/A_PSPR/v4/HLJRice_L578_Year_2010v4");
var HLJRice2015 = ee.Image("users/chengkangmk/A_PSPR/v4/HLJRice_L578_Year_2015v4");
var HLJRice2020 = ee.Image("users/chengkangmk/A_PSPR/v4/HLJRice_L578_Year_2020v4");

Map.addLayer(HLJRice1990.selfMask(),{'palette':'red'},'HLJRice1990');
Map.addLayer(HLJRice1995.selfMask(),{'palette':'green'},'HLJRice1995');
Map.addLayer(HLJRice2000.selfMask(),{'palette':'blue'},'HLJRice2000');
Map.addLayer(HLJRice2005.selfMask(),{'palette':'yellow'},'HLJRice2005');
Map.addLayer(HLJRice2010.selfMask(),{'palette':'orange'},'HLJRice2010');
Map.addLayer(HLJRice2015.selfMask(),{'palette':'purple'},'HLJRice2015');
Map.addLayer(HLJRice2020.selfMask(),{'palette':'pink'},'HLJRice2020');
