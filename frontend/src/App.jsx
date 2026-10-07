import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import KpiBar from './components/KpiBar';
import MapStudio from './components/MapStudio';
import GisToolbox from './components/GisToolbox';
import AnalyticsTab from './components/AnalyticsTab';
import FeatureTable from './components/FeatureTable';
import UploadModal from './components/UploadModal';
import FeatureDrawer from './components/FeatureDrawer';
import HistoryModal from './components/HistoryModal';
import ExecutiveReportModal from './components/ExecutiveReportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'analytics' | 'table'
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' | 'imperial'
  
  const [currentFileId, setCurrentFileId] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [stats, setStats] = useState(null);
  const [featuresList, setFeaturesList] = useState([]);
  
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(null);
  const [inspectedFeatureIndex, setInspectedFeatureIndex] = useState(null);
  
  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);

  // GIS Toolkit State
  const [gisLayers, setGisLayers] = useState({ buffer: null, convexHull: null });
  const [drawMode, setDrawMode] = useState(null); // 'ruler' | 'polygon' | null
  const [liveMeasureResult, setLiveMeasureResult] = useState(null);
  const [bufferDistance, setBufferDistance] = useState(1.0); // km

  const mapRef = useRef(null);

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Trigger celebration confetti
  const triggerCelebration = () => {
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#4f46e5', '#10b981', '#0ea5e9', '#f59e0b', '#7c3aed'],
    });
  };

  // Load Dataset by ID
  const loadDataset = async (fileId) => {
    try {
      const [geoRes, statsRes, featRes, fileInfoRes] = await Promise.all([
        fetch(`/api/files/${fileId}/geojson/`),
        fetch(`/api/files/${fileId}/stats/`),
        fetch(`/api/files/${fileId}/features/?limit=1000`),
        fetch(`/api/files/${fileId}/`),
      ]);

      if (!geoRes.ok || !statsRes.ok) {
        throw new Error('Could not fetch dataset details.');
      }

      const geoData = await geoRes.json();
      const statsData = await statsRes.json();
      const featData = await featRes.json();
      const fileInfo = await fileInfoRes.json();

      setCurrentFileId(fileId);
      setGeoJsonData(geoData);
      setStats(statsData);
      setFeaturesList(featData.items || []);
      setCurrentFile(fileInfo);
      setGisLayers({ buffer: null, convexHull: null });
      setLiveMeasureResult(null);

      showToast(`Loaded ${statsData.filename} (${featData.total || 0} features)`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Poll File Status until completion
  const pollFileStatus = (fileId, filename) => {
    showToast(`Processing ${filename}... Calculating metric measurements.`, 'info');
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/files/${fileId}/`);
        if (!res.ok) throw new Error('File not found');

        const fileData = await res.json();
        if (fileData.status === 'COMPLETED') {
          clearInterval(interval);
          triggerCelebration();
          loadDataset(fileId);
        } else if (fileData.status === 'FAILED') {
          clearInterval(interval);
          showToast(`Processing failed: ${fileData.error_message}`, 'error');
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          showToast('Processing timeout.', 'error');
        }
      } catch (err) {
        clearInterval(interval);
        showToast(err.message, 'error');
      }
    }, 1000);
  };

  // Handle Upload
  const handleUploadFile = async (file, onProgressStep) => {
    const formData = new FormData();
    formData.append('file', file);

    onProgressStep(1);
    const res = await fetch('/api/files/', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }

    const data = await res.json();
    onProgressStep(2);

    setTimeout(() => {
      onProgressStep(3);
      pollFileStatus(data.id, data.filename);
    }, 400);
  };

  // Handle Sample Load
  const handleLoadSample = async (sampleType) => {
    try {
      const res = await fetch(`/api/files/sample/${sampleType}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to load sample.');
      const data = await res.json();
      pollFileStatus(data.id, data.filename);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Export actions
  const handleExportGeoJson = () => {
    if (!geoJsonData) return;
    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${stats?.filename || 'dataset'}_export.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('GeoJSON exported successfully!');
  };

  const handleExportCsv = () => {
    if (!currentFileId) return;
    window.open(`/api/files/${currentFileId}/export/csv`, '_blank');
    showToast('CSV measurements download started.');
  };

  const handleCopyGeoJson = () => {
    if (!geoJsonData) return;
    navigator.clipboard.writeText(JSON.stringify(geoJsonData, null, 2)).then(() => {
      setCopied(true);
      showToast('GeoJSON copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFitBounds = () => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  };

  // GIS Layer Handlers
  const handleApplyBuffer = (bufferFeatureCollection, dist) => {
    setGisLayers((prev) => ({ ...prev, buffer: bufferFeatureCollection }));
    showToast(`Generated ${dist} km buffer envelope around features.`);
  };

  const handleApplyConvexHull = (hullFeature) => {
    setGisLayers((prev) => ({ ...prev, convexHull: hullFeature }));
    showToast('Convex Hull boundary enclosure generated.');
  };

  const handleClearGisLayers = () => {
    setGisLayers({ buffer: null, convexHull: null });
    setLiveMeasureResult(null);
    showToast('GIS layers reset.');
  };

  // Initial Load Check
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/files/?limit=1');
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            loadDataset(data.items[0].id);
          }
        }
      } catch (err) {
        console.log('No existing files.');
      }
    };
    fetchLatest();
  }, []);

  // Tab change map invalidation
  useEffect(() => {
    if (activeTab === 'map' && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
      setTimeout(() => mapRef.current?.invalidateSize(), 250);
    }
  }, [activeTab]);

  const inspectedFeature = (featuresList || []).find((f) => f.feature_index === inspectedFeatureIndex);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentFile={currentFile}
        unitSystem={unitSystem}
        setUnitSystem={setUnitSystem}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenHistory={() => setHistoryModalOpen(true)}
        onOpenReport={() => setReportModalOpen(true)}
      />

      {/* Main Workspace */}
      <main style={{ flex: 1, padding: '1.5rem 2.5rem', maxWidth: '1750px', width: '100%', margin: '0 auto' }}>
        
        {/* Top KPI Metrics Bar */}
        <KpiBar
          stats={stats}
          unitSystem={unitSystem}
          onExportGeoJson={handleExportGeoJson}
          onExportCsv={handleExportCsv}
          onCopyGeoJson={handleCopyGeoJson}
          onFitBounds={handleFitBounds}
          copied={copied}
        />

        {/* Tab Content */}
        {activeTab === 'map' && (
          <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Turf.js Interactive GIS Tool Panel */}
            <GisToolbox
              geoJsonData={geoJsonData}
              onApplyBuffer={handleApplyBuffer}
              onApplyConvexHull={handleApplyConvexHull}
              onClearGisLayers={handleClearGisLayers}
              drawMode={drawMode}
              setDrawMode={setDrawMode}
              liveMeasureResult={liveMeasureResult}
              bufferDistance={bufferDistance}
              setBufferDistance={setBufferDistance}
            />

            {/* Spatial Map Studio */}
            <MapStudio
              geoJsonData={geoJsonData}
              selectedFeatureIndex={selectedFeatureIndex}
              onSelectFeature={(idx) => setSelectedFeatureIndex(idx)}
              onInspectFeature={(idx) => setInspectedFeatureIndex(idx)}
              onLoadSample={handleLoadSample}
              unitSystem={unitSystem}
              mapRefProp={mapRef}
              gisLayers={gisLayers}
              drawMode={drawMode}
              onLiveMeasureUpdate={(res) => setLiveMeasureResult(res)}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade">
            <AnalyticsTab
              stats={stats}
              featuresList={featuresList}
              unitSystem={unitSystem}
              onSelectFeature={(idx) => setSelectedFeatureIndex(idx)}
              onSwitchToMap={() => setActiveTab('map')}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div className="animate-fade">
            <FeatureTable
              featuresList={featuresList}
              unitSystem={unitSystem}
              selectedFeatureIndex={selectedFeatureIndex}
              onSelectFeature={(idx) => setSelectedFeatureIndex(idx)}
              onInspectFeature={(idx) => setInspectedFeatureIndex(idx)}
              onSwitchToMap={() => setActiveTab('map')}
            />
          </div>
        )}

      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadFile={handleUploadFile}
        onLoadSample={handleLoadSample}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onLoadDataset={(id) => loadDataset(id)}
        currentFileId={currentFileId}
      />

      {/* Executive Report Modal */}
      <ExecutiveReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        stats={stats}
        featuresList={featuresList}
        unitSystem={unitSystem}
      />

      {/* Feature Inspector Drawer */}
      <FeatureDrawer
        feature={inspectedFeature}
        isOpen={inspectedFeatureIndex !== null}
        onClose={() => setInspectedFeatureIndex(null)}
        onFocusOnMap={(idx) => {
          setSelectedFeatureIndex(idx);
          setActiveTab('map');
        }}
        unitSystem={unitSystem}
      />

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 2000,
          background: toast.type === 'error' ? '#fff1f2' : '#ffffff',
          color: toast.type === 'error' ? '#e11d48' : '#0f172a',
          border: `1px solid ${toast.type === 'error' ? '#fecdd3' : '#e2e8f0'}`,
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: 'var(--shadow-floating)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          animation: 'fadeIn 0.25s ease'
        }}>
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
