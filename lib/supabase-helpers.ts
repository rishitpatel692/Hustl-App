// Helper for safe single-row queries that might return 0 rows
export function coerceMaybeSingle<T>(res: { data: T | null; error: any }) {
  if (res.error && res.error.code !== 'PGRST116') {
    return res; // Real error, bubble it up
  }
  // PGRST116 or no data => treat as null without throwing
  return { data: res.data ?? null, error: null };
}

// Helper for standardized "not found" error messages
export function getNotFoundMessage(entityType: string = 'item'): string {
  return `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found or no longer available`;
}