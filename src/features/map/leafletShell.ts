import indiaCountryGeoJson from './india_country_simplified.json';

/** Leaflet shell for the Maps tab. Receives applyMap(state) from React Native. */

export function leafletHtml(markerColor: string): string {
  const geoJsonData = JSON.stringify(indiaCountryGeoJson);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height:100%; width:100%; margin:0; padding:0; background:#0b1220; }
    .leaflet-control-attribution { font-size:9px; }
    .custom-marker {
      width:28px; height:28px; border-radius:50% 50% 50% 0;
      background:${markerColor}; border:3px solid #fff;
      transform:rotate(-45deg); box-shadow:0 2px 8px rgba(0,0,0,.3);
    }
    .custom-marker::after {
      content:''; width:8px; height:8px; border-radius:50%;
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%); background:#fff;
    }
  </style>
</head>
<body>
<div id="map"></div>
<canvas id="windCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:550;"></canvas>
<script>
var GIBS = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
var STOPS = {
  temp:[[-5,"#2c3e8c"],[10,"#3d8ec9"],[20,"#5ec4b6"],[26,"#f0e27a"],[32,"#e67e22"],[40,"#c0392b"],[48,"#6d1a4a"]],
  precip:[[0,"rgba(0,0,0,0)"],[0.2,"rgba(80,180,255,0.25)"],[1,"rgba(40,120,220,0.55)"],[4,"rgba(80,40,180,0.7)"],[12,"rgba(220,40,140,0.85)"],[30,"rgba(180,20,40,0.95)"]],
  wind:[[0,"#1b4f72"],[8,"#1a7a6d"],[18,"#7dbe3c"],[35,"#f4d03f"],[55,"#e67e22"],[80,"#922b21"]],
  pressure:[[990,"#6c3483"],[1000,"#2471a3"],[1008,"#f4f6f7"],[1016,"#d68910"],[1028,"#922b21"]],
  clouds:[[0,"rgba(255,255,255,0)"],[30,"rgba(220,230,240,0.25)"],[60,"rgba(200,210,220,0.5)"],[100,"rgba(180,190,200,0.8)"]],
  humidity:[[10,"#8d6e63"],[40,"#cddc39"],[70,"#26a69a"],[95,"#1565c0"]],
  cape:[[0,"rgba(0,0,0,0)"],[200,"#f9e79f"],[800,"#e67e22"],[2000,"#c0392b"],[3500,"#6c3483"]]
};
var FIELD = {wind:"wind_kmh",temp:"temp_c",precip:"precip_mm",pressure:"pressure_hpa",clouds:"cloud_pct",humidity:"rh_pct",cape:"cape"};
var CELL_COLOR = {cloudburst:"#c0392b",downburst:"#e67e22",storm:"#8e44ad",cloud:"#2980b9",lightning:"#f1c40f",fire:"#ea580c",landslide:"#92400e"};
function parseColor(c){
  if(c.indexOf("rgba")===0){var m=c.match(/[\\d.]+/g)||[];return [+m[0]||0,+m[1]||0,+m[2]||0,(m[3]==null?1:+m[3])*255];}
  var h=c.replace("#",""); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),220];
}
function colorAt(layer,v){
  if(v==null||isNaN(v)) return [0,0,0,0];
  var stops=STOPS[layer]||STOPS.temp;
  if(v<=stops[0][0]) return parseColor(stops[0][1]);
  if(v>=stops[stops.length-1][0]) return parseColor(stops[stops.length-1][1]);
  for(var i=1;i<stops.length;i++){
    var aV=stops[i-1][0], aC=stops[i-1][1], bV=stops[i][0], bC=stops[i][1];
    if(v<=bV){
      var t=(v-aV)/(bV-aV||1);
      var A=parseColor(aC), B=parseColor(bC);
      return [A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t,A[3]+(B[3]-A[3])*t];
    }
  }
  return parseColor(stops[stops.length-1][1]);
}
function sampleGrid(grid,lat,lon,key){
  var nx=grid.nx, ny=grid.ny, lats=grid.lats, lons=grid.lons, arr=grid.fields[key];
  if(!arr||ny<2||nx<2) return null;
  var x=lon; if(x>180)x-=360; if(x<-180)x+=360;
  if(lat<lats[0]||lat>lats[ny-1]||x<lons[0]||x>lons[nx-1]) return null;
  var dy=lats[1]-lats[0], dx=lons[1]-lons[0];
  var fi=(lat-lats[0])/dy, fj=(x-lons[0])/dx;
  var i0=Math.max(0,Math.min(ny-2,Math.floor(fi)));
  var j0=Math.max(0,Math.min(nx-2,Math.floor(fj)));
  var ti=fi-i0, tj=fj-j0;
  function at(i,j){ var v=arr[i*nx+j]; return v==null?null:+v; }
  var q11=at(i0,j0), q21=at(i0,j0+1), q12=at(i0+1,j0), q22=at(i0+1,j0+1);
  if(q11==null||q21==null||q12==null||q22==null) return q11??q21??q12??q22;
  var a=q11*(1-tj)+q21*tj, b=q12*(1-tj)+q22*tj;
  return a*(1-ti)+b*ti;
}
function paintGrid(grid, layer){
  var key=FIELD[layer]; if(!key||!grid) return null;
  var w=480, h=220;
  var c=document.createElement("canvas"); c.width=w; c.height=h;
  var ctx=c.getContext("2d"); if(!ctx) return null;
  var img=ctx.createImageData(w,h), data=img.data;
  var south=grid.lats[0], north=grid.lats[grid.ny-1], west=grid.lons[0], east=grid.lons[grid.nx-1];
  for(var y=0;y<h;y++){
    var lat=north-((north-south)*y)/(h-1);
    for(var x=0;x<w;x++){
      var lon=west+((east-west)*x)/(w-1);
      var col=colorAt(layer, sampleGrid(grid,lat,lon,key));
      var i=(y*w+x)*4;
      data[i]=col[0]; data[i+1]=col[1]; data[i+2]=col[2]; data[i+3]=col[3];
    }
  }
  ctx.putImageData(img,0,0);
  return {url:c.toDataURL("image/png"), bounds:[[south,west],[north,east]]};
}
function glyph(kind, phase){
  if(kind==="lightning") return "⚡";
  if(kind==="fire") return "🔥";
  if(kind==="landslide") return "⛰";
  if(kind==="cloudburst") return "💧";
  if(kind==="downburst") return "↘";
  if(phase==="predicted") return "✦";
  return "☁";
}
function eventIcon(kind, phase){
  var color=CELL_COLOR[kind]||"#64748b";
  var live=phase==="live"||phase==="active";
  var size=live?26:20;
  var html='<div style="width:'+size+'px;height:'+size+'px;border-radius:9999px;background:#0f172a;border:2px solid '+color+';display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 8px '+color+'99">'+glyph(kind,phase)+'</div>';
  return L.divIcon({className:"", html:html, iconSize:[size,size], iconAnchor:[size/2,size/2]});
}

