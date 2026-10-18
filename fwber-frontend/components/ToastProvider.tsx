'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, Heart, MessageCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'match' | 'message';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showMatch: (title: string, message?: string, action?: Toast['action']) => void;
  showMessage: (title: string, message?: string, action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: Toast = { id, duration: 5000, ...toast };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Keep only the most recent toasts
      return updated.slice(-maxToasts);
    });

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration);
    }

    return id;
  }, [maxToasts, removeToast]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const showError = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 7000 });
  }, [addToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  const showMatch = useCallback((title: string, message?: string, action?: Toast['action']) => {
    addToast({ type: 'match', title, message, action, duration: 8000 });
  }, [addToast]);

  const showMessage = useCallback((title: string, message?: string, action?: Toast['action']) => {
    addToast({ type: 'message', title, message, action, duration: 6000 });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      showSuccess,
      showError,
      showInfo,
      showMatch,
      showMessage,
    }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      case 'warning':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'match':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-purple-500" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
      case 'warning':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'match':
        return 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800';
      case 'message':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    }
  };

  return (
    <div
      className={`
        pointer-events-auto
        min-w-[320px] max-w-md
        rounded-lg border shadow-lg
        p-4
        transition-all duration-300 ease-in-out
        ${getBgColor()}
        ${isExiting 
          ? 'opacity-0 translate-x-full' 
          : 'opacity-100 translate-x-0 animate-slide-in-right'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground dark:text-foreground">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button type="button"
              onClick={() => {
                toast.action?.onClick();
                handleClose();
              }}
              className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button type="button"
          onClick={handleClose}
          className="flex-shrink-0 text-muted-foreground hover:text-muted-foreground dark:hover:dark:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to show notifications for WebSocket events
 */
export function useWebSocketNotifications() {
  const toast = useToast();

  const notifyMatch = useCallback((matchName: string, onViewMatch: () => void) => {
    toast.showMatch(
      `New Match! 💝`,
      `You matched with ${matchName}!`,
      {
        label: 'View Match',
        onClick: onViewMatch,
      }
    );
  }, [toast]);

  const notifyMessage = useCallback((senderName: string, preview: string, onViewMessage: () => void) => {
    toast.showMessage(
      `Message from ${senderName}`,
      preview,
      {
        label: 'Reply',
        onClick: onViewMessage,
      }
    );
  }, [toast]);

  const notifyConnectionLost = useCallback(() => {
    toast.showError(
      'Connection Lost',
      'Trying to reconnect...'
    );
  }, [toast]);

  const notifyConnectionRestored = useCallback(() => {
    toast.showSuccess(
      'Connection Restored',
      'You\'re back online!'
    );
  }, [toast]);

  return {
    notifyMatch,
    notifyMessage,
    notifyConnectionLost,
    notifyConnectionRestored,
  };
}
