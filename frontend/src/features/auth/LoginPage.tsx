import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { authApi } from '../../api';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ username, password });
      login(res.data);
      showToast('Login successful', 'success');

      // Redirect based on role
      const routes: Record<string, string> = {
        ADMIN: '/admin',
        DISTRIBUTOR: '/distributor',
        EMPLOYEE: '/employee',
      };
      navigate(routes[res.data.role] || '/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 206, 0, 0.08), transparent 60%), var(--color-bg)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }} className="animate-fade-in">
          <img src="/logo.png" alt="UltraTech Cement" style={{
            maxHeight: '72px',
            borderRadius: '8px',
            margin: '0 auto 20px',
            boxShadow: '0 8px 30px rgba(255, 206, 0, 0.15)',
          }} />
          <h1 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#f5f5f4',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            Snack Portal
          </h1>
          <p style={{ color: '#a8a29e', fontSize: '14px' }}>
            Sign in to access the snack distribution portal
          </p>
        </div>

        <Card glow>
          <form onSubmit={handleSubmit}>
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              }
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              }
            />

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#fca5a5',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: '8px' }}
            >
              Sign In
            </Button>
          </form>
        </Card>

        <p style={{
          textAlign: 'center',
          color: '#475569',
          fontSize: '12px',
          marginTop: '24px',
        }}>
          Internal use only • Company LAN
        </p>
      </div>
    </div>
  );
}
