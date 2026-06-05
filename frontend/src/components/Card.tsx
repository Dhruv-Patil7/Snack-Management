import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', style, glow = false, onClick }: CardProps) {
  return (
    <div
      className={`animate-fade-in ${className}`}
      onClick={onClick}
      style={{
        background: 'rgba(21, 21, 19, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: glow
          ? '0 0 20px rgba(255, 206, 0, 0.15)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
