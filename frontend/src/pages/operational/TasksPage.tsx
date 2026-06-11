import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

interface Task { id: number; title: string; description: string | null; isCompleted: boolean; dueDate: string | null; completedAt: string | null; }

export default function TasksPage() {
  const { user }       = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc,  setNewDesc]  = useState('');
  const [msg, setMsg]           = useState('');
  const canCreate               = user?.role === 'MANAGEMENT' || user?.role === 'ADMIN';

  useEffect(() => { void load(); }, []);

  async function load() {
    const r = await api.get<Task[]>('/api/operational/tasks');
    setTasks(r.data);
  }

  async function toggleTask(task: Task) {
    if (task.isCompleted) {
      await api.patch(`/api/operational/tasks/${task.id}/undo`);
    } else {
      await api.patch(`/api/operational/tasks/${task.id}/complete`);
    }
    await load();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/management/tasks', { title: newTitle, description: newDesc || undefined });
      setNewTitle(''); setNewDesc('');
      setMsg('✅ Task created.');
      await load();
    } catch {
      setMsg('❌ Failed to create task.');
    }
  }

  const pending   = tasks.filter((t) => !t.isCompleted);
  const completed = tasks.filter((t) =>  t.isCompleted);
  const progress  = tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Daily Task Checklist</h1>
        <p>Today's operational tasks for your branch</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{completed.length} of {tasks.length} tasks complete</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pending.length} remaining</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: progress === 100 ? 'var(--green)' : 'var(--accent)' }}>
            {Math.round(progress)}%
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {canCreate && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Add Task</div>
          {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}
          <form onSubmit={createTask}>
            <div className="form-row">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Task Title</label>
                <input className="form-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Check fridge temperatures" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description (optional)</label>
                <input className="form-input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Additional details…" />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" style={{ marginTop: 12 }}>Add Task</button>
          </form>
        </div>
      )}

      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Pending</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => toggleTask(t)}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)', background: 'transparent', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14, color: 'var(--green)' }}>✓ Completed</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', opacity: 0.6 }}>
                <button
                  onClick={() => toggleTask(t)}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--green)', background: 'var(--green)', cursor: 'pointer', flexShrink: 0, marginTop: 2, fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✓</button>
                <div>
                  <div style={{ fontWeight: 500, textDecoration: 'line-through' }}>{t.title}</div>
                  {t.completedAt && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Completed {new Date(t.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="card">
          <div className="empty-state"><div className="icon">✅</div><p>No tasks scheduled for today.</p></div>
        </div>
      )}
    </div>
  );
}
