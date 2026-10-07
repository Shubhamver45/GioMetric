import React, { useState } from 'react';
import * as turf from '@turf/turf';
import { Ruler, Pentagon, ShieldAlert, Sparkles, Sliders, RefreshCw, Layers, Compass, Scissors } from 'lucide-react';

export default function GisToolbox({
  geoJsonData,
  onApplyBuffer,
  onApplyConvexHull,
  onClearGisLayers,
  drawMode,
  setDrawMode,
  liveMeasureResult,
  bufferDistance,
  setBufferDistance,
}) {
  const [activeTab, setActiveTab] = useState('measure'); // 'measure' | 'buffer' | 'geometry'

  const handleCalculateConvexHull = () => {
    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) return;
    try {
      const hull = turf.convex(geoJsonData);
      if (hull) {
        onApplyConvexHull(hull);
      }
    } catch (err) {
      console.error('Convex hull error:', err);
    }
  };

  const handleGenerateBuffer = (distKm) => {
    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) return;
    try {
      const bufferedFeatures = [];
      geoJsonData.features.forEach((f) => {
        try {
          if (f.geometry) {
            const b = turf.buffer(f, distKm, { units: 'kilometers' });
            if (b) bufferedFeatures.push(b);
          }
        } catch (e) {
          console.warn('Buffer skip:', e);
        }
      });

      if (bufferedFeatures.length > 0) {
        const featureCollection = turf.featureCollection(bufferedFeatures);
        onApplyBuffer(featureCollection, distKm);
      }
    } catch (err) {
      console.error('Buffer error:', err);
    }
  };

  return (
    <div className="glass-card" style={{
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      border: '1px solid rgba(226, 232, 240, 0.95)',
      boxShadow: 'var(--shadow-card)'
    }}>
      {/* Header & Sub-Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Compass size={17} />
          </div>
          <div>
            <h3 className="font-heading" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
              Turf.js Spatial Studio Toolkit
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Client-side geoprocessing & interactive spatial analysis</p>
          </div>
        </div>

        {/* Action Subtabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {[
            { id: 'measure', label: 'Draw & Measure', icon: Ruler },
            { id: 'buffer', label: 'Buffer Envelopes', icon: Sliders },
            { id: 'geometry', label: 'Spatial Hulls', icon: Pentagon },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#4f46e5' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Live Interactive Measure & Draw */}
      {activeTab === 'measure' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#f8fafc', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Interactive Map Tools:</span>
            <button
              onClick={() => setDrawMode(drawMode === 'ruler' ? null : 'ruler')}
              className={drawMode === 'ruler' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <Ruler size={13} />
              <span>{drawMode === 'ruler' ? 'Active: Measuring Distance' : 'Measure Distance (Ruler)'}</span>
            </button>

            <button
              onClick={() => setDrawMode(drawMode === 'polygon' ? null : 'polygon')}
              className={drawMode === 'polygon' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <Pentagon size={13} />
              <span>{drawMode === 'polygon' ? 'Active: Drawing Area' : 'Draw Polygon (Area)'}</span>
            </button>

            {drawMode && (
              <button
                onClick={() => { setDrawMode(null); onClearGisLayers(); }}
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', color: '#e11d48' }}
              >
                <RefreshCw size={13} /> Clear
              </button>
            )}
          </div>

          {/* Live Measure Readout */}
          {liveMeasureResult ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                {liveMeasureResult.type === 'distance' ? 'Live Distance:' : 'Live Area:'}
              </span>
              <strong className="font-mono" style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                {liveMeasureResult.formatted}
              </strong>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {drawMode ? 'Click on map points to measure' : 'Select a tool to measure directly on map'}
            </span>
          )}
        </div>
      )}

      {/* Tab 2: Live Buffer Generator */}
      {activeTab === 'buffer' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', background: '#f8fafc', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
              Buffer Radius: <strong style={{ color: '#4f46e5' }}>{bufferDistance} km</strong> ({(bufferDistance * 1000).toFixed(0)}m)
            </span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={bufferDistance}
              onChange={(e) => {
                const d = parseFloat(e.target.value);
                setBufferDistance(d);
                handleGenerateBuffer(d);
              }}
              style={{ flex: 1, accentColor: '#4f46e5' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => handleGenerateBuffer(bufferDistance)}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
            >
              <Sparkles size={13} />
              <span>Apply Buffer Layer</span>
            </button>
            <button
              onClick={onClearGisLayers}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Convex Hull Enclosure */}
      {activeTab === 'geometry' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: '#f8fafc', padding: '0.85rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Convex Hull Boundary Enclosure</span>
            <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Generates minimal bounding polygon enclosing all features</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleCalculateConvexHull}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
            >
              <Pentagon size={13} />
              <span>Generate Convex Hull</span>
            </button>
            <button
              onClick={onClearGisLayers}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
