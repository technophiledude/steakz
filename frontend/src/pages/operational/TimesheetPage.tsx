import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface Timesheet { id: number; date: string; hoursWorked: number; notes: string | null; }

export default function TimesheetPage() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0] ?? '');
  const [hours,      setHours]      = useState('');
  const [notes,      setNotes]      = useState('');
  const [msg,        setMsg]        = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    const r = await api.get<Timesheet[]>('/api/operational/timesheets');
    setTimesheets(r.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/operational/timesheets', { date, hoursWorked: parseFloat(hours), notes: notes || undefined });
      setHours(''); setNotes('');
      setMsg('✅ Timesheet submitted.');
      await load();
    } catch {
      setMsg('❌ Failed to submit timesheet.');
    }
  }

  const totalHours   = timesheets.reduce((s, t) => s + t.hoursWorked, 0);
  const thisWeekHrs  = timesheets
    .filter((t) => {
      const d = new Date(t.date);
      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      return d >= weekStart;
    })
    .reduce((s, t) => s + t.hoursWorked, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Timesheet</h1>
        <p>Log your working hours</p>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="card">
          <div className="card-title">This Week</div>
          <div className="card-value">{thisWeekHrs.toFixed(1)}h</div>
        </div>
        <div className="card">
          <div className="card-title">Total (30 days)</div>
          <div className="card-value">{totalHours.toFixed(1)}h</div>
        </div>
        <div className="card">
          <div className="card-title">Entries</div>
          <div className="card-value">{timesheets.length}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Log Hours</div>
          {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Hours Worked</label>
              <input className="form-input" type="number" step="0.5" min="0.5" max="16" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 8.0" required />
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this shift…" />
            </div>
            <button className="btn btn-primary" type="submit">Submit</button>
          </form>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Recent Entries</div>
          {timesheets.length === 0 ? (
            <div className="empty-state"><div className="icon">🕐</div><p>No entries yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Hours</th><th>Notes</th></tr></thead>
                <tbody>
                  {timesheets.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td><strong>{t.hoursWorked}h</strong></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
