import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface MenuItem { id: number; name: string; category: string; price: number; isActive: boolean; }

export default function AdminMenuPage() {
  const [items,    setItems]    = useState<MenuItem[]>([]);
  const [showNew,  setShowNew]  = useState(false);
  const [name,     setName]     = useState('');
  const [category, setCategory] = useState('Mains');
  const [price,    setPrice]    = useState('');
  const [msg,      setMsg]      = useState('');

  const CATEGORIES = ['Starters', 'Mains', 'Sides', 'Desserts', 'Drinks'];

  useEffect(() => { void load(); }, []);

  async function load() {
    const r = await api.get<MenuItem[]>('/api/admin/menu');
    setItems(r.data);
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/admin/menu', { name, category, price: parseFloat(price) });
      setName(''); setCategory('Mains'); setPrice(''); setShowNew(false);
      setMsg('✅ Menu item created.');
      await load();
    } catch {
      setMsg('❌ Failed to create item.');
    }
  }

  async function toggleItem(id: number) {
    await api.patch(`/api/admin/menu/${id}/toggle`);
    await load();
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Menu Management</h1>
            <p>Manage the Steakz menu — active items appear in order entry</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Add Item</button>
        </div>
      </div>

      {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}

      {categories.map((cat) => (
        <div key={cat} className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            {cat}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {items.filter((i) => i.category === cat).map((item) => (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.5 }}>
                    <td><strong>{item.name}</strong></td>
                    <td><strong style={{ color: 'var(--accent)' }}>£{item.price.toFixed(2)}</strong></td>
                    <td><span className={`badge ${item.isActive ? 'badge-green' : 'badge-red'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className={`btn btn-sm ${item.isActive ? 'btn-danger' : 'btn-secondary'}`} onClick={() => toggleItem(item.id)}>
                        {item.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add Menu Item</div>
            <form onSubmit={createItem}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Beef Wellington" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price (£)</label>
                  <input className="form-input" type="number" step="0.01" min="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 28.95" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
