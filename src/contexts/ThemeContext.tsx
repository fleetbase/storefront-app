import React, { createContext, useContext, ReactNode } from 'react';
import useAppTheme from '../hooks/use-app-theme';

type ThemeContextType = {
    appTheme: string;
    changeScheme: (newScheme: string) => void;
    schemes: string[];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const { appTheme, changeScheme, schemes } = useAppTheme();

    return <ThemeContext.Provider value={{ appTheme, changeScheme, schemes }}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
};
