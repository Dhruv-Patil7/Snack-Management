import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
}

const badgeColors: Record<string, { bg: string; color: string; border: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.15)', color: '#86efac', border: 'rgba(34, 197, 94, 0.3)' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: 'rgba(245, 158, 11, 0.3)' },
  danger: { bg: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: 'rgba(59, 130, 246, 0.3)' },
  neutral: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' },
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const colors = badgeColors[variant];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      fontSize: '12px',
      fontWeight: 600,
      borderRadius: '9999px',
      background: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
      letterSpacing: '0.03em',
    }}>
      {children}
    </span>
  );
}
