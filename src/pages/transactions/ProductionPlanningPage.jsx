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
  const [fgs, setFgs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ machine_id:'', finished_goods_id:'', shift_id:'', batch_number:'', start_datetime:'', end_datetime:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const [p, m, rm, fg, sh] = await Promise.all([
        api.getProductionPlans(),
        api.getPackingMachines(),
        api.getPackingMaterials(),
        api.getFinishedGoods(),
        api.getShifts()
      ]);
      setPlans(p);
      setMachines(m.filter(m => m.is_active));
      setMaterials(rm.filter(r => r.is_active));
      setFgs(fg.filter(f => f.is_active));
      setShifts(sh.filter(s => s.is_active));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      machine_id: '', finished_goods_id: '', shift_id: '', batch_number: '',
      start_datetime: start.toISOString().slice(0,16),
      end_datetime: end.toISOString().slice(0,16),
      notes: ''
    });
    setError(''); setShowModal(true);
  };
  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      machine_id: plan.machine_id,
      finished_goods_id: plan.finished_goods_id || '',
      shift_id: plan.shift_id || '',
      batch_number: plan.batch_number || '',
      start_datetime: plan.start_datetime.slice(0, 16),
      end_datetime: plan.end_datetime.slice(0, 16),
      notes: plan.notes || ''
    });
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
    try {
      if (action === 'pending_approval') await api.submitPlan(plan.id);
      else if (action === 'approved') await api.approvePlan(plan.id);
      else if (action === 'draft') await api.rejectPlan(plan.id);
      else if (action === 'cancelled') await api.cancelPlan(plan.id);
      else if (action === 'completed') await api.completePlan(plan.id);
      await load();
      setError('');
    } catch (err) { 
      setError(err.message || 'Action failed'); 
    }
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

      {error && !showModal && <div className="alert alert-error" style={{ marginBottom:'16px' }}>⚠️ {error} <button style={{float:'right', background:'none', border:'none', cursor:'pointer'}} onClick={() => setError('')}>✕</button></div>}

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
              <th>#</th><th>Machine</th><th>FG & Shift</th><th>Batch #</th><th>Schedule</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={9} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Loading...</td></tr>}
              {filtered.map(plan => (
                <tr key={plan.id}>
                  <td><strong>#{plan.id}</strong></td>
                  <td>
                    {plan.finished_goods_id ? (
                      <div>
                        <div className="badge badge-indigo text-xs" style={{ marginBottom: '4px' }}>FG</div>
                        <div><strong>{plan.finished_good_name}</strong></div>
                        <code style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>{plan.finished_good_part_number}</code>
                        {plan.shift_name && (
                          <div style={{ marginTop:'6px' }}>
                            <span className="badge badge-cyan text-xs">🕒 {plan.shift_name}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-danger text-xs italic">⚠️ FG Missing</div>
                    )}
                  </td>
                  <td><code className="text-sm">{plan.batch_number || '—'}</code></td>
                  <td>
                    <div className="text-sm">
                      <div>Start: {new Date(plan.start_datetime).toLocaleString('en-GB', {dateStyle:'short', timeStyle:'short'})}</div>
                      <div className="text-muted">End: {new Date(plan.end_datetime).toLocaleString('en-GB', {dateStyle:'short', timeStyle:'short'})}</div>
                    </div>
                  </td>
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
        <span>Workflow: <strong>Draft</strong> → <strong>Pending Approval</strong> → <strong>Approved</strong> (by Shift Operator) → <strong>In Progress</strong> (auto on first scan) → <strong>Completed</strong>. Any changes to approved plans require re-approval.</span>
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
                  <label className="form-label">Batch Number</label>
                  <input className="form-input" value={form.batch_number} onChange={e => setForm({...form, batch_number:e.target.value})} placeholder="e.g. B240402-1" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Finished Good</label>
                  <select className="form-select" value={form.finished_goods_id} onChange={e => setForm({...form, finished_goods_id:e.target.value})} required>
                    <option value="">— Select Finished Good —</option>
                    {fgs.map(fg => <option key={fg.id} value={fg.id}>{fg.name} ({fg.part_number})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Shift</label>
                  <select className="form-select" value={form.shift_id} onChange={e => setForm({...form, shift_id:e.target.value})} required>
                    <option value="">— Select Shift —</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>)}
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
