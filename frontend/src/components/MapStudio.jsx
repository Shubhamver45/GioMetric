import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import {
  Layers,
  Sparkles,
  Zap,
  Crosshair,
  Eye,
  EyeOff,
  Map as MapIcon,
  Compass,
  Trees,
  Building2,
  Palette,
  Sliders,
  RotateCcw,
  Navigation,
} from 'lucide-react';

export default function MapStudio({
  geoJsonData,
  selectedFeatureIndex,
  onSelectFeature,
  onInspectFeature,
  onLoadSample,
  unitSystem,
  mapRefProp,
  gisLayers,
  drawMode,
  onLiveMeasureUpdate,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const gisExtraLayerRef = useRef(null);
  const baseLayersRef = useRef({});
  const drawLayerRef = useRef(null);
  const drawPointsRef = useRef([]);

  const [activeBasemap, setActiveBasemap] = useState('light');
  const [coordinates, setCoordinates] = useState({ lat: 12.9716, lng: 77.5946 });
  const [layerOpacity, setLayerOpacity] = useState(0.45);
  const [colorMode, setColorMode] = useState('category'); // 'category' | 'choropleth'
  const [showTooltips, setShowTooltips] = useState(true);
  const [layerVisibility, setLayerVisibility] = useState({
    polygons: true,
    lines: true,
    points: true,
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 1. Esri Light Gray Canvas (100% Free, Zero API Keys, Ultra-Clean Light GIS Theme)
    const lightLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; World Light Gray Base',
        maxZoom: 16,
      }
    ).addTo(map);

    // 2. OpenStreetMap Streets (100% Free Open Data)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    // 3. Esri World Imagery (Satellite)
    const satLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; World Imagery',
        maxZoom: 19,
      }
    );

    // 4. Esri World Topographic
    const topoLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Topo Map',
        maxZoom: 19,
      }
    );

    baseLayersRef.current = {
      light: lightLayer,
      osm: osmLayer,
      satellite: satLayer,
      topo: topoLayer,
    };

    map.on('mousemove', (e) => {
      setCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    drawLayerRef.current = L.layerGroup().addTo(map);
    gisExtraLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    if (mapRefProp) {
      mapRefProp.current = map;
    }

    // Ensure Leaflet calculates dimensions correctly immediately & after flex/render animations
    const triggerInvalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    triggerInvalidate();
    const t1 = setTimeout(triggerInvalidate, 100);
    const t2 = setTimeout(triggerInvalidate, 400);
    const t3 = setTimeout(triggerInvalidate, 800);

    // ResizeObserver for dynamic layout shifts
    let resizeObserver = null;
    if (window.ResizeObserver && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        triggerInvalidate();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    window.addEventListener('resize', triggerInvalidate);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', triggerInvalidate);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch Basemap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(baseLayersRef.current).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });

    if (baseLayersRef.current[activeBasemap]) {
      baseLayersRef.current[activeBasemap].addTo(map);
    }
  }, [activeBasemap]);

  // Jump to Preset Coordinates
  const handleQuickJump = (lat, lng, zoom = 13) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.5 });
    }
  };

  // Handle Interactive Drawing & Measurement Clicks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    drawPointsRef.current = [];
    if (drawLayerRef.current) {
      drawLayerRef.current.clearLayers();
    }

    if (!drawMode) return;

    const handleMapClick = (e) => {
      const latlng = e.latlng;
      drawPointsRef.current.push([latlng.lng, latlng.lat]);
      const pts = drawPointsRef.current;

      L.circleMarker(latlng, {
        radius: 6,
        fillColor: '#4f46e5',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(drawLayerRef.current);

      if (drawMode === 'ruler') {
        if (pts.length >= 2) {
          const line = turf.lineString(pts);
          const lenKm = turf.length(line, { units: 'kilometers' });
          const lenM = lenKm * 1000;

          const latlngs = pts.map((p) => [p[1], p[0]]);
          L.polyline(latlngs, { color: '#4f46e5', weight: 4, dashArray: '4, 4' }).addTo(
            drawLayerRef.current
          );

          const formatted =
            unitSystem === 'metric'
              ? `${lenM >= 1000 ? `${(lenM / 1000).toFixed(3)} km` : `${lenM.toFixed(1)} m`}`
              : `${(lenKm * 0.621371).toFixed(3)} Miles (${(lenM * 3.28084).toFixed(0)} ft)`;

          if (onLiveMeasureUpdate) {
            onLiveMeasureUpdate({ type: 'distance', value: lenM, formatted, pointsCount: pts.length });
          }
        }
      } else if (drawMode === 'polygon') {
        if (pts.length >= 3) {
          const closedPts = [...pts, pts[0]];
          const poly = turf.polygon([closedPts]);
          const areaM2 = turf.area(poly);

          const latlngs = closedPts.map((p) => [p[1], p[0]]);
          L.polygon(latlngs, {
            color: '#059669',
            fillColor: '#10b981',
            fillOpacity: 0.35,
            weight: 3,
          }).addTo(drawLayerRef.current);

          const formatted =
            unitSystem === 'metric'
              ? `${
                  areaM2 >= 1_000_000
                    ? `${(areaM2 / 1_000_000).toFixed(4)} km²`
                    : `${areaM2.toFixed(1)} m²`
                }`
              : `${(areaM2 * 0.000247105).toFixed(3)} Acres (${(
                  areaM2 * 10.7639
                ).toLocaleString(undefined, { maximumFractionDigits: 0 })} sq ft)`;

          if (onLiveMeasureUpdate) {
            onLiveMeasureUpdate({ type: 'area', value: areaM2, formatted, pointsCount: pts.length });
          }
        }
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [drawMode, unitSystem]);

  // Handle GIS Extra Layers (Buffer & Convex Hull)
  useEffect(() => {
    if (!gisExtraLayerRef.current || !mapInstanceRef.current) return;
    gisExtraLayerRef.current.clearLayers();

    if (gisLayers?.buffer) {
      L.geoJSON(gisLayers.buffer, {
        style: {
          color: '#8b5cf6',
          fillColor: '#a78bfa',
          fillOpacity: 0.22,
          weight: 2,
          dashArray: '4, 4',
        },
      }).addTo(gisExtraLayerRef.current);
    }

    if (gisLayers?.convexHull) {
      L.geoJSON(gisLayers.convexHull, {
        style: {
          color: '#f59e0b',
          fillColor: '#fde68a',
          fillOpacity: 0.18,
          weight: 3,
          dashArray: '6, 6',
        },
      }).addTo(gisExtraLayerRef.current);
    }
  }, [gisLayers]);

  // Render GeoJSON Features on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }

    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
      return;
    }

    // Calculate min/max area for choropleth scale
    let maxArea = 1;
    geoJsonData.features.forEach((f) => {
      if (f.properties?.area_m2 && f.properties.area_m2 > maxArea) {
        maxArea = f.properties.area_m2;
      }
    });

    const geoLayer = L.geoJSON(geoJsonData, {
      filter: (feature) => {
        const type = feature.geometry?.type || '';
        if (type.includes('Polygon') && !layerVisibility.polygons) return false;
        if (type.includes('Line') && !layerVisibility.lines) return false;
        if (type.includes('Point') && !layerVisibility.points) return false;
        return true;
      },
      style: (feature) => {
        const type = feature.geometry?.type || '';
        const isSelected = selectedFeatureIndex === feature.properties.feature_index;
        const area = feature.properties?.area_m2 || 0;

        if (type.includes('Polygon')) {
          let fillColor = '#10b981';
          let strokeColor = '#059669';

          if (colorMode === 'choropleth') {
            const ratio = Math.min(Math.max(area / maxArea, 0.15), 1.0);
            if (ratio > 0.7) {
              fillColor = '#047857';
              strokeColor = '#065f46';
            } else if (ratio > 0.4) {
              fillColor = '#059669';
              strokeColor = '#047857';
            } else {
              fillColor = '#34d399';
              strokeColor = '#10b981';
            }
          }

          return {
            fillColor: isSelected ? '#f59e0b' : fillColor,
            fillOpacity: isSelected ? 0.8 : layerOpacity,
            color: isSelected ? '#d97706' : strokeColor,
            weight: isSelected ? 3.5 : 2,
          };
        } else if (type.includes('Line')) {
          return {
            color: isSelected ? '#f59e0b' : '#0284c7',
            weight: isSelected ? 5 : 3.5,
            opacity: 0.9,
            dashArray: '3, 6',
          };
        }
        return { color: '#7c3aed', weight: 2 };
      },
      pointToLayer: (feature, latlng) => {
        const isSelected = selectedFeatureIndex === feature.properties.feature_index;
        return L.circleMarker(latlng, {
          radius: isSelected ? 10 : 8,
          fillColor: isSelected ? '#f59e0b' : '#7c3aed',
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.9,
        });
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const isMetric = unitSystem === 'metric';

        const areaText =
          props.area_m2 != null
            ? isMetric
              ? `${props.area_m2.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²`
              : `${(props.area_m2 * 0.000247105).toFixed(3)} Acres`
            : null;

        const lenText =
          props.length_m != null
            ? isMetric
              ? `${props.length_m.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`
              : `${(props.length_m * 0.000621371).toFixed(3)} Miles`
            : null;

        // Hover Floating Tooltip
        if (showTooltips) {
          const tooltipContent = `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.78rem; font-weight: 700; color: #0f172a;">
              Feature #${props.feature_index} &bull; ${props.geometry_type}
              <div style="font-weight: 500; font-size: 0.72rem; color: #475569; margin-top: 2px;">
                ${areaText ? `Area: <strong style="color: #059669;">${areaText}</strong>` : ''}
                ${lenText ? `Length: <strong style="color: #0284c7;">${lenText}</strong>` : ''}
              </div>
            </div>
          `;
          layer.bindTooltip(tooltipContent, {
            sticky: true,
            opacity: 0.95,
            className: 'custom-geo-tooltip',
          });
        }

        layer.on('mouseover', () => {
          layer.setStyle({ fillOpacity: 0.85, weight: 4, color: '#4f46e5' });
        });

        layer.on('mouseout', () => {
          geoLayer.resetStyle(layer);
        });

        layer.on('click', () => {
          if (onSelectFeature) {
            onSelectFeature(props.feature_index);
          }
        });

        // Popup HTML
        const popupDiv = document.createElement('div');
        popupDiv.style.padding = '0.9rem 1.1rem';
        popupDiv.style.minWidth = '220px';
        popupDiv.innerHTML = `
          <div style="font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.35rem; display: flex; justify-content: space-between; align-items: center;">
            <span>Feature #${props.feature_index}</span>
            <span style="font-size: 0.7rem; background: #eef2ff; color: #4f46e5; padding: 0.1rem 0.4rem; border-radius: 4px;">${
              props.geometry_type || 'Feature'
            }</span>
          </div>
          <div style="font-size: 0.8rem; color: #475569; display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.45rem;">
            ${areaText ? `<div><strong>Area:</strong> ${areaText}</div>` : ''}
            ${lenText ? `<div><strong>Length:</strong> ${lenText}</div>` : ''}
            <div><strong>CRS:</strong> <span style="font-family: monospace;">${
              props.crs || 'EPSG:4326'
            }</span></div>
          </div>
          <button id="inspect-btn-${props.feature_index}" style="margin-top: 0.65rem; width: 100%; background: #4f46e5; color: #fff; border: none; padding: 0.4rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
            Inspect Full Attributes
          </button>
        `;

        layer.bindPopup(popupDiv);
        layer.on('popupopen', () => {
          const btn = document.getElementById(`inspect-btn-${props.feature_index}`);
          if (btn) {
            btn.onclick = () => {
              map.closePopup();
              if (onInspectFeature) onInspectFeature(props.feature_index);
            };
          }
        });
      },
    });

    geoLayer.addTo(map);
    geoJsonLayerRef.current = geoLayer;

    if (geoLayer.getLayers().length > 0) {
      map.invalidateSize();
      map.fitBounds(geoLayer.getBounds(), { padding: [50, 50], maxZoom: 16 });
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }
  }, [geoJsonData, layerVisibility, selectedFeatureIndex, unitSystem, layerOpacity, colorMode, showTooltips]);

  const hasData = geoJsonData && geoJsonData.features && geoJsonData.features.length > 0;

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.25rem',
        borderRadius: '20px',
        border: '1px solid rgba(226, 232, 240, 0.95)',
        boxShadow: 'var(--shadow-card)',
        background: '#ffffff',
      }}
    >
      {/* External Map Control Toolbar Box (Outside the Map) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem',
          padding: '0.75rem 1rem',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Left: Basemap Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Basemap:</span>
          <div
            style={{
              display: 'flex',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '2px',
              gap: '2px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {[
              { id: 'light', label: 'Light Studio' },
              { id: 'osm', label: 'Streets' },
              { id: 'satellite', label: 'Satellite' },
              { id: 'topo', label: 'Topographic' },
            ].map((bm) => (
              <button
                key={bm.id}
                onClick={() => setActiveBasemap(bm.id)}
                style={{
                  border: 'none',
                  background: activeBasemap === bm.id ? '#4f46e5' : 'transparent',
                  color: activeBasemap === bm.id ? '#ffffff' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: activeBasemap === bm.id ? 700 : 500,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: activeBasemap === bm.id ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none',
                }}
              >
                {bm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Layer Adjustments (when dataset loaded) */}
        {hasData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Polygon Opacity Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                style={{ width: '90px', accentColor: '#4f46e5', cursor: 'pointer' }}
              />
              <span className="font-mono" style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 700, minWidth: '32px' }}>
                {Math.round(layerOpacity * 100)}%
              </span>
            </div>

            {/* Color Mode Toggle */}
            <button
              onClick={() => setColorMode(colorMode === 'category' ? 'choropleth' : 'category')}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.28rem 0.6rem', height: '28px' }}
              title="Toggle Heatmap / Category Fills"
            >
              <Palette size={13} color="#059669" />
              <span>{colorMode === 'category' ? 'Category Colors' : 'Area Heatmap'}</span>
            </button>

            {/* Layer Visibility Checkboxes */}
            <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.75rem', color: '#334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layerVisibility.polygons}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, polygons: e.target.checked })}
                />
                <span>Polygons</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layerVisibility.lines}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, lines: e.target.checked })}
                />
                <span>Lines</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layerVisibility.points}
                  onChange={(e) => setLayerVisibility({ ...layerVisibility, points: e.target.checked })}
                />
                <span>Points</span>
              </label>
            </div>
          </div>
        )}

        {/* Right: Coordinates & Teleport Jump */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.3rem 0.65rem',
              fontSize: '0.72rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Compass size={13} color="#4f46e5" />
            <span className="font-mono">
              {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            </span>
          </div>

          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'bangalore') handleQuickJump(12.9716, 77.5946);
              if (val === 'sf') handleQuickJump(37.7749, -122.4194);
              if (val === 'singapore') handleQuickJump(1.29027, 103.851959);
              if (val === 'yellowstone') handleQuickJump(44.80, -110.45);
              if (val === 'london') handleQuickJump(51.5074, -0.1278);
              if (val === 'tokyo') handleQuickJump(35.6762, 139.6503);
            }}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.72rem',
              color: '#334155',
              padding: '0.3rem 0.55rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">🚀 Teleport City...</option>
            <option value="bangalore">Bangalore Hub</option>
            <option value="yellowstone">Yellowstone NP</option>
            <option value="sf">California Valley</option>
            <option value="singapore">Singapore Marina</option>
            <option value="london">London Metro</option>
            <option value="tokyo">Tokyo Metropole</option>
          </select>
        </div>
      </div>

      {/* Dedicated Map Viewport Box (Completely Clean & Unobstructed) */}
      <div
        id="map-container-root"
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 430px)',
          minHeight: '520px',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Empty State Overlay */}
        {!hasData && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(248, 250, 252, 0.94)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              zIndex: 900,
            }}
          >
            <div
              style={{
                maxWidth: '640px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: '#eef2ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(79, 70, 229, 0.15)',
                  border: '1px solid #c7d2fe',
                }}
              >
                <MapIcon size={32} />
              </div>
              <div>
                <h2 className="font-heading" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  Spatial Vector Studio Ready
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.6 }}>
                  Select one of our 4 pre-packaged datasets or upload your own <strong>Shapefile ZIP</strong> / <strong>Google Earth KML</strong>.
                </p>
              </div>

              {/* 4 Sample Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%' }}>
                <button
                  onClick={() => onLoadSample('urban')}
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.65rem',
                  }}
                >
                  <Sparkles size={16} />
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem' }}>Urban Bangalore (KML)</strong>
                    <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>Zoning & Arterial Expressways</span>
                  </div>
                </button>

                <button
                  onClick={() => onLoadSample('wildlife')}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.65rem',
                    borderColor: '#a7f3d0',
                    background: '#ecfdf5',
                  }}
                >
                  <Trees size={16} color="#059669" />
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#065f46' }}>Yellowstone NP (KML)</strong>
                    <span style={{ fontSize: '0.68rem', color: '#047857' }}>Wildlife Migration Corridors</span>
                  </div>
                </button>

                <button
                  onClick={() => onLoadSample('agriculture')}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.65rem',
                    borderColor: '#fde68a',
                    background: '#fffbeb',
                  }}
                >
                  <Zap size={16} color="#d97706" />
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#78350f' }}>California Farms (.ZIP)</strong>
                    <span style={{ fontSize: '0.68rem', color: '#92400e' }}>Agricultural Crop Parcels</span>
                  </div>
                </button>

                <button
                  onClick={() => onLoadSample('singapore')}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.65rem',
                    borderColor: '#ddd6fe',
                    background: '#f5f3ff',
                  }}
                >
                  <Building2 size={16} color="#7c3aed" />
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', color: '#4c1d95' }}>Singapore Marina (.ZIP)</strong>
                    <span style={{ fontSize: '0.68rem', color: '#5b21b6' }}>High-Density Cadastral Lots</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
