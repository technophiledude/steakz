import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL: Record<string, string> = {
  ADMIN:       'Administrator',
  OPERATIONAL: 'Operational Staff',
  MANAGEMENT:  'Management',
  SENIOR:      'Senior Leadership',
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN:       'badge-red',
  OPERATIONAL: 'badge-blue',
  MANAGEMENT:  'badge-accent',
  SENIOR:      'badge-green',
};

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="topbar">
      <div className="topbar-brand">
        🥩 STEAKZ
        <span>Management Information System</span>
      </div>
      <div className="topbar-right">
        {user && (
          <>
            <div className="topbar-user">
              <strong>{user.name}</strong>
              {user.branch && <> · {user.branch.name}</>}
            </div>
            <span className={`badge ${ROLE_BADGE[user.role] ?? 'badge-muted'}`}>
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
