import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ProfileRepo } from '@/lib/profileRepo';
import { ReviewRepo } from '@/lib/reviewRepo';
import type { UserProfile, UserRatingAggregate, TaskReview } from '@/types/database';

interface UserProfileData {
  profile: UserProfile | null;
  aggregate: UserRatingAggregate | null;
  reviews: TaskReview[];
  hasMoreReviews: boolean;
  totalReviews: number;
}

interface UseUserProfileReturn {
  data: UserProfileData;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  loadMoreReviews: () => Promise<void>;
  filterReviews: (starsFilter: number | null) => Promise<void>;
  isLoadingMore: boolean;
}

const REVIEWS_PER_PAGE = 10;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple cache for profile data
const profileCache = new Map<string, { data: UserProfileData; timestamp: number }>();

export function useUserProfile(userId: string | null): UseUserProfileReturn {
  const [data, setData] = useState<UserProfileData>({
    profile: null,
    aggregate: null,
    reviews: [],
    hasMoreReviews: false,
    totalReviews: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStarsFilter, setCurrentStarsFilter] = useState<number | null>(null);
  const [reviewsOffset, setReviewsOffset] = useState(0);

  // Load profile data
  const loadProfile = useCallback(async (useCache = true) => {
    if (!userId) return;

    // Check cache first
    if (useCache) {
      const cached = profileCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load profile and aggregates in parallel
      const [profileResult, aggregateResult] = await Promise.all([
        ProfileRepo.getProfile(userId),
        ReviewRepo.getUserRatingAggregate(userId)
      ]);

      if (profileResult.error) {
        setError(profileResult.error);
        return;
      }

      if (!profileResult.data) {
        setError('Profile not found');
        return;
      }

      // Load initial reviews
      const reviewsResult = await ReviewRepo.getUserReviews(userId, REVIEWS_PER_PAGE, 0);
      
      const newData: UserProfileData = {
        profile: profileResult.data,
        aggregate: aggregateResult.data,
        reviews: reviewsResult.data?.reviews || [],
        hasMoreReviews: reviewsResult.data?.has_more || false,
        totalReviews: reviewsResult.data?.total_count || 0,
      };

      setData(newData);
      setReviewsOffset(REVIEWS_PER_PAGE);

      // Cache the result
      profileCache.set(userId, {
        data: newData,
        timestamp: Date.now()
      });

    } catch (error) {
      setError('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load more reviews (pagination)
  const loadMoreReviews = useCallback(async () => {
    if (!userId || isLoadingMore || !data.hasMoreReviews) return;

    setIsLoadingMore(true);

    try {
      const result = await ReviewRepo.getUserReviews(
        userId, 
        REVIEWS_PER_PAGE, 
        reviewsOffset,
        currentStarsFilter || undefined
      );

      if (result.data) {
        setData(prev => ({
          ...prev,
          reviews: [...prev.reviews, ...result.data!.reviews],
          hasMoreReviews: result.data!.has_more,
        }));
        setReviewsOffset(prev => prev + REVIEWS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to load more reviews:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, reviewsOffset, currentStarsFilter, data.hasMoreReviews, isLoadingMore]);

  // Filter reviews by stars
  const filterReviews = useCallback(async (starsFilter: number | null) => {
    if (!userId) return;

    setCurrentStarsFilter(starsFilter);
    setReviewsOffset(0);
    setIsLoading(true);

    try {
      const result = await ReviewRepo.getUserReviews(
        userId, 
        REVIEWS_PER_PAGE, 
        0,
        starsFilter || undefined
      );

      if (result.data) {
        setData(prev => ({
          ...prev,
          reviews: result.data!.reviews,
          hasMoreReviews: result.data!.has_more,
          totalReviews: result.data!.total_count,
        }));
        setReviewsOffset(REVIEWS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to filter reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Refresh profile (bypass cache)
  const refreshProfile = useCallback(async () => {
    setReviewsOffset(0);
    setCurrentStarsFilter(null);
    await loadProfile(false);
  }, [loadProfile]);

  // Load profile on mount or userId change
  useEffect(() => {
    if (userId) {
      loadProfile();
    } else {
      setData({
        profile: null,
        aggregate: null,
        reviews: [],
        hasMoreReviews: false,
        totalReviews: 0,
      });
      setError(null);
    }
  }, [loadProfile, userId]);

  return {
    data,
    isLoading,
    error,
    refreshProfile,
    loadMoreReviews,
    filterReviews,
    isLoadingMore,
  };
}