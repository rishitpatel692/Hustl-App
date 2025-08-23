import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface StarRatingProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
  color?: string;
}

export default function StarRating({ 
  rating, 
  size = 16, 
  showNumber = true,
  color = '#FFD700' 
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, index) => (
          <Star
            key={`full-${index}`}
            size={size}
            color={color}
            fill={color}
            strokeWidth={1}
          />
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <View style={styles.halfStarContainer}>
            <Star
              size={size}
              color={Colors.semantic.tabInactive}
              fill="none"
              strokeWidth={1}
            />
            <View style={[styles.halfStarOverlay, { width: size / 2 }]}>
              <Star
                size={size}
                color={color}
                fill={color}
                strokeWidth={1}
              />
            </View>
          </View>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, index) => (
          <Star
            key={`empty-${index}`}
            size={size}
            color={Colors.semantic.tabInactive}
            fill="none"
            strokeWidth={1}
          />
        ))}
      </View>
      
      {showNumber && (
        <Text style={[styles.ratingText, { fontSize: size * 0.75 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  halfStarContainer: {
    position: 'relative',
  },
  halfStarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  ratingText: {
    fontWeight: '600',
    color: Colors.semantic.bodyText,
  },
});