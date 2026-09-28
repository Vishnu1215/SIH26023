import React from 'react';
import { FileQuestion } from 'lucide-react';
import Button from './Button.jsx';

/**
 * Enterprise EmptyState Component for tables, search results, and workspaces.
 */
export default function EmptyState({
  icon: Icon = FileQuestion,
  title = 'No records found',
  description = 'There are currently no items to display in this view.',
  actionText,
  onAction,
  actionIcon,
  secondaryActionText,
  onSecondaryAction,
  className = ''
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <div className="empty-state-icon-box">
        <Icon size={28} className="empty-state-icon" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {(actionText || secondaryActionText) && (
        <div className="empty-state-actions">
          {secondaryActionText && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionText}
            </Button>
          )}
          {actionText && (
            <Button variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
              {actionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
