import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { dashboardApi, employeeApi, userApi } from '../../api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { Spinner } from '../../components/Spinner';
import type { Employee, UserAccount, Redemption, DashboardData } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

type Tab = 'dashboard' | 'directory' | 'system-accounts' | 'history';

function Spoiler({ value, color }: { value: string; color: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <code
      onClick={() => setRevealed(!revealed)}
      style={{
        color,
        fontFamily: 'monospace',
        filter: revealed ? 'none' : 'blur(4.5px)',
        cursor: 'pointer',
        userSelect: revealed ? 'auto' : 'none',
        background: 'rgba(255, 255, 255, 0.08)',
        padding: '1px 5px',
        borderRadius: '4px',
        marginLeft: '4px',
        marginRight: '4px',
        transition: 'filter 150ms ease',
        display: 'inline-block',
      }}
      title={revealed ? 'Click to hide' : 'Click to reveal'}
    >
      {value}
    </code>
  );
}

export function AdminPortal() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  // Employees (Directory)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [empLoading, setEmpLoading] = useState(false);
  const [empPage, setEmpPage] = useState(0);
  const [empTotalPages, setEmpTotalPages] = useState(0);
  const [showCreateEmp, setShowCreateEmp] = useState(false);
  const [newEmp, setNewEmp] = useState({
    employeeCode: '',
    name: '',
    department: '',
    employeeType: 'OFFICE',
    createUserAccount: false,
    username: '',
    password: '',
    pin: '1234',
  });

  // Users (Directory - Inline & Non-Employee)
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateUserForEmp, setShowCreateUserForEmp] = useState<Employee | null>(null);
  const [newUserForEmp, setNewUserForEmp] = useState({ username: '', password: '', pin: '1234' });
  const [showCreateSystemUser, setShowCreateSystemUser] = useState(false);
  const [newSystemUser, setNewSystemUser] = useState({ username: '', password: '', role: 'DISTRIBUTOR' });

  // History (Employee-wise with Lazy-Loading)
  const [historySearch, setHistorySearch] = useState('');
  const [historyEmployees, setHistoryEmployees] = useState<Employee[]>([]);
  const [historyEmpLoading, setHistoryEmpLoading] = useState(false);
  const [historyEmpPage, setHistoryEmpPage] = useState(0);
  const [historyEmpTotalPages, setHistoryEmpTotalPages] = useState(0);
  const [expandedEmpIds, setExpandedEmpIds] = useState<number[]>([]);
  const [employeeSummaries, setEmployeeSummaries] = useState<Record<number, { history: Redemption[], monthlyCount: number }>>({});
  const [loadingSummaryIds, setLoadingSummaryIds] = useState<number[]>([]);

  // Modals
  const [showResetPw, setShowResetPw] = useState<number | null>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [showResetPin, setShowResetPin] = useState<number | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: number; name: string; type: 'employee' | 'user' } | null>(null);

  // Edit Employee State
  const [showEditEmp, setShowEditEmp] = useState<Employee | null>(null);
  const [editEmpForm, setEditEmpForm] = useState({
    name: '',
    department: '',
    employeeType: 'OFFICE',
    username: '',
    password: '',
    pin: '',
  });

  // Edit System User State
  const [showEditSystemUser, setShowEditSystemUser] = useState<UserAccount | null>(null);
  const [editSystemUserForm, setEditSystemUserForm] = useState({
    username: '',
    role: '',
    password: '',
  });

  // Dashboard
  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await dashboardApi.today();
      setDashboard(res.data);
    } catch { showToast('Failed to load dashboard', 'error'); }
    finally { setDashLoading(false); }
  }, [showToast]);

  // Employees
  const fetchEmployees = useCallback(async (page = 0) => {
    setEmpLoading(true);
    try {
      const res = await employeeApi.list({ search: empSearch || undefined, page, size: 15 });
      setEmployees(res.data.content);
      setEmpTotalPages(res.data.totalPages);
      setEmpPage(res.data.number);
    } catch { showToast('Failed to load employees', 'error'); }
    finally { setEmpLoading(false); }
  }, [empSearch, showToast]);

  // Users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await userApi.list();
      setUsers(res.data);
    } catch { showToast('Failed to load users', 'error'); }
    finally { setUsersLoading(false); }
  }, [showToast]);

  // History Employees
  const fetchHistoryEmployees = useCallback(async (page = 0) => {
    setHistoryEmpLoading(true);
    try {
      const res = await employeeApi.list({ search: historySearch || undefined, page, size: 15 });
      setHistoryEmployees(res.data.content);
      setHistoryEmpTotalPages(res.data.totalPages);
      setHistoryEmpPage(res.data.number);
    } catch { showToast('Failed to load employees for history', 'error'); }
    finally { setHistoryEmpLoading(false); }
  }, [historySearch, showToast]);

  const handleStartEditEmployee = (emp: Employee) => {
    const linkedUser = users.find((u) => u.employeeId === emp.id);
    setEditEmpForm({
      name: emp.name,
      department: emp.department || '',
      employeeType: emp.employeeType,
      username: linkedUser ? linkedUser.username : '',
      password: '',
      pin: '',
    });
    setShowEditEmp(emp);
  };

  const handleSaveEmployeeChanges = async () => {
    if (!showEditEmp) return;
    try {
      // 1. Update employee profile
      await employeeApi.update(showEditEmp.id, {
        name: editEmpForm.name,
        department: editEmpForm.department || undefined,
        employeeType: editEmpForm.employeeType,
      });

      // 2. Update user credentials if linked
      const linkedUser = users.find((u) => u.employeeId === showEditEmp.id);
      if (linkedUser) {
        // Update username if changed
        if (editEmpForm.username && editEmpForm.username !== linkedUser.username) {
          await userApi.update(linkedUser.id, { username: editEmpForm.username });
        }
        if (editEmpForm.password) {
          await userApi.resetPassword(linkedUser.id, editEmpForm.password);
        }
        if (editEmpForm.pin) {
          await userApi.resetPin(linkedUser.id, editEmpForm.pin);
        }
      }

      showToast('Employee details updated successfully', 'success');
      setShowEditEmp(null);
      fetchEmployees(empPage);
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update employee details', 'error');
    }
  };

  const handleStartEditSystemUser = (u: UserAccount) => {
    setEditSystemUserForm({
      username: u.username,
      role: u.role,
      password: '',
    });
    setShowEditSystemUser(u);
  };

  const handleSaveSystemUserChanges = async () => {
    if (!showEditSystemUser) return;
    try {
      const hasUsernameChanged = editSystemUserForm.username !== showEditSystemUser.username;
      const hasRoleChanged = editSystemUserForm.role !== showEditSystemUser.role;
      
      // Update username and/or role if changed
      if (hasUsernameChanged || hasRoleChanged) {
        await userApi.update(showEditSystemUser.id, {
          username: hasUsernameChanged ? editSystemUserForm.username : undefined,
          role: hasRoleChanged ? editSystemUserForm.role : undefined,
        });
      }

      if (editSystemUserForm.password) {
        await userApi.resetPassword(showEditSystemUser.id, editSystemUserForm.password);
      }

      showToast('System user updated successfully', 'success');
      setShowEditSystemUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update system user', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'directory') {
      fetchEmployees(0);
      fetchUsers();
    }
    if (activeTab === 'system-accounts') {
      fetchUsers();
    }
    if (activeTab === 'history') {
      fetchHistoryEmployees(0);
    }
  }, [activeTab]);

  const handleCreateEmployee = async () => {
    try {
      const res = await employeeApi.create({
        employeeCode: newEmp.employeeCode,
        name: newEmp.name,
        department: newEmp.department || undefined,
        employeeType: newEmp.employeeType,
      });
      showToast('Employee created', 'success');

      if (newEmp.createUserAccount) {
        try {
          await userApi.create({
            username: newEmp.username,
            password: newEmp.password,
            pin: newEmp.pin || undefined,
            role: 'EMPLOYEE',
            employeeId: res.data.id,
          });
          showToast('Associated user login account created', 'success');
        } catch (err: any) {
          showToast('Employee created, but user account failed: ' + (err.response?.data?.message || 'Error'), 'warning');
        }
      }

      setShowCreateEmp(false);
      setNewEmp({
        employeeCode: '',
        name: '',
        department: '',
        employeeType: 'OFFICE',
        createUserAccount: false,
        username: '',
        password: '',
        pin: '1234',
      });
      fetchEmployees(0);
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create employee', 'error');
    }
  };

  const handleCreateUserForEmployee = async () => {
    if (!showCreateUserForEmp) return;
    try {
      await userApi.create({
        username: newUserForEmp.username,
        password: newUserForEmp.password,
        pin: newUserForEmp.pin || undefined,
        role: 'EMPLOYEE',
        employeeId: showCreateUserForEmp.id,
      });
      showToast('Login account created successfully', 'success');
      setShowCreateUserForEmp(null);
      setNewUserForEmp({ username: '', password: '', pin: '1234' });
      fetchUsers();
      fetchEmployees(empPage);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create login account', 'error');
    }
  };

  const handleCreateSystemUser = async () => {
    try {
      await userApi.create({
        username: newSystemUser.username,
        password: newSystemUser.password,
        role: newSystemUser.role,
      });
      showToast('System user account created', 'success');
      setShowCreateSystemUser(false);
      setNewSystemUser({ username: '', password: '', role: 'DISTRIBUTOR' });
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create system user', 'error');
    }
  };

  const toggleExpandEmployee = async (empId: number) => {
    if (expandedEmpIds.includes(empId)) {
      setExpandedEmpIds(expandedEmpIds.filter(id => id !== empId));
    } else {
      setExpandedEmpIds([...expandedEmpIds, empId]);
      if (!employeeSummaries[empId]) {
        setLoadingSummaryIds(prev => [...prev, empId]);
        try {
          const res = await dashboardApi.employeeSummary(empId);
          setEmployeeSummaries(prev => ({
            ...prev,
            [empId]: { history: res.data.history, monthlyCount: res.data.monthlyCount }
          }));
        } catch {
          showToast('Failed to load employee history', 'error');
        } finally {
          setLoadingSummaryIds(prev => prev.filter(id => id !== empId));
        }
      }
    }
  };

  const handlePhotoUpload = async (empId: number, file: File) => {
    try {
      await employeeApi.uploadPhoto(empId, file);
      showToast('Photo uploaded', 'success');
      fetchEmployees(empPage);
    } catch {
      showToast('Upload failed', 'error');
    }
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'directory', label: 'Directory', icon: '👥' },
    { key: 'system-accounts', label: 'System Accounts', icon: '🔑' },
    { key: 'history', label: 'History', icon: '📋' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)' }}>
      <style>{`
        .btn-ghost-danger {
          background: transparent !important;
          color: #ef4444 !important;
          border: 1px solid transparent !important;
        }
        .btn-ghost-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #f87171 !important;
        }
      `}</style>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'rgba(21, 21, 19, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        {/* Brand */}
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <img src="/logo.png" alt="UltraTech" style={{ height: '36px', borderRadius: '4px' }} />
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.01em' }}>Snack Manager</h1>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === tab.key ? 'rgba(255, 206, 0, 0.15)' : 'transparent',
                color: activeTab === tab.key ? '#ffce00' : '#94a3b8',
                fontWeight: activeTab === tab.key ? 600 : 400,
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: '4px',
                transition: 'all 150ms',
                textAlign: 'left',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 600 }}>{user?.username}</p>
          <button
            onClick={logout}
            style={{
              marginTop: '8px',
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: '240px', padding: '24px 32px' }}>

        {/* ===== Dashboard ===== */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '24px' }}>Dashboard</h2>
            {dashLoading ? <Spinner /> : dashboard && (
              <>
                {/* ── Stat Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                  {[
                    { label: '☀️ Morning Today', value: dashboard.morningCount, color: '#fbbf24', gradient: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(251,191,36,0.04) 100%)' },
                    { label: '🌙 Evening Today', value: dashboard.eveningCount, color: '#60a5fa', gradient: 'linear-gradient(135deg, rgba(96,165,250,0.15) 0%, rgba(96,165,250,0.04) 100%)' },
                    { label: '📅 This Month', value: dashboard.monthlyTotal, color: '#ffce00', gradient: 'linear-gradient(135deg, rgba(255,206,0,0.15) 0%, rgba(255,206,0,0.04) 100%)' },
                    { label: '👥 Active Employees', value: dashboard.totalActiveEmployees, color: '#a78bfa', gradient: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(167,139,250,0.04) 100%)' },
                  ].map((c, i) => (
                    <div key={i} style={{
                      background: c.gradient,
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      padding: '20px 22px',
                      transition: 'transform 200ms ease, box-shadow 200ms ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c.color}22`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '10px', fontWeight: 500 }}>{c.label}</p>
                      <p style={{ fontSize: '38px', fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Charts Row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

                  {/* Weekly Consumption Chart */}
                  <div style={{
                    background: 'rgba(21, 21, 19, 0.6)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    padding: '24px',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Weekly Consumption</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Shift-wise snack redemptions — last 7 days</p>

                    {(() => {
                      const stats = dashboard.weeklyStats || [];
                      const maxVal = Math.max(...stats.map(s => Math.max(s.morning, s.evening)), 1);
                      const chartH = 220;
                      const barW = 22;
                      const groupGap = 36;
                      const chartW = stats.length * (barW * 2 + 8 + groupGap);
                      const yTicks = 5;

                      return (
                        <div style={{ position: 'relative' }}>
                          {/* Legend */}
                          <div style={{ display: 'flex', gap: '18px', marginBottom: '14px', justifyContent: 'flex-end' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#fbbf24', display: 'inline-block' }} /> Morning
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#60a5fa', display: 'inline-block' }} /> Evening
                            </span>
                          </div>

                          <svg width="100%" viewBox={`0 0 ${chartW + 50} ${chartH + 50}`} style={{ overflow: 'visible' }}>
                            {/* Y-axis grid lines and labels */}
                            {Array.from({ length: yTicks + 1 }).map((_, i) => {
                              const yVal = Math.round((maxVal / yTicks) * i);
                              const y = chartH - (yVal / maxVal) * chartH + 10;
                              return (
                                <g key={`y-${i}`}>
                                  <line x1="40" y1={y} x2={chartW + 40} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                                  <text x="34" y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">{yVal}</text>
                                </g>
                              );
                            })}

                            {/* Bars */}
                            {stats.map((s, i) => {
                              const xBase = 46 + i * (barW * 2 + 8 + groupGap);
                              const mH = (s.morning / maxVal) * chartH;
                              const eH = (s.evening / maxVal) * chartH;
                              const mY = chartH - mH + 10;
                              const eY = chartH - eH + 10;

                              return (
                                <g key={i}>
                                  {/* Morning bar */}
                                  <rect x={xBase} y={mY} width={barW} height={mH} rx="4"
                                    fill="url(#morningGrad)"
                                    style={{ transition: 'all 400ms ease', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { (e.target as SVGRectElement).style.filter = 'brightness(1.3)'; }}
                                    onMouseLeave={(e) => { (e.target as SVGRectElement).style.filter = 'none'; }}
                                  >
                                    <title>{s.day} {s.date} — Morning: {s.morning}</title>
                                  </rect>
                                  {/* Morning count label */}
                                  {s.morning > 0 && (
                                    <text x={xBase + barW / 2} y={mY - 5} fill="#fbbf24" fontSize="10" fontWeight="700" textAnchor="middle">{s.morning}</text>
                                  )}

                                  {/* Evening bar */}
                                  <rect x={xBase + barW + 4} y={eY} width={barW} height={eH} rx="4"
                                    fill="url(#eveningGrad)"
                                    style={{ transition: 'all 400ms ease', cursor: 'pointer' }}
                                    onMouseEnter={(e) => { (e.target as SVGRectElement).style.filter = 'brightness(1.3)'; }}
                                    onMouseLeave={(e) => { (e.target as SVGRectElement).style.filter = 'none'; }}
                                  >
                                    <title>{s.day} {s.date} — Evening: {s.evening}</title>
                                  </rect>
                                  {/* Evening count label */}
                                  {s.evening > 0 && (
                                    <text x={xBase + barW + 4 + barW / 2} y={eY - 5} fill="#60a5fa" fontSize="10" fontWeight="700" textAnchor="middle">{s.evening}</text>
                                  )}

                                  {/* Day label */}
                                  <text x={xBase + barW + 2} y={chartH + 26} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="600">{s.day}</text>
                                  <text x={xBase + barW + 2} y={chartH + 40} fill="#64748b" fontSize="9" textAnchor="middle">{s.date}</text>
                                </g>
                              );
                            })}

                            {/* Gradient definitions */}
                            <defs>
                              <linearGradient id="morningGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fbbf24" />
                                <stop offset="100%" stopColor="#d97706" />
                              </linearGradient>
                              <linearGradient id="eveningGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#60a5fa" />
                                <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Distributor Stats Panel */}
                  <div style={{
                    background: 'rgba(21, 21, 19, 0.6)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px',
                    padding: '24px',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Distributor Performance</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>Snacks served this month</p>

                    {(() => {
                      const dStats = dashboard.distributorStats || [];
                      const maxD = Math.max(...dStats.map(d => d.count), 1);
                      const colors = ['#fbbf24', '#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fb923c', '#22d3ee', '#e879f9'];

                      if (dStats.length === 0) {
                        return <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No data for this month yet</p>;
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {dStats.map((d, i) => {
                            const pct = Math.round((d.count / maxD) * 100);
                            const color = colors[i % colors.length];
                            return (
                              <div key={d.distributorName}
                                style={{ transition: 'transform 150ms ease', cursor: 'default' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      width: '24px', height: '24px', borderRadius: '6px',
                                      background: `${color}22`, color, display: 'flex',
                                      alignItems: 'center', justifyContent: 'center',
                                      fontSize: '12px', fontWeight: 800,
                                    }}>
                                      {i + 1}
                                    </span>
                                    <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600 }}>{d.distributorName}</span>
                                  </div>
                                  <span style={{ color, fontSize: '14px', fontWeight: 800 }}>{d.count}</span>
                                </div>
                                <div style={{
                                  height: '6px',
                                  background: 'rgba(255,255,255,0.04)',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${color}cc, ${color})`,
                                    borderRadius: '3px',
                                    transition: 'width 600ms ease-out',
                                  }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* ── Today's Shift Utilization ── */}
                <div style={{
                  marginTop: '20px',
                  background: 'rgba(21, 21, 19, 0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  padding: '24px',
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Today's Shift Utilization</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
                    Percentage of active employees who redeemed snacks today
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {[
                      { label: 'Morning Shift', count: dashboard.morningCount, color: '#fbbf24', icon: '☀️' },
                      { label: 'Evening Shift', count: dashboard.eveningCount, color: '#60a5fa', icon: '🌙' },
                    ].map((shift) => {
                      const pct = dashboard.totalActiveEmployees > 0 ? Math.round((shift.count / dashboard.totalActiveEmployees) * 100) : 0;
                      const circumference = 2 * Math.PI * 40;
                      const offset = circumference - (pct / 100) * circumference;
                      return (
                        <div key={shift.label} style={{
                          display: 'flex', alignItems: 'center', gap: '24px',
                          padding: '12px 16px', borderRadius: '12px',
                          background: 'rgba(255,255,255,0.02)',
                        }}>
                          <svg width="100" height="100" style={{ flexShrink: 0 }}>
                            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                            <circle cx="50" cy="50" r="40" fill="none" stroke={shift.color} strokeWidth="8"
                              strokeDasharray={circumference} strokeDashoffset={offset}
                              strokeLinecap="round" transform="rotate(-90 50 50)"
                              style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
                            />
                            <text x="50" y="46" textAnchor="middle" fill={shift.color} fontSize="20" fontWeight="800">{pct}%</text>
                            <text x="50" y="62" textAnchor="middle" fill="#64748b" fontSize="9">utilization</text>
                          </svg>
                          <div>
                            <p style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>{shift.icon} {shift.label}</p>
                            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                              <span style={{ color: shift.color, fontWeight: 700 }}>{shift.count}</span> of {dashboard.totalActiveEmployees} employees
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== Directory (Merged Employees & Users) ===== */}
        {activeTab === 'directory' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>Directory & Accounts</h2>
              <Button onClick={() => setShowCreateEmp(true)}>+ Add Employee</Button>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>
              Manage employee profiles and web portal access. Deactivating an employee profile completely blocks them from redeeming snacks, suspends their portal login account, and terminates any active sessions on all devices.
            </p>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                placeholder="Search employees..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEmployees(0)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(21, 21, 19, 0.6)',
                  border: '1px solid #3e3e3a',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 200ms',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 206, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#3e3e3a';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <Button variant="secondary" onClick={() => fetchEmployees(0)}>Search</Button>
            </div>

            {empLoading ? <Spinner /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0 4px',
                }}>
                  <thead>
                    <tr>
                      {['Photo', 'Code', 'Name', 'Department', 'Login Account', 'Status', 'Action'].map((h) => (
                        <th key={h} style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          color: '#64748b',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const linkedUser = users.find((u) => u.employeeId === emp.id);
                      return (
                        <tr key={emp.id} style={{
                          background: 'rgba(21, 21, 19, 0.4)',
                          borderRadius: '10px',
                        }}>
                          {/* Photo */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                              {emp.photoUrl ? (
                                <img
                                  src={`${API_BASE}${emp.photoUrl}`}
                                  alt={emp.name}
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%',
                                  background: '#334155', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: '16px',
                                }}>👤</div>
                              )}
                              <label style={{
                                position: 'absolute', inset: 0, cursor: 'pointer', borderRadius: '50%',
                              }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handlePhotoUpload(emp.id, e.target.files[0]);
                                  }}
                                />
                              </label>
                            </div>
                          </td>

                          {/* Code, Name, Department */}
                          <td style={{ padding: '10px 12px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>{emp.employeeCode}</td>
                          <td style={{ padding: '10px 12px', color: '#f1f5f9', fontSize: '14px', fontWeight: 500 }}>{emp.name}</td>
                          <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '14px' }}>{emp.department || '-'}</td>

                          {/* Linked User Account Info & Reset Actions */}
                          <td style={{ padding: '10px 12px' }}>
                            {linkedUser ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>@{linkedUser.username}</strong>
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                  Key: <Spoiler value={linkedUser.passwordRaw || 'N/A'} color="#ffce00" />
                                  {linkedUser.pinRaw && <> | PIN: <Spoiler value={linkedUser.pinRaw} color="#38bdf8" /></>}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <Button variant="ghost" size="sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => { setShowResetPw(linkedUser.id); setResetPwValue(''); }}>PW</Button>
                                  <Button variant="ghost" size="sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => { setShowResetPin(linkedUser.id); setResetPinValue(''); }}>PIN</Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ color: '#64748b', fontSize: '13px', marginRight: '8px' }}>No Login Account</span>
                                <Button variant="secondary" size="sm" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setShowCreateUserForEmp(emp)}>
                                  + Create
                                </Button>
                              </div>
                            )}
                          </td>

                          {/* Active Status */}
                          <td style={{ padding: '10px 12px' }}>
                            <Badge variant={emp.active ? 'success' : 'danger'}>{emp.active ? 'Active' : 'Inactive'}</Badge>
                          </td>

                          {/* Status Action */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '280px' }}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleStartEditEmployee(emp)}
                              >
                                Edit
                              </Button>
                              {linkedUser?.username !== user?.username ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    style={{ width: '110px' }}
                                    onClick={async () => {
                                      await employeeApi.update(emp.id, { active: !emp.active });
                                      showToast(`Employee profile ${emp.active ? 'deactivated' : 'activated'}`, 'info');
                                      fetchEmployees(empPage);
                                      fetchUsers();
                                    }}
                                  >
                                    {emp.active ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  {!emp.active && (
                                    <Button
                                      variant="ghost"
                                      className="btn-ghost-danger"
                                      size="sm"
                                      style={{ width: '80px' }}
                                      onClick={() => setShowDeleteConfirm({ id: emp.id, name: emp.name, type: 'employee' })}
                                    >
                                      Delete
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginLeft: '8px' }}>Logged In (Self)</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {empTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <Button variant="ghost" size="sm" disabled={empPage === 0} onClick={() => fetchEmployees(empPage - 1)}>← Prev</Button>
                    <span style={{ color: '#94a3b8', fontSize: '14px', padding: '6px 12px' }}>Page {empPage + 1} of {empTotalPages}</span>
                    <Button variant="ghost" size="sm" disabled={empPage >= empTotalPages - 1} onClick={() => fetchEmployees(empPage + 1)}>Next →</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== System Accounts ===== */}
        {activeTab === 'system-accounts' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>System Accounts</h2>
              <Button onClick={() => setShowCreateSystemUser(true)}>+ Add System User</Button>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>
              Manage standalone login accounts for System Administrators and Distributors. Note that these are separate from employee profile logins.
            </p>

            {usersLoading ? <Spinner /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0 4px',
                }}>
                  <thead>
                    <tr>
                      {['Username', 'Role', 'Status', 'Actions'].map((h) => (
                        <th key={h} style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          color: '#64748b',
                          fontSize: '12px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter((u) => u.employeeId === null).map((u) => (
                      <tr key={u.id} style={{
                        background: 'rgba(21, 21, 19, 0.4)',
                        borderRadius: '10px',
                      }}>
                        <td style={{ padding: '12px', color: '#f1f5f9', fontSize: '14px', fontWeight: 500 }}>
                          <div>{u.username}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', fontWeight: 'normal' }}>
                            Key: <Spoiler value={u.passwordRaw || 'N/A'} color="#ffce00" />
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge variant={u.role === 'ADMIN' ? 'danger' : 'warning'}>{u.role}</Badge>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <Badge variant={u.active ? 'success' : 'danger'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td style={{ padding: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Button variant="secondary" size="sm" onClick={() => handleStartEditSystemUser(u)}>Edit</Button>
                          {u.username !== user?.username ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '200px' }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                style={{ width: '110px' }}
                                onClick={async () => {
                                  await userApi.toggleActive(u.id);
                                  showToast('Status toggled', 'info');
                                  fetchUsers();
                                }}
                              >
                                {u.active ? 'Deactivate' : 'Activate'}
                              </Button>
                              {!u.active && (
                                <Button
                                  variant="ghost"
                                  className="btn-ghost-danger"
                                  size="sm"
                                  style={{ width: '80px' }}
                                  onClick={() => setShowDeleteConfirm({ id: u.id, name: `@${u.username}`, type: 'user' })}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', paddingLeft: '8px' }}>Logged In (Self)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== History (Redesigned: Employee-wise Consumption List) ===== */}
        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>Snack Consumption History</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Select an employee to see their total snacks consumed and detailed redemption logs.</p>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                placeholder="Search employees by name or code..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHistoryEmployees(0)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(21, 21, 19, 0.6)',
                  border: '1px solid #3e3e3a',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 200ms',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 206, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#3e3e3a';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <Button variant="secondary" onClick={() => fetchHistoryEmployees(0)}>Search</Button>
            </div>

            {historyEmpLoading ? <Spinner /> : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                    <thead>
                      <tr>
                        {['Photo', 'Employee Code', 'Employee Name', 'Department', 'Actions'].map((h) => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '8px 12px', color: '#64748b',
                            fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historyEmployees.map((emp) => {
                        const isExpanded = expandedEmpIds.includes(emp.id);
                        const isLoadingSummary = loadingSummaryIds.includes(emp.id);
                        const summary = employeeSummaries[emp.id];

                        return (
                          <React.Fragment key={emp.id}>
                            <tr style={{ background: 'rgba(21, 21, 19, 0.4)', verticalAlign: 'middle' }}>
                              {/* Photo */}
                              <td style={{ padding: '12px' }}>
                                {emp.photoUrl ? (
                                  <img
                                    src={`${API_BASE}${emp.photoUrl}`}
                                    alt={emp.name}
                                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: '#334155', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '16px',
                                  }}>👤</div>
                                )}
                              </td>

                              {/* Code, Name, Dept */}
                              <td style={{ padding: '12px', color: '#e2e8f0', fontSize: '14px', fontFamily: 'monospace' }}>{emp.employeeCode}</td>
                              <td style={{ padding: '12px', color: '#f1f5f9', fontSize: '14px', fontWeight: 500 }}>{emp.name}</td>
                              <td style={{ padding: '12px', color: '#94a3b8', fontSize: '14px' }}>{emp.department || '-'}</td>

                              {/* Action */}
                              <td style={{ padding: '12px' }}>
                                <Button
                                  variant={isExpanded ? 'secondary' : 'ghost'}
                                  size="sm"
                                  onClick={() => toggleExpandEmployee(emp.id)}
                                >
                                  {isExpanded ? 'Collapse ↩' : 'View Consumption 📋'}
                                </Button>
                              </td>
                            </tr>

                            {/* Expanded Row */}
                            {isExpanded && (
                              <tr style={{ background: 'rgba(21, 21, 19, 0.2)' }}>
                                <td colSpan={5} style={{ padding: '16px 24px', borderLeft: '3px solid #ffce00' }}>
                                  {isLoadingSummary ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                                      <Spinner />
                                    </div>
                                  ) : summary ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      {/* Total consumption badge */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>Snack Log Summary</span>
                                        <Badge variant="warning">
                                          Consumed {summary.monthlyCount} Snacks This Month
                                        </Badge>
                                      </div>

                                      {/* Logs subtable */}
                                      {summary.history.length === 0 ? (
                                        <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                                          No snacks consumed yet.
                                        </p>
                                      ) : (
                                        <div style={{ overflowX: 'auto', maxHeight: '250px', overflowY: 'auto' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                {['Date & Time', 'Session', 'Redemption Mode', 'Scanned By'].map((th) => (
                                                  <th key={th} style={{
                                                    textAlign: 'left', padding: '6px 8px', color: '#64748b',
                                                    fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em'
                                                  }}>{th}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {summary.history.map((log) => (
                                                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                  <td style={{ padding: '8px', color: '#e2e8f0', fontSize: '13px' }}>{log.redeemedAt}</td>
                                                  <td style={{ padding: '8px' }}>
                                                    <Badge variant={log.session === 'MORNING' ? 'warning' : 'info'}>
                                                      {log.session === 'MORNING' ? '☀️ Morning' : '🌙 Evening'}
                                                    </Badge>
                                                  </td>
                                                  <td style={{ padding: '8px' }}>
                                                    <Badge variant={log.redemptionMode === 'DYNAMIC_QR' ? 'success' : 'neutral'}>
                                                      {log.redemptionMode === 'DYNAMIC_QR' ? 'QR Code' : 'Manual Entry'}
                                                    </Badge>
                                                  </td>
                                                  <td style={{ padding: '8px', color: '#94a3b8', fontSize: '13px' }}>{log.distributorName}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
                                      Failed to load consumption details.
                                    </p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {historyEmpTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <Button variant="ghost" size="sm" disabled={historyEmpPage === 0} onClick={() => fetchHistoryEmployees(historyEmpPage - 1)}>← Prev</Button>
                    <span style={{ color: '#94a3b8', fontSize: '14px', padding: '6px 12px' }}>Page {historyEmpPage + 1} of {historyEmpTotalPages}</span>
                    <Button variant="ghost" size="sm" disabled={historyEmpPage >= historyEmpTotalPages - 1} onClick={() => fetchHistoryEmployees(historyEmpPage + 1)}>Next →</Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ===== Modals ===== */}

      {/* Merged Create Employee & Optional Account Modal */}
      <Modal isOpen={showCreateEmp} onClose={() => setShowCreateEmp(false)} title="Add Employee Profile">
        <Input label="Employee Code" value={newEmp.employeeCode} onChange={(e) => setNewEmp({ ...newEmp, employeeCode: e.target.value })} placeholder="e.g. EMP001" required />
        <Input label="Full Name" value={newEmp.name} onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} placeholder="John Doe" required />
        <Input label="Department" value={newEmp.department} onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })} placeholder="Engineering" />
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>Employee Type</label>
          <select
            value={newEmp.employeeType}
            onChange={(e) => setNewEmp({ ...newEmp, employeeType: e.target.value })}
            style={{
              width: '100%', padding: '10px 14px', background: 'rgba(21, 21, 19, 0.6)',
              border: '1px solid #3e3e3a', borderRadius: '10px', color: '#f1f5f9',
              fontSize: '14px', fontFamily: 'inherit',
            }}
          >
            <option value="OFFICE">Office Staff</option>
            <option value="PLANT">Plant Staff</option>
            <option value="CONTRACTOR">Contractor</option>
          </select>
        </div>

        {/* Checkbox to create login account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 16px' }}>
          <input
            id="createUserAccount"
            type="checkbox"
            checked={newEmp.createUserAccount}
            onChange={(e) => setNewEmp({ ...newEmp, createUserAccount: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: '#ffce00', cursor: 'pointer' }}
          />
          <label htmlFor="createUserAccount" style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            Create associated user login account?
          </label>
        </div>

        {/* Associated user credentials form */}
        {newEmp.createUserAccount && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <h4 style={{ color: '#ffce00', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.02em' }}>Login Credentials</h4>
            <Input label="Username" value={newEmp.username} onChange={(e) => setNewEmp({ ...newEmp, username: e.target.value })} placeholder="john.doe" required />
            <Input label="Password" type="password" value={newEmp.password} onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })} placeholder="Min 6 characters" required />
            <Input label="4-digit PIN (for barcode scan fallback)" type="password" maxLength={4} value={newEmp.pin} onChange={(e) => setNewEmp({ ...newEmp, pin: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 1234" required />
          </div>
        )}

        <Button fullWidth onClick={handleCreateEmployee} disabled={!newEmp.employeeCode || !newEmp.name || (newEmp.createUserAccount && (!newEmp.username || !newEmp.password || !newEmp.pin))}>
          Create Employee
        </Button>
      </Modal>

      {/* Create User for Existing Employee Modal */}
      <Modal isOpen={showCreateUserForEmp !== null} onClose={() => setShowCreateUserForEmp(null)} title={`Create Login Account: ${showCreateUserForEmp?.name}`}>
        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
          Provide login credentials to enable employee **{showCreateUserForEmp?.name}** (Code: {showCreateUserForEmp?.employeeCode}) to log into the portal.
        </p>
        <Input label="Username" value={newUserForEmp.username} onChange={(e) => setNewUserForEmp({ ...newUserForEmp, username: e.target.value })} placeholder="john.doe" required />
        <Input label="Password" type="password" value={newUserForEmp.password} onChange={(e) => setNewUserForEmp({ ...newUserForEmp, password: e.target.value })} placeholder="Min 6 characters" required />
        <Input label="4-digit PIN (for barcode scan fallback)" type="password" maxLength={4} value={newUserForEmp.pin} onChange={(e) => setNewUserForEmp({ ...newUserForEmp, pin: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 1234" required />
        <Button fullWidth onClick={handleCreateUserForEmployee} disabled={!newUserForEmp.username || !newUserForEmp.password || !newUserForEmp.pin}>
          Enable Login Account
        </Button>
      </Modal>

      {/* Create Standalone System User (Admins/Distributors) */}
      <Modal isOpen={showCreateSystemUser} onClose={() => setShowCreateSystemUser(false)} title="Create System Login Account">
        <Input label="Username" value={newSystemUser.username} onChange={(e) => setNewSystemUser({ ...newSystemUser, username: e.target.value })} placeholder="admin.office" required />
        <Input label="Password" type="password" value={newSystemUser.password} onChange={(e) => setNewSystemUser({ ...newSystemUser, password: e.target.value })} placeholder="Min 6 characters" required />
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>System Role</label>
          <select
            value={newSystemUser.role}
            onChange={(e) => setNewSystemUser({ ...newSystemUser, role: e.target.value })}
            style={{
              width: '100%', padding: '10px 14px', background: 'rgba(21, 21, 19, 0.6)',
              border: '1px solid #3e3e3a', borderRadius: '10px', color: '#f1f5f9',
              fontSize: '14px', fontFamily: 'inherit',
            }}
          >
            <option value="DISTRIBUTOR">Distributor (Scans QR codes)</option>
            <option value="ADMIN">Administrator (Full control)</option>
          </select>
        </div>

        <Button fullWidth onClick={handleCreateSystemUser} disabled={!newSystemUser.username || !newSystemUser.password}>
          Create System Account
        </Button>
      </Modal>

      {/* Reset Password */}
      <Modal isOpen={showResetPw !== null} onClose={() => setShowResetPw(null)} title="Reset Password">
        <Input label="New Password" type="password" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} placeholder="Min 6 characters" />
        <Button fullWidth disabled={resetPwValue.length < 6} onClick={async () => {
          if (showResetPw) {
            await userApi.resetPassword(showResetPw, resetPwValue);
            showToast('Password reset successful', 'success');
            setShowResetPw(null);
          }
        }}>Reset Password</Button>
      </Modal>

      {/* Reset PIN */}
      <Modal isOpen={showResetPin !== null} onClose={() => setShowResetPin(null)} title="Reset PIN">
        <Input label="New 4-digit PIN" type="password" maxLength={4} value={resetPinValue} onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1234" />
        <Button fullWidth disabled={resetPinValue.length !== 4} onClick={async () => {
          if (showResetPin) {
            await userApi.resetPin(showResetPin, resetPinValue);
            showToast('PIN reset successful', 'success');
            setShowResetPin(null);
          }
        }}>Reset PIN</Button>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteConfirm !== null} 
        onClose={() => setShowDeleteConfirm(null)} 
        title="⚠️ Permanent Deletion Warning"
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5' }}>
            Are you sure you want to permanently delete {showDeleteConfirm?.type === 'employee' ? 'employee' : 'system user'} <strong>{showDeleteConfirm?.name}</strong>?
          </p>
          <div style={{ 
            color: '#f87171', 
            fontSize: '13px', 
            lineHeight: '1.5', 
            padding: '12px', 
            background: 'rgba(239, 68, 68, 0.08)', 
            borderRadius: '8px', 
            border: '1px solid rgba(239, 68, 68, 0.2)' 
          }}>
            <strong>CRITICAL WARNING:</strong> This action is completely irreversible. 
            {showDeleteConfirm?.type === 'employee' 
              ? ' This will permanently remove their employee profile, their linked login account, and ALL of their snack redemption history.'
              : ' This will permanently remove their user credentials and any associated system logs.'}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="danger"
              fullWidth 
              onClick={async () => {
                if (!showDeleteConfirm) return;
                try {
                  if (showDeleteConfirm.type === 'employee') {
                    await employeeApi.delete(showDeleteConfirm.id);
                    showToast('Employee deleted permanently', 'success');
                    fetchEmployees(empPage);
                  } else {
                    await userApi.delete(showDeleteConfirm.id);
                    showToast('System user deleted permanently', 'success');
                  }
                  fetchUsers();
                  setShowDeleteConfirm(null);
                } catch (err: any) {
                  showToast(err.response?.data?.message || 'Deletion failed', 'error');
                }
              }}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal isOpen={showEditEmp !== null} onClose={() => setShowEditEmp(null)} title={`Edit Employee: ${showEditEmp?.name}`}>
        <Input 
          label="Full Name" 
          value={editEmpForm.name} 
          onChange={(e) => setEditEmpForm({ ...editEmpForm, name: e.target.value })} 
          placeholder="e.g. John Doe" 
          required 
        />
        <Input 
          label="Department" 
          value={editEmpForm.department} 
          onChange={(e) => setEditEmpForm({ ...editEmpForm, department: e.target.value })} 
          placeholder="e.g. Engineering" 
        />
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>Employee Type</label>
          <select
            value={editEmpForm.employeeType}
            onChange={(e) => setEditEmpForm({ ...editEmpForm, employeeType: e.target.value })}
            style={{
              width: '100%', padding: '10px 14px', background: 'rgba(21, 21, 19, 0.6)',
              border: '1px solid #3e3e3a', borderRadius: '10px', color: '#f1f5f9',
              fontSize: '14px', fontFamily: 'inherit',
            }}
          >
            <option value="OFFICE">Office Staff</option>
            <option value="PLANT">Plant Staff</option>
            <option value="CONTRACTOR">Contractor</option>
          </select>
        </div>

        {/* Credentials Edit section (only shown if the employee has a login account) */}
        {showEditEmp && users.some((u) => u.employeeId === showEditEmp.id) ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <h4 style={{ color: '#ffce00', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.02em' }}>Update Login Credentials</h4>
            <Input 
              label="Username" 
              value={editEmpForm.username} 
              onChange={(e) => setEditEmpForm({ ...editEmpForm, username: e.target.value })} 
              placeholder="e.g. john.doe" 
              required
            />
            <Input 
              label="New Password" 
              type="password" 
              value={editEmpForm.password} 
              onChange={(e) => setEditEmpForm({ ...editEmpForm, password: e.target.value })} 
              placeholder="Leave blank to keep unchanged" 
            />
            <Input 
              label="New 4-digit PIN (for barcode scan fallback)" 
              type="password" 
              maxLength={4} 
              value={editEmpForm.pin} 
              onChange={(e) => setEditEmpForm({ ...editEmpForm, pin: e.target.value.replace(/\D/g, '') })} 
              placeholder="Leave blank to keep unchanged" 
            />
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px', fontStyle: 'italic' }}>
            This employee does not have a linked login account.
          </p>
        )}

        <Button fullWidth onClick={handleSaveEmployeeChanges} disabled={!editEmpForm.name || (showEditEmp && users.some((u) => u.employeeId === showEditEmp.id) && !editEmpForm.username)}>
          Save Changes
        </Button>
      </Modal>

      {/* Edit System User Modal */}
      <Modal isOpen={showEditSystemUser !== null} onClose={() => setShowEditSystemUser(null)} title={`Edit System Account: ${showEditSystemUser?.username}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <Input 
            label="Username" 
            value={editSystemUserForm.username} 
            onChange={(e) => setEditSystemUserForm({ ...editSystemUserForm, username: e.target.value })} 
            placeholder="e.g. admin.office" 
            required 
          />
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>System Role</label>
            <select
              value={editSystemUserForm.role}
              onChange={(e) => setEditSystemUserForm({ ...editSystemUserForm, role: e.target.value })}
              style={{
                width: '100%', padding: '10px 14px', background: 'rgba(21, 21, 19, 0.6)',
                border: '1px solid #3e3e3a', borderRadius: '10px', color: '#f1f5f9',
                fontSize: '14px', fontFamily: 'inherit',
              }}
            >
              <option value="DISTRIBUTOR">Distributor (Scans QR codes)</option>
              <option value="ADMIN">Administrator (Full control)</option>
            </select>
          </div>

          <Input 
            label="New Password" 
            type="password" 
            value={editSystemUserForm.password} 
            onChange={(e) => setEditSystemUserForm({ ...editSystemUserForm, password: e.target.value })} 
            placeholder="Leave blank to keep unchanged (min 6 characters)" 
          />
        </div>
        <Button fullWidth onClick={handleSaveSystemUserChanges} disabled={!editSystemUserForm.username || (editSystemUserForm.password.length > 0 && editSystemUserForm.password.length < 6)}>
          Save Changes
        </Button>
      </Modal>
    </div>
  );
}
