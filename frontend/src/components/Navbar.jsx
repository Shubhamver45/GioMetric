import React from 'react';
import { Layers, UploadCloud, History, FileText, Globe2, Sparkles, ExternalLink, Activity, Award } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  currentFile,
  unitSystem,
  setUnitSystem,
  onOpenUpload,
  onOpenHistory,
  onOpenReport,
}) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.88)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
      padding: '0.75rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)'
    }}>
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
          position: 'relative',
        }}>
          <Layers size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
              GeoMetric <span style={{ color: '#4f46e5' }}>Studio</span>
            </h1>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
            Geospatial Vector Measurements & Geodesic Intelligence
          </p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '0.25rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        gap: '0.25rem'
      }}>
        {[
          { id: 'map', label: 'Spatial Map', icon: Globe2 },
          { id: 'analytics', label: 'Measurements & Metrics', icon: Activity },
          { id: 'table', label: 'Features Table', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.825rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              <Icon size={15} color={isActive ? '#4f46e5' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Header Actions & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        
        {/* Active Dataset Pill */}
        {currentFile ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.78rem',
            color: '#065f46',
            fontWeight: 600
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669', boxShadow: '0 0 6px #059669' }}></span>
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentFile.filename}
            </span>
            <span className="font-mono" style={{ fontSize: '0.7rem', background: 'rgba(5, 150, 105, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
              {currentFile.crs || 'UTM Auto'}
            </span>
          </div>
        ) : null}

        {/* Unit Selector Toggle */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '2px',
        }}>
          <button
            onClick={() => setUnitSystem('metric')}
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: unitSystem === 'metric' ? 700 : 500,
              border: 'none',
              borderRadius: '6px',
              background: unitSystem === 'metric' ? '#ffffff' : 'transparent',
              color: unitSystem === 'metric' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              boxShadow: unitSystem === 'metric' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Metric
          </button>
          <button
            onClick={() => setUnitSystem('imperial')}
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: unitSystem === 'imperial' ? 700 : 500,
              border: 'none',
              borderRadius: '6px',
              background: unitSystem === 'imperial' ? '#ffffff' : 'transparent',
              color: unitSystem === 'imperial' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              boxShadow: unitSystem === 'imperial' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Imperial
          </button>
        </div>

        {/* Executive Report Button */}
        <button
          onClick={onOpenReport}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 0.85rem', borderColor: '#c7d2fe', background: '#f5f3ff', color: '#4f46e5' }}
        >
          <Award size={15} color="#4f46e5" />
          <span>Executive Report</span>
        </button>

        {/* Action Buttons */}
        <button onClick={onOpenUpload} className="btn btn-primary" style={{ padding: '0.5rem 0.95rem' }}>
          <UploadCloud size={16} />
          <span>Upload Vector</span>
        </button>

        <button onClick={onOpenHistory} className="btn btn-secondary" style={{ padding: '0.5rem 0.85rem' }}>
          <History size={15} />
          <span>History</span>
        </button>

        <a href="/docs" target="_blank" rel="noreferrer" className="btn btn-ghost" title="Interactive API Docs" style={{ padding: '0.5rem 0.6rem' }}>
          <ExternalLink size={16} />
        </a>
      </div>
    </header>
  );
}