var lastFit=0;
var map=L.map("map",{zoomControl:false}).setView([22.07,88.07],6);
var pinIcon=L.divIcon({className:"",html:'<div class="custom-marker"></div>',iconSize:[28,28],iconAnchor:[14,28]});
var pin=L.marker([22.07,88.07],{icon:pinIcon}).addTo(map);
var baseLayer=null, radarLayer=null, satLayer=null, fieldLayer=null;
var wmsLayers={};
var hazardGroup=L.layerGroup().addTo(map);

/* ── India Official Survey of India Boundary (including PoK, CoK, Arunachal, Islands) from GeoJSON ── */
var indiaGeoData = ${geoJsonData};
var boundaryStyle = {
  color: "#38BDF8",
  weight: 2.2,
  opacity: 0.95,
  fillColor: "#0284C7",
  fillOpacity: 0.04,
  lineCap: "round",
  lineJoin: "round"
};
var glowStyle = {
  color: "#00E5FF",
  weight: 4.5,
  opacity: 0.35,
  fill: false,
  lineCap: "round",
  lineJoin: "round"
};

if (indiaGeoData) {
  try {
    L.geoJSON(indiaGeoData, { style: glowStyle, interactive: false }).addTo(map);
    L.geoJSON(indiaGeoData, { style: boundaryStyle, interactive: false }).addTo(map);
  } catch(e) { console.log(e); }
}

/* ── Wind Streamlines Particle Engine ── */
var windCanvas=document.getElementById("windCanvas");
if(windCanvas && map.getContainer()){
  map.getContainer().appendChild(windCanvas);
}
var windCtx=windCanvas?windCanvas.getContext("2d"):null;
var windAnimId=null;
var windParticles=[];
var currentWindGrid=null;
var PARTICLE_COUNT=1300;

function resizeWindCanvas(){
  if(!windCanvas||!map) return;
  var rect=map.getContainer().getBoundingClientRect();
  var dpr=window.devicePixelRatio||1;
  windCanvas.width=rect.width*dpr;
  windCanvas.height=rect.height*dpr;
  if(windCtx){
    windCtx.setTransform(1, 0, 0, 1, 0, 0);
    windCtx.scale(dpr, dpr);
  }
}

function initWindParticle(b){
  if(!b) b=map.getBounds();
  var south=b.getSouth(), north=b.getNorth(), west=b.getWest(), east=b.getEast();
  return {
    lat: south + Math.random()*(north - south),
    lon: west + Math.random()*(east - west),
    age: Math.floor(Math.random()*45),
    maxAge: 45 + Math.floor(Math.random()*50)
  };
}

