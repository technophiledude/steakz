import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface User    { id: number; name: string; email: string; role: string; isActive: boolean; branchId: number | null; branch?: { name: string; city: string } | null; createdAt: string; }
interface Branch  { id: number; name: string; city: string; }

const ROLE_BADGE: Record<string, string> = {
  ADMIN:       'badge-red',
  OPERATIONAL: 'badge-blue',
  MANAGEMENT:  'badge-accent',
  SENIOR:      'badge-green',
};

export default function AdminUsersPage() {
  const [users,    setUsers]    = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showNew,  setShowNew]  = useState(false);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('OPERATIONAL');
  const [branchId, setBranchId] = useState('');
  const [msg,      setMsg]      = useState('');
  const [filter,   setFilter]   = useState('');

  useEffect(() => {
    void api.get<User[]>('/api/admin/users').then((r) => setUsers(r.data));
    void api.get<Branch[]>('/api/admin/branches').then((r) => setBranches(r.data));
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/admin/users', { name, email, password, role, branchId: branchId ? parseInt(branchId) : undefined });
      setName(''); setEmail(''); setPassword(''); setRole('OPERATIONAL'); setBranchId(''); setShowNew(false);
      setMsg('✅ User created.');
      const r = await api.get<User[]>('/api/admin/users');
      setUsers(r.data);
    } catch {
      setMsg('❌ Email already in use or error creating user.');
    }
  }

  async function toggleUser(id: number, isActive: boolean) {
    const endpoint = isActive ? 'terminate' : 'activate';
    await api.patch(`/api/admin/users/${id}/${endpoint}`);
    const r = await api.get<User[]>('/api/admin/users');
    setUsers(r.data);
  }

  const filtered = filter
    ? users.filter((u) => u.name.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase()) || u.role === filter)
    : users;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>User Management</h1>
            <p>Manage all Steakz staff accounts and access levels</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Add User</button>
        </div>
      </div>

      {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input className="form-input" style={{ maxWidth: 280 }} placeholder="Search by name or email…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className="form-select" style={{ maxWidth: 160 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="SENIOR">Senior</option>
          <option value="MANAGEMENT">Management</option>
          <option value="OPERATIONAL">Operational</option>
        </select>
        {filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter('')}>Clear</button>}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-muted'}`}>{u.role}</span></td>
                  <td style={{ fontSize: 12 }}>{u.branch ? `${u.branch.name}` : '—'}</td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                  <td>
                    {u.role !== 'ADMIN' && (
                      <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-secondary'}`} onClick={() => toggleUser(u.id, u.isActive)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add New User</div>
            <form onSubmit={createUser}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="OPERATIONAL">Operational Staff</option>
                    <option value="MANAGEMENT">Management</option>
                    <option value="SENIOR">Senior Leadership</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Branch (optional for Senior/Admin)</label>
                <select className="form-select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">No branch assigned</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.city}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
