import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface Branch { id: number; name: string; location: string; city: string; phone: string | null; isActive: boolean; _count: { users: number; orders: number }; }

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showNew,  setShowNew]  = useState(false);
  const [name,     setName]     = useState('');
  const [location, setLocation] = useState('');
  const [city,     setCity]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [msg,      setMsg]      = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    const r = await api.get<Branch[]>('/api/admin/branches');
    setBranches(r.data);
  }

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/admin/branches', { name, location, city, phone: phone || undefined });
      setName(''); setLocation(''); setCity(''); setPhone(''); setShowNew(false);
      setMsg('✅ Branch created.');
      await load();
    } catch {
      setMsg('❌ Failed to create branch.');
    }
  }

  async function toggleBranch(id: number) {
    await api.patch(`/api/admin/branches/${id}/toggle`);
    await load();
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Branch Management</h1>
            <p>Manage Steakz restaurant locations across the UK</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Add Branch</button>
        </div>
      </div>

      {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {branches.map((b) => (
          <div key={b.id} className="card" style={{ opacity: b.isActive ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>🏢 {b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{b.location}, {b.city}</div>
                {b.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.phone}</div>}
              </div>
              <span className={`badge ${b.isActive ? 'badge-green' : 'badge-red'}`}>
                {b.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              <span>👥 {b._count.users} staff</span>
              <span>🍽️ {b._count.orders} orders</span>
            </div>
            <button className={`btn btn-sm ${b.isActive ? 'btn-danger' : 'btn-secondary'}`} onClick={() => toggleBranch(b.id)}>
              {b.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add New Branch</div>
            <form onSubmit={createBranch}>
              <div className="form-group">
                <label className="form-label">Branch Name</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Steakz Leeds" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Address / Street</label>
                  <input className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 12 Briggate" required />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Leeds" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0113 000 0000" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
