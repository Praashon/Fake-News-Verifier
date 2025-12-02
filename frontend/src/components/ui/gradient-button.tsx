'use client';

import type { HTMLAttributes } from 'react';

interface GradientButtonProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  width?: string;
  height?: string;
  onClick?: () => void;
  disabled?: boolean;
}

const GradientButton = ({
  children,
  width = '200px',
  height = '50px',
  className = '',
  onClick,
  disabled = false,
  ...props
}: GradientButtonProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div className="text-center">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`
          relative rounded-[50px] cursor-pointer
          flex items-center justify-center
          bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500
          p-[2px]
          transition-all duration-300
          hover:shadow-lg hover:shadow-cyan-500/25
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        style={{
          minWidth: width,
          height: height,
          backgroundSize: '200% 200%',
          animation: 'gradientRotate 3s ease infinite',
        }}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        aria-disabled={disabled}
        {...props}
      >
        <span 
          className="
            relative z-10 w-full h-full
            bg-gray-900 rounded-[48px]
            flex items-center justify-center
            text-white font-medium
            transition-all duration-300
            hover:bg-gray-800
          "
        >
          {children}
        </span>
      </div>
    </div>
  );
};

export default GradientButton;
