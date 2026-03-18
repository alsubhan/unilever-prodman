import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function RawMaterialUsagePage() {
  const [data, setData] = useState(null);
  const [machines, setMachines] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [filters, setFilters] = useState({ from_date:'', to_date:'', machine_id:'', raw_material_id:'' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getPackingMachines().then(m => setMachines(m));
    api.getRawMaterials().then(r => setMaterials(r));
    handleSearch();
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.machine_id) params.machine_id = filters.machine_id;
      if (filters.raw_material_id) params.raw_material_id = filters.raw_material_id;
      const res = await api.getRawMaterialUsage(params);
      setData(res);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleExportCSV = () => {
    if (!data?.rows?.length) return;
    const headers = ['Scanned At','Machine','Machine Code','Expected Material','Part Number','Scanned Barcode','Valid','Operator'];
    const rows = data.rows.map(r => [
      new Date(r.scanned_at).toLocaleString(),
      r.machine_name, r.machine_code,
      r.expected_material, r.expected_part_number,
      r.scanned_raw_material_barcode,
      r.is_valid ? 'YES' : 'NO',
      r.operator_name || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rm-usage-${Date.now()}.csv`; a.click();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Raw Material Usage Report</h1>
          <p className="page-subtitle">Track all scan validations and material usage</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExportCSV} disabled={!data?.rows?.length}>⬇ Export CSV</button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <form onSubmit={handleSearch}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input className="form-input" type="date" value={filters.from_date} onChange={e => setFilters({...filters, from_date:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input className="form-input" type="date" value={filters.to_date} onChange={e => setFilters({...filters, to_date:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Packing Machine</label>
              <select className="form-select" value={filters.machine_id} onChange={e => setFilters({...filters, machine_id:e.target.value})}>
                <option value="">All Machines</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.machine_code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Raw Material</label>
              <select className="form-select" value={filters.raw_material_id} onChange={e => setFilters({...filters, raw_material_id:e.target.value})}>
                <option value="">All Materials</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.part_number})</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-4" disabled={loading}>{loading ? 'Loading...' : '🔍 Search'}</button>
        </form>
      </div>

      {/* Summary */}
      {data && (
        <>
          <div className="grid-4 mb-6">
            <div className="stat-card"><div className="stat-icon blue">📊</div><div><div className="stat-value">{data.summary.total}</div><div className="stat-label">Total Scans</div></div></div>
            <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-value">{data.summary.valid}</div><div className="stat-label">Valid Scans</div></div></div>
            <div className="stat-card"><div className="stat-icon red">❌</div><div><div className="stat-value">{data.summary.invalid}</div><div className="stat-label">Invalid Scans</div></div></div>
            <div className="stat-card"><div className="stat-icon cyan">💯</div><div><div className="stat-value">{data.summary.success_rate}%</div><div className="stat-label">Success Rate</div></div></div>
          </div>

          <div className="card" style={{ padding:0 }}>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr>
                  <th>Scanned At</th><th>Machine</th><th>Expected Material</th><th>Scanned Barcode</th><th>Result</th><th>Operator</th>
                </tr></thead>
                <tbody>
                  {data.rows.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>No records found</td></tr>
                  )}
                  {data.rows.map((row, i) => (
                    <tr key={i}>
                      <td className="text-sm">{new Date(row.scanned_at).toLocaleString('en-GB', {dateStyle:'short',timeStyle:'medium'})}</td>
                      <td>
                        <div>{row.machine_name}</div>
                        <code style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{row.machine_code}</code>
                      </td>
                      <td>
                        <div>{row.expected_material||'—'}</div>
                        <code style={{ fontSize:'0.7rem', color:'var(--accent)' }}>{row.expected_part_number}</code>
                      </td>
                      <td><code style={{ color: row.is_valid ? 'var(--success)' : 'var(--danger)' }}>{row.scanned_raw_material_barcode}</code></td>
                      <td>
                        {row.is_valid
                          ? <span className="badge badge-green">✅ Valid</span>
                          : <span className="badge badge-red">❌ Invalid</span>}
                      </td>
                      <td className="text-muted">{row.operator_name||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
