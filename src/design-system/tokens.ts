/**
 * AstraFocusNexus Design System - Phase 2
 * 
 * Core design tokens and styling constants for consistent UI across the application.
 * 
 * This module provides:
 * - Color palette (base, semantic, functional colors)
 * - Typography scale
 * - Spacing system
 * - Shadows and elevation
 * - Radius/border styles
 * - Transition timing functions
 */

/**
 * Base color tokens matching the CSS theme variables from index.css
 */
export const DesignTokens = {
  // Background colors
  bg0: '#080b12',        // deep space (primary dark background)
  bg1: '#0b1020',        // secondary dark background  
  bg2: '#151a2e',        // card/container background
  
  // Text colors
  fg: '#e6f6ff',         // near-white (primary text)
  muted: '#aabdcf',      // secondary text (hints, labels)
  subdued: '#6b7280',    // disabled/inactive text
  
  // Brand colors (from theme)
  brand: '#00e5ff',      // neon cyan (primary brand color)
  brand2: '#7c4dff',     // neon purple (secondary brand)
  accent: '#14f195',     // neon green (success/accent)
  
  // Functional colors
  success: {
    DEFAULT: '#14f195',
    bg: 'rgba(20, 241, 149, 0.1)',
    border: 'rgba(20, 241, 149, 0.3)'
  },
  error: {
    DEFAULT: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)'
  },
  warning: {
    DEFAULT: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)'
  },
  info: {
    DEFAULT: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)'
  },
  
  // Border colors
  line: 'rgba(255, 255, 255, 0.14)',
  divider: 'rgba(255, 255, 255, 0.08)',
  
  // Grid pattern (for backgrounds)
  grid: 'rgba(255, 255, 255, 0.06)'
};

/**
 * Typography scale using Inter font family
 */
export const Typography = {
  fontFamily: {
    base: '"Inter", "system-ui", "Arial", sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace'
  },
  
  fontSize: {
    xs: '0.75rem',       // 12px - captions, small labels
    sm: '0.875rem',      // 14px - secondary text
    base: '1rem',        // 16px - body text
    lg: '1.125rem',      // 18px - headings, cards
    xl: '1.25rem',       // 20px - section headings
    '2xl': '1.5rem',     // 24px - page titles
    '3xl': '1.875rem',   // 30px - main titles  
    '4xl': '2.25rem',    // 36px - hero headers
    '5xl': '3rem'        // 48px - featured content
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  
  lineHeight: {
    tight: '1.25',       // headings, tight code
    normal: '1.5',       // body text
    relaxed: '1.625'     // long-form content
  }
};

/**
 * Spacing scale (4px baseline)
 * Matches Tailwind's default spacing
 */
export const Spacing = {
  px: '0.25rem',        // 4px
  px2: '0.5rem',        // 8px  
  px3: '0.75rem',       // 12px
  px4: '1rem',          // 16px
  px5: '1.25rem',       // 20px
  px6: '1.5rem',        // 24px
  px8: '2rem',          // 32px
  px10: '2.5rem',       // 40px
  px12: '3rem'         // 48px
  
  // Alternative quarter-scale for fine-tuning
};

/**
 * Border radius tokens
 */
export const Radius = {
  none: '0',
  xs: '0.125rem',       // 2px - subtle rounding
  sm: '0.25rem',        // 4px - small controls
  md: '0.375rem',       // 6px - default buttons
  lg: '0.5rem',         // 8px - cards, inputs
  xl: '0.75rem',        // 12px - large cards
  '2xl': '1rem',        // 16px - modals
  full: '9999px'        // Circle
};

/**
 * Shadow elevation tokens
 */
export const Shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',    // subtle lift
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',   // small card
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)', // default card  
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)', // featured
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', // modal
  
  // Glow effects for brand colors
  brandGlow: '0 0 20px rgba(0, 229, 255, 0.3)',
  errorGlow: '0 0 20px rgba(239, 68, 68, 0.3)'
};

/**
 * Transition timing functions
 */
export const Transitions = {
  default: '150ms ease-in-out',
  fast: '75ms ease-in-out',
  slow: '300ms ease-in-out',
  
  // For specific effects
  scale: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  hover: '100ms ease'
};

/**
 * Z-index layer scale
 */
export const ZIndices = {
  dropdown: 100,
  sticky: 200,
  sidebar: 300,
  modal: 400,
  toast: 500,
  popover: 600
};

/** Grid pattern color (moved to declare before use) */
const GRID_COLOR = 'rgba(255, 255, 255, 0.06)';

/**
 * Grid pattern for backgrounds (matches CSS)
 */
export const GridPattern = {
  color: GRID_COLOR,
  size: '38px',         // 38x38 grid
  style: `linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px),
          linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)`
};

/**
 * Selection color token
 */
export const Selection = {
  background: 'rgba(0, 229, 255, 0.3)'    // brand with opacity
};
