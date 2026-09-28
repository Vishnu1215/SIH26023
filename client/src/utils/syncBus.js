/**
 * System-Wide Synchronization Bus for SIH26023 Ministry of Coal Platform
 * Synchronizes Dashboard, Documents, Analytics, Reports, Search, Recommendations, and Admin
 * across all active modules and browser tabs.
 */

import { useEffect, useRef } from 'react';

const EVENT_NAME = 'sih-platform-updated';
const CHANNEL_NAME = 'sih_coal_sync_channel';

// Browser BroadcastChannel for multi-tab synchronization
let broadcastChannel = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event && event.data) {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event.data }));
      }
    };
  } catch (err) {
    console.warn('[SyncBus] BroadcastChannel initialization skipped:', err);
  }
}

/**
 * Emit a platform-wide update event
 * @param {Object} detail - Event metadata (e.g. { type: 'DOCUMENT_UPLOADED', count: 3 })
 */
export function emitPlatformUpdate(detail = {}) {
  const payload = {
    ...detail,
    timestamp: Date.now()
  };

  // Local window event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
  }

  // Cross-tab broadcast
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      console.warn('[SyncBus] Failed to broadcast message:', e);
    }
  }
}

/**
 * React hook to listen for platform synchronization events
 * @param {Function} onUpdate - Callback invoked when a synchronization event occurs
 * @param {Array} deps - Dependency list
 */
export function usePlatformSync(onUpdate, deps = []) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let debounceTimer = null;
    const handler = (event) => {
      // Debounce slightly to prevent redundant rapid re-fetches
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (callbackRef.current) {
          callbackRef.current(event?.detail || {});
        }
      }, 150);
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, deps);
}
