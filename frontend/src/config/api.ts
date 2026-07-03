/** API base URL without trailing slash — e.g. http://localhost:5165 */
export const API_ORIGIN =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5165';

export const API_BASE = `${API_ORIGIN}/api`;

export const HEALTH_URL = `${API_ORIGIN}/health`;
