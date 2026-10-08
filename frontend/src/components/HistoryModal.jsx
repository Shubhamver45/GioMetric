import React, { useEffect, useState } from 'react';
import { History, X, RefreshCw, FolderOpen, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function HistoryModal({
  isOpen,
  onClose,
  onLoadDataset,
  currentFileId,
}) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files/?limit=50');
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    try {
      const res = await fetch(`/api/files/${fileId}/`, { method: 'DELETE' });
      if (res.ok) {
        fetchHistory();
      }
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  if (!isOpen) return null;

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
        maxWidth: '680px',
        background: '#ffffff',
        boxShadow: 'var(--shadow-floating)',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={20} />
            </div>
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Uploaded Datasets & History
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Switch or inspect previous files in the database</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading history...</p>
          ) : historyItems.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No uploaded datasets found.</p>
          ) : (
            historyItems.map((item) => {
              const isCurrent = currentFileId === item.id;
              const isCompleted = item.status === 'COMPLETED';

              return (
                <div
                  key={item.id}
                  style={{
                    background: isCurrent ? '#f0f9ff' : '#f8fafc',
                    border: `1px solid ${isCurrent ? '#bae6fd' : '#e2e8f0'}`,
                    borderRadius: '14px',
                    padding: '0.9rem 1.15rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{item.filename}</strong>
                      {isCurrent && <span className="badge badge-sky">Active Studio</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <span style={{ color: isCompleted ? '#059669' : '#d97706', fontWeight: 600 }}>
                        {item.status}
                      </span>
                      <span>&bull;</span>
                      <span>{item.feature_count ?? '—'} features</span>
                      <span>&bull;</span>
                      <span className="font-mono">{item.crs || 'CRS Auto'}</span>
                      <span>&bull;</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => { onLoadDataset(item.id); onClose(); }}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <FolderOpen size={14} color="#4f46e5" />
                      <span>Load</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: '#fff1f2',
                        border: '1px solid #fecdd3',
                        color: '#e11d48',
                        borderRadius: '8px',
                        padding: '0.4rem 0.6rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}>
          <button onClick={fetchHistory} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
