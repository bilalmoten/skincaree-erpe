'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-[hsl(var(--success))]',
    error: 'bg-destructive',
    info: 'bg-[hsl(var(--info))]',
    warning: 'bg-[hsl(var(--warning))]',
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white/90 hover:text-white font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
}

