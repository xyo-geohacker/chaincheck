/**
 * Centralized color theme for the ChainCheck mobile app
 * All colors should be imported from this file to maintain consistency
 */

export const colors = {
  // Background colors
  background: {
    primary: '#05060F',
    secondary: '#121125',
    card: '#131222',
    header: '#111025',
    input: '#1A1830',
  },

  // Primary purple theme (matching LoginScreen button)
  purple: {
    primary: '#61487a',      // Main button color
    shadow: '#4a3a6a',      // Shadow and border color
    disabled: '#61487a',    // Disabled button (same as primary but with reduced opacity)
    light: '#8B8FA8',       // Placeholder text
  },

  // Text colors
  text: {
    primary: '#F7F8FD',
    secondary: '#DADDF9',
    muted: '#9aa5d8',
    placeholder: '#8B8FA8',
    accent: '#8EA8FF',
  },

  // Button colors (with opacity for transparency)
  button: {
    primary: 'rgba(97, 72, 122, 0.85)',        // #61487a with 85% opacity
    primaryShadow: 'rgba(74, 58, 106, 0.85)',  // #4a3a6a with 85% opacity
    secondary: 'rgba(74, 58, 106, 0.85)',      // #4a3a6a with 85% opacity
    secondaryBorder: '#4a3a6a',                // Keep border fully opaque
    disabled: 'rgba(97, 72, 122, 0.6)',        // Disabled with less opacity (60%)
    text: '#f9f9ff',
    textSecondary: '#d7dcff',
  },

  // Border colors
  border: {
    primary: '#4a3a6a',
    secondary: '#4a3a6a',
    card: '#4a3a6a',
    input: '#4a3a6a',
  },

  // Status colors (keep existing for semantic meaning)
  status: {
    success: 'rgba(34,197,94,0.15)',
    error: 'rgba(248,113,113,0.18)',
    info: 'rgba(125,211,252,0.16)',
  },
};

