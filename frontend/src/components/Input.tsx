import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, style, type, ...props }: InputProps) {
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const paddingRight = isPassword ? '40px' : '14px';
  const paddingLeft = icon ? '40px' : '14px';

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
          type={inputType}
          style={{
            width: '100%',
            padding: `10px ${paddingRight} 10px ${paddingLeft}`,
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
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
          </button>
        )}
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
