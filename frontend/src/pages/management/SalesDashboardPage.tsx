import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface SaleRecord {
  id: number; date: string; totalRevenue: number; orderCount: number; avgSpend: number; covers: number;
  branch: { name: string; city: string };
}
interface SalesSummary { totalRevenue: number; totalOrders: number; avgDailyRevenue: number; avgSpend: number; }
interface BranchStat { branch: { name: string; city: string }; totalRevenue: number; totalOrders: number; avgSpend: number; }

function fmt(n: number) { return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function SalesDashboardPage() {
  const [sales,   setSales]   = useState<SaleRecord[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [byBranch, setByBranch] = useState<BranchStat[]>([]);
  const [days,    setDays]    = useState(30);

  useEffect(() => { void load(); }, [days]);

  async function load() {
    const [s, b] = await Promise.all([
      api.get<{ sales: SaleRecord[]; summary: SalesSummary }>(`/api/management/sales?days=${days}`),
      api.get<BranchStat[]>('/api/management/sales/by-branch'),
    ]);
    setSales(s.data.sales);
    setSummary(s.data.summary);
    setByBranch(b.data);
  }

  // Aggregate daily totals across branches
  const dailyMap = new Map<string, number>();
  for (const s of sales) {
    const d = s.date.split('T')[0] ?? '';
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + s.totalRevenue);
  }
  const dailyRevenue = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxRev = Math.max(...dailyRevenue.map((d) => d[1]), 1);

  const topBranch = byBranch[0];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Sales Dashboard</h1>
            <p>Revenue, orders and performance across branches</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 14, 30].map((d) => (
              <button key={d} className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {summary && (
        <div className="kpi-grid">
          <div className="card">
            <div className="card-title">Total Revenue</div>
            <div className="card-value">{fmt(summary.totalRevenue)}</div>
            <div className="card-sub">Last {days} days</div>
          </div>
          <div className="card">
            <div className="card-title">Total Orders</div>
            <div className="card-value">{summary.totalOrders.toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="card-title">Avg Daily Revenue</div>
            <div className="card-value">{fmt(summary.avgDailyRevenue)}</div>
          </div>
          <div className="card">
            <div className="card-title">Avg Spend / Order</div>
            <div className="card-value">{fmt(summary.avgSpend)}</div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Revenue trend chart */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">Revenue Trend</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All branches combined</span>
          </div>
          <div className="bar-chart">
            {dailyRevenue.slice(-30).map(([date, rev]) => (
              <div key={date} className="bar" style={{ height: `${(rev / maxRev) * 100}%` }}>
                <div className="bar-tooltip">
                  {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br />
                  {fmt(rev)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {dailyRevenue.length > 0 && (
              <>
                <span>{new Date(dailyRevenue[0]![0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <span>{new Date(dailyRevenue[dailyRevenue.length - 1]![0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </>
            )}
          </div>
        </div>

        {/* Branch leaderboard */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Branch Performance (30 days)</div>
          {byBranch.length === 0 ? (
            <div className="empty-state"><p>No data available.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byBranch.map((b, i) => {
                const topRev = topBranch?.totalRevenue ?? 1;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <strong>{b.branch?.name}</strong>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{b.branch?.city}</span>
                      </div>
                      <strong style={{ color: 'var(--accent)' }}>{fmt(b.totalRevenue)}</strong>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(b.totalRevenue / topRev) * 100}%` }} />
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>{b.totalOrders} orders</span>
                      <span>Avg spend: {fmt(b.avgSpend)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detailed table */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Daily Breakdown</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Branch</th><th>Revenue</th><th>Orders</th><th>Avg Spend</th><th>Covers</th></tr>
            </thead>
            <tbody>
              {[...sales].reverse().slice(0, 60).map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td>{s.branch?.name}</td>
                  <td><strong style={{ color: 'var(--accent)' }}>{fmt(s.totalRevenue)}</strong></td>
                  <td>{s.orderCount}</td>
                  <td>{fmt(s.avgSpend)}</td>
                  <td>{s.covers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
