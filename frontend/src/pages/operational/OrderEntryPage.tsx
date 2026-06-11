import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface MenuItem { id: number; name: string; category: string; price: number; }
interface OrderItem { menuItemId: number; name: string; price: number; quantity: number; }
interface Order {
  id: number; tableNumber: number | null; status: string; total: number;
  items: Array<{ menuItem: MenuItem; quantity: number; unitPrice: number }>;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:     'badge-yellow',
  IN_PROGRESS: 'badge-blue',
  COMPLETED:   'badge-green',
  CANCELLED:   'badge-red',
};

export default function OrderEntryPage() {
  const [menu,       setMenu]       = useState<MenuItem[]>([]);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [cart,       setCart]       = useState<OrderItem[]>([]);
  const [tableNo,    setTableNo]    = useState('');
  const [msg,        setMsg]        = useState('');
  const [activeTab,  setActiveTab]  = useState<'new' | 'today'>('new');

  useEffect(() => {
    void api.get<MenuItem[]>('/api/operational/menu').then((r) => setMenu(r.data));
    void loadOrders();
  }, []);

  async function loadOrders() {
    const r = await api.get<Order[]>('/api/operational/orders');
    setOrders(r.data);
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function removeFromCart(id: number) {
    setCart((prev) => prev.filter((c) => c.menuItemId !== id));
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) => prev
      .map((c) => c.menuItemId === id ? { ...c, quantity: c.quantity + delta } : c)
      .filter((c) => c.quantity > 0)
    );
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  async function submitOrder() {
    if (cart.length === 0) return;
    setMsg('');
    try {
      await api.post('/api/operational/orders', {
        tableNumber: tableNo ? parseInt(tableNo) : null,
        items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
      });
      setCart([]);
      setTableNo('');
      setMsg('✅ Order placed successfully!');
      await loadOrders();
    } catch {
      setMsg('❌ Failed to place order.');
    }
  }

  async function updateStatus(orderId: number, status: string) {
    await api.patch(`/api/operational/orders/${orderId}/status`, { status });
    await loadOrders();
  }

  const categories = [...new Set(menu.map((m) => m.category))].sort();

  return (
    <div>
      <div className="page-header">
        <h1>Order Entry</h1>
        <p>Create new orders and manage today's service</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'new'   ? 'active' : ''}`} onClick={() => setActiveTab('new')}>New Order</button>
        <button className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`} onClick={() => setActiveTab('today')}>Today's Orders ({orders.length})</button>
      </div>

      {activeTab === 'new' && (
        <div className="two-col">
          {/* Menu */}
          <div>
            {categories.map((cat) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {menu.filter((m) => m.category === cat).map((item) => (
                    <button key={item.id} className="btn btn-secondary" style={{ justifyContent: 'space-between', padding: '10px 14px' }} onClick={() => addToCart(item)}>
                      <span style={{ fontSize: 13 }}>{item.name}</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>£{item.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cart */}
          <div>
            <div className="card">
              <div className="section-header">
                <div className="section-title">Current Order</div>
              </div>
              <div className="form-group">
                <label className="form-label">Table Number (optional)</label>
                <input className="form-input" type="number" value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="e.g. 5" />
              </div>

              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <p>No items added yet.<br />Tap items from the menu to add them.</p>
                </div>
              ) : (
                <>
                  {cart.map((c) => (
                    <div key={c.menuItemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>£{c.price.toFixed(2)} each</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => changeQty(c.menuItemId, -1)}>−</button>
                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{c.quantity}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => changeQty(c.menuItemId, 1)}>+</button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeFromCart(c.menuItemId)}>✕</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 18, fontWeight: 700 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent)' }}>£{cartTotal.toFixed(2)}</span>
                  </div>
                  {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`} style={{ marginTop: 12 }}>{msg}</div>}
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: 12 }} onClick={submitOrder}>
                    Place Order — £{cartTotal.toFixed(2)}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'today' && (
        <div className="card">
          {orders.length === 0 ? (
            <div className="empty-state"><div className="icon">🍽️</div><p>No orders today yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Table</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th><th>Action</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><strong>#{o.id}</strong></td>
                      <td>{o.tableNumber ?? '—'}</td>
                      <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-muted)' }}>
                        {o.items.map((i) => `${i.menuItem.name} ×${i.quantity}`).join(', ')}
                      </td>
                      <td><strong>£{o.total.toFixed(2)}</strong></td>
                      <td><span className={`badge ${STATUS_BADGE[o.status] ?? 'badge-muted'}`}>{o.status.replace('_', ' ')}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        {o.status === 'PENDING'     && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(o.id, 'IN_PROGRESS')}>Start</button>}
                        {o.status === 'IN_PROGRESS' && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(o.id, 'COMPLETED')}>Complete</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
