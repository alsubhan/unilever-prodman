import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => api.getBackups().then(setBackups).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleBackup = async () => {
    setCreating(true);
    try {
      const result = await api.createBackup();
      alert(`✅ Backup created: ${result.filename} (${(result.size_bytes / 1024).toFixed(1)} KB)`);
      await load();
    } catch (err) { alert(`❌ Backup failed: ${err.message}`); }
    finally { setCreating(false); }
  };

  const handleDownload = (filename) => {
    window.open(`/api/utility/backup/${filename}`, '_blank');
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Database Backup</h1>
          <p className="page-subtitle">Create and download database backups for disaster recovery</p>
        </div>
        <button id="create-backup-btn" className="btn btn-primary" onClick={handleBackup} disabled={creating}>
          {creating ? '⟳ Creating...' : '💾 Create Backup Now'}
        </button>
      </div>

      <div className="alert alert-info mb-6">
        <span>ℹ️</span>
        <div>
          <strong>About Backups:</strong> Each backup creates a complete copy of the database file. Backups are stored on the server and can be downloaded for off-site storage. It is recommended to take daily backups and store them in a secure location.
        </div>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3>Backup History</h3>
          <span className="text-muted text-sm">{backups.length} backups</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>Filename</th><th>Size</th><th>Created</th><th>Created By</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Loading...</td></tr>}
              {backups.map(b => (
                <tr key={b.id}>
                  <td><code style={{ fontSize:'0.8rem', color:'var(--accent)' }}>{b.filename}</code></td>
                  <td>{formatSize(b.size_bytes)}</td>
                  <td className="text-sm">{new Date(b.created_at).toLocaleString('en-GB', {dateStyle:'medium', timeStyle:'short'})}</td>
                  <td className="text-muted">{b.created_by_name || '—'}</td>
                  <td>
                    {b.file_exists
                      ? <span className="badge badge-green">✓ Available</span>
                      : <span className="badge badge-red">✕ Missing</span>
                    }
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDownload(b.filename)} disabled={!b.file_exists}>
                      ⬇ Download
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && backups.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>No backups yet. Create your first backup above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
