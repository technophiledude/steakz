import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface KPI {
  thisMonthRevenue: number; lastMonthRevenue: number; revenueGrowth: number;
  thisMonthOrders: number; thisMonthCovers: number;
  activeBranches: number; totalStaff: number; unreadAlerts: number;
}
interface TrendRecord { date: string; totalRevenue: number; orderCount: number; branchId: number; branch: { name: string } }
interface BranchStat  { branch?: { name: string; city: string }; totalRevenue: number; totalOrders: number; totalCovers: number; }

function fmt(n: number) { return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }

export default function KPIDashboardPage() {
  const [kpis,  setKpis]  = useState<KPI | null>(null);
  const [trend, setTrend] = useState<TrendRecord[]>([]);
  const [branches, setBranches] = useState<BranchStat[]>([]);

  useEffect(() => {
    void api.get<{ kpis: KPI; trend: TrendRecord[]; branchStats: BranchStat[] }>('/api/senior/kpi').then((r) => {
      setKpis(r.data.kpis);
      setTrend(r.data.trend);
      setBranches(r.data.branchStats);
    });
  }, []);

  // Aggregate trend by date
  const dailyMap = new Map<string, number>();
  for (const t of trend) {
    const d = t.date.split('T')[0] ?? '';
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + t.totalRevenue);
  }
  const dailyRevenue = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxRev       = Math.max(...dailyRevenue.map((d) => d[1]), 1);
  const topBranch    = branches[0];

  if (!kpis) return <div className="loading-page"><div className="spinner" /> Loading KPI data…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>KPI Dashboard</h1>
        <p>Company-wide performance metrics — senior leadership view</p>
      </div>

      {/* Primary KPIs */}
      <div className="kpi-grid">
        <div className="card">
          <div className="card-title">Revenue This Month</div>
          <div className="card-value">{fmt(kpis.thisMonthRevenue)}</div>
          <div className="card-sub">
            <span className={`grow-badge ${kpis.revenueGrowth >= 0 ? 'grow-pos' : 'grow-neg'}`}>
              {kpis.revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(kpis.revenueGrowth)}%
            </span>
            {' '}vs last month
          </div>
        </div>
        <div className="card">
          <div className="card-title">Last Month Revenue</div>
          <div className="card-value">{fmt(kpis.lastMonthRevenue)}</div>
        </div>
        <div className="card">
          <div className="card-title">Orders This Month</div>
          <div className="card-value">{kpis.thisMonthOrders.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-title">Covers This Month</div>
          <div className="card-value">{kpis.thisMonthCovers.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-title">Active Branches</div>
          <div className="card-value">{kpis.activeBranches}</div>
        </div>
        <div className="card">
          <div className="card-title">Total Staff</div>
          <div className="card-value">{kpis.totalStaff}</div>
        </div>
        <div className="card" style={{ borderColor: kpis.unreadAlerts > 0 ? 'var(--red)' : undefined }}>
          <div className="card-title">Unread Alerts</div>
          <div className="card-value" style={{ color: kpis.unreadAlerts > 0 ? 'var(--red)' : 'var(--green)' }}>
            {kpis.unreadAlerts}
          </div>
        </div>
      </div>

      <div className="two-col">
        {/* 30-day revenue trend */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">30-Day Revenue Trend</div>
          </div>
          <div className="bar-chart">
            {dailyRevenue.map(([date, rev]) => (
              <div key={date} className="bar" style={{ height: `${(rev / maxRev) * 100}%` }}>
                <div className="bar-tooltip">
                  {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br />
                  {fmt(rev)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Branch rankings */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 20 }}>Branch Rankings (30 days)</div>
          {branches.map((b, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginRight: 8 }}>#{i + 1}</span>
                  <strong>{b.branch?.name}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{b.branch?.city}</span>
                </div>
                <strong style={{ color: 'var(--accent)' }}>{fmt(b.totalRevenue)}</strong>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${topBranch ? (b.totalRevenue / (topBranch.totalRevenue || 1)) * 100 : 0}%` }} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{b.totalOrders} orders</span>
                <span>{b.totalCovers} covers</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
