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

type Tab = 'dashboard' | 'directory' | 'history';

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

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboard();
    if (activeTab === 'directory') {
      fetchEmployees(0);
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
    { key: 'history', label: 'History', icon: '📋' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg)' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <Card glow>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>☀️ Morning Today</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, color: '#fcd34d' }}>{dashboard.morningCount}</p>
                </Card>
                <Card glow>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>🌙 Evening Today</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, color: '#93c5fd' }}>{dashboard.eveningCount}</p>
                </Card>
                <Card glow>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>📅 This Month</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, color: '#ffce00' }}>{dashboard.monthlyTotal}</p>
                </Card>
                <Card>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>👥 Active Employees</p>
                  <p style={{ fontSize: '36px', fontWeight: 800, color: '#f1f5f9' }}>{dashboard.totalActiveEmployees}</p>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ===== Directory (Merged Employees & Users) ===== */}
        {activeTab === 'directory' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>Directory & Accounts</h2>
              <Button onClick={() => setShowCreateEmp(true)}>+ Add Employee</Button>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <Input
                placeholder="Search employees..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEmployees(0)}
                style={{ marginBottom: 0, flex: 1 }}
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
                      {['Photo', 'Code', 'Name', 'Department', 'Status', 'User Account', 'Profile Action'].map((h) => (
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

                          {/* Profile Active Status */}
                          <td style={{ padding: '10px 12px' }}>
                            <Badge variant={emp.active ? 'success' : 'danger'}>{emp.active ? 'Active' : 'Inactive'}</Badge>
                          </td>

                          {/* Linked User Account Info & Actions */}
                          <td style={{ padding: '10px 12px' }}>
                            {linkedUser ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>@{linkedUser.username}</strong>
                                  <Badge variant={linkedUser.active ? 'success' : 'danger'}>
                                    {linkedUser.active ? 'Active Login' : 'Suspended'}
                                  </Badge>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <Button variant="ghost" size="sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => { setShowResetPw(linkedUser.id); setResetPwValue(''); }}>PW</Button>
                                  <Button variant="ghost" size="sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => { setShowResetPin(linkedUser.id); setResetPinValue(''); }}>PIN</Button>
                                  <Button variant="ghost" size="sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={async () => {
                                    await userApi.toggleActive(linkedUser.id);
                                    showToast('Login status updated', 'info');
                                    fetchUsers();
                                  }}>{linkedUser.active ? 'Suspend' : 'Unsuspend'}</Button>
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

                          {/* Profile Status Action */}
                          <td style={{ padding: '10px 12px' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await employeeApi.update(emp.id, { active: !emp.active });
                                showToast(`Employee profile ${emp.active ? 'deactivated' : 'activated'}`, 'info');
                                fetchEmployees(empPage);
                              }}
                            >
                              {emp.active ? 'Deactivate' : 'Activate'}
                            </Button>
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

            {/* Standalone System Accounts Section */}
            <Card style={{ marginTop: '36px', padding: '24px', background: 'rgba(21, 21, 19, 0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>System Accounts</h3>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Standalone login accounts (Admins & Distributors)</p>
                </div>
                <Button variant="secondary" onClick={() => setShowCreateSystemUser(true)}>+ Add System User</Button>
              </div>

              {usersLoading ? <Spinner /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                    <thead>
                      <tr>
                        {['Username', 'Role', 'Status', 'Actions'].map((h) => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '8px 12px', color: '#64748b',
                            fontSize: '12px', fontWeight: 600, textTransform: 'uppercase'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter((u) => u.employeeId === null).map((u) => (
                        <tr key={u.id} style={{ background: 'rgba(21, 21, 19, 0.25)' }}>
                          <td style={{ padding: '12px', color: '#f1f5f9', fontSize: '14px', fontWeight: 500 }}>{u.username}</td>
                          <td style={{ padding: '12px' }}>
                            <Badge variant={u.role === 'ADMIN' ? 'danger' : 'warning'}>{u.role}</Badge>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Badge variant={u.active ? 'success' : 'danger'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                            <Button variant="ghost" size="sm" onClick={() => { setShowResetPw(u.id); setResetPwValue(''); }}>Reset PW</Button>
                            <Button variant="ghost" size="sm" onClick={async () => {
                              await userApi.toggleActive(u.id);
                              showToast('Status toggled', 'info');
                              fetchUsers();
                            }}>{u.active ? 'Deactivate' : 'Activate'}</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ===== History (Redesigned: Employee-wise Consumption List) ===== */}
        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>Snack Consumption History</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Select an employee to see their total snacks consumed and detailed redemption logs.</p>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <Input
                placeholder="Search employees by name or code..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHistoryEmployees(0)}
                style={{ marginBottom: 0, flex: 1 }}
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
            <option value="FIELD">Field / Contractor</option>
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
    </div>
  );
}
