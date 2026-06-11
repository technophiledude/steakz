import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface StockItem {
  id: number; name: string; category: string; unit: string; currentQuantity: number; reorderThreshold: number;
  branch: { name: string; city: string };
}
interface StockRequest {
  id: number; quantity: number; notes: string | null; status: string; createdAt: string;
  stockItem: { name: string; unit: string; branch: { name: string } };
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'badge-yellow',
  APPROVED:  'badge-blue',
  REJECTED:  'badge-red',
  FULFILLED: 'badge-green',
};

export default function InventoryPage() {
  const [items,    setItems]    = useState<StockItem[]>([]);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [lowCount, setLowCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'stock' | 'requests'>('stock');
  const [adjustId, setAdjustId] = useState<number | null>(null);
  const [adjQty,   setAdjQty]   = useState('');
  const [adjType,  setAdjType]  = useState<'IN' | 'OUT'>('IN');
  const [adjNotes, setAdjNotes] = useState('');
  const [msg,      setMsg]      = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    const [inv, req] = await Promise.all([
      api.get<{ items: StockItem[]; lowStockCount: number }>('/api/management/inventory'),
      api.get<StockRequest[]>('/api/management/inventory/requests'),
    ]);
    setItems(inv.data.items);
    setLowCount(inv.data.lowStockCount);
    setRequests(req.data);
  }

  async function updateRequest(id: number, status: string) {
    await api.patch(`/api/management/inventory/requests/${id}`, { status });
    await load();
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustId) return;
    setMsg('');
    try {
      await api.patch(`/api/management/inventory/${adjustId}/adjust`, { quantity: parseFloat(adjQty), type: adjType, notes: adjNotes || undefined });
      setAdjustId(null); setAdjQty(''); setAdjNotes('');
      setMsg('✅ Stock adjusted.');
      await load();
    } catch {
      setMsg('❌ Failed to adjust stock.');
    }
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div>
      <div className="page-header">
        <h1>Inventory Management</h1>
        <p>Monitor stock levels and manage replenishment requests</p>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Total Items Tracked</div>
          <div className="card-value">{items.length}</div>
        </div>
        <div className="card" style={{ borderColor: lowCount > 0 ? 'var(--red)' : undefined }}>
          <div className="card-title">Low Stock Alerts</div>
          <div className="card-value" style={{ color: lowCount > 0 ? 'var(--red)' : 'var(--green)' }}>{lowCount}</div>
        </div>
        <div className="card">
          <div className="card-title">Pending Requests</div>
          <div className="card-value">{requests.filter((r) => r.status === 'PENDING').length}</div>
        </div>
      </div>

      {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>{msg}</div>}

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'stock'    ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>Stock Levels</button>
        <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>Requests ({requests.filter(r => r.status === 'PENDING').length})</button>
      </div>

      {activeTab === 'stock' && (
        <div className="card">
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{cat}</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item</th><th>Branch</th><th>Current Stock</th><th>Reorder At</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {items.filter((i) => i.category === cat).map((i) => (
                      <tr key={i.id}>
                        <td><strong>{i.name}</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.branch?.name}</td>
                        <td><strong>{i.currentQuantity} {i.unit}</strong></td>
                        <td style={{ color: 'var(--text-muted)' }}>{i.reorderThreshold} {i.unit}</td>
                        <td>
                          {i.currentQuantity <= i.reorderThreshold
                            ? <span className="badge badge-red">Low Stock ⚠️</span>
                            : i.currentQuantity <= i.reorderThreshold * 1.5
                            ? <span className="badge badge-yellow">Running Low</span>
                            : <span className="badge badge-green">OK</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setAdjustId(i.id); setMsg(''); }}>
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="card">
          {requests.length === 0 ? (
            <div className="empty-state"><div className="icon">📦</div><p>No requests.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Branch</th><th>Qty</th><th>Notes</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.stockItem.name}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.stockItem.branch?.name}</td>
                      <td>{r.quantity} {r.stockItem.unit}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.notes ?? '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-muted'}`}>{r.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-GB')}</td>
                      <td>
                        {r.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => updateRequest(r.id, 'APPROVED')}>Approve</button>
                            <button className="btn btn-danger btn-sm"    onClick={() => updateRequest(r.id, 'REJECTED')}>Reject</button>
                          </div>
                        )}
                        {r.status === 'APPROVED' && (
                          <button className="btn btn-primary btn-sm" onClick={() => updateRequest(r.id, 'FULFILLED')}>Fulfil</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjust modal */}
      {adjustId !== null && (
        <div className="modal-overlay" onClick={() => setAdjustId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Adjust Stock — {items.find((i) => i.id === adjustId)?.name}</div>
            <form onSubmit={handleAdjust}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={adjType} onChange={(e) => setAdjType(e.target.value as 'IN' | 'OUT')}>
                    <option value="IN">Stock In (+)</option>
                    <option value="OUT">Stock Out (−)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity ({items.find((i) => i.id === adjustId)?.unit})</label>
                  <input className="form-input" type="number" step="0.1" min="0.1" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Reason for adjustment…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAdjustId(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
