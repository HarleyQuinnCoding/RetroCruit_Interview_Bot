import React from 'react';

interface HolographicButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  active?: boolean;
  disabled?: boolean;
  size?: 'default' | 'xs'; // Updated size prop
}

const HolographicButton: React.FC<HolographicButtonProps> = ({
  children,
  onClick,
  className = '',
  active = false,
  disabled = false,
  size = 'default', // Default size
}) => {
  const sizeClasses = {
    default: 'text-lg px-6 py-3 md:text-xl md:px-8 md:py-4',   // New default (was previous 'small')
    xs: 'text-base px-4 py-2 md:text-lg md:px-6 md:py-3',     // New extra-small for sidebar
  };

  const baseClasses = `
    font-['Michroma'] ${sizeClasses[size]}
    bg-gradient-to-br from-cyan-900/20 to-teal-900/20 text-cyan-400
    border-2 border-cyan-500/50 rounded-xl md:rounded-2xl
    backdrop-blur-sm md:backdrop-blur-md cursor-pointer
    shadow-[0_0_10px_rgba(0,255,255,0.2)] md:shadow-[0_0_15px_rgba(0,255,255,0.3)]
    text-shadow-[0_0_5px_rgba(0,255,255,0.3)]
    transition-all duration-300 ease-in-out
    hover:from-cyan-900/30 hover:to-teal-900/30
    hover:border-purple-400 hover:text-purple-300
    hover:shadow-[0_0_20px_rgba(255,0,255,0.6)] hover:text-shadow-[0_0_12px_rgba(255,0,255,0.9)]
    transform hover:scale-105
    ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100 !shadow-none !text-shadow-none' : ''}
  `;

  const activeClasses = active
    ? `
      !bg-gradient-to-br !from-purple-900/40 !to-fuchsia-900/40
      !border-purple-400 !text-purple-300
      !shadow-[0_0_25px_rgba(255,0,255,0.8)] !text-shadow-[0_0_15px_rgba(255,0,255,1)]
      scale-105
    `
    : '';

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${activeClasses} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default HolographicButton;