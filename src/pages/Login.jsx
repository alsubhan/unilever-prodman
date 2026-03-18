import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🏭</div>
        <h1 className="login-title">Production Management</h1>
        <p className="login-subtitle">Sign in to access the system</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: '8px', justifyContent: 'center' }}
          >
            {loading ? <span className="spinner">⟳</span> : '🔑'} {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '28px', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Default Credentials</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
            {[
              { user: 'admin', pass: 'Admin@123', role: 'Admin' },
              { user: 'manager', pass: 'Manager@123', role: 'Production Manager' },
              { user: 'operator1', pass: 'Operator@123', role: 'Operator' },
            ].map(c => (
              <div key={c.user} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span><strong style={{ color: 'var(--text-primary)' }}>{c.user}</strong> / {c.pass}</span>
                <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>{c.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
