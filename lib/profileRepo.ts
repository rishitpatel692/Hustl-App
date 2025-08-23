import { supabase } from './supabase';
import type { UserProfile } from '@/types/database';

export class ProfileRepo {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const profile = data?.[0] ?? null;
      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const profile = data?.[0] ?? null;
      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Create or update profile (upsert)
   */
  static async upsertProfile(profile: Partial<UserProfile> & { id: string }): Promise<{ data: UserProfile | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          updated_at: new Date().toISOString()
        })
        .select()
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const upsertedProfile = data?.[0] ?? null;
      return { data: upsertedProfile, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Search profiles by name or username
   */
  static async searchProfiles(query: string, limit: number = 20): Promise<{ data: UserProfile[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }
}