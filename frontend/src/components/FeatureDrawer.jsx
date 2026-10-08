import React, { useState } from 'react';
import { X, Crosshair, BoxSelect, Route, Info, Copy, Check, Tag } from 'lucide-react';

export default function FeatureDrawer({
  feature,
  isOpen,
  onClose,
  onFocusOnMap,
  unitSystem,
}) {
  const [copiedWkt, setCopiedWkt] = useState(false);

  if (!isOpen || !feature) return null;

  const isMetric = unitSystem === 'metric';
  const meas = feature.measurements || {};
  let props = {};
  if (typeof feature.properties === 'string') {
    try {
      props = JSON.parse(feature.properties);
    } catch {
      props = {};
    }
  } else if (feature.properties) {
    props = feature.properties;
  }

  const propEntries = Object.entries(props || {});

  const handleCopyWkt = () => {
    if (!feature.geometry_wkt) return;
    navigator.clipboard.writeText(feature.geometry_wkt).then(() => {
      setCopiedWkt(true);
      setTimeout(() => setCopiedWkt(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(15, 23, 42, 0.18)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          height: '100%',
          boxShadow: '-8px 0 35px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e2e8f0',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#eef2ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #c7d2fe',
              }}
            >
              <Info size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <h3 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Feature #{feature.feature_index}
                </h3>
                <span className="badge badge-sky" style={{ fontSize: '0.68rem' }}>
                  {feature.geometry_type || 'Vector'}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                Spatial Coordinate Reference: <strong className="font-mono">{feature.crs || 'EPSG:4326'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.4rem',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          
          {/* 1. Computed Geodesic Measurements */}
          <div>
            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', marginBottom: '0.6rem' }}>
              Computed Geodesic Measurements
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {meas.area_m2 != null && (
                <>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.9rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Surface Area (m²)</span>
                    <p className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#065f46', marginTop: '0.2rem' }}>
                      {meas.area_m2.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                    </p>
                  </div>
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.9rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Hectares & Acres</span>
                    <p className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#065f46', marginTop: '0.2rem' }}>
                      {(meas.area_m2 * 0.0001).toFixed(3)} ha <span style={{ color: '#059669', fontWeight: 500 }}>({(meas.area_m2 * 0.000247105).toFixed(3)} ac)</span>
                    </p>
                  </div>
                </>
              )}

              {meas.length_m != null && (
                <>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.9rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700 }}>Perimeter / Length (m)</span>
                    <p className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0369a1', marginTop: '0.2rem' }}>
                      {meas.length_m.toLocaleString(undefined, { maximumFractionDigits: 1 })} m
                    </p>
                  </div>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.9rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700 }}>Kilometres & Miles</span>
                    <p className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0369a1', marginTop: '0.2rem' }}>
                      {(meas.length_m / 1000).toFixed(3)} km <span style={{ color: '#0284c7', fontWeight: 500 }}>({(meas.length_m * 0.000621371).toFixed(3)} mi)</span>
                    </p>
                  </div>
                </>
              )}

              {meas.area_m2 == null && meas.length_m == null && (
                <div style={{ gridColumn: 'span 2', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>
                  Point locations have zero enclosed area and length by geographic definition.
                </div>
              )}
            </div>
          </div>

          {/* 2. Attributes & Custom Properties (Clean Table) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                Feature Attributes & Metadata
              </h4>
              <span className="badge badge-subtle">{propEntries.length} Attributes</span>
            </div>

            {propEntries.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <tbody>
                    {propEntries.map(([k, v], idx) => (
                      <tr
                        key={k}
                        style={{
                          borderBottom: idx < propEntries.length - 1 ? '1px solid #f1f5f9' : 'none',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.9rem', fontWeight: 600, color: '#334155', width: '38%', verticalAlign: 'top' }}>
                          {k}
                        </td>
                        <td className="font-mono" style={{ padding: '0.65rem 0.9rem', color: '#0f172a', fontWeight: 500, wordBreak: 'break-word' }}>
                          {String(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
                No custom metadata attributes attached to this feature.
              </div>
            )}
          </div>

          {/* 3. Well-Known Text (WKT) Geometry */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                Well-Known Text (WKT) Geometry
              </h4>
              <button
                onClick={handleCopyWkt}
                className="btn btn-secondary"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: '24px' }}
              >
                {copiedWkt ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                <span>{copiedWkt ? 'Copied WKT' : 'Copy WKT'}</span>
              </button>
            </div>
            <div
              className="font-mono"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#334155',
                padding: '0.9rem',
                borderRadius: '12px',
                fontSize: '0.72rem',
                maxHeight: '130px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}
            >
              {feature.geometry_wkt || 'No WKT string available'}
            </div>
          </div>

        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <button onClick={onClose} className="btn btn-secondary">
            Close Panel
          </button>
          <button
            onClick={() => {
              onFocusOnMap(feature.feature_index);
              onClose();
            }}
            className="btn btn-primary"
          >
            <Crosshair size={15} />
            <span>Focus on Map Studio</span>
          </button>
        </div>

      </div>
    </div>
  );
}
