import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, getHabits, getDailyFocusTime } from './storage';

export interface BackupData {
    version: number;
    timestamp: number;
    habits: Record<string, string>;
    focusStats: Record<string, number>;
    settings: {
        theme?: string;
        customPrimaryColor?: string;
        customSoundUri?: string;
    };
}

export const exportData = async (): Promise<string> => {
    try {
        const habits = await getHabits();

        // Get all focus stats directly from storage as the helper only gets one day
        const focusStatsRaw = await AsyncStorage.getItem(STORAGE_KEYS.FOCUS_STATS);
        const focusStats = focusStatsRaw ? JSON.parse(focusStatsRaw) : {};

        // Get settings
        const theme = await AsyncStorage.getItem('user_theme');
        const customPrimaryColor = await AsyncStorage.getItem('user_custom_primary_color');
        const customSoundUri = await AsyncStorage.getItem('user_custom_sound');

        const backup: BackupData = {
            version: 1,
            timestamp: Date.now(),
            habits,
            focusStats,
            settings: {
                theme: theme || undefined,
                customPrimaryColor: customPrimaryColor || undefined,
                customSoundUri: customSoundUri || undefined,
            },
        };

        return JSON.stringify(backup);
    } catch (error) {
        console.error('Export failed', error);
        throw new Error('Failed to export data');
    }
};

export const importData = async (jsonString: string): Promise<boolean> => {
    try {
        const data: BackupData = JSON.parse(jsonString);

        if (!data.habits || !data.focusStats) {
            throw new Error('Invalid backup format');
        }

        // Restore Habits
        await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(data.habits));

        // Restore Focus Stats
        await AsyncStorage.setItem(STORAGE_KEYS.FOCUS_STATS, JSON.stringify(data.focusStats));

        // Restore Settings
        if (data.settings?.theme) {
            await AsyncStorage.setItem('user_theme', data.settings.theme);
        }
        if (data.settings?.customPrimaryColor) {
            await AsyncStorage.setItem('user_custom_primary_color', data.settings.customPrimaryColor);
        }
        if (data.settings?.customSoundUri) {
            await AsyncStorage.setItem('user_custom_sound', data.settings.customSoundUri);
        }

        return true;
    } catch (error) {
        console.error('Import failed', error);
        return false;
    }
};
