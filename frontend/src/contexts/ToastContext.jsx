import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_TTL = 4200;

const toastStyles = {
  success: {
    icon: CheckCircle2,
    accent: 'bg-emerald-400',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    accent: 'bg-red-500',
    label: 'Error',
  },
  info: {
    icon: Info,
    accent: 'bg-blue-400',
    label: 'Info',
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((type, message, title) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, type, message, title }].slice(-4));
    window.setTimeout(() => dismiss(id), TOAST_TTL);
  }, [dismiss]);

  const value = useMemo(() => ({
    success: (message, title) => pushToast('success', message, title),
    error: (message, title) => pushToast('error', message, title),
    info: (message, title) => pushToast('info', message, title),
  }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const style = toastStyles[toast.type] || toastStyles.info;
          const Icon = style.icon;
          return (
            <div key={toast.id} className="toast-card">
              <div className={`toast-accent ${style.accent}`} />
              <div className="toast-icon">
                <Icon size={20} />
              </div>
              <div className="toast-body">
                <p className="toast-title">{toast.title || style.label}</p>
                <p className="toast-message">{toast.message}</p>
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return toast;
};
