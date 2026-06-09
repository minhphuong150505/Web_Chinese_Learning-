/**
 * Build a URL to a study-material file served by the backend
 * (/api/hsk/material/**). Each path segment is URL-encoded so the spaces and
 * Vietnamese characters in the real filenames survive, while the "/" separators
 * are kept intact.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export function materialUrl(relativePath: string): string {
  const encoded = relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${API_BASE}/hsk/material/${encoded}`;
}
