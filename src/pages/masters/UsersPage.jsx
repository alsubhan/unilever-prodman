import { useState, useEffect } from 'react';
import api from '../../utils/api';

const ROLES = ['admin', 'production_manager', 'operator', 'viewer'];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'operator' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ username: '', password: '', full_name: '', role: 'operator' });
    setError('');
    setShowModal(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, password: '', full_name: u.full_name, role: u.role });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.updateUser(editing.id, form);
      } else {
        await api.createUser(form);
      }
      await load();
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await api.deleteUser(id); await load(); } catch (err) { alert(err.message); }
  };

  const handleToggleActive = async (u) => {
    try { await api.updateUser(u.id, { is_active: u.is_active ? 0 : 1 }); await load(); } catch (err) { alert(err.message); }
  };

  const roleBadge = (role) => {
    const map = { admin: 'badge-red', production_manager: 'badge-orange', operator: 'badge-blue', viewer: 'badge-gray' };
    return <span className={`badge ${map[role] || 'badge-gray'}`}>{role.replace('_', ' ')}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Master</h1>
          <p className="page-subtitle">Manage system users and their roles</p>
        </div>
        <button id="create-user-btn" className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
          <div className="search-bar">
            <span>🔍</span>
            <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} id="user-search" />
          </div>
          <span className="text-muted text-sm">{filtered.length} users</span>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>Full Name</th><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Loading...</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.full_name}</strong></td>
                  <td><code style={{ color:'var(--accent)', fontSize:'0.8rem' }}>{u.username}</code></td>
                  <td>{roleBadge(u.role)}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>✏️ Edit</button>
                      <button className="btn btn-sm btn-warning" onClick={() => handleToggleActive(u)}>
                        {u.is_active ? '⏸ Disable' : '▶ Enable'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit User' : 'Create User'}</h3>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠️ {error}</div>}
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" value={form.username} onChange={e => setForm({...form, username:e.target.value})} required disabled={!!editing} placeholder="e.g. jsmith" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password {editing && '(leave blank to keep)'}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} required={!editing} placeholder="••••••••" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} required placeholder="John Smith" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm({...form, role:e.target.value})}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
