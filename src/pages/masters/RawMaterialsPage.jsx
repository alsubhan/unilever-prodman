import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function RawMaterialsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ part_number: '', name: '', description: '', unit: 'kg' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getRawMaterials().then(setItems).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.part_number.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ part_number:'', name:'', description:'', unit:'kg' });
    setError('');
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ part_number:item.part_number, name:item.name, description:item.description||'', unit:item.unit });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api.updateRawMaterial(editing.id, form);
      else await api.createRawMaterial(form);
      await load();
      setShowModal(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this raw material?')) return;
    try { await api.deleteRawMaterial(id); await load(); } catch (err) { alert(err.message); }
  };

  const handleToggle = async (item) => {
    try { await api.updateRawMaterial(item.id, { is_active: item.is_active ? 0 : 1 }); await load(); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Raw Material Master</h1>
          <p className="page-subtitle">Manage raw materials and part numbers</p>
        </div>
        <button id="create-rm-btn" className="btn btn-primary" onClick={openCreate}>+ Add Raw Material</button>
      </div>

      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px', alignItems:'center' }}>
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="Search by name or part no..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-muted text-sm">{filtered.length} materials</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>Part Number</th><th>Name</th><th>Description</th><th>Unit</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Loading...</td></tr>}
              {filtered.map(item => (
                <tr key={item.id}>
                  <td><code style={{ color:'var(--accent)' }}>{item.part_number}</code></td>
                  <td><strong>{item.name}</strong></td>
                  <td className="text-muted">{item.description || '—'}</td>
                  <td><span className="badge badge-cyan">{item.unit}</span></td>
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
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>No raw materials found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Raw Material' : 'Add Raw Material'}</h3>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:'16px' }}>⚠️ {error}</div>}
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Part Number (Barcode)</label>
                  <input className="form-input" value={form.part_number} onChange={e => setForm({...form, part_number:e.target.value})} required placeholder="RM-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-select" value={form.unit} onChange={e => setForm({...form, unit:e.target.value})}>
                    {['kg','g','L','mL','bags','pieces','rolls'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name:e.target.value})} required placeholder="Material name" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Optional description" />
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
