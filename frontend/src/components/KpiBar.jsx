import React from 'react';
import { BoxSelect, Route, Layers, Download, FileSpreadsheet, Copy, Maximize, Check } from 'lucide-react';

export default function KpiBar({
  stats,
  unitSystem,
  onExportGeoJson,
  onExportCsv,
  onCopyGeoJson,
  onFitBounds,
  copied,
}) {
  const isMetric = unitSystem === 'metric';

  // Area formatting
  const totalAreaM2 = stats?.total_area_m2 || 0;
  const totalAreaKm2 = stats?.total_area_km2 || 0;
  const totalAreaHa = stats?.total_area_hectares || 0;
  const totalAreaAcres = stats?.total_area_acres || 0;
  const totalAreaSqFt = totalAreaM2 * 10.7639;

  const areaPrimaryVal = isMetric ? formatNumber(totalAreaM2) : formatNumber(totalAreaAcres, 3);
  const areaPrimaryUnit = isMetric ? 'm²' : 'Acres';
  const areaSecondaryVal = isMetric ? formatNumber(totalAreaKm2, 4) : formatNumber(totalAreaSqFt, 0);
  const areaSecondaryUnit = isMetric ? 'km²' : 'sq ft';
  const areaTertiaryVal = isMetric ? formatNumber(totalAreaHa, 2) : formatNumber(totalAreaKm2 * 0.386102, 3);
  const areaTertiaryUnit = isMetric ? 'Hectares' : 'sq mi';

  // Length formatting
  const totalLenM = stats?.total_length_m || 0;
  const totalLenKm = stats?.total_length_km || 0;
  const totalLenMiles = stats?.total_length_miles || 0;
  const totalLenFt = totalLenM * 3.28084;

  const lenPrimaryVal = isMetric ? formatNumber(totalLenM) : formatNumber(totalLenMiles, 3);
  const lenPrimaryUnit = isMetric ? 'm' : 'Miles';
  const lenSecondaryVal = isMetric ? formatNumber(totalLenKm, 3) : formatNumber(totalLenFt, 0);
  const lenSecondaryUnit = isMetric ? 'km' : 'ft';

  // Feature Breakdown
  const totalFeatures = stats?.total_features || 0;
  const polyCount = stats?.breakdown?.polygons || 0;
  const lineCount = stats?.breakdown?.lines || 0;
  const pointCount = stats?.breakdown?.points || 0;

  const total = totalFeatures || 1;
  const polyPct = ((polyCount / total) * 100).toFixed(1);
  const linePct = ((lineCount / total) * 100).toFixed(1);
  const pointPct = ((pointCount / total) * 100).toFixed(1);

  return (
    <section style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '1.25rem',
      marginBottom: '1.5rem'
    }}>
      {/* 1. Area Card */}
      <div className="glass-card" style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              border: '1px solid #a7f3d0'
            }}>
              <BoxSelect size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Enclosed Area</p>
              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>{polyCount} Polygons measured</span>
            </div>
          </div>
          <span className="badge badge-emerald font-mono">UTM Metric</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginTop: '0.2rem' }}>
          <span className="font-heading" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
            {areaPrimaryVal}
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#64748b' }}>
            {areaPrimaryUnit}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: '#64748b', paddingTop: '0.35rem', borderTop: '1px solid #f1f5f9' }}>
          <span>≈ <strong style={{ color: '#334155' }}>{areaSecondaryVal}</strong> {areaSecondaryUnit}</span>
          <span>&bull;</span>
          <span><strong style={{ color: '#334155' }}>{areaTertiaryVal}</strong> {areaTertiaryUnit}</span>
        </div>
      </div>

      {/* 2. Length Card */}
      <div className="glass-card" style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#f0f9ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7',
              border: '1px solid #bae6fd'
            }}>
              <Route size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Linear Length</p>
              <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 700 }}>{lineCount} Line segments</span>
            </div>
          </div>
          <span className="badge badge-sky font-mono">Geodesic</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginTop: '0.2rem' }}>
          <span className="font-heading" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
            {lenPrimaryVal}
          </span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#64748b' }}>
            {lenPrimaryUnit}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: '#64748b', paddingTop: '0.35rem', borderTop: '1px solid #f1f5f9' }}>
          <span>≈ <strong style={{ color: '#334155' }}>{lenSecondaryVal}</strong> {lenSecondaryUnit}</span>
          <span>&bull;</span>
          <span><strong style={{ color: '#334155' }}>{isMetric ? `${formatNumber(totalLenMiles, 3)} mi` : `${formatNumber(totalLenKm, 3)} km`}</strong></span>
        </div>
      </div>

      {/* 3. Features Extracted & Breakdown */}
      <div className="glass-card" style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#f5f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
              border: '1px solid #ddd6fe'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Features Parsed</p>
              <span className="font-mono" style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 700 }}>
                {stats?.crs || 'EPSG:4326'}
              </span>
            </div>
          </div>
          <span className="badge badge-violet">{totalFeatures} Total</span>
        </div>

        {/* Multi-color distribution bar */}
        <div style={{
          display: 'flex',
          height: '7px',
          borderRadius: '999px',
          overflow: 'hidden',
          background: '#f1f5f9',
          marginTop: '0.5rem',
          gap: '2px'
        }}>
          <div style={{ width: `${polyPct}%`, background: '#10b981', transition: 'width 0.4s ease' }} title={`Polygons: ${polyPct}%`} />
          <div style={{ width: `${linePct}%`, background: '#0ea5e9', transition: 'width 0.4s ease' }} title={`Lines: ${linePct}%`} />
          <div style={{ width: `${pointPct}%`, background: '#8b5cf6', transition: 'width 0.4s ease' }} title={`Points: ${pointPct}%`} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: '#64748b', paddingTop: '0.35rem', borderTop: '1px solid #f1f5f9' }}>
          <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', marginRight: '4px' }}></span>{polyCount} Poly</span>
          <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#0ea5e9', marginRight: '4px' }}></span>{lineCount} Lines</span>
          <span><span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#8b5cf6', marginRight: '4px' }}></span>{pointCount} Pts</span>
        </div>
      </div>
    </section>
  );
}

function formatNumber(val, decimals = 2) {
  if (val == null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
