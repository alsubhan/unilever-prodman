import { useState, useEffect } from 'react';
import api from '../../utils/api';

const ROLES = ['admin', 'production_manager', 'operator', 'viewer'];
const ROLE_LABELS = {
  admin: 'Admin',
  production_manager: 'Shift Operator',
  operator: 'Dumping Operator',
  viewer: 'Viewer',
};
const MODULES = [
  { key:'users', label:'User Master' },
  { key:'packing_materials', label:'Packing Materials' },
  { key:'packing_machines', label:'Packing Machines' },
  { key:'access_rights', label:'Access Rights' },
  { key:'production_planning', label:'Production Planning' },
  { key:'production_validation', label:'Production Validation' },
  { key:'reports', label:'Reports' },
  { key:'utility', label:'Utility' },
];
const PERMS = ['can_view','can_create','can_edit','can_delete','can_approve'];

export default function AccessRightsPage() {
  const [rights, setRights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const load = () => api.getAccessRights().then(setRights).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const getRight = (role, module) => rights.find(r => r.role === role && r.module === module) || {};

  const handleToggle = async (role, module, perm, currentVal) => {
    const key = `${role}-${module}-${perm}`;
    setSaving(key);
    const existing = getRight(role, module);
    const updated = {
      role, module,
      can_view: existing.can_view || 0,
      can_create: existing.can_create || 0,
      can_edit: existing.can_edit || 0,
      can_delete: existing.can_delete || 0,
      can_approve: existing.can_approve || 0,
      [perm]: currentVal ? 0 : 1
    };
    try {
      await api.updateAccessRight(updated);
      await load();
    } catch (err) { alert(err.message); }
    finally { setSaving(''); }
  };

  const permLabels = { can_view:'View', can_create:'Create', can_edit:'Edit', can_delete:'Delete', can_approve:'Approve' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Access Rights</h1>
          <p className="page-subtitle">Configure role-based permissions per module</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div className="card" style={{ padding:'0', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table className="table" style={{ minWidth:'900px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth:'160px' }}>Module</th>
                  {ROLES.map(role => (
                    <th key={role} colSpan={5} style={{ textAlign:'center', borderLeft:'1px solid var(--border)' }}>
                      <span className={`badge ${role === 'admin' ? 'badge-red' : role === 'production_manager' ? 'badge-orange' : role === 'operator' ? 'badge-blue' : 'badge-gray'}`}>
                        {ROLE_LABELS[role] || role.replace('_', ' ')}
                      </span>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th></th>
                  {ROLES.map(role => PERMS.map(p => (
                    <th key={`${role}-${p}`} style={{ fontSize:'0.6rem', textAlign:'center', padding:'6px 4px', borderLeft: p === 'can_view' ? '1px solid var(--border)' : 'none', color:'var(--text-muted)' }}>
                      {permLabels[p]}
                    </th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(mod => (
                  <tr key={mod.key}>
                    <td style={{ fontWeight:600 }}>{mod.label}</td>
                    {ROLES.map(role => PERMS.map(perm => {
                      const right = getRight(role, mod.key);
                      const val = right[perm] || 0;
                      const key = `${role}-${mod.key}-${perm}`;
                      const isSaving = saving === key;
                      return (
                        <td key={key} style={{ textAlign:'center', padding:'8px 4px', borderLeft: perm === 'can_view' ? '1px solid var(--border)' : 'none' }}>
                          <button
                            onClick={() => handleToggle(role, mod.key, perm, val)}
                            disabled={isSaving}
                            style={{
                              width:'24px', height:'24px',
                              borderRadius:'6px',
                              border: val ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border)',
                              background: val ? 'var(--success-light)' : 'var(--bg-input)',
                              cursor:'pointer',
                              fontSize:'12px',
                              transition:'all 150ms',
                              color: val ? 'var(--success)' : 'var(--text-muted)'
                            }}
                          >
                            {isSaving ? '⟳' : val ? '✓' : ''}
                          </button>
                        </td>
                      );
                    }))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'16px', borderTop:'1px solid var(--border)', display:'flex', gap:'16px', flexWrap:'wrap' }}>
            {Object.entries(permLabels).map(([key, label]) => (
              <span key={key} className="text-muted text-sm">
                <strong style={{ color:'var(--text-primary)' }}>{label}</strong> — {key.replace('can_','').replace('_',' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
