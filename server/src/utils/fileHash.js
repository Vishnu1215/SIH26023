import fs from 'fs';
import crypto from 'crypto';

/**
 * Compute SHA-256 hash of a file on disk.
 * @param {string} filePath - Absolute or relative file path
 * @returns {string|null} Hex-encoded SHA-256 hash or null if file not found
 */
export const computeFileSha256 = (filePath) => {
  if (!filePath) return null;
  try {
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  } catch (err) {
    console.warn(`[FileHash] Could not compute hash for ${filePath}:`, err.message);
    return null;
  }
};

export default {
  computeFileSha256
};
