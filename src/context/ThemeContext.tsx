import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'dim';

export interface ThemeColors {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    accent: string;
    border: string;
    success: string;
    error: string;
    warning: string;
}

export const themes: Record<ThemeType, ThemeColors> = {
    light: {
        background: '#FFFFFF',
        surface: '#F3F4F6',
        text: '#1F2937',
        textSecondary: '#6B7280',
        primary: '#4CAF50', // Green
        accent: '#81C784',
        border: '#E5E7EB',
        success: '#4CAF50',
        error: '#EF4444',
        warning: '#F59E0B',
    },
    dark: {
        background: '#111827',
        surface: '#1F2937',
        text: '#F9FAFB',
        textSecondary: '#9CA3AF',
        primary: '#66BB6A', // Lighter Green
        accent: '#81C784',
        border: '#374151',
        success: '#66BB6A',
        error: '#EF4444',
        warning: '#F59E0B',
    },
    dim: {
        background: '#1E293B', // Slate 800
        surface: '#334155', // Slate 700
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        primary: '#81C784', // Soft Green
        accent: '#A5B4FC',
        border: '#475569',
        success: '#34D399',
        error: '#F87171',
        warning: '#FBBF24',
    },
};

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    setTheme: (theme: ThemeType) => void;
    toggleTheme: () => void;
    customPrimaryColor: string | null;
    setCustomPrimaryColor: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('light');
    const [customPrimaryColor, setCustomPrimaryColorState] = useState<string | null>(null);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user_theme');
            const savedColor = await AsyncStorage.getItem('user_custom_primary_color');

            if (savedTheme) {
                setThemeState(savedTheme as ThemeType);
            } else if (systemScheme) {
                setThemeState(systemScheme === 'dark' ? 'dark' : 'light');
            }

            if (savedColor) {
                setCustomPrimaryColorState(savedColor);
            }
        } catch (error) {
            console.error('Failed to load theme', error);
        }
    };

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem('user_theme', newTheme);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const setCustomPrimaryColor = async (color: string | null) => {
        setCustomPrimaryColorState(color);
        try {
            if (color) {
                await AsyncStorage.setItem('user_custom_primary_color', color);
            } else {
                await AsyncStorage.removeItem('user_custom_primary_color');
            }
        } catch (error) {
            console.error('Failed to save custom color', error);
        }
    };

    const toggleTheme = async () => {
        setThemeState((prev) => {
            const newTheme = prev === 'light' ? 'dark' : prev === 'dark' ? 'dim' : 'light';
            // Save to AsyncStorage
            AsyncStorage.setItem('user_theme', newTheme).catch(error => {
                console.error('Failed to save theme', error);
            });
            return newTheme;
        });
    };

    const baseColors = themes[theme];
    const colors = {
        ...baseColors,
        primary: customPrimaryColor || baseColors.primary,
    };

    return (
        <ThemeContext.Provider value={{ theme, colors, setTheme, toggleTheme, customPrimaryColor, setCustomPrimaryColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
