// This file is deprecated - chat now uses Supabase Realtime directly
// Keeping for backward compatibility during migration

export function useChatSocket() {
  return null;
}

export function createRealtimeFallback(roomId: string, onMessage: (message: any) => void) {
  // This is now handled directly in ChatService
  return () => {};
}