import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface MonthlyRevenue { month: string; totalRevenue: number; totalOrders: number; }
interface Summary        { totalAnnualRevenue: number; totalAnnualOrders: number; avgMonthlyRevenue: number; }
interface BranchYTD      { branch?: { name: string; city: string }; ytdRevenue: number; ytdOrders: number; revenueShare: number; }

function fmt(n: number) { return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtK(n: number) { return n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : fmt(n); }

export default function FinancialPage() {
  const [monthly,   setMonthly]   = useState<MonthlyRevenue[]>([]);
  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [branchYTD, setBranchYTD] = useState<BranchYTD[]>([]);

  useEffect(() => {
    void api.get<{ monthlyRevenue: MonthlyRevenue[]; summary: Summary; branchYTD: BranchYTD[] }>('/api/senior/financial').then((r) => {
      setMonthly(r.data.monthlyRevenue);
      setSummary(r.data.summary);
      setBranchYTD(r.data.branchYTD);
    });
  }, []);

  const maxMonthly = Math.max(...monthly.map((m) => m.totalRevenue), 1);

  if (!summary) return <div className="loading-page"><div className="spinner" /> Loading financial data…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Financial Summary Report</h1>
        <p>Annual revenue analysis and branch performance — for senior leadership</p>
      </div>

      <div className="kpi-grid">
        <div className="card">
          <div className="card-title">Annual Revenue (12m)</div>
          <div className="card-value" style={{ fontSize: 24 }}>{fmt(summary.totalAnnualRevenue)}</div>
        </div>
        <div className="card">
          <div className="card-title">Avg Monthly Revenue</div>
          <div className="card-value" style={{ fontSize: 24 }}>{fmt(summary.avgMonthlyRevenue)}</div>
        </div>
        <div className="card">
          <div className="card-title">Total Orders (12m)</div>
          <div className="card-value">{summary.totalAnnualOrders.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="card-title">Active Branches</div>
          <div className="card-value">{branchYTD.length}</div>
        </div>
      </div>

      {/* Monthly revenue bar chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title" style={{ marginBottom: 20 }}>Monthly Revenue — Last 12 Months</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingBottom: 24, position: 'relative' }}>
          {monthly.map((m) => (
            <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>{fmtK(m.totalRevenue)}</div>
              <div
                style={{
                  width: '100%',
                  background: 'var(--accent-dim)',
                  borderRadius: '4px 4px 0 0',
                  height: `${(m.totalRevenue / maxMonthly) * 120}px`,
                  minHeight: 4,
                  transition: 'all 0.3s',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        {/* Detailed monthly table */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Monthly Breakdown</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Month</th><th>Revenue</th><th>Orders</th><th>Avg/Order</th></tr></thead>
              <tbody>
                {[...monthly].reverse().map((m) => (
                  <tr key={m.month}>
                    <td><strong>{m.month}</strong></td>
                    <td><strong style={{ color: 'var(--accent)' }}>{fmt(m.totalRevenue)}</strong></td>
                    <td>{m.totalOrders.toLocaleString()}</td>
                    <td>{m.totalOrders > 0 ? fmt(m.totalRevenue / m.totalOrders) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Branch YTD */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Branch YTD Performance</div>
          {branchYTD.length === 0 ? (
            <div className="empty-state"><p>No YTD data yet.</p></div>
          ) : (
            <>
              {branchYTD.map((b, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <strong>{b.branch?.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>{b.branch?.city}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: 'var(--accent)' }}>{fmt(b.ytdRevenue)}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.revenueShare}% of total</div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${b.revenueShare}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {b.ytdOrders.toLocaleString()} orders YTD
                  </div>
                </div>
              ))}

              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Total YTD</strong>
                <strong style={{ color: 'var(--accent)' }}>{fmt(branchYTD.reduce((s, b) => s + b.ytdRevenue, 0))}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
