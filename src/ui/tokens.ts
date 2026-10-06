/**
 * Shape and spacing shared by the redesigned screens. Colors always come from theme
 * roles ($primary, $surface, ...), never from here.
 */
export const radius = {
    tile: 12,
    button: 12,
    card: 16,
    sheet: 24,
    pill: 999,
} as const;

export const space = {
    /** Horizontal screen padding. */
    gutter: 16,
    gap: 12,
    section: 24,
} as const;

/** Minimum touch target (iOS HIG / Material). */
export const HIT_SIZE = 44;

/** Card and floating-control shadows; flat on Android where elevation draws its own. */
export const elevation = {
    card: { shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    floating: { shadowColor: '#101828', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    sheet: { shadowColor: '#101828', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
} as const;
