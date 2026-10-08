import React from 'react';
import { Activity, BoxSelect, Route, Globe, CheckCircle2, ShieldCheck, Gauge, Award, BarChart2 } from 'lucide-react';
import AnalyticsCharts from './AnalyticsCharts';

export default function AnalyticsTab({ stats, featuresList, unitSystem, onSelectFeature, onSwitchToMap }) {
  if (!stats) {
    return (
      <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>No dataset loaded. Upload a file or load a sample dataset to view spatial intelligence metrics.</p>
      </div>
    );
  }

  const isMetric = unitSystem === 'metric';

  // Find largest polygon and longest line
  let largestPoly = null;
  let longestLine = null;

  (featuresList || []).forEach((f) => {
    const area = f.measurements?.area_m2;
    const len = f.measurements?.length_m;

    if (area != null && (!largestPoly || area > largestPoly.measurements.area_m2)) {
      largestPoly = f;
    }
    if (len != null && (!longestLine || len > longestLine.measurements.length_m)) {
      longestLine = f;
    }
  });

  const totalAreaM2 = stats.total_area_m2 || 0;
  const totalLenM = stats.total_length_m || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner */}
      <div className="glass-card" style={{ padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="badge badge-emerald">Engine Verified</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>UTM Geodesic Auto-Reprojection Matrix</span>
          </div>
          <h2 className="font-heading" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            Spatial Vector Analytics for {stats.filename}
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.15rem' }}>
            Accurate metric measurements computed with coordinate transformation from source CRS <strong>{stats.crs || 'EPSG:4326'}</strong>.
          </p>
        </div>

        <button onClick={onSwitchToMap} className="btn btn-primary">
          <span>View on Map Studio</span>
        </button>
      </div>

      {/* Visual Analytics Charts (Chart.js) */}
      <AnalyticsCharts stats={stats} featuresList={featuresList} unitSystem={unitSystem} />

      {/* Grid: Largest Polygon & Longest Line */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        
        {/* Largest Polygon */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={20} />
              </div>
              <div>
                <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Dominant Area Polygon
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Highest enclosed surface parcel</p>
              </div>
            </div>
            {largestPoly && <span className="badge badge-emerald">Feature #{largestPoly.feature_index}</span>}
          </div>

          {largestPoly ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.5rem 0' }}>
                <span className="font-heading" style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>
                  {isMetric
                    ? largestPoly.measurements.area_m2.toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : (largestPoly.measurements.area_m2 * 0.000247105).toFixed(3)}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b' }}>
                  {isMetric ? 'm²' : 'Acres'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#475569' }}>
                Represents <strong>{((largestPoly.measurements.area_m2 / (totalAreaM2 || 1)) * 100).toFixed(1)}%</strong> of the total measured dataset area.
              </p>
              <button
                onClick={() => { onSelectFeature(largestPoly.feature_index); onSwitchToMap(); }}
                className="btn btn-secondary"
                style={{ marginTop: '0.75rem', fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              >
                Inspect on Map
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No polygon features in this dataset.</p>
          )}
        </div>

        {/* Longest Line */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Route size={20} />
              </div>
              <div>
                <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Primary Corridor Line
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Longest linear transit or boundary feature</p>
              </div>
            </div>
            {longestLine && <span className="badge badge-sky">Feature #{longestLine.feature_index}</span>}
          </div>

          {longestLine ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.5rem 0' }}>
                <span className="font-heading" style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7' }}>
                  {isMetric
                    ? longestLine.measurements.length_m.toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : (longestLine.measurements.length_m * 0.000621371).toFixed(3)}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#64748b' }}>
                  {isMetric ? 'm' : 'Miles'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#475569' }}>
                Represents <strong>{((longestLine.measurements.length_m / (totalLenM || 1)) * 100).toFixed(1)}%</strong> of total linear length.
              </p>
              <button
                onClick={() => { onSelectFeature(longestLine.feature_index); onSwitchToMap(); }}
                className="btn btn-secondary"
                style={{ marginTop: '0.75rem', fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              >
                Inspect on Map
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No linestring features in this dataset.</p>
          )}
        </div>
      </div>

      {/* Unit Conversion Matrix */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 className="font-heading" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.85rem' }}>
          Dataset Measurements Unit Conversion Matrix
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Square Metres (m²)</span>
            <p className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {totalAreaM2.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Square Kilometres (km²)</span>
            <p className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {(totalAreaM2 / 1_000_000).toFixed(5)}
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Acres (ac)</span>
            <p className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {(totalAreaM2 * 0.000247105).toFixed(3)}
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Hectares (ha)</span>
            <p className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {(totalAreaM2 * 0.0001).toFixed(4)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
