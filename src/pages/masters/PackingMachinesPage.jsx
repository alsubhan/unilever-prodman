import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function PackingMachinesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ machine_code:'', name:'', description:'', location:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getPackingMachines().then(setItems).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.machine_code.toLowerCase().includes(search.toLowerCase()) ||
    (i.location||'').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm({ machine_code:'', name:'', description:'', location:'' }); setError(''); setShowModal(true); };
  const openEdit = (item) => { setEditing(item); setForm({ machine_code:item.machine_code, name:item.name, description:item.description||'', location:item.location||'' }); setError(''); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api.updatePackingMachine(editing.id, form);
      else await api.createPackingMachine(form);
      await load();
      setShowModal(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this packing machine?')) return;
    try { await api.deletePackingMachine(id); await load(); } catch (err) { alert(err.message); }
  };

  const handleToggle = async (item) => {
    try { await api.updatePackingMachine(item.id, { is_active: item.is_active ? 0 : 1 }); await load(); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Packing Machine Master</h1>
          <p className="page-subtitle">Manage packing machines and their unique barcodes</p>
        </div>
        <button id="create-machine-btn" className="btn btn-primary" onClick={openCreate}>+ Add Machine</button>
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px', alignItems:'center' }}>
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="Search machines..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-muted text-sm">{filtered.length} machines</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>Machine Code (Barcode)</th><th>Name</th><th>Location</th><th>Description</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Loading...</td></tr>}
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'18px' }}>⚙️</span>
                      <code style={{ color:'var(--accent)', fontWeight:'700' }}>{item.machine_code}</code>
                    </div>
                  </td>
                  <td><strong>{item.name}</strong></td>
                  <td><span className="badge badge-cyan">📍 {item.location||'—'}</span></td>
                  <td className="text-muted">{item.description||'—'}</td>
                  <td><span className={`badge ${item.is_active ? 'badge-green' : 'badge-red'}`}>{item.is_active ? '● Active' : '● Inactive'}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(item)}>✏️ Edit</button>
                      <button className="btn btn-sm btn-warning" onClick={() => handleToggle(item)}>{item.is_active ? '⏸' : '▶'}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>No machines found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Machine' : 'Add Packing Machine'}</h3>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:'16px' }}>⚠️ {error}</div>}
            <div className="alert alert-info" style={{ marginBottom:'16px' }}>
              <span>ℹ️</span>
              <span>The <strong>Machine Code</strong> is printed as a barcode on the machine. Operators scan this first to identify the machine.</span>
            </div>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Machine Code (Barcode ID)</label>
                  <input className="form-input" value={form.machine_code} onChange={e => setForm({...form, machine_code:e.target.value})} required placeholder="PM-A1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Line</label>
                  <input className="form-input" value={form.location} onChange={e => setForm({...form, location:e.target.value})} placeholder="Line A" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Machine Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name:e.target.value})} required placeholder="Packing Machine A1" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Optional notes" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update' : 'Add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
