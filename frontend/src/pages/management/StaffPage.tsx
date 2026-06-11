import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface StaffMember { id: number; name: string; email: string; role: string; isActive: boolean; branch?: { name: string; city: string } | null; }
interface Timesheet { id: number; date: string; hoursWorked: number; user: { name: string; role: string }; branch: { name: string }; }

const ROLE_BADGE: Record<string, string> = {
  OPERATIONAL: 'badge-blue',
  MANAGEMENT:  'badge-accent',
};

export default function StaffPage() {
  const [staff,      setStaff]      = useState<StaffMember[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [activeTab,  setActiveTab]  = useState<'staff' | 'hours'>('staff');

  useEffect(() => {
    void api.get<StaffMember[]>('/api/management/staff').then((r) => setStaff(r.data));
    void api.get<Timesheet[]>('/api/management/timesheets').then((r) => setTimesheets(r.data));
  }, []);

  const totalHours      = timesheets.reduce((s, t) => s + t.hoursWorked, 0);
  const activeStaff     = staff.filter((s) => s.isActive);
  const operationalCount = staff.filter((s) => s.role === 'OPERATIONAL').length;

  return (
    <div>
      <div className="page-header">
        <h1>Staff Management</h1>
        <p>View team members and working hours</p>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Active Staff</div>
          <div className="card-value">{activeStaff.length}</div>
        </div>
        <div className="card">
          <div className="card-title">Operational Staff</div>
          <div className="card-value">{operationalCount}</div>
        </div>
        <div className="card">
          <div className="card-title">Hours This Week</div>
          <div className="card-value">{totalHours.toFixed(0)}h</div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>Team ({staff.length})</button>
        <button className={`tab-btn ${activeTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveTab('hours')}>Hours Log</button>
      </div>

      {activeTab === 'staff' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th></tr></thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</td>
                    <td><span className={`badge ${ROLE_BADGE[s.role] ?? 'badge-muted'}`}>{s.role}</span></td>
                    <td style={{ fontSize: 12 }}>{s.branch ? `${s.branch.name}, ${s.branch.city}` : '—'}</td>
                    <td><span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Staff Member</th><th>Role</th><th>Branch</th><th>Date</th><th>Hours</th></tr></thead>
              <tbody>
                {timesheets.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.user.name}</strong></td>
                    <td><span className={`badge ${ROLE_BADGE[t.user.role] ?? 'badge-muted'}`}>{t.user.role}</span></td>
                    <td style={{ fontSize: 12 }}>{t.branch?.name}</td>
                    <td>{new Date(t.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td><strong>{t.hoursWorked}h</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
