import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function ShiftsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', start_time: '06:00', end_time: '14:00' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getShifts().then(setItems).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name:'', start_time:'06:00', end_time:'14:00' });
    setError('');
    setShowModal(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ name:item.name, start_time:item.start_time, end_time:item.end_time });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await api.updateShift(editing.id, form);
      else await api.createShift(form);
      await load();
      setShowModal(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this shift?')) return;
    try { await api.deleteShift(id); await load(); } catch (err) { alert(err.message); }
  };

  const handleToggle = async (item) => {
    try { await api.updateShift(item.id, { is_active: item.is_active ? 0 : 1 }); await load(); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shift Master</h1>
          <p className="page-subtitle">Manage production shifts and timings</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Shift</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>Shift Name</th><th>Start Time</th><th>End Time</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Loading...</td></tr>}
              {items.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td><code className="text-sm">{item.start_time}</code></td>
                  <td><code className="text-sm">{item.end_time}</code></td>
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
              {!loading && items.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>No shifts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Shift' : 'Add Shift'}</h3>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:'16px' }}>⚠️ {error}</div>}
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div className="form-group">
                <label className="form-label">Shift Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({...form, name:e.target.value})} required placeholder="e.g. Shift A" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" className="form-input" value={form.start_time} onChange={e => setForm({...form, start_time:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" className="form-input" value={form.end_time} onChange={e => setForm({...form, end_time:e.target.value})} required />
                </div>
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
