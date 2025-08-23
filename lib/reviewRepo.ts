import { supabase } from './supabase';
import type { TaskReview, UserRatingAggregate, CreateReviewData, EditReviewData } from '@/types/database';

export class ReviewRepo {
  /**
   * Create a new task review
   */
  static async createReview(data: CreateReviewData): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: result, error } = await supabase.rpc('create_task_review', {
        p_task_id: data.taskId,
        p_stars: data.stars,
        p_comment: data.comment || '',
        p_tags: data.tags || []
      });

      if (error) {
        return { data: null, error: error.message };
      }

      if (result?.error) {
        return { data: null, error: result.error };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Edit an existing review (within 24 hours)
   */
  static async editReview(data: EditReviewData): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data: result, error } = await supabase.rpc('edit_task_review', {
        p_review_id: data.reviewId,
        p_stars: data.stars,
        p_comment: data.comment || '',
        p_tags: data.tags || []
      });

      if (error) {
        return { data: null, error: error.message };
      }

      if (result?.error) {
        return { data: null, error: result.error };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get user's rating aggregates
   */
  static async getUserRatingAggregate(userId: string): Promise<{ data: UserRatingAggregate | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('user_rating_aggregates')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const aggregate = data?.[0] ?? null;
      return { data: aggregate, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get paginated reviews for a user
   */
  static async getUserReviews(
    userId: string, 
    limit: number = 10, 
    offset: number = 0, 
    starsFilter?: number
  ): Promise<{ data: { reviews: TaskReview[]; total_count: number; has_more: boolean } | null; error: string | null }> {
    try {
      const { data: result, error } = await supabase.rpc('get_user_reviews', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
        p_stars_filter: starsFilter || null
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Get review for a specific task
   */
  static async getTaskReview(taskId: string): Promise<{ data: TaskReview | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('task_reviews')
        .select(`
          *,
          task:tasks(id, title, category),
          rater:profiles!task_reviews_rater_id_fkey(id, full_name, username, avatar_url)
        `)
        .eq('task_id', taskId)
        .eq('is_hidden', false)
        .limit(1);

      if (error) {
        return { data: null, error: error.message };
      }

      const review = data?.[0] ?? null;
      return { data: review, error: null };
    } catch (error) {
      return { data: null, error: 'Network error. Please check your connection.' };
    }
  }

  /**
   * Check if user can review a task
   */
  static async canReviewTask(taskId: string): Promise<{ canReview: boolean; reason?: string }> {
    try {
      // Check if task exists and is completed by current user
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('id, status, created_by, accepted_by')
        .eq('id', taskId)
        .eq('created_by', (await supabase.auth.getUser()).data.user?.id || '')
        .eq('status', 'completed')
        .limit(1);

      if (taskError || !task?.[0]) {
        return { canReview: false, reason: 'Task not found or not eligible for review' };
      }

      // Check for existing review
      const { data: existingReview, error: reviewError } = await supabase
        .from('task_reviews')
        .select('id')
        .eq('task_id', taskId)
        .eq('rater_id', (await supabase.auth.getUser()).data.user?.id || '')
        .limit(1);

      if (reviewError) {
        return { canReview: false, reason: 'Error checking existing review' };
      }

      if (existingReview?.[0]) {
        return { canReview: false, reason: 'You have already reviewed this task' };
      }

      return { canReview: true };
    } catch (error) {
      return { canReview: false, reason: 'Network error' };
    }
  }

  /**
   * Format star rating for display
   */
  static formatStarRating(rating: number): string {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  }

  /**
   * Get rating color based on value
   */
  static getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#10B981'; // Green
    if (rating >= 3.5) return '#F59E0B'; // Yellow
    if (rating >= 2.5) return '#FF8C00'; // Orange
    return '#EF4444'; // Red
  }
}