function startWindAnimation(grid){
  currentWindGrid=grid;
  if(!windCanvas||!windCtx||!grid||!grid.fields.wind_u||!grid.fields.wind_v) return;
  if(windAnimId){
    cancelAnimationFrame(windAnimId);
    windAnimId=null;
  }
  resizeWindCanvas();
  var b=map.getBounds();
  windParticles=[];
  for(var i=0;i<PARTICLE_COUNT;i++){
    windParticles.push(initWindParticle(b));
  }

  function step(){
    if(!currentWindGrid||!windCtx) return;
    var dpr=window.devicePixelRatio||1;
    var w=windCanvas.width/dpr;
    var h=windCanvas.height/dpr;

    windCtx.globalCompositeOperation="destination-out";
    windCtx.fillStyle="rgba(0, 0, 0, 0.085)";
    windCtx.fillRect(0, 0, w, h);
    windCtx.globalCompositeOperation="source-over";

    var b=map.getBounds();
    var south=b.getSouth(), north=b.getNorth(), west=b.getWest(), east=b.getEast();
    var zoom=map.getZoom();
    var dt=0.00008 * Math.pow(1.28, 8 - zoom);

    for(var i=0;i<windParticles.length;i++){
      var p=windParticles[i];
      if(p.age>=p.maxAge || p.lat<south || p.lat>north || p.lon<west || p.lon>east){
        windParticles[i]=initWindParticle(b);
        continue;
      }
      var u=sampleGrid(currentWindGrid, p.lat, p.lon, "wind_u");
      var v=sampleGrid(currentWindGrid, p.lat, p.lon, "wind_v");
      if(u==null||v==null){
        windParticles[i]=initWindParticle(b);
        continue;
      }
      var spd=Math.sqrt(u*u + v*v);
      var rad=p.lat*Math.PI/180;
      var cosLat=Math.cos(rad);
      if(cosLat<0.1) cosLat=0.1;

      var p0=map.latLngToContainerPoint([p.lat, p.lon]);
      var dLat=v*dt*48;
      var dLon=(u*dt*48)/cosLat;

      var nextLat=p.lat+dLat;
      var nextLon=p.lon+dLon;
      var p1=map.latLngToContainerPoint([nextLat, nextLon]);

      var alpha=Math.sin((p.age/p.maxAge)*Math.PI)*0.95;
      
      // High-visibility glowing palette directly on top of dark/colored weather grid
      var strokeColor="rgba(240, 249, 255, "+alpha+")";
      if(spd>18){
        strokeColor="rgba(254, 202, 202, "+alpha+")";
      }else if(spd>10){
        strokeColor="rgba(254, 240, 138, "+alpha+")";
      }else if(spd>4){
        strokeColor="rgba(167, 243, 208, "+alpha+")";
      }

      windCtx.beginPath();
      windCtx.moveTo(p0.x, p0.y);
      windCtx.lineTo(p1.x, p1.y);
      windCtx.strokeStyle=strokeColor;
      windCtx.lineWidth=spd>12?2.2:1.6;
      windCtx.lineCap="round";
      windCtx.stroke();

      p.lat=nextLat;
      p.lon=nextLon;
      p.age++;
    }
    windAnimId=requestAnimationFrame(step);
  }
  windAnimId=requestAnimationFrame(step);
}

function stopWindAnimation(){
  currentWindGrid=null;
  if(windAnimId){
    cancelAnimationFrame(windAnimId);
    windAnimId=null;
  }
  if(windCanvas&&windCtx){
    var dpr=window.devicePixelRatio||1;
    windCtx.clearRect(0, 0, windCanvas.width/dpr, windCanvas.height/dpr);
  }
}

map.on("movestart zoomstart", function(){
  if(currentWindGrid&&windCtx){
    var dpr=window.devicePixelRatio||1;
    windCtx.clearRect(0, 0, windCanvas.width/dpr, windCanvas.height/dpr);
  }
});
map.on("moveend zoomend resize", function(){
  if(currentWindGrid){
    resizeWindCanvas();
    var b=map.getBounds();
    for(var i=0;i<windParticles.length;i++){
      windParticles[i]=initWindParticle(b);
    }
  }
});

