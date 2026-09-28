import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Enterprise Button Component with unified states, variants, and animations.
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {React.ComponentType} [props.icon]
 * @param {'left' | 'right'} [props.iconPosition='left']
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const isDisabled = disabled || loading;

  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const loadingClass = loading ? 'btn-loading' : '';

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`btn ${variantClass} ${sizeClass} ${loadingClass} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <Loader2 className="btn-icon animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="btn-icon" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      ) : null}

      {children && <span className="btn-text">{children}</span>}

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="btn-icon-right" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
      )}
    </button>
  );
}
