import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCode } from 'react-qr-code';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { qrApi, redemptionApi } from '../../api';
import { Card } from '../../components/Card';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/Badge';
import type { Redemption } from '../../types';

export function EmployeePortal() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [qrToken, setQrToken] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qr' | 'history'>('qr');
  const [history, setHistory] = useState<Redemption[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = useCallback(async () => {
    try {
      const res = await qrApi.generate();
      setQrToken(res.data.qrToken);
      setCountdown(res.data.expiresInSeconds);
      setLoading(false);
    } catch (err) {
      showToast('Failed to generate QR code', 'error');
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchQr();
    // Refresh QR every 25 seconds (5s before 30s expiry)
    timerRef.current = setInterval(fetchQr, 25000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchQr]);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

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
                    display: 'inline-block',
                    boxShadow: '0 0 30px rgba(255, 206, 0, 0.15)',
                  }}
                  className="animate-pulse-glow"
                  >
                    <QRCode
                      value={qrToken}
                      size={220}
                      level="M"
                      style={{ display: 'block' }}
                    />
                  </div>

                  {/* Countdown */}
                  <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: countdown > 10 ? '#22c55e' : countdown > 5 ? '#f59e0b' : '#ef4444',
                      animation: 'pulse-glow 1s ease-in-out infinite',
                    }} />
                    <span style={{
                      color: '#94a3b8',
                      fontSize: '13px',
                    }}>
                      Refreshes in <strong style={{ color: countdown > 10 ? '#22c55e' : countdown > 5 ? '#f59e0b' : '#ef4444' }}>{countdown}s</strong>
                    </span>
                  </div>

                  <p style={{
                    color: '#475569',
                    fontSize: '11px',
                    marginTop: '16px',
                  }}>
                    QR code refreshes automatically for security
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
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>
                          {r.redeemedAt}
                        </p>
                      </div>
                      <Badge variant={r.redemptionMode === 'DYNAMIC_QR' ? 'success' : 'neutral'}>
                        {r.redemptionMode === 'DYNAMIC_QR' ? 'QR' : 'Manual'}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
