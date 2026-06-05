import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}



const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: '13px', borderRadius: '8px' },
  md: { padding: '10px 20px', fontSize: '14px', borderRadius: '10px' },
  lg: { padding: '14px 28px', fontSize: '16px', borderRadius: '12px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 600,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    width: fullWidth ? '100%' : undefined,
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button
      disabled={disabled || loading}
      style={baseStyle}
      className={`btn-${variant}`}
      {...props}
    >
      {loading && (
        <span style={{
          width: '16px',
          height: '16px',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
          display: 'inline-block',
        }} />
      )}
      {children}
    </button>
  );
}

// Add CSS for button variants and hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .btn-primary {
    background: linear-gradient(135deg, #ffce00, #d97706) !important;
    color: #0f172a !important;
    border: none !important;
    box-shadow: 0 4px 14px rgba(251, 191, 36, 0.25);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4);
    filter: brightness(1.05);
  }
  .btn-secondary {
    background: rgba(30, 41, 59, 0.8) !important;
    color: #e2e8f0 !important;
    border: 1px solid #374151 !important;
  }
  .btn-secondary:hover:not(:disabled) {
    background: rgba(30, 41, 59, 1) !important;
    border-color: #4b5563 !important;
  }
  .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626) !important;
    color: white !important;
    border: none !important;
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
  }
  .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
  }
  .btn-ghost {
    background: transparent !important;
    color: #94a3b8 !important;
    border: 1px solid transparent !important;
  }
  .btn-ghost:hover:not(:disabled) {
    background: rgba(30, 41, 59, 0.5) !important;
    color: #e2e8f0 !important;
  }
  .btn-success {
    background: linear-gradient(135deg, #22c55e, #16a34a) !important;
    color: white !important;
    border: none !important;
    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3);
  }
  .btn-success:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(34, 197, 94, 0.45);
  }
`;
if (!document.getElementById('btn-styles')) {
  styleSheet.id = 'btn-styles';
  document.head.appendChild(styleSheet);
}
