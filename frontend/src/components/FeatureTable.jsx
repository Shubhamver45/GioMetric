import React, { useState, useMemo } from 'react';
import { Search, Crosshair, Eye, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';

export default function FeatureTable({
  featuresList,
  unitSystem,
  selectedFeatureIndex,
  onSelectFeature,
  onInspectFeature,
  onSwitchToMap,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState('feature_index'); // 'feature_index' | 'geometry_type' | 'area_m2' | 'length_m'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const isMetric = unitSystem === 'metric';

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtering & Sorting
  const filteredFeatures = useMemo(() => {
    let result = (featuresList || []).filter((f) => {
      // Type Filter
      if (activeFilter !== 'all') {
        const type = (f.geometry_type || '').toLowerCase();
        if (activeFilter === 'polygon' && !type.includes('polygon')) return false;
        if (activeFilter === 'line' && !type.includes('line')) return false;
        if (activeFilter === 'point' && !type.includes('point')) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const idxMatch = String(f.feature_index).includes(q);
        const typeMatch = (f.geometry_type || '').toLowerCase().includes(q);
        const propsMatch = JSON.stringify(f.properties || {}).toLowerCase().includes(q);
        return idxMatch || typeMatch || propsMatch;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'area_m2') {
        aVal = a.measurements?.area_m2 || 0;
        bVal = b.measurements?.area_m2 || 0;
      } else if (sortField === 'length_m') {
        aVal = a.measurements?.length_m || 0;
        bVal = b.measurements?.length_m || 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [featuresList, activeFilter, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredFeatures.length / pageSize) || 1;
  const paginatedFeatures = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFeatures.slice(start, start + pageSize);
  }, [filteredFeatures, currentPage, pageSize]);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Feature Attribute & Measurement Table
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Showing {filteredFeatures.length} of {featuresList?.length || 0} features &bull; Click headers to sort
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search ID, type, or property..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.8rem',
                outline: 'none',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'polygon', label: 'Polygons' },
              { id: 'line', label: 'Lines' },
              { id: 'point', label: 'Points' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveFilter(tab.id); setCurrentPage(1); }}
                style={{
                  border: 'none',
                  background: activeFilter === tab.id ? '#ffffff' : 'transparent',
                  color: activeFilter === tab.id ? '#0f172a' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: activeFilter === tab.id ? 700 : 500,
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: activeFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Canvas */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              
              {/* Index Column */}
              <th
                onClick={() => handleSort('feature_index')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span># Index</span>
                  {sortField === 'feature_index' ? (
                    sortOrder === 'asc' ? <ArrowUp size={12} color="#4f46e5" /> : <ArrowDown size={12} color="#4f46e5" />
                  ) : <ArrowUpDown size={12} color="#cbd5e1" />}
                </div>
              </th>

              {/* Geometry Type */}
              <th
                onClick={() => handleSort('geometry_type')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Geometry Type</span>
                  {sortField === 'geometry_type' ? (
                    sortOrder === 'asc' ? <ArrowUp size={12} color="#4f46e5" /> : <ArrowDown size={12} color="#4f46e5" />
                  ) : <ArrowUpDown size={12} color="#cbd5e1" />}
                </div>
              </th>

              {/* Area */}
              <th
                onClick={() => handleSort('area_m2')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Computed Area</span>
                  {sortField === 'area_m2' ? (
                    sortOrder === 'asc' ? <ArrowUp size={12} color="#4f46e5" /> : <ArrowDown size={12} color="#4f46e5" />
                  ) : <ArrowUpDown size={12} color="#cbd5e1" />}
                </div>
              </th>

              {/* Length */}
              <th
                onClick={() => handleSort('length_m')}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Computed Length</span>
                  {sortField === 'length_m' ? (
                    sortOrder === 'asc' ? <ArrowUp size={12} color="#4f46e5" /> : <ArrowDown size={12} color="#4f46e5" />
                  ) : <ArrowUpDown size={12} color="#cbd5e1" />}
                </div>
              </th>

              <th style={{ padding: '0.75rem 1rem' }}>Attribute Properties</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFeatures.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  No matching features found.
                </td>
              </tr>
            ) : (
              paginatedFeatures.map((f) => {
                const isSelected = selectedFeatureIndex === f.feature_index;
                const type = f.geometry_type || 'Unknown';
                let badgeClass = 'badge-emerald';
                if (type.includes('Line')) badgeClass = 'badge-sky';
                if (type.includes('Point')) badgeClass = 'badge-violet';

                const meas = f.measurements || {};
                const areaDisplay = meas.area_m2 != null
                  ? isMetric
                    ? `${meas.area_m2.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²`
                    : `${(meas.area_m2 * 0.000247105).toFixed(3)} ac`
                  : '—';

                const lenDisplay = meas.length_m != null
                  ? isMetric
                    ? `${meas.length_m.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`
                    : `${(meas.length_m * 0.000621371).toFixed(3)} mi`
                  : '—';

                const props = f.properties || {};
                const propKeys = Object.keys(props);
                const propPreview = propKeys.length > 0
                  ? `${propKeys[0]}: ${String(props[propKeys[0]]).substring(0, 20)}${propKeys.length > 1 ? ` (+${propKeys.length - 1} more)` : ''}`
                  : 'None';

                return (
                  <tr
                    key={f.feature_index}
                    onClick={() => onSelectFeature(f.feature_index)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#eef2ff' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td className="font-mono" style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#475569' }}>
                      #{f.feature_index}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${badgeClass}`}>{type}</span>
                    </td>
                    <td className="font-mono" style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      {areaDisplay}
                    </td>
                    <td className="font-mono" style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                      {lenDisplay}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.78rem' }}>
                      {propPreview}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { onSelectFeature(f.feature_index); onSwitchToMap(); }}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                          title="Focus on Map"
                        >
                          <Crosshair size={13} color="#4f46e5" />
                        </button>
                        <button
                          onClick={() => onInspectFeature(f.feature_index)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                          title="Inspect Attributes"
                        >
                          <Eye size={13} color="#059669" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.8rem' }}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.5rem' }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary"
            style={{ padding: '0.3rem 0.5rem' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

    </div>
  );
}
