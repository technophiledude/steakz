import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin',             email: 'admin@steakz.co.uk',          password: 'admin123',    role: 'ADMIN' },
  { label: 'Manager (London)',  email: 'sarah.mitchell@steakz.co.uk', password: 'Password1!',  role: 'MANAGEMENT' },
  { label: 'Staff (London)',    email: 'james.obrien@steakz.co.uk',   password: 'Password1!',  role: 'OPERATIONAL' },
  { label: 'Senior Leadership', email: 'emma.clarke@steakz.co.uk',    password: 'Password1!',  role: 'SENIOR' },
];

export default function LoginPage() {
  const { login }                   = useAuth();
  const navigate                    = useNavigate();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch {
      setError('Invalid email or password, or account is inactive.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(acc: typeof DEMO_ACCOUNTS[0]) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  }

  return (
    <div className="login-bg">
      <div className="login-box">
        <div className="login-logo">
          <h1>🥩 STEAKZ</h1>
          <p>Management Information System</p>
        </div>

        {error && <div className="alert-box error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.name@steakz.co.uk"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 600 }}>
            Demo Accounts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'space-between' }}
                onClick={() => fillDemo(acc)}
                type="button"
              >
                <span>{acc.label}</span>
                <span className="badge badge-muted" style={{ fontSize: 10 }}>{acc.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
