import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  return (
    <nav className="sidebar">
      {/* Level 1 — Operational */}
      {(role === 'OPERATIONAL' || role === 'MANAGEMENT' || role === 'ADMIN') && (
        <>
          <div className="sidebar-section">Operations</div>
          <NavLink to="/orders"    className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">🍽️</span> Order Entry
          </NavLink>
          <NavLink to="/stock"     className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">📦</span> Stock Requests
          </NavLink>
          <NavLink to="/timesheet" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">🕐</span> Timesheet
          </NavLink>
          <NavLink to="/tasks"     className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">✅</span> Daily Tasks
          </NavLink>
          <NavLink to="/compliance" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">📋</span> Compliance
          </NavLink>
        </>
      )}

      {/* Level 2 — Management */}
      {(role === 'MANAGEMENT' || role === 'SENIOR' || role === 'ADMIN') && (
        <>
          <div className="sidebar-section">Management</div>
          <NavLink to="/sales"     className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">📊</span> Sales Dashboard
          </NavLink>
          <NavLink to="/inventory" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">🏪</span> Inventory
          </NavLink>
          <NavLink to="/staff"     className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">👥</span> Staff
          </NavLink>
          <NavLink to="/alerts"    className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">🔔</span> Alerts
          </NavLink>
        </>
      )}

      {/* Level 3 — Senior Leadership */}
      {(role === 'SENIOR' || role === 'ADMIN') && (
        <>
          <div className="sidebar-section">Leadership</div>
          <NavLink to="/kpi"       className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">🎯</span> KPI Dashboard
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">📈</span> Analytics
          </NavLink>
          <NavLink to="/financial" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">💷</span> Financial Report
          </NavLink>
        </>
      )}

      {/* Admin */}
      {role === 'ADMIN' && (
        <>
          <div className="sidebar-section">Admin</div>
          <NavLink to="/admin/branches" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">🏢</span> Branches
          </NavLink>
          <NavLink to="/admin/users"    className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">👤</span> Users
          </NavLink>
          <NavLink to="/admin/menu"     className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
            <span className="icon">🥩</span> Menu Items
          </NavLink>
        </>
      )}
    </nav>
  );
}
