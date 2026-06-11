import { useEffect, useState } from 'react';
import api from '../../api/axios';

interface ComplianceRecord {
  id: number; type: string; description: string; result: string | null; recordedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  FOOD_SAFETY:     '🍱 Food Safety',
  ALLERGEN:        '⚠️ Allergen',
  TEMPERATURE_LOG: '🌡️ Temperature Log',
  HYGIENE_AUDIT:   '🧹 Hygiene Audit',
};

const RESULT_BADGE: Record<string, string> = {
  PASS:    'badge-green',
  FAIL:    'badge-red',
  WARNING: 'badge-yellow',
};

export default function CompliancePage() {
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [type,    setType]    = useState('TEMPERATURE_LOG');
  const [desc,    setDesc]    = useState('');
  const [result,  setResult]  = useState('PASS');
  const [msg,     setMsg]     = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    const r = await api.get<ComplianceRecord[]>('/api/operational/compliance');
    setRecords(r.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/operational/compliance', { type, description: desc, result });
      setDesc('');
      setMsg('✅ Compliance record saved.');
      await load();
    } catch {
      setMsg('❌ Failed to save record.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Compliance Records</h1>
        <p>Log food safety, allergen, and hygiene checks — required for FSA compliance</p>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Log New Record</div>
          {msg && <div className={`alert-box ${msg.startsWith('✅') ? 'success' : 'error'}`}>{msg}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Check Type</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Details / Observations</label>
              <textarea
                className="form-textarea"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={type === 'TEMPERATURE_LOG'
                  ? 'e.g. Fridge 1: 3°C | Fridge 2: 4°C | Freezer: -18°C'
                  : 'Describe what was checked and any observations…'}
                required
                style={{ minHeight: 100 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Result</label>
              <select className="form-select" value={result} onChange={(e) => setResult(e.target.value)}>
                <option value="PASS">✅ Pass</option>
                <option value="WARNING">⚠️ Warning</option>
                <option value="FAIL">❌ Fail</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">Save Record</button>
          </form>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Recent Records</div>
          {records.length === 0 ? (
            <div className="empty-state"><div className="icon">📋</div><p>No records yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {records.map((r) => (
                <div key={r.id} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{TYPE_LABELS[r.type] ?? r.type}</span>
                    {r.result && <span className={`badge ${RESULT_BADGE[r.result] ?? 'badge-muted'}`}>{r.result}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{r.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(r.recordedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
