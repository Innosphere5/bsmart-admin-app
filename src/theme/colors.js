// B'Smart Admin Design System Tokens
export const colors = {
  // Brand Primary
  navy: '#1B2A5E',        // Brand main color (Header text, buttons, active icons)
  navyDark: '#111C44',    // Hover/Pressed state
  navyLight: '#3B82F6',   // Links & accents
  navySoft: '#EEF2FF',    // Pill & container backgrounds

  // Neutral Surfaces
  background: '#F8FAFC',  // Page layout background
  card: '#FFFFFF',        // Card surfaces
  cardBorder: '#E2E8F0',  // Border outline
  borderLight: '#F1F5F9', // Divider lines

  // Status Badges & Accents
  status: {
    pendingBg: '#FEF9C3',
    pendingText: '#854D0E',

    readyBg: '#DBEAFE',
    readyText: '#1E40AF',

    confirmedBg: '#E0E7FF',
    confirmedText: '#3730A3',

    deliveredBg: '#DCFCE7',
    deliveredText: '#15803D',

    cancelledBg: '#FEE2E2',
    cancelledText: '#991B1B',

    lowStockBg: '#FEF3C7',
    lowStockText: '#9A3412',
    lowStockCardBg: '#FFF5F5',
    lowStockCardBorder: '#FECDD3',

    inStockBg: '#DCFCE7',
    inStockText: '#166534',

    outOfStockBg: '#FEE2E2',
    outOfStockText: '#991B1B',
  },

  // Typography Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  white: '#FFFFFF',

  // Interactive Accent Colors
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  blue: '#2563EB',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const typography = {
  h1: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  h2: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  h3: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
  body: { fontSize: 14, fontWeight: '400', color: colors.textPrimary },
  boldBody: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  small: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },
  tiny: { fontSize: 11, fontWeight: '500', color: colors.textMuted },
};

export default colors;
