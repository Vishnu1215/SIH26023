import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Enterprise Toast Notification Component.
 */
export default function Toast({
  type = 'info',
  message,
  onClose,
  duration = 4500,
  className = ''
}) {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  };
  const IconComponent = icons[type] || Info;

  return (
    <div className={`toast-notification toast-${type} ${className}`.trim()} role="alert">
      <div className="toast-content">
        <IconComponent className="toast-icon" size={18} />
        <span className="toast-text">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="toast-close"
          aria-label="Close notification"
        >
          <X size={15} />
        </button>
      )}
      {duration > 0 && (
        <div
          className="toast-progress-bar"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
}
