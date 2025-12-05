'use client';

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  className?: string;
  onClick?: () => void;
  icon?: LucideIcon;
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export const Button = ({ children, variant = 'primary', className = '', onClick, icon: Icon }: ButtonProps) => {
  const baseStyle = "inline-flex items-center justify-center px-6 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg cursor-pointer";
  const variants = {
    primary: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/30",
    secondary: "bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 shadow-gray-200/50",
    outline: "border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 shadow-none px-4",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-500/30"
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-5 h-5 mr-2" />}
      {children}
    </button>
  );
};

export const FeatureCard = ({ icon: Icon, title, description, color }: FeatureCardProps) => (
  <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow duration-300 group">
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
      <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
    </div>
    <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);