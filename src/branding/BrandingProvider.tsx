import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import useStorage, { getString } from '../hooks/use-storage';
import { themes as compiledThemes } from '../../tamagui.config';
import { getBuildBranding, getBuildBrandingSources } from './build-branding';
import { resolveBranding } from './resolve';
import { presetThemeName } from './presets';
import type { ColorScheme } from './presets';
import { ensureBrandTheme, setActiveTheme } from './runtime-theme';
import type { ThemeColors } from './build-themes';
import type { BrandingIssue, BrandingSource, ResolvedBranding } from './resolve';

export type SchemePreference = 'system' | 'light' | 'dark';

export const APPEARANCE_STORAGE_KEY = 'storefront:appearance';
/**
 * Development only: a branding config (JSON) stored under this key is applied on
 * top of the build branding at startup, to preview a theme without rebuilding.
 * On web: localStorage.setItem('storefront:branding-preview', JSON.stringify({...})).
 */
export const BRANDING_PREVIEW_STORAGE_KEY = 'storefront:branding-preview';
/** Pre-branding storage key for the user's light/dark choice; read once for migration. */
const LEGACY_SCHEME_KEY = 'user_color_scheme';
const SCHEME_PREFERENCES: SchemePreference[] = ['system', 'light', 'dark'];

export type BrandingContextValue = {
    branding: ResolvedBranding;
    issues: BrandingIssue[];
    /** The scheme being rendered. */
    scheme: ColorScheme;
    /** The user's choice (or the brand default when the user cannot choose). */
    preference: SchemePreference;
    setPreference: (preference: SchemePreference) => void;
    /** Preferences the user may choose from; empty when the brand disables the toggle. */
    schemePreferences: SchemePreference[];
    themeName: string;
    theme: ThemeColors;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

const isPreference = (value: unknown): value is SchemePreference => typeof value === 'string' && (SCHEME_PREFERENCES as string[]).includes(value);

function initialPreference(): SchemePreference | null {
    try {
        const legacy = getString(LEGACY_SCHEME_KEY);
        return isPreference(legacy) ? legacy : null;
    } catch {
        return null;
    }
}

function readLocalPreview(): BrandingSource | null {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
    try {
        const raw = getString(BRANDING_PREVIEW_STORAGE_KEY);
        return raw ? { name: 'local-preview', config: JSON.parse(raw), enforceContrast: true } : null;
    } catch (error) {
        console.warn('[branding] Ignoring invalid local preview', error);
        return null;
    }
}

function resolveInitialBranding() {
    const preview = readLocalPreview();
    return preview ? resolveBranding([...getBuildBrandingSources(), preview]) : getBuildBranding();
}

let issuesReported = false;

type Props = {
    children: React.ReactNode;
    /** Override the resolved branding (tests, previews). Defaults to the build branding. */
    resolved?: { branding: ResolvedBranding; issues: BrandingIssue[] };
};

/**
 * Resolves branding, the color scheme and the Tamagui theme to render, and
 * shares them through one context so every consumer stays in sync.
 */
export const BrandingProvider = ({ children, resolved }: Props) => {
    const initial = useMemo(() => resolved ?? resolveInitialBranding(), [resolved]);
    const { branding, issues } = initial;
    const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
    const [storedPreference, setStoredPreference] = useStorage<SchemePreference | null>(APPEARANCE_STORAGE_KEY, initialPreference());

    const { allowUserToggle, defaultScheme } = branding.appearance;
    const preference: SchemePreference = allowUserToggle && isPreference(storedPreference) ? storedPreference : defaultScheme;
    const scheme: ColorScheme = preference === 'system' ? systemScheme : preference;

    const active = useMemo(() => {
        const compiledName = presetThemeName(scheme, branding.preset);
        return ensureBrandTheme({
            compiledName,
            compiledTheme: (compiledThemes as Record<string, ThemeColors>)[compiledName],
            colors: branding.colors[scheme],
            extra: branding.extraColors[scheme],
        });
    }, [branding, scheme]);

    // Keep non-React readers (getTheme) in step with what renders.
    setActiveTheme(active);

    useEffect(() => {
        if (!issuesReported && issues.length && typeof __DEV__ !== 'undefined' && __DEV__) {
            issuesReported = true;
            console.warn(`[branding] ${issues.length} issue(s):\n${issues.map((issue) => `- ${issue.source} ${issue.path}: ${issue.message}`).join('\n')}`);
        }
    }, [issues]);

    const setPreference = useCallback(
        (next: SchemePreference) => {
            if (allowUserToggle && isPreference(next)) setStoredPreference(next);
        },
        [allowUserToggle, setStoredPreference]
    );

    const value = useMemo<BrandingContextValue>(
        () => ({
            branding,
            issues,
            scheme,
            preference,
            setPreference,
            schemePreferences: allowUserToggle ? SCHEME_PREFERENCES : [],
            themeName: active.name,
            theme: active.theme,
        }),
        [branding, issues, scheme, preference, setPreference, allowUserToggle, active]
    );

    return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = (): BrandingContextValue => {
    const context = useContext(BrandingContext);
    if (!context) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
};
