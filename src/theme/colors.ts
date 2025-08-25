/**
 * Hustl App - iOS-first Color System
 * Single source of truth for all color tokens
 * Designed for React Native with iOS-first principles
 */

export const Colors = {
  // Primary / UF Blue
  primary: '#0052CC',
  primaryDark: '#003D99',
  primaryLight: '#1A66FF',

  // Secondary / UF Orange  
  secondary: '#FF6B35',
  secondaryLight: '#FF7A47',
  secondaryDark: '#E55A2B',

  // Surfaces & Text
  white: '#FFFFFF',
  bg: '#FAFBFC',
  muted: '#F8F9FA',
  mutedDark: '#F1F3F5',
  border: '#E1E5E9',
  text: '#1A2332',
  textHover: '#0F1419',

  // Status / Badges
  gold: '#FFD700',
  purple: '#8B5CF6',
  purpleDark: '#6D28D9',
  success: '#10B981',
  successDark: '#059669',
  accepted: '#3B82F6',
  acceptedDark: '#1D4ED8',
  inProgress: '#F59E0B',
  inProgressDark: '#D97706',

  // Scrollbar (mobile friendly)
  scrollbar: '#C1C1C1',
  scrollbarHover: '#A1A1A1',

  // Semantic color mappings for components
  semantic: {
    // Buttons
    primaryButton: '#0052CC',
    primaryButtonPressed: '#003D99',
    primaryButtonFocus: '#1A66FF',
    
    secondaryButton: '#FF6B35',
    secondaryButtonPressed: '#E55A2B',
    secondaryButtonAccent: '#FF7A47',

    // Surfaces
    screen: '#FAFBFC',
    card: '#FFFFFF',
    cardBorder: '#E1E5E9',
    cardShadow: 'rgba(16, 24, 40, 0.08)',
    
    // Text
    bodyText: '#1A2332',
    headingText: '#0F1419',
    interactiveText: '#0052CC',
    interactiveTextPressed: '#003D99',
    
    // Inputs
    inputBackground: '#FFFFFF',
    inputBorder: '#E1E5E9',
    inputText: '#1A2332',
    inputFocus: '#1A66FF',
    
    // Status badges
    premiumBadge: '#FFD700',
    acceptedBadge: '#3B82F6',
    acceptedBadgePressed: '#1D4ED8',
    inProgressBadge: '#F59E0B',
    inProgressBadgePressed: '#D97706',
    completedBadge: '#10B981',
    completedBadgePressed: '#059669',
    specialBadge: '#8B5CF6',
    specialBadgePressed: '#6D28D9',
    
    // Alerts & Toasts
    successAlert: '#10B981',
    errorAlert: '#E55A2B',
    errorAlertText: '#FFFFFF',
    infoAlert: '#1A66FF',
    
    // Navigation
    tabInactive: '#6B7280',
    tabActive: '#0052CC',
    fabBackground: '#FF6B35',
    fabIcon: '#FFFFFF',
    
    // Dividers
    divider: '#E1E5E9',
    dividerLight: '#F1F3F5',
    borderLight: '#E1E5E9',
  }
};

// Utility functions for color manipulation
export const ColorUtils = {
  withOpacity: (color: string, opacity: number): string => {
    const hex = color.replace('#', '');
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alpha}`;
  },

  getTextColor: (backgroundColor: string): string => {
    const darkBackgrounds = [
      Colors.primary,
      Colors.primaryDark,
      Colors.secondary,
      Colors.secondaryDark,
      Colors.text,
      Colors.textHover,
      Colors.acceptedDark,
      Colors.inProgressDark,
      Colors.successDark,
      Colors.purpleDark,
    ];
    
    return darkBackgrounds.includes(backgroundColor) ? Colors.white : Colors.text;
  },

  getPressedColor: (baseColor: string): string => {
    const pressedMap: Record<string, string> = {
      [Colors.primary]: Colors.primaryDark,
      [Colors.secondary]: Colors.secondaryDark,
      [Colors.accepted]: Colors.acceptedDark,
      [Colors.inProgress]: Colors.inProgressDark,
      [Colors.success]: Colors.successDark,
      [Colors.purple]: Colors.purpleDark,
    };
    
    return pressedMap[baseColor] || baseColor;
  },
};

export default Colors;