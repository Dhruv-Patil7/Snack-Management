import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCode } from 'react-qr-code';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { qrApi, redemptionApi, menuApi } from '../../api';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import type { Redemption } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function EmployeePortal() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qr' | 'history'>('qr');
  const [history, setHistory] = useState<Redemption[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [morningSnack, setMorningSnack] = useState('');
  const [eveningSnack, setEveningSnack] = useState('');
  const [nightSnack, setNightSnack] = useState('');

  const [lastRedemptionId, setLastRedemptionId] = useState<number | null>(null);
  const [newRedemption, setNewRedemption] = useState<Redemption | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = useCallback(async () => {
    try {
      const res = await qrApi.generate();
      setQrToken(res.data.qrToken);
      setLoading(false);
    } catch (err) {
      showToast('Failed to load QR code', 'error');
      setLoading(false);
    }
  }, [showToast]);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await menuApi.getToday();
      setMorningSnack(res.data.morningSnack || '');
      setEveningSnack(res.data.eveningSnack || '');
      setNightSnack((res.data as any).nightSnack || '');
    } catch {
      // Silently fail or fallback
    }
  }, []);

  useEffect(() => {
    fetchQr();
    fetchMenu();
  }, [fetchQr, fetchMenu]);
  useEffect(() => {
    const initHistory = async () => {
      try {
        const res = await redemptionApi.myHistory();
        if (res.data.length > 0) {
          const maxId = Math.max(...res.data.map((r) => r.id));
          setLastRedemptionId(maxId);
        } else {
          setLastRedemptionId(0);
        }
      } catch {
        setLastRedemptionId(0);
      }
    };
    initHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'qr' && lastRedemptionId !== null) {
      const pollHistory = async () => {
        try {
          const res = await redemptionApi.myHistory();
          if (res.data.length > 0) {
            const sortedByLatest = [...res.data].sort((a, b) => b.id - a.id);
            const latest = sortedByLatest[0];
            if (latest.id > lastRedemptionId) {
              if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
              }
              setNewRedemption(latest);
              setLastRedemptionId(latest.id);
            }
          }
        } catch {
          // Silently ignore polling errors
        }
      };
      pollingRef.current = setInterval(pollHistory, 3000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeTab, lastRedemptionId]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await redemptionApi.myHistory();
      setHistory(res.data);
    } catch {
      showToast('Failed to load history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

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
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '12px' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 800, color: '#f5f5f4', letterSpacing: '-0.01em' }}>Snack Portal</h1>
            <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '-2px' }}>{user?.employeeName || user?.username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: '#fca5a5',
            padding: '6px 14px',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Logout
        </button>
      </header>

      {/* Tab navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '16px 20px 0',
        maxWidth: '500px',
        margin: '0 auto',
      }}>
        {(['qr', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px',
              background: activeTab === tab ? 'rgba(255, 206, 0, 0.15)' : 'transparent',
              border: `1px solid ${activeTab === tab ? 'rgba(255, 206, 0, 0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '10px',
              color: activeTab === tab ? '#ffce00' : '#64748b',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 200ms',
            }}
          >
            {tab === 'qr' ? '📱 My QR Code' : '📋 History'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        {activeTab === 'qr' ? (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            {/* Today's Snack Menu Card */}
            <Card style={{
              background: 'linear-gradient(135deg, rgba(255, 206, 0, 0.08) 0%, rgba(255, 206, 0, 0.02) 100%)',
              border: '1px solid rgba(255, 206, 0, 0.15)',
              padding: '16px 20px',
              marginBottom: '16px',
              textAlign: 'left',
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🍔</span> Today's Snack Menu
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>☀️ Morning Snack:</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: morningSnack ? '#fcd34d' : '#f87171',
                    background: morningSnack ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}>
                    {morningSnack || 'Not Configured'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>🌙 Evening Snack:</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: eveningSnack ? '#60a5fa' : '#f87171',
                    background: eveningSnack ? 'rgba(96, 165, 250, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}>
                    {eveningSnack || 'Not Configured'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>🌃 Night Snack:</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: nightSnack ? '#a78bfa' : '#f87171',
                    background: nightSnack ? 'rgba(167, 139, 250, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}>
                    {nightSnack || 'Not Configured'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>☕ Beverages:</span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#a78bfa',
                    background: 'rgba(167, 139, 250, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                  }}>
                    Tea & Coffee
                  </span>
                </div>
              </div>
            </Card>

            <Card glow style={{ marginTop: '8px' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
                Show this QR code to the distributor
              </p>

              {loading ? (
                <Spinner size={48} />
              ) : (
                <>
                  <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    display: 'block',
                    boxShadow: '0 0 30px rgba(255, 206, 0, 0.15)',
                    position: 'relative',
                    maxWidth: '350px',
                    width: '100%',
                    margin: '0 auto',
                    boxSizing: 'border-box',
                  }}
                  className="animate-pulse-glow"
                  >
                    <QRCode
                      value={qrToken}
                      size={256}
                      level="H"
                      style={{ height: 'auto', maxWidth: '100%', width: '100%', display: 'block' }}
                    />
                    {user?.photoUrl ? (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24%',
                        height: '24%',
                        background: 'white',
                        padding: '1.5%',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}>
                        <img
                          src={`${API_BASE}${user.photoUrl}`}
                          alt="Employee"
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24%',
                        height: '24%',
                        background: 'white',
                        padding: '1.5%',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                        }}>
                          👤
                        </div>
                      </div>
                    )}
                  </div>

                  <p style={{
                    color: '#475569',
                    fontSize: '12px',
                    marginTop: '16px',
                    fontWeight: 500,
                  }}>
                    Your permanent static QR code
                  </p>
                </>
              )}
            </Card>
          </div>
        ) : (
          <div className="animate-fade-in">
            {historyLoading ? (
              <Spinner />
            ) : history.length === 0 ? (
              <Card>
                <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  No redemption history yet
                </p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map((r) => (
                  <Card key={r.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Badge variant={r.session === 'MORNING' ? 'warning' : 'info'}>
                          {r.session === 'MORNING' ? '☀️ Morning' : '🌙 Evening'}
                        </Badge>
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#f1f5f9',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {r.snackItem || 'Snack'}
                        </span>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
                          {r.redeemedAt}
                        </p>
                      </div>
                      <Badge variant={r.redemptionMode === 'DYNAMIC_QR' || r.redemptionMode === 'STATIC_QR' ? 'success' : 'neutral'}>
                        {r.redemptionMode === 'DYNAMIC_QR' || r.redemptionMode === 'STATIC_QR' ? 'QR' : 'Manual'}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for Instant Redemption Feedback */}
      <Modal
        isOpen={newRedemption !== null}
        onClose={() => setNewRedemption(null)}
        title="🎉 Snack Redeemed!"
        maxWidth="400px"
      >
        {newRedemption && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
              fontSize: '40px',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
              marginBottom: '8px'
            }}>
              ✓
            </div>
            <div>
              <h3 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                Snack Claimed Successfully!
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
                Your snack for the <strong style={{ color: '#ffce00' }}>{newRedemption.session === 'MORNING' ? 'Morning ☀️' : 'Evening 🌙'}</strong> session has been scanned and recorded.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '12px 16px',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Item Redeemed:</span>
                <span style={{ color: '#ffce00', fontWeight: 700 }}>{newRedemption.snackItem}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Time:</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{newRedemption.redeemedAt}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Distributor:</span>
                <span style={{ color: '#e2e8f0' }}>{newRedemption.distributorName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Mode:</span>
                <span style={{ color: '#e2e8f0' }}>{newRedemption.redemptionMode === 'DYNAMIC_QR' || newRedemption.redemptionMode === 'STATIC_QR' ? 'QR Code' : 'Manual Entry'}</span>
              </div>
            </div>

            <Button
              fullWidth
              onClick={() => setNewRedemption(null)}
              style={{ marginTop: '8px' }}
            >
              Great, thanks!
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
