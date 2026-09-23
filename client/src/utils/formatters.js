/**
 * Consistent formatting utilities for SIH26023 platform.
 * Formats numbers, production volumes, percentages, latencies, and counts.
 */

/**
 * Format raw number with comma thousand separators and optional fixed decimal places.
 * @param {number|string|null} val
 * @param {number} [decimals=0]
 * @returns {string}
 */
export function formatNumber(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  const num = Number(val);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format coal production in Million Tonnes (MT) with 2 decimals.
 * e.g. 142787.01 -> "142,787.01 MT"
 * @param {number|string|null} val
 * @returns {string}
 */
export function formatProduction(val) {
  if (val === null || val === undefined || isNaN(Number(val))) return '0.00 MT';
  const num = Number(val);
  return `${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} MT`;
}

/**
 * Format percentage with 1 decimal place.
 * e.g. 93.700000 -> "93.7%"
 * @param {number|string|null} val
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(Number(val))) return '0.0%';
  const num = Number(val);
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format processing latency in seconds.
 * e.g. 0.36 -> "0.36 s", 0.012 -> "0.01 s"
 * @param {number|string|null} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatTime(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(Number(val))) return '0.00 s';
  const num = Number(val);
  if (num === 0) return '0.00 s';
  if (num < 0.01) return '<0.01 s';
  return `${num.toFixed(decimals)} s`;
}

/**
 * Format integer counts with comma thousand separators.
 * e.g. 1245 -> "1,245"
 * @param {number|string|null} val
 * @returns {string}
 */
export function formatCount(val) {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Math.round(Number(val)).toLocaleString('en-IN');
}
