import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface TrendDay  { date: string; _sum: { totalRevenue: number; orderCount: number; covers: number } }
interface BranchComp { branch?: { name: string; city: string }; totalRevenue: number; totalOrders: number; avgSpend: number }
interface CompSummary { type: string; _count: { id: number } }
interface LowStock  { id: number; name: string; currentQuantity: number; unit: string; reorderThreshold: number; branch: { name: string } }

const COMPLIANCE_ICONS: Record<string, string> = {
  FOOD_SAFETY: '🍱', ALLERGEN: '⚠️', TEMPERATURE_LOG: '🌡️', HYGIENE_AUDIT: '🧹',
};

function fmt(n: number) { return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }

export default function AnalyticsPage() {
  const [trend,       setTrend]       = useState<TrendDay[]>([]);
  const [byBranch,    setByBranch]    = useState<BranchComp[]>([]);
  const [compliance,  setCompliance]  = useState<CompSummary[]>([]);
  const [lowStock,    setLowStock]    = useState<LowStock[]>([]);
  const [days,        setDays]        = useState(90);

  useEffect(() => {
    void api.get<{ salesTrend: TrendDay[]; branchComparison: BranchComp[]; complianceSummary: CompSummary[]; lowStockAlerts: LowStock[] }>(
      `/api/senior/analytics?days=${days}`
    ).then((r) => {
      setTrend(r.data.salesTrend);
      setByBranch(r.data.branchComparison);
      setCompliance(r.data.complianceSummary);
      setLowStock(r.data.lowStockAlerts);
    });
  }, [days]);

  const maxRev = Math.max(...trend.map((d) => d._sum.totalRevenue ?? 0), 1);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Analytics</h1>
            <p>Deep-dive performance data across the Steakz estate</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[30, 60, 90].map((d) => (
              <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue trend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Company-Wide Revenue Trend ({days} days)</div>
        <div className="bar-chart" style={{ height: 160 }}>
          {trend.map((d) => (
            <div key={String(d.date)} className="bar" style={{ height: `${((d._sum.totalRevenue ?? 0) / maxRev) * 100}%` }}>
              <div className="bar-tooltip">
                {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br />
                {fmt(d._sum.totalRevenue ?? 0)}<br />
                {d._sum.orderCount} orders
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Branch comparison */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Branch Comparison</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Branch</th><th>Revenue</th><th>Orders</th><th>Avg Spend</th></tr></thead>
              <tbody>
                {byBranch.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <div><strong>{b.branch?.name}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.branch?.city}</div>
                    </td>
                    <td><strong style={{ color: 'var(--accent)' }}>{fmt(b.totalRevenue)}</strong></td>
                    <td>{b.totalOrders.toLocaleString()}</td>
                    <td>{fmt(b.avgSpend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance overview */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Compliance Activity</div>
          {compliance.length === 0 ? (
            <div className="empty-state"><p>No compliance records in period.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {compliance.map((c) => (
                <div key={c.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 20 }}>{COMPLIANCE_ICONS[c.type] ?? '📋'}</span>
                    <span style={{ fontWeight: 500 }}>{c.type.replace('_', ' ')}</span>
                  </div>
                  <span className="badge badge-accent">{c._count.id} records</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16, color: 'var(--red)' }}>⚠️ Low Stock Alerts ({lowStock.length})</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Branch</th><th>Current</th><th>Reorder At</th><th>Urgency</th></tr></thead>
              <tbody>
                {lowStock.map((s) => {
                  const pct = (s.currentQuantity / s.reorderThreshold) * 100;
                  return (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.branch?.name}</td>
                      <td><strong style={{ color: 'var(--red)' }}>{s.currentQuantity} {s.unit}</strong></td>
                      <td>{s.reorderThreshold} {s.unit}</td>
                      <td>
                        {pct < 50
                          ? <span className="badge badge-red">Critical</span>
                          : <span className="badge badge-yellow">Low</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
