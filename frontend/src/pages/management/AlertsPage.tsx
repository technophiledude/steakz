import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface Alert { id: number; type: string; title: string; message: string; status: string; createdAt: string; branch?: { name: string } | null; }

const TYPE_ICON: Record<string, string> = {
  LOW_STOCK:      '📦',
  HIGH_SALES:     '📈',
  LOW_SALES:      '📉',
  COMPLIANCE_DUE: '📋',
  STAFF_SHORTAGE: '👥',
  SYSTEM:         '⚙️',
};

const TYPE_BADGE: Record<string, string> = {
  LOW_STOCK:      'badge-red',
  HIGH_SALES:     'badge-green',
  LOW_SALES:      'badge-yellow',
  COMPLIANCE_DUE: 'badge-accent',
  STAFF_SHORTAGE: 'badge-yellow',
  SYSTEM:         'badge-blue',
};

const STATUS_BADGE: Record<string, string> = {
  UNREAD:   'badge-red',
  READ:     'badge-muted',
  RESOLVED: 'badge-green',
};

export default function AlertsPage() {
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [type,    setType]    = useState('LOW_STOCK');
  const [title,   setTitle]   = useState('');
  const [message, setMessage] = useState('');
  const [msg,     setMsg]     = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    const r = await api.get<Alert[]>('/api/management/alerts');
    setAlerts(r.data);
  }

  async function markRead(id: number) {
    await api.patch(`/api/management/alerts/${id}/read`);
    await load();
  }

  async function resolve(id: number) {
    await api.patch(`/api/management/alerts/${id}/resolve`);
    await load();
  }

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/management/alerts', { type, title, message });
      setTitle(''); setMessage(''); setShowNew(false);
      setMsg('✅ Alert created.');
      await load();
    } catch {
      setMsg('❌ Failed to create alert.');
    }
  }

  const unread   = alerts.filter((a) => a.status === 'UNREAD');
  const read     = alerts.filter((a) => a.status === 'READ');
  const resolved = alerts.filter((a) => a.status === 'RESOLVED');

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Alerts & Notifications</h1>
            <p>Branch alerts and operational notifications</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Create Alert</button>
        </div>
      </div>

      {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="card" style={{ borderColor: unread.length ? 'var(--red)' : undefined }}>
          <div className="card-title">Unread</div>
          <div className="card-value" style={{ color: unread.length ? 'var(--red)' : 'var(--green)' }}>{unread.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Read</div>
          <div className="card-value">{read.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Resolved</div>
          <div className="card-value" style={{ color: 'var(--green)' }}>{resolved.length}</div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="icon">🔔</div><p>No alerts.</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((a) => (
            <div key={a.id} className="card" style={{ borderLeft: `4px solid ${a.status === 'UNREAD' ? 'var(--red)' : 'var(--border)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22 }}>{TYPE_ICON[a.type] ?? '🔔'}</span>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <strong>{a.title}</strong>
                      <span className={`badge ${TYPE_BADGE[a.type] ?? 'badge-muted'}`}>{a.type.replace('_', ' ')}</span>
                      <span className={`badge ${STATUS_BADGE[a.status] ?? 'badge-muted'}`}>{a.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 600 }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      {a.branch?.name && <>{a.branch.name} · </>}
                      {new Date(a.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {a.status === 'UNREAD'  && <button className="btn btn-ghost btn-sm" onClick={() => markRead(a.id)}>Mark Read</button>}
                  {a.status !== 'RESOLVED' && <button className="btn btn-secondary btn-sm" onClick={() => resolve(a.id)}>Resolve</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Create Alert</div>
            <form onSubmit={createAlert}>
              <div className="form-group">
                <label className="form-label">Alert Type</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  {Object.keys(TYPE_ICON).map((t) => <option key={t} value={t}>{TYPE_ICON[t]} {t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alert title…" required />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue…" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
