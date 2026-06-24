import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { redemptionApi, employeeApi, menuApi } from '../../api';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import type { ScanResult, Employee } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

type View = 'session-select' | 'scanner' | 'verification' | 'success' | 'error' | 'forgot-id';

export function DistributorPortal() {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [session, setSession] = useState<string>(() => {
    return localStorage.getItem('distributor_session') || '';
  });
  const [view, setView] = useState<View>(() => {
    return localStorage.getItem('distributor_session') ? 'scanner' : 'session-select';
  });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [todaySnack, setTodaySnack] = useState('');
  const [selectedSnacks, setSelectedSnacks] = useState<string[]>([]);

  // Forgot-ID state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // QR Scanner
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    await stopScanner();

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15, // Faster frame rate for more responsive scanning on mobile
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7; // Responsive square (70% of viewport size)
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          await stopScanner();
          handleQrScan(decodedText);
        },
        () => { /* ignore errors during scanning */ }
      );
    } catch (err) {
      showToast('Camera access denied. Please allow camera access.', 'error');
    }
  }, [session, stopScanner, showToast]);

  useEffect(() => {
    if (!session) return;
    const fetchDailyMenu = async () => {
      try {
        const res = await menuApi.getToday();
        const snackName = session === 'MORNING' 
          ? res.data.morningSnack 
          : session === 'EVENING' 
            ? res.data.eveningSnack 
            : (res.data as any).nightSnack;
        setTodaySnack(snackName);
        if (snackName) {
          setSelectedSnacks([snackName]);
        } else {
          setSelectedSnacks(['Tea']);
        }
      } catch {
        setSelectedSnacks(['Tea']);
      }
    };
    fetchDailyMenu();
  }, [session]);

  useEffect(() => {
    if (view === 'scanner') {
      const timer = setTimeout(() => startScanner(), 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [view, startScanner, stopScanner]);

  const handleQrScan = async (qrToken: string) => {
    try {
      const res = await redemptionApi.scan(qrToken, session);
      setScanResult(res.data);
      setView('verification');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid or expired QR code';
      setErrorMessage(msg);
      setView('error');
    }
  };

  const handleConfirm = async () => {
    if (!scanResult || selectedSnacks.length === 0) return;
    setConfirmLoading(true);

    try {
      await redemptionApi.confirm(scanResult.employeeId, session, selectedSnacks.join(', '));
      setView('success');
      showToast('Snack redeemed successfully!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Redemption failed';
      setErrorMessage(msg);
      setView('error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await employeeApi.search(searchQuery);
      setSearchResults(res.data);
    } catch {
      showToast('Search failed', 'error');
    }
  };

  const handleManualRedeem = async () => {
    if (!selectedEmployee || !pin || selectedSnacks.length === 0) return;
    setManualLoading(true);

    try {
      await redemptionApi.manual(selectedEmployee.employeeCode, pin, session, selectedSnacks.join(', '));
      setView('success');
      showToast('Snack redeemed successfully!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Redemption failed';
      setErrorMessage(msg);
      setView('error');
    } finally {
      setManualLoading(false);
    }
  };

  const resetToScanner = async () => {
    setScanResult(null);
    setErrorMessage('');
    setSelectedEmployee(null);
    setPin('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSnacks(todaySnack ? [todaySnack] : ['Tea']);
    setView('scanner');
  };

  const selectSession = (s: string) => {
    setSession(s);
    localStorage.setItem('distributor_session', s);
    setView('scanner');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 206, 0, 0.04), transparent 50%), var(--color-bg)',
    }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(21, 21, 19, 0.8)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="UltraTech" style={{ height: '36px', borderRadius: '4px' }} />
          <div style={{
            borderLeft: '1px solid rgba(255,255,255,0.15)',
            paddingLeft: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px'
          }}>
            <h1 style={{ fontSize: '14px', fontWeight: 800, color: '#f5f5f4', letterSpacing: '-0.01em', lineHeight: '1.2' }}>
              Distributor Portal
            </h1>
            {session && (
              <Badge variant={session === 'MORNING' ? 'warning' : session === 'EVENING' ? 'info' : 'success'}>
                {session === 'MORNING' ? '☀️ Morning' : session === 'EVENING' ? '🌙 Evening' : '🌃 Night'}
              </Badge>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {session && view !== 'session-select' && (
            <button
              onClick={() => { localStorage.removeItem('distributor_session'); setSession(''); setView('session-select'); }}
              style={{
                background: 'rgba(255, 206, 0, 0.1)',
                border: '1px solid rgba(255, 206, 0, 0.25)',
                borderRadius: '8px',
                color: '#ffce00',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Switch Session
            </button>
          )}
          <button
            onClick={() => { localStorage.removeItem('distributor_session'); logout(); }}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#fca5a5',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>

        {/* Session Selection */}
        {view === 'session-select' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', marginBottom: '8px', color: '#f1f5f9' }}>
              Select Session
            </h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              Choose the current snack distribution session
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Card
                onClick={() => selectSession('MORNING')}
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '24px',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>☀️</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#fcd34d' }}>Morning Session</span>
              </Card>
              <Card
                onClick={() => selectSession('EVENING')}
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '24px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>🌙</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#93c5fd' }}>Evening Session</span>
              </Card>
              <Card
                onClick={() => selectSession('NIGHT')}
                style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: '24px',
                  border: '1px solid rgba(167, 139, 250, 0.2)',
                }}
              >
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>🌃</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#c084fc' }}>Night Session</span>
              </Card>
            </div>
          </div>
        )}

        {/* QR Scanner */}
        {view === 'scanner' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '16px', color: '#f1f5f9' }}>
              Scan Employee QR
            </h2>

            <Card style={{ padding: '0', overflow: 'hidden' }}>
              <div
                id="qr-reader"
                ref={scannerContainerRef}
                style={{
                  width: '100%',
                  borderRadius: '16px 16px 0 0',
                  overflow: 'hidden',
                }}
              />
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                  Point camera at employee's QR code
                </p>
              </div>
            </Card>

            <Button
              variant="ghost"
              fullWidth
              style={{ marginTop: '16px' }}
              onClick={() => setView('forgot-id')}
            >
              🔑 Employee Forgot ID?
            </Button>
          </div>
        )}

        {/* Verification */}
        {view === 'verification' && scanResult && (
          <div className="animate-slide-up" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#f1f5f9' }}>
              Verify Identity
            </h2>

            <Card glow>
              {/* Photo */}
              {scanResult.photoUrl && (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  margin: '0 auto 16px',
                  border: '3px solid rgba(255, 206, 0, 0.4)',
                  boxShadow: '0 0 20px rgba(255, 206, 0, 0.2)',
                }}>
                  <img
                    src={`${API_BASE}${scanResult.photoUrl}`}
                    alt={scanResult.employeeName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {!scanResult.photoUrl && (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e293b, #334155)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: '48px',
                  border: '3px solid rgba(255,255,255,0.1)',
                }}>
                  👤
                </div>
              )}

              <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
                {scanResult.employeeName}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>
                {scanResult.employeeCode}
              </p>
              {scanResult.department && (
                <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
                  {scanResult.department}
                </p>
              )}

              <Badge variant={session === 'MORNING' ? 'warning' : session === 'EVENING' ? 'info' : 'success'}>
                {session === 'MORNING' ? '☀️ Morning Session' : session === 'EVENING' ? '🌙 Evening Session' : '🌃 Night Session'}
              </Badge>

              {scanResult.alreadyRedeemed ? (
                <div style={{
                  marginTop: '20px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <p style={{ color: '#fca5a5', fontWeight: 600, fontSize: '15px' }}>
                    ⚠️ Already Redeemed
                  </p>
                  <p style={{ color: '#f87171', fontSize: '13px', marginTop: '4px' }}>
                    {session} snack already redeemed at {scanResult.alreadyRedeemedAt}
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: '20px', textAlign: 'left', marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '8px' }}>
                      Select Snack Items (Multiple allowed)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {[
                        ...(todaySnack ? [{ id: todaySnack, label: `${todaySnack} (Today's Snack)` }] : []),
                        { id: 'Tea', label: 'Tea' },
                        { id: 'Coffee', label: 'Coffee' },
                        { id: 'Extra Snacks', label: 'Extra Snacks' }
                      ].map((option) => {
                        const isChecked = selectedSnacks.includes(option.id);
                        return (
                          <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 4px', borderRadius: '6px', transition: 'background 150ms' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                  setSelectedSnacks((prev) => [...prev, option.id]);
                                } else {
                                  setSelectedSnacks((prev) => prev.filter((item) => item !== option.id));
                                }
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#ffce00', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', color: isChecked ? '#ffce00' : '#e2e8f0', fontWeight: isChecked ? 600 : 400 }}>
                              {option.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    variant="success"
                    size="lg"
                    fullWidth
                    loading={confirmLoading}
                    disabled={selectedSnacks.length === 0}
                    onClick={handleConfirm}
                    style={{ marginTop: '24px' }}
                  >
                    ✓ Confirm Redemption
                  </Button>
                </>
              )}
            </Card>

            <Button
              variant="ghost"
              fullWidth
              onClick={resetToScanner}
              style={{ marginTop: '12px' }}
            >
              ← Back to Scanner
            </Button>
          </div>
        )}

        {/* Success */}
        {view === 'success' && (
          <div className="animate-success" style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '3px solid rgba(34, 197, 94, 0.4)',
              fontSize: '48px',
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#86efac', marginBottom: '8px' }}>
              Snack Redeemed!
            </h2>
            <p style={{ color: '#ffce00', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>
              Redeemed: {selectedSnacks.join(', ')}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>
              Redemption recorded successfully
            </p>
            <Button size="lg" fullWidth onClick={resetToScanner}>
              Scan Next Employee
            </Button>
          </div>
        )}

        {/* Error */}
        {view === 'error' && (
          <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '3px solid rgba(239, 68, 68, 0.3)',
              fontSize: '48px',
            }}>
              ✗
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>
              Redemption Failed
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>
              {errorMessage}
            </p>
            <Button size="lg" fullWidth onClick={resetToScanner}>
              Try Again
            </Button>
          </div>
        )}

        {/* Forgot ID Flow */}
        {view === 'forgot-id' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '20px', color: '#f1f5f9' }}>
              🔑 Manual Verification
            </h2>

            {!selectedEmployee ? (
              <Card>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <Input
                    placeholder="Search by name or employee code"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <Button onClick={handleSearch} size="md">
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflow: 'auto' }}>
                    {searchResults.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedEmployee(emp)}
                        style={{
                          padding: '12px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 200ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 206, 0, 0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                      >
                        {emp.photoUrl ? (
                          <img
                            src={`${API_BASE}${emp.photoUrl}`}
                            alt={emp.name}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#334155', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '18px',
                          }}>👤</div>
                        )}
                        <div>
                          <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '14px' }}>{emp.name}</p>
                          <p style={{ color: '#64748b', fontSize: '12px' }}>{emp.employeeCode} • {emp.department}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : (
              <Card glow style={{ textAlign: 'center' }}>
                {selectedEmployee.photoUrl ? (
                  <img
                    src={`${API_BASE}${selectedEmployee.photoUrl}`}
                    alt={selectedEmployee.name}
                    style={{
                      width: '100px', height: '100px', borderRadius: '50%',
                      objectFit: 'cover', margin: '0 auto 12px', display: 'block',
                      border: '3px solid rgba(255, 206, 0, 0.4)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    background: '#334155', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '40px', margin: '0 auto 12px',
                  }}>👤</div>
                )}
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>{selectedEmployee.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>{selectedEmployee.employeeCode}</p>

                <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                    Select Snack Items (Multiple allowed)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                      ...(todaySnack ? [{ id: todaySnack, label: `${todaySnack} (Today's Snack)` }] : []),
                      { id: 'Tea', label: 'Tea' },
                      { id: 'Coffee', label: 'Coffee' },
                      { id: 'Extra Snacks', label: 'Extra Snacks' }
                    ].map((option) => {
                      const isChecked = selectedSnacks.includes(option.id);
                      return (
                        <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 4px', borderRadius: '6px', transition: 'background 150ms' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked) {
                                setSelectedSnacks((prev) => [...prev, option.id]);
                              } else {
                                setSelectedSnacks((prev) => prev.filter((item) => item !== option.id));
                              }
                            }}
                            style={{ width: '18px', height: '18px', accentColor: '#ffce00', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: isChecked ? '#ffce00' : '#e2e8f0', fontWeight: isChecked ? 600 : 400 }}>
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Input
                  label="Enter 4-digit PIN"
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • •"
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '12px' }}
                />

                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  loading={manualLoading}
                  disabled={pin.length !== 4 || selectedSnacks.length === 0}
                  onClick={handleManualRedeem}
                >
                  ✓ Confirm Redemption
                </Button>

                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => { setSelectedEmployee(null); setPin(''); }}
                  style={{ marginTop: '8px' }}
                >
                  ← Select Different Employee
                </Button>
              </Card>
            )}

            <Button
              variant="ghost"
              fullWidth
              onClick={resetToScanner}
              style={{ marginTop: '12px' }}
            >
              ← Back to Scanner
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
