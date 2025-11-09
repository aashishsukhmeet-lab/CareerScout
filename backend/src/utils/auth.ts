/**
 * Stub authentication helper
 * In production, this would extract user ID from JWT token, session, etc.
 */
export function currentUserId(): string {
  // For now, always return a test user
  // In production, extract from req.headers.authorization or session
  return 'user-1';
}