function setTile(url){
  if(baseLayer) map.removeLayer(baseLayer);
  baseLayer=L.tileLayer(url,{maxZoom:19, noWrap:true}).addTo(map);
}
function clearNamed(name, layer){
  if(layer){ map.removeLayer(layer); }
  return null;
}
window.applyMap=function(s){
  try{
    if(s.lat!=null && s.lon!=null){
      pin.setLatLng([s.lat,s.lon]);
      pin.bindPopup("<b>"+(s.label||"")+"</b>");
      if(s.recenter) map.setView([s.lat,s.lon], s.zoom||8);
    }
    if(s.basemapUrl) setTile(s.basemapUrl);
    var op=s.opacity==null?0.7:s.opacity;

    radarLayer=clearNamed("r", radarLayer);
    if(s.radarUrl) radarLayer=L.tileLayer(s.radarUrl,{opacity:op, maxZoom:18, pane:"overlayPane"}).addTo(map);

    satLayer=clearNamed("s", satLayer);
    if(s.satUrl) satLayer=L.tileLayer(s.satUrl,{opacity:op, maxZoom:18, pane:"overlayPane"}).addTo(map);

    fieldLayer=clearNamed("f", fieldLayer);
    if(s.grid && s.wxLayer && FIELD[s.wxLayer]){
      var painted=paintGrid(s.grid, s.wxLayer);
      if(painted) fieldLayer=L.imageOverlay(painted.url, painted.bounds, {opacity:op, zIndex:350}).addTo(map);
      if(s.wxLayer==="wind" && s.grid.fields.wind_u && s.grid.fields.wind_v){
        startWindAnimation(s.grid);
      } else {
        stopWindAnimation();
      }
    } else {
      stopWindAnimation();
    }

    Object.keys(wmsLayers).forEach(function(k){ map.removeLayer(wmsLayers[k]); });
    wmsLayers={};
    function addWms(id, url, layers, version){
      if(!url||!layers) return;
      wmsLayers[id]=L.tileLayer.wms(url,{
        layers:layers, format:"image/png", transparent:true, version:version||"1.1.1", opacity:op
      }).addTo(map);
    }
    var ov=s.overlays||{};
    if(ov.gibs_truecolor) addWms("tc", GIBS, "MODIS_Terra_CorrectedReflectance_TrueColor", "1.3.0");
    if(ov.gibs_ir) addWms("ir", GIBS, "Himawari_AHI_Band13_Clean_Infrared", "1.3.0");
    if(ov.gibs_imerg) addWms("im", GIBS, "IMERG_Precipitation_Rate", "1.3.0");
    if(ov.bhuvan_geomorph && ov.wmsUrl) addWms("bw", ov.wmsUrl, ov.bhuvanWb||"geomorphology");
    if(ov.bhuvan_geomorph_in && ov.wmsUrl) addWms("bi", ov.wmsUrl, ov.bhuvanIn||"geomorphology");

    hazardGroup.clearLayers();
    var hl=s.highlights||[];
    function addPt(p, kind, phase){
      if(p==null||p.lat==null||p.lon==null) return;
      if(!isFinite(+p.lat)||!isFinite(+p.lon)) return;
      var k=kind||p.kind||"storm";
      var mk=L.marker([+p.lat,+p.lon],{icon:eventIcon(k, phase||p.phase||"live")});
      var title=(p.place||p.label||k)+" · "+(phase||p.phase||"live");
      mk.bindPopup(title);
      hazardGroup.addLayer(mk);
    }
    var storm=s.storm||{};
    function want(id){ return hl.indexOf(id)>=0; }
    if(want("lightning")) (storm.cells||[]).concat(storm.incidents||[]).forEach(function(c){
      if((c.kind||"")==="lightning" && (c.phase||"live")==="live") addPt(c,"lightning","live");
    });
    if(want("storm")||want("cloudburst")||want("downburst")||want("cloud")) (storm.cells||[]).concat(storm.incidents||[]).forEach(function(c){
      var k=c.kind||"storm";
      if(k==="lightning") return;
      if((c.phase||"live")!=="live" && c.phase && c.phase!=="active") return;
      if(want(k)||(k==="storm"&&want("storm"))) addPt(c,k,"live");
    });
    if(want("pred_lightning")) (storm.predicted||[]).forEach(function(c){ addPt(c,"lightning","predicted"); });
    if(want("pred_storm")) (storm.predicted_storms||[]).forEach(function(c){ addPt(c,c.kind||"storm","predicted"); });
    if(want("past_lightning")) (storm.past_strokes||storm.strokes||[]).forEach(function(c){ addPt(c,"lightning","past"); });
    if(want("past_storm")) (storm.past_cells||[]).forEach(function(c){ addPt(c,c.kind||"storm","past"); });
    if(want("fire")) (storm.fires||[]).forEach(function(c){ addPt(c,"fire","live"); });
    if(want("landslide")) (storm.landslides||[]).forEach(function(c){ addPt(c,"landslide","live"); });
    if(s.fit && s.fit!==lastFit && hazardGroup.getLayers().length){
      lastFit=s.fit;
      var b=hazardGroup.getBounds();
      if(b.isValid()) map.fitBounds(b,{padding:[28,28], maxZoom:9});
    }
  }catch(e){ console.log(String(e)); }
};
setTile("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}");
</script>
</body>
</html>`;
}
