import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function RestorePage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);

  const load = () => api.getBackups().then(b => setBackups(b.filter(b => b.file_exists))).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleRestore = async () => {
    if (!selected) return alert('Please select a backup to restore');
    const confirmed = confirm(
      `⚠️ WARNING: Restoring will REPLACE the current database with the selected backup.\n\nAll data created after this backup will be LOST.\n\nA safety backup will be created automatically before restoring.\n\nAre you absolutely sure?`
    );
    if (!confirmed) return;
    setRestoring(true);
    setResult(null);
    try {
      const res = await api.restoreBackup(selected);
      setResult({ type:'success', message: res.message, safety: res.safety_backup });
    } catch (err) {
      setResult({ type:'error', message: err.message });
    } finally { setRestoring(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Database Restore</h1>
          <p className="page-subtitle">Restore the database from a previous backup</p>
        </div>
      </div>

      <div className="alert alert-warning mb-4">
        <span>⚠️</span>
        <div>
          <strong>Important:</strong> Restoring will replace all current data with the selected backup. This action cannot be undone. A safety backup is automatically created before restore. Please contact the system administrator before proceeding.
        </div>
      </div>

      <div className="card" style={{ maxWidth:'640px' }}>
        <h3 style={{ marginBottom:'20px' }}>Select Backup to Restore</h3>

        {loading ? (
          <div style={{ color:'var(--text-muted)' }}>Loading available backups...</div>
        ) : backups.length === 0 ? (
          <div className="alert alert-error">No available backup files found. Please create a backup first.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
            {backups.map(b => (
              <label key={b.id} style={{
                display:'flex', alignItems:'center', gap:'12px',
                padding:'14px 16px',
                background: selected === b.filename ? 'var(--accent-light)' : 'var(--bg-input)',
                border: `1px solid ${selected === b.filename ? 'var(--border-accent)' : 'var(--border)'}`,
                borderRadius:'var(--radius-md)', cursor:'pointer', transition:'all 150ms'
              }}>
                <input type="radio" name="backup" value={b.filename} checked={selected === b.filename} onChange={() => setSelected(b.filename)} style={{ accentColor:'var(--accent)' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:'0.875rem', color: selected === b.filename ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {b.filename}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'2px' }}>
                    {new Date(b.created_at).toLocaleString('en-GB', {dateStyle:'medium', timeStyle:'short'})} · {b.size_bytes ? `${(b.size_bytes/1024).toFixed(1)} KB` : '?'}  · by {b.created_by_name || 'System'}
                  </div>
                </div>
                <span className="badge badge-green">✓</span>
              </label>
            ))}
          </div>
        )}

        {result && (
          <div className={`alert ${result.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom:'20px' }}>
            <span>{result.type === 'success' ? '✅' : '❌'}</span>
            <div>
              <div>{result.message}</div>
              {result.safety && <div style={{ fontSize:'0.8rem', marginTop:'6px', opacity:0.8 }}>Safety backup: <code>{result.safety}</code></div>}
              {result.type === 'success' && (
                <div style={{ marginTop:'8px', fontWeight:'600' }}>⚡ Please restart the server for changes to take full effect.</div>
              )}
            </div>
          </div>
        )}

        <button
          id="restore-btn"
          className="btn btn-danger btn-lg"
          onClick={handleRestore}
          disabled={restoring || !selected || backups.length === 0}
          style={{ width:'100%', justifyContent:'center' }}
        >
          {restoring ? '⟳ Restoring...' : '🔄 Restore Selected Backup'}
        </button>
      </div>
    </div>
  );
}
