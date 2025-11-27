import React from 'react';

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg';
}

export const NeoButton: React.FC<NeoButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md',
  ...props 
}) => {
  const baseStyles = "border-2 border-black font-bold transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-hover disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-banana-yellow text-black shadow-neo hover:bg-yellow-400",
    secondary: "bg-neo-red text-white shadow-neo hover:bg-rose-500",
    dark: "bg-black text-white shadow-neo hover:bg-gray-900",
    white: "bg-white text-black shadow-neo hover:bg-gray-50",
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-2 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};