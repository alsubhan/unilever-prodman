import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  draft: 'badge-gray', pending_approval: 'badge-orange',
  approved: 'badge-green', in_progress: 'badge-cyan',
  completed: 'badge-blue', cancelled: 'badge-red'
};

const STATUS_FLOW = { draft: ['pending_approval'], pending_approval: ['approved', 'draft'], approved: ['cancelled'], in_progress: ['completed', 'cancelled'] };

export default function ProductionPlanningPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [machines, setMachines] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ machine_id:'', raw_material_id:'', start_datetime:'', end_datetime:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const [p, m, rm] = await Promise.all([api.getProductionPlans(), api.getPackingMachines(), api.getRawMaterials()]);
    setPlans(p); setMachines(m.filter(m => m.is_active)); setMaterials(rm.filter(r => r.is_active));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isManager = ['admin', 'production_manager'].includes(user?.role);

  const filtered = filter === 'all' ? plans : plans.filter(p => p.status === filter);

  const openCreate = () => {
    setEditing(null);
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60000);
    const end = new Date(now.getTime() + 9 * 60 * 60000);
    setForm({
      machine_id: '', raw_material_id: '',
      start_datetime: start.toISOString().slice(0,16),
      end_datetime: end.toISOString().slice(0,16),
      notes: ''
    });
    setError(''); setShowModal(true);
  };
  const openEdit = (plan) => {
    setEditing(plan);
    setForm({ machine_id:plan.machine_id, raw_material_id:plan.raw_material_id, start_datetime:plan.start_datetime.slice(0,16), end_datetime:plan.end_datetime.slice(0,16), notes:plan.notes||'' });
    setError(''); setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.updateProductionPlan(editing.id, form);
      else await api.createProductionPlan(form);
      await load(); setShowModal(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleAction = async (plan, action) => {
    const labels = { pending_approval:'Submit for Approval', approved:'Approve', draft:'Reject (Back to Draft)', cancelled:'Cancel', completed:'Mark as Completed' };
    if (!window.confirm(`${labels[action] || action} plan #${plan.id}?`)) return;
    try {
      if (action === 'pending_approval') await api.submitPlan(plan.id);
      else if (action === 'approved') await api.approvePlan(plan.id);
      else if (action === 'draft') await api.rejectPlan(plan.id);
      else if (action === 'cancelled') await api.cancelPlan(plan.id);
      else if (action === 'completed') await api.completePlan(plan.id);
      await load();
    } catch (err) { alert(err.message); }
  };

  const STATUSES = ['all', 'draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Production Planning</h1>
          <p className="page-subtitle">Schedule and manage production plans with approval workflow</p>
        </div>
        <button id="create-plan-btn" className="btn btn-primary" onClick={openCreate}>+ New Plan</button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:'flex', gap:'6px', marginBottom:'20px', flexWrap:'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform:'capitalize' }}>
            {s === 'all' ? `All (${plans.length})` : `${s.replace('_',' ')} (${plans.filter(p=>p.status===s).length})`}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr>
              <th>#</th><th>Machine</th><th>Raw Material</th><th>Start</th><th>End</th><th>Status</th><th>Created By</th><th>Approved By</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Loading...</td></tr>}
              {filtered.map(plan => (
                <tr key={plan.id}>
                  <td><strong>#{plan.id}</strong></td>
                  <td>
                    <div><strong>{plan.machine_name}</strong></div>
                    <code style={{ fontSize:'0.7rem', color:'var(--accent)' }}>{plan.machine_code}</code>
                  </td>
                  <td>
                    <div>{plan.raw_material_name}</div>
                    <code style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{plan.part_number}</code>
                  </td>
                  <td className="text-sm">{new Date(plan.start_datetime).toLocaleString('en-GB', {dateStyle:'short',timeStyle:'short'})}</td>
                  <td className="text-sm">{new Date(plan.end_datetime).toLocaleString('en-GB', {dateStyle:'short',timeStyle:'short'})}</td>
                  <td><span className={`badge ${STATUS_COLORS[plan.status]}`} style={{ textTransform:'capitalize' }}>{plan.status.replace('_',' ')}</span></td>
                  <td className="text-muted text-sm">{plan.created_by_name||'—'}</td>
                  <td className="text-muted text-sm">{plan.approved_by_name||'—'}</td>
                  <td>
                    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                      {(STATUS_FLOW[plan.status] || []).map(nextStatus => {
                        if (nextStatus === 'approved' && !isManager) return null;
                        const btnMap = { pending_approval:'Submit', approved:'✅ Approve', draft:'❌ Reject', cancelled:'🚫 Cancel', completed:'✅ Complete' };
                        const clsMap = { approved:'btn-success', draft:'btn-warning', cancelled:'btn-danger', pending_approval:'btn-primary', completed:'btn-success' };
                        return (
                          <button key={nextStatus} className={`btn btn-sm ${clsMap[nextStatus]||'btn-secondary'}`}
                            onClick={() => handleAction(plan, nextStatus)}>
                            {btnMap[nextStatus]}
                          </button>
                        );
                      })}
                      {['draft','pending_approval'].includes(plan.status) && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(plan)}>✏️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>No plans found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="alert alert-info mt-4">
        <span>ℹ️</span>
        <span>Workflow: <strong>Draft</strong> → <strong>Pending Approval</strong> → <strong>Approved</strong> (by Production Manager) → <strong>In Progress</strong> (auto on first scan) → <strong>Completed</strong>. Any changes to approved plans require re-approval.</span>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? `Edit Plan #${editing.id}` : 'Create Production Plan'}</h3>
              <button className="btn btn-sm btn-secondary btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:'16px' }}>⚠️ {error}</div>}
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Packing Machine</label>
                  <select className="form-select" value={form.machine_id} onChange={e => setForm({...form, machine_id:e.target.value})} required>
                    <option value="">— Select Machine —</option>
                    {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.machine_code})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Raw Material</label>
                  <select className="form-select" value={form.raw_material_id} onChange={e => setForm({...form, raw_material_id:e.target.value})} required>
                    <option value="">— Select Raw Material —</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.part_number})</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date & Time</label>
                  <input className="form-input" type="datetime-local" value={form.start_datetime} onChange={e => setForm({...form, start_datetime:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date & Time</label>
                  <input className="form-input" type="datetime-local" value={form.end_datetime} onChange={e => setForm({...form, end_datetime:e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Any additional notes..." />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Plan' : 'Create Plan')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
