import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#06b6d4','#7c3aed'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'80px', color:'var(--text-muted)' }}>Loading dashboard...</div>;
  if (!data) return null;

  const { stats, plansByStatus, scanTrend, recentPlans } = data;

  const statusChartData = plansByStatus.map(p => ({ name: p.status.replace('_', ' '), value: p.count }));

  const STATUS_BADGE = {
    draft:'badge-gray', pending_approval:'badge-orange', approved:'badge-green',
    in_progress:'badge-cyan', completed:'badge-blue', cancelled:'badge-red'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Production Dashboard</h1>
          <p className="page-subtitle">Real-time overview — refreshes every 30s</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>🔄 Refresh</button>
      </div>

      {/* Stat Cards */}
      <div className="grid-auto mb-6">
        <div className="stat-card">
          <div className="stat-icon blue">🏭</div>
          <div>
            <div className="stat-value">{stats.activePlans}</div>
            <div className="stat-label">Active Plans</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div>
            <div className="stat-value">{stats.pendingApproval}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value">{stats.validScansToday}</div>
            <div className="stat-label">Valid Scans Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🚨</div>
          <div>
            <div className="stat-value">{stats.errorsToday}</div>
            <div className="stat-label">Errors Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan">📊</div>
          <div>
            <div className="stat-value">{stats.totalScansToday > 0 ? Math.round((stats.validScansToday / stats.totalScansToday) * 100) : 100}%</div>
            <div className="stat-label">Scan Success Rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🎯</div>
          <div>
            <div className="stat-value">{stats.completedToday}</div>
            <div className="stat-label">Completed Today</div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-6">
        {/* Scan trend chart */}
        <div className="card">
          <h3 style={{ marginBottom:'20px' }}>📈 Scan Trend (Last 7 Days)</h3>
          {scanTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scanTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} />
                <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} />
                <Tooltip contentStyle={{ background:'#1a2235', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#f1f5f9' }} />
                <Bar dataKey="valid" name="Valid" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="invalid" name="Invalid" fill="#ef4444" radius={[4,4,0,0]} />
                <Legend wrapperStyle={{ color:'#94a3b8', fontSize:'12px' }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:'8px' }}>
              <span style={{ fontSize:'32px' }}>📊</span>
              <span>No scan data yet</span>
            </div>
          )}
        </div>

        {/* Plans by status pie */}
        <div className="card">
          <h3 style={{ marginBottom:'20px' }}>🍕 Plans by Status</h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name}: ${value}`} labelLine={{ stroke:'rgba(255,255,255,0.2)' }}>
                  {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background:'#1a2235', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', color:'#f1f5f9' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:'8px' }}>
              <span style={{ fontSize:'32px' }}>📋</span>
              <span>No plans yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent plans */}
      <div className="card">
        <h3 style={{ marginBottom:'16px' }}>🕐 Recent Production Plans</h3>
        {recentPlans.length === 0 ? (
          <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)' }}>No plans created yet</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr>
                <th>#</th><th>Machine</th><th>Packing Material</th><th>Start</th><th>End</th><th>Status</th>
              </tr></thead>
              <tbody>
                {recentPlans.map(plan => (
                  <tr key={plan.id}>
                    <td><strong>#{plan.id}</strong></td>
                    <td>{plan.machine_name}</td>
                    <td>{plan.packing_material_name}</td>
                    <td className="text-sm">{new Date(plan.start_datetime).toLocaleString('en-GB', {dateStyle:'short',timeStyle:'short'})}</td>
                    <td className="text-sm">{new Date(plan.end_datetime).toLocaleString('en-GB', {dateStyle:'short',timeStyle:'short'})}</td>
                    <td><span className={`badge ${STATUS_BADGE[plan.status]}`} style={{ textTransform:'capitalize' }}>{plan.status.replace('_',' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
