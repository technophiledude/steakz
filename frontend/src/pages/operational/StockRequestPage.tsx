import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface StockItem { id: number; name: string; category: string; unit: string; currentQuantity: number; reorderThreshold: number; }
interface StockRequest { id: number; quantity: number; notes: string | null; status: string; createdAt: string; stockItem: StockItem; }

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'badge-yellow',
  APPROVED:  'badge-blue',
  REJECTED:  'badge-red',
  FULFILLED: 'badge-green',
};

export default function StockRequestPage() {
  const [items,    setItems]    = useState<StockItem[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [selected, setSelected] = useState('');
  const [qty,      setQty]      = useState('');
  const [notes,    setNotes]    = useState('');
  const [msg,      setMsg]      = useState('');

  useEffect(() => {
    void api.get<StockItem[]>('/api/operational/stock').then((r) => setItems(r.data));
    void loadRequests();
  }, []);

  async function loadRequests() {
    const r = await api.get<StockRequest[]>('/api/operational/stock/requests');
    setRequests(r.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/operational/stock/request', {
        stockItemId: parseInt(selected),
        quantity:    parseFloat(qty),
        notes:       notes || undefined,
      });
      setSelected(''); setQty(''); setNotes('');
      setMsg('✅ Stock request submitted.');
      await loadRequests();
    } catch {
      setMsg('❌ Failed to submit request.');
    }
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div>
      <div className="page-header">
        <h1>Stock Requests</h1>
        <p>Request ingredient and supply replenishment</p>
      </div>

      <div className="two-col">
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>New Request</div>
            {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Stock Item</label>
                <select className="form-select" value={selected} onChange={(e) => setSelected(e.target.value)} required>
                  <option value="">Select item…</option>
                  {categories.map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {items.filter((i) => i.category === cat).map((i) => (
                        <option key={i.id} value={i.id}>{i.name} (Current: {i.currentQuantity} {i.unit})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity Requested</label>
                <input className="form-input" type="number" step="0.1" min="0.1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 20" required />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any urgency or special instructions…" />
              </div>
              <button className="btn btn-primary" type="submit">Submit Request</button>
            </form>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 16 }}>Current Stock Levels</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Status</th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td><strong>{i.name}</strong></td>
                      <td><span className="badge badge-muted">{i.category}</span></td>
                      <td>{i.currentQuantity} {i.unit}</td>
                      <td>
                        {i.currentQuantity <= i.reorderThreshold
                          ? <span className="badge badge-red">Low Stock</span>
                          : <span className="badge badge-green">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>My Requests</div>
          {requests.length === 0 ? (
            <div className="empty-state"><div className="icon">📦</div><p>No requests yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map((r) => (
                <div key={r.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong>{r.stockItem.name}</strong>
                    <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-muted'}`}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Qty: {r.quantity} {r.stockItem.unit}
                    {r.notes && <> · {r.notes}</>}
                    <br />{new Date(r.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
