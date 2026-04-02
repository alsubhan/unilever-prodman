import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function FinishedGoodsPage() {
  const [items, setItems] = useState([]);
  const [pms, setPms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ part_number: '', name: '', description: '', packing_material_ids: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [fgData, pmData] = await Promise.all([
        api.getFinishedGoods(),
        api.getPackingMaterials()
      ]);
      setItems(fgData);
      setPms(pmData.filter(p => p.is_active));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.part_number.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ part_number: '', name: '', description: '', packing_material_ids: [] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      part_number: item.part_number,
      name: item.name,
      description: item.description || '',
      packing_material_ids: item.packing_materials ? item.packing_materials.map(pm => pm.id) : []
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.packing_material_ids.length === 0) {
      setError('Please select at least one packing material');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) await api.updateFinishedGood(editing.id, form);
      else await api.createFinishedGood(form);
      await load();
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this finished good?')) return;
    try {
      await api.deleteFinishedGood(id);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const togglePM = (pmId) => {
    setForm(prev => {
      const ids = prev.packing_material_ids.includes(pmId)
        ? prev.packing_material_ids.filter(id => id !== pmId)
        : [...prev.packing_material_ids, pmId];
      return { ...prev, packing_material_ids: ids };
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Finished Goods Master</h1>
          <p className="page-subtitle">Manage FG Pouches and their packing material requirements</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Finished Good</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="Search by name or part no..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-muted text-sm">{filtered.length} items</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Part Number</th>
                <th>Name</th>
                <th>Packing Materials</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>}
              {filtered.map(item => (
                <tr key={item.id}>
                  <td><code style={{ color: 'var(--accent)' }}>{item.part_number}</code></td>
                  <td>
                    <strong>{item.name}</strong>
                    <div className="text-muted text-xs">{item.description}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {item.packing_materials && item.packing_materials.map(pm => (
                        <span key={pm.id} className="badge badge-cyan" title={pm.name}>{pm.part_number}</span>
                      ))}
                      {(!item.packing_materials || item.packing_materials.length === 0) && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td><span className={`badge ${item.is_active ? 'badge-green' : 'badge-red'}`}>{item.is_active ? '● Active' : '● Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(item)}>✏️ Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No finished goods found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Finished Good' : 'Add Finished Good'}</h3>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Part Number (Barcode)</label>
                <input className="form-input" value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} required placeholder="FG-001" />
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="FG Pouch Name" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              
              <div className="form-group">
                <label className="form-label">Associate Packing Materials (Select at least one)</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}>
                  {pms.map(pm => (
                    <div key={pm.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px', borderBottom: '1px solid var(--border-light)' }}>
                      <input type="checkbox" checked={form.packing_material_ids.includes(pm.id)} onChange={() => togglePM(pm.id)} id={`pm-${pm.id}`} />
                      <label htmlFor={`pm-${pm.id}`} style={{ cursor: 'pointer', flex: 1 }}>
                        <strong>{pm.part_number}</strong> - {pm.name}
                      </label>
                    </div>
                  ))}
                  {pms.length === 0 && <div className="text-muted text-center p-4">No active packing materials found</div>}
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
