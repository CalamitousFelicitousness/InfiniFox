/**
 * InfiniFox Light Theme
 * Professional light theme optimized for daytime use
 */

import { createBaseTheme } from './base'
import type { Theme } from '../types'

/**
 * InfiniFox Light Theme
 * Clean, modern light theme with excellent readability
 */
export const lightTheme: Theme = {
  ...createBaseTheme(),
  name: 'infinifox-light',
  description: 'InfiniFox light theme optimized for daytime use with high contrast and readability',
  mode: 'light',
  
  colors: {
    ...createBaseTheme().colors,
    palette: {
      ...createBaseTheme().colors.palette,
      // Override specific colors for light theme
    },
    semantic: {
      // Background colors - light and clean
      background: {
        primary: '#ffffff',           // Pure white for main background
        secondary: '#f8f9fa',        // Very light gray for sections
        tertiary: '#f1f3f5',         // Light gray for nested elements
        elevated: '#ffffff',         // White for elevated surfaces
        overlay: 'rgba(0, 0, 0, 0.4)',           // Dark overlay for modals
        overlayHeavy: 'rgba(0, 0, 0, 0.6)',      // Heavier overlay
        overlayLight: 'rgba(0, 0, 0, 0.2)',      // Light overlay
        canvas: '#fafbfc',           // Slightly off-white for canvas
      },
      
      // Text colors - high contrast for readability
      text: {
        primary: '#1a1d23',          // Almost black for main text
        secondary: '#495057',        // Dark gray for secondary text
        tertiary: '#868e96',         // Medium gray for tertiary
        muted: '#adb5bd',           // Light gray for muted text
        disabled: '#ced4da',        // Very light gray for disabled
        placeholder: '#adb5bd',     // Light gray for placeholders
        inverse: '#ffffff',          // White text on dark backgrounds
        link: '#4c3dd8',            // Purple for links
        linkHover: '#3c2dd5',       // Darker purple on hover
      },
      
      // Border colors - subtle but visible
      border: {
        primary: '#dee2e6',          // Light gray border
        secondary: '#e9ecef',        // Very subtle border
        default: '#dee2e6',          // Light gray border (alias for compatibility)
        subtle: '#e9ecef',           // Very subtle border
        hover: '#ced4da',            // Slightly darker on hover
        focus: '#4c3dd8',            // Purple for focus
        active: '#3c2dd5',           // Darker purple when active
        error: '#dc3545',            // Red for errors
        success: '#28a745',          // Green for success
        warning: '#ffc107',          // Yellow for warnings
      },
      
      // Primary colors - purple theme
      primary: {
        base: '#5c4cdb',             // Main purple
        hover: '#4c3dd8',            // Darker on hover
        active: '#3c2dd5',           // Even darker when pressed
        bg: 'rgba(92, 76, 219, 0.08)',          // Very light purple background
        bgHover: 'rgba(92, 76, 219, 0.12)',     // Slightly darker on hover
        border: 'rgba(92, 76, 219, 0.3)',       // Purple border
        text: '#5c4cdb',             // Purple text
      },
      
      // Status colors - adjusted for light background
      success: {
        base: '#28a745',
        hover: '#218838',
        active: '#1e7e34',
        bg: 'rgba(40, 167, 69, 0.08)',
        bgHover: 'rgba(40, 167, 69, 0.12)',
        border: 'rgba(40, 167, 69, 0.3)',
        text: '#28a745',
      },
      
      warning: {
        base: '#ffc107',
        hover: '#e0a800',
        active: '#d39e00',
        bg: 'rgba(255, 193, 7, 0.08)',
        bgHover: 'rgba(255, 193, 7, 0.12)',
        border: 'rgba(255, 193, 7, 0.3)',
        text: '#856404',  // Darker yellow for better contrast
      },
      
      danger: {
        base: '#dc3545',
        hover: '#c82333',
        active: '#bd2130',
        bg: 'rgba(220, 53, 69, 0.08)',
        bgHover: 'rgba(220, 53, 69, 0.12)',
        border: 'rgba(220, 53, 69, 0.3)',
        text: '#dc3545',
      },
      
      info: {
        base: '#17a2b8',
        hover: '#138496',
        active: '#117a8b',
        bg: 'rgba(23, 162, 184, 0.08)',
        bgHover: 'rgba(23, 162, 184, 0.12)',
        border: 'rgba(23, 162, 184, 0.3)',
        text: '#17a2b8',
      },
      
      // Interactive element colors
      interactive: {
        primary: '#5c4cdb',          // Main purple
        primaryHover: '#4c3dd8',     // Darker on hover
        primaryActive: '#3c2dd5',    // Even darker when pressed
        secondary: '#6c757d',        // Gray for secondary
        secondaryHover: '#5a6268',   // Darker gray on hover
        secondaryActive: '#495057',  // Even darker when pressed
      },
      
      // Surface colors
      surface: {
        primary: '#ffffff',
        secondary: '#f8f9fa',
        tertiary: '#f1f3f5',
        hover: 'rgba(0, 0, 0, 0.02)',
        active: 'rgba(0, 0, 0, 0.04)',
        disabled: '#f8f9fa',
      },
      
      // Component-specific colors
      button: {
        primaryBg: '#5c4cdb',
        primaryBgHover: '#4c3dd8',
        primaryBgActive: '#3c2dd5',
        primaryText: '#ffffff',
        
        secondaryBg: '#f1f3f5',
        secondaryBgHover: '#e9ecef',
        secondaryBgActive: '#dee2e6',
        secondaryText: '#495057',
        
        ghostBg: 'transparent',
        ghostBgHover: 'rgba(0, 0, 0, 0.04)',
        ghostBgActive: 'rgba(0, 0, 0, 0.08)',
        ghostText: '#495057',
        
        dangerBg: '#dc3545',
        dangerBgHover: '#c82333',
        dangerBgActive: '#bd2130',
        dangerText: '#ffffff',
      },
      
      input: {
        bg: '#ffffff',
        bgHover: '#f8f9fa',
        bgFocus: '#ffffff',
        bgDisabled: '#f1f3f5',
        border: '#dee2e6',
        borderHover: '#ced4da',
        borderFocus: '#4c3dd8',
        text: '#1a1d23',
        placeholder: '#adb5bd',
      },
      
      // Code colors for light theme
      code: {
        bg: '#f8f9fa',
        text: '#1a1d23',
        comment: '#868e96',
        keyword: '#5c4cdb',
        string: '#28a745',
        number: '#dc3545',
        function: '#17a2b8',
        variable: '#e83e8c',
        operator: '#495057',
      },
    },
  },
  
  // Shadows - softer for light theme
  shadows: {
    ...createBaseTheme().shadows,
    box: {
      none: 'none',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      float: '0 12px 28px 0 rgba(0, 0, 0, 0.15), 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      modal: '0 24px 48px -12px rgba(0, 0, 0, 0.18)',
      button: '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      buttonHover: '0 4px 8px 0 rgba(0, 0, 0, 0.15)',
      buttonPrimary: '0 4px 12px 0 rgba(92, 76, 219, 0.3)',
      buttonPrimaryHover: '0 6px 16px 0 rgba(92, 76, 219, 0.4)',
    },
  },
  
  // Custom properties specific to light theme
  custom: {
    // Glass morphism effects - adjusted for light theme
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBgHover: 'rgba(255, 255, 255, 0.9)',
    glassBlur: '12px',
    glassBorder: 'rgba(0, 0, 0, 0.08)',
    glassShine: 'rgba(255, 255, 255, 0.5)',
    
    // Canvas specific
    canvasGridColor: 'rgba(0, 0, 0, 0.04)',
    canvasGridColorStrong: 'rgba(0, 0, 0, 0.08)',
    canvasBg: '#fafbfc',
    
    // Scrollbar styling - subtle for light theme
    scrollbarTrack: '#f1f3f5',
    scrollbarThumb: '#adb5bd',
    scrollbarThumbHover: '#868e96',
    
    // Focus ring - purple theme
    ringBase: 'rgba(92, 76, 219, 0.5)',
    ringDanger: 'rgba(220, 53, 69, 0.5)',
    ringSuccess: 'rgba(40, 167, 69, 0.5)',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    gradientSuccess: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
    gradientDanger: 'linear-gradient(135deg, #f85032 0%, #e73827 100%)',
    gradientInfo: 'linear-gradient(135deg, #667eea 0%, #41d1ff 100%)',
    gradientWarning: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
    
    // Overlays
    overlayBg: 'rgba(0, 0, 0, 0.4)',
    overlayBgHeavy: 'rgba(0, 0, 0, 0.6)',
    overlayBgLight: 'rgba(0, 0, 0, 0.2)',
    
    // Component shadows
    panelShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06)',
    toolbarShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
    dropdownShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    modalShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    
    // Hover effects
    hoverBg: 'rgba(0, 0, 0, 0.02)',
    hoverBgStrong: 'rgba(0, 0, 0, 0.04)',
    activeBg: 'rgba(0, 0, 0, 0.06)',
    
    // Selection colors
    selectionBg: 'rgba(92, 76, 219, 0.2)',
    selectionText: '#1a1d23',
    
    // Badge colors
    badgeBg: '#f1f3f5',
    badgeText: '#495057',
    badgeBorder: '#dee2e6',
    
    // Tooltip
    tooltipBg: '#1a1d23',
    tooltipText: '#ffffff',
    tooltipShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    
    // Dividers
    dividerColor: '#e9ecef',
    dividerColorStrong: '#dee2e6',
    
    // Status indicators
    onlineColor: '#28a745',
    offlineColor: '#868e96',
    busyColor: '#ffc107',
    awayColor: '#17a2b8',
    
    // Chart colors
    chartColors: [
      '#5c4cdb',  // Purple
      '#28a745',  // Green
      '#17a2b8',  // Cyan
      '#ffc107',  // Yellow
      '#dc3545',  // Red
      '#e83e8c',  // Pink
      '#6610f2',  // Indigo
      '#fd7e14',  // Orange
    ],
  },
}

/**
 * Light theme specific overrides
 */
export const lightThemeOverrides = {
  // Adjusted shadows for light theme
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  
  // Adjusted glow effects for light theme
  glows: {
    primary: '0 0 20px rgba(92, 76, 219, 0.3)',
    primaryIntense: '0 0 30px rgba(92, 76, 219, 0.5)',
    primarySubtle: '0 0 10px rgba(92, 76, 219, 0.15)',
  },
  
  // Focus states
  focus: {
    outline: '2px solid rgba(92, 76, 219, 0.5)',
    outlineOffset: '2px',
    shadow: '0 0 0 3px rgba(92, 76, 219, 0.1)',
  },
}

// Export theme and overrides
export default lightTheme
