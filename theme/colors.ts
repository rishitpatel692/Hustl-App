/**
 * Hustl App - iOS-first Color System
 * Single source of truth for all color tokens
 * Designed for React Native with iOS-first principles
 */

export const Colors = {
  // Primary / UF Blue
  primary: '#0021A5',
  primaryDark: '#001B85',
  primaryLight: '#1E40AF',

  // Secondary / UF Orange  
  secondary: '#FA4616', // Updated UF Orange
  secondaryLight: '#FB7C47',
  secondaryDark: '#E63A0B',

  // Surfaces & Text
  white: '#FFFFFF',
  bg: '#FAFBFC',
  muted: '#F8FAFC',
  mutedDark: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textHover: '#020617',

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
    primaryButton: '#0021A5',
    primaryButtonPressed: '#001B85',
    primaryButtonFocus: '#1E40AF',
    
    secondaryButton: '#FA4616',
    secondaryButtonPressed: '#E63A0B',
    secondaryButtonAccent: '#FB7C47',

    // Surfaces
    screen: '#FAFBFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardShadow: 'rgba(15, 23, 42, 0.08)',
    
    // Text
    bodyText: '#334155',
    headingText: '#0F172A',
    interactiveText: '#475569',
    interactiveTextPressed: '#020617',
    
    // Inputs
    inputBackground: '#FFFFFF',
    inputBorder: '#E2E8F0',
    inputBorderFocus: '#0021A5',
    inputText: '#0F172A',
    inputFocus: '#1E40AF',
    
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
    errorAlert: '#E63A0B',
    errorAlertText: '#FFFFFF',
    infoAlert: '#0038FF',
    
    // Navigation
    tabInactive: '#94A3B8',
    tabActive: '#0021A5',
    fabBackground: '#FF4D23',
    fabIcon: '#FFFFFF',
    
    // Dividers
    divider: '#E2E8F0',
    dividerLight: '#F1F5F9',
  }
};

// Utility functions for color manipulation
export const ColorUtils = {
  // Add opacity to any color
  withOpacity: (color: string, opacity: number): string => {
    const hex = color.replace('#', '');
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `#${hex}${alpha}`;
  },

  // Get appropriate text color for background
  getTextColor: (backgroundColor: string): string => {
    // For dark backgrounds (primary, secondary, etc.), use white text
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

  // Get pressed state color
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