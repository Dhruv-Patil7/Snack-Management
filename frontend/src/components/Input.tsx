import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, style, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#94a3b8',
          marginBottom: '6px',
          letterSpacing: '0.02em',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
          }}>
            {icon}
          </span>
        )}
        <input
          style={{
            width: '100%',
            padding: icon ? '10px 14px 10px 40px' : '10px 14px',
            background: 'rgba(21, 21, 19, 0.6)',
            border: `1px solid ${error ? '#ef4444' : '#3e3e3a'}`,
            borderRadius: '10px',
            color: '#f1f5f9',
            fontSize: '14px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 200ms',
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : 'var(--color-accent)';
            e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 206, 0, 0.15)'}`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? '#ef4444' : '#3e3e3a';
            e.target.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>
      {error && (
        <p style={{
          color: '#ef4444',
          fontSize: '12px',
          marginTop: '4px',
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
