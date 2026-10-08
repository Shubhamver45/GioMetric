import React, { useState, useRef } from 'react';
import { UploadCloud, FileUp, X, Sparkles, Zap, Trash2, Trees, Building2 } from 'lucide-react';

export default function UploadModal({
  isOpen,
  onClose,
  onUploadFile,
  onLoadSample,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (ext !== '.zip' && ext !== '.kml') {
      alert('Unsupported file format. Please choose a .zip (Shapefile) or .kml file.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadStep(1);

    try {
      await onUploadFile(selectedFile, (step) => {
        setUploadStep(step);
      });
      onClose();
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '640px',
        background: '#ffffff',
        boxShadow: 'var(--shadow-floating)',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(226, 232, 240, 0.9)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Upload Geospatial Vector File
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Supports Shapefile (.zip) & Google Earth (.kml)</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
          
          {/* Dropzone */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#4f46e5' : '#cbd5e1'}`,
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: dragOver ? '#eef2ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.kml"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileUp size={24} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                  Click to browse or drag and drop file
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Shapefile ZIP (with .shp, .dbf, .shx) or KML up to 50 MB
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className="badge badge-amber font-mono">.ZIP Shapefile</span>
                <span className="badge badge-sky font-mono">.KML Vector</span>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{selectedFile.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Progress Indicator */}
          {uploading && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
                Processing Vector Pipeline...
              </p>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadStep * 33}%`, background: '#4f46e5', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {/* 4 Instant Samples */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            <span style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }}></span>
            <span>OR LOAD ONE OF 4 PRE-PACKAGED SAMPLES</span>
            <span style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }}></span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={() => { onClose(); onLoadSample('urban'); }}
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block' }}>Urban Survey (KML)</strong>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Zoning & Arterial Corridors</span>
              </div>
            </button>

            <button
              onClick={() => { onClose(); onLoadSample('wildlife'); }}
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trees size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#065f46', display: 'block' }}>Yellowstone NP (KML)</strong>
                <span style={{ fontSize: '0.7rem', color: '#047857' }}>Wildlife Migration Paths</span>
              </div>
            </button>

            <button
              onClick={() => { onClose(); onLoadSample('agriculture'); }}
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#78350f', display: 'block' }}>California Farms (.ZIP)</strong>
                <span style={{ fontSize: '0.7rem', color: '#92400e' }}>Agricultural Crop Lots</span>
              </div>
            </button>

            <button
              onClick={() => { onClose(); onLoadSample('singapore'); }}
              style={{
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: '12px',
                padding: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '0.8rem', color: '#4c1d95', display: 'block' }}>Singapore Marina (.ZIP)</strong>
                <span style={{ fontSize: '0.7rem', color: '#5b21b6' }}>High-Density Cadastral Lots</span>
              </div>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: '#f8fafc' }}>
          <button onClick={onClose} className="btn btn-secondary" disabled={uploading}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={!selectedFile || uploading}>
            <span>Process & Compute Measurements</span>
          </button>
        </div>
      </div>
    </div>
  );
}
