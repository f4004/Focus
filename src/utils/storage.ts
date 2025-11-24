import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimerMode, TimerPreset } from './timerLogic';


export interface DayStatus {
    date: string; // YYYY-MM-DD
    status: 'completed' | 'missed' | 'skipped' | 'none' | 'planned';
}

export const STORAGE_KEYS = {
    HABITS: 'user_habits',
    SETTINGS: 'user_settings',
    FOCUS_STATS: 'user_focus_stats',
    UNSYNCED_STATS: 'user_unsynced_focus_stats',
    REMOTE_BASELINE: 'user_remote_focus_baseline',
    DAILY_GOAL: 'user_daily_goal',
    STREAK: 'user_streak',
    LAST_STREAK_DATE: 'user_last_streak_date',
    SHOW_STREAK: 'user_show_streak',
    VISUAL_SET: 'user_visual_set',
    SECONDS_BUFFER: 'timer_seconds_buffer',
    TIMER_STATE: 'timer_state_v2',
};

// Visual emoji sets for timer display when hidden
export const VISUAL_SETS = {
    moon: ['🌑', '🌒', '🌓', '🌔', '🌕'],
    plant: ['🌱', '🌿', '🌳'],
    chicken: ['🐣', '🐥', '🐔'],
    stars: ['✨', '⭐', '🌟', '💫'],
};

export type VisualSetType = keyof typeof VISUAL_SETS;
export const VISUAL_SET_ORDER: VisualSetType[] = ['moon', 'plant', 'chicken', 'stars'];

// Helper to get emoji for progress (0 to 1)
export const getEmojiForProgress = (setType: VisualSetType, progress: number): string => {
    const emojis = VISUAL_SETS[setType];
    const index = Math.min(Math.floor(progress * emojis.length), emojis.length - 1);
    return emojis[index];
};

//--- HELPER: GET LOCAL DATE (Fixes Timezone Bug) ---
const getTodayDate = () => {
    // uses Canada locale (en-CA) to force YYYY-MM-DD format in local time
    return new Date().toLocaleDateString('en-CA');
};

export const getHabits = async (): Promise<Record<string, DayStatus['status']>> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Failed to load habits', e);
        return {};
    }
};

export const saveHabitStatus = async (date: string, status: DayStatus['status']) => {
    try {
        const habits = await getHabits();
        habits[date] = status;
        await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    } catch (e) {
        console.error('Failed to save habit', e);
    }
};

export const markTodayCompleted = async () => {
    await saveHabitStatus(getTodayDate(), 'completed');
};

export const getDailyFocusTime = async (date?: string): Promise<number> => {
    try {
        const targetDate = date || getTodayDate();
        const data = await AsyncStorage.getItem(STORAGE_KEYS.FOCUS_STATS);
        const stats = data ? JSON.parse(data) : {};
        const value = stats[targetDate] || 0;
        return value;
    } catch (e) {
        return 0;
    }
};

export const getUnsyncedFocusTime = async (): Promise<number> => {
    try {
        const today = getTodayDate();
        const data = await AsyncStorage.getItem(STORAGE_KEYS.UNSYNCED_STATS);
        const stats = data ? JSON.parse(data) : {};
        return stats[today] || 0;
    } catch (e) {
        return 0;
    }
};

export const addUnsyncedFocusTime = async (minutes: number) => {
    try {
        const today = getTodayDate();
        const data = await AsyncStorage.getItem(STORAGE_KEYS.UNSYNCED_STATS);
        const stats = data ? JSON.parse(data) : {};
        stats[today] = (stats[today] || 0) + minutes;
        await AsyncStorage.setItem(STORAGE_KEYS.UNSYNCED_STATS, JSON.stringify(stats));
    } catch (e) { console.error(e); }
};

export const clearUnsyncedFocusTime = async () => {
    try {
        const today = getTodayDate();
        const data = await AsyncStorage.getItem(STORAGE_KEYS.UNSYNCED_STATS);
        const stats = data ? JSON.parse(data) : {};
        stats[today] = 0;
        await AsyncStorage.setItem(STORAGE_KEYS.UNSYNCED_STATS, JSON.stringify(stats));
    } catch (e) { console.error(e); }
};

export const setDailyFocusTime = async (minutes: number) => {
    try {
        const today = getTodayDate();
        const stats = await AsyncStorage.getItem(STORAGE_KEYS.FOCUS_STATS);
        const parsedStats = stats ? JSON.parse(stats) : {};
        parsedStats[today] = minutes;
        await AsyncStorage.setItem(STORAGE_KEYS.FOCUS_STATS, JSON.stringify(parsedStats));
    } catch (error) { console.error(error); }
};

export const addFocusTime = async (minutes: number) => {
    try {
        const today = getTodayDate();
        const current = await getDailyFocusTime(today);
        const newTotal = current + minutes;
        console.log(`[STORAGE] Adding ${minutes}m. New Total: ${newTotal}`);
        await setDailyFocusTime(newTotal);
        await addUnsyncedFocusTime(minutes);
    } catch (error) { console.error(error); }
};

export const getLastSyncedFocusTime = async (): Promise<number> => {
    try {
        const today = getTodayDate();
        const synced = await AsyncStorage.getItem('last_synced_focus_stats');
        const parsed = synced ? JSON.parse(synced) : {};
        return parsed[today] || 0;
    } catch (error) { return 0; }
};

export const setLastSyncedFocusTime = async (minutes: number) => {
    try {
        const today = getTodayDate();
        const synced = await AsyncStorage.getItem('last_synced_focus_stats');
        const parsed = synced ? JSON.parse(synced) : {};
        parsed[today] = minutes;
        await AsyncStorage.setItem('last_synced_focus_stats', JSON.stringify(parsed));
    } catch (error) { console.error(error); }
};

export const setRemoteFocusBaseline = async (minutes: number) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.REMOTE_BASELINE, minutes.toString());
    } catch (error) { console.error(error); }
};

export const getRemoteFocusBaseline = async (): Promise<number> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.REMOTE_BASELINE);
        return data ? parseInt(data, 10) : 0;
    } catch (error) { return 0; }
};

// --- DAILY GOAL & STREAK ---

export const getDailyGoal = async (): Promise<number> => {
    try {
        const goal = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
        return goal ? parseInt(goal, 10) : 60; // Default 60 mins
    } catch (e) { return 60; }
};

export const setDailyGoal = async (minutes: number) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_GOAL, minutes.toString());
    } catch (e) { console.error(e); }
};

export const getStreak = async (): Promise<number> => {
    try {
        const streak = await AsyncStorage.getItem(STORAGE_KEYS.STREAK);
        return streak ? parseInt(streak, 10) : 0;
    } catch (e) { return 0; }
};

export const getShowStreak = async (): Promise<boolean> => {
    try {
        const show = await AsyncStorage.getItem(STORAGE_KEYS.SHOW_STREAK);
        return show !== null ? JSON.parse(show) : true; // Default true
    } catch (e) { return true; }
};

export const setShowStreak = async (show: boolean) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.SHOW_STREAK, JSON.stringify(show));
    } catch (e) { console.error(e); }
};

export const updateStreak = async (todayMinutes: number) => {
    try {
        const goal = await getDailyGoal();
        if (todayMinutes < goal) return; // Goal not met yet

        const today = getTodayDate();
        const lastStreakDate = await AsyncStorage.getItem(STORAGE_KEYS.LAST_STREAK_DATE);

        if (lastStreakDate === today) return; // Already counted for today

        let currentStreak = await getStreak();

        if (lastStreakDate) {
            const lastDate = new Date(lastStreakDate);
            const currDate = new Date(today);
            const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentStreak += 1; // Consecutive day
            } else if (diffDays > 1) {
                currentStreak = 1; // Broken streak, restart
            } else {
                // diffDays == 0, already handled above
            }
        } else {
            currentStreak = 1; // First time
        }

        await AsyncStorage.setItem(STORAGE_KEYS.STREAK, currentStreak.toString());
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_STREAK_DATE, today);
    } catch (e) {
        console.error('Failed to update streak', e);
    }
};

// --- VISUAL SET ---

export const getVisualSet = async (): Promise<VisualSetType> => {
    try {
        const set = await AsyncStorage.getItem(STORAGE_KEYS.VISUAL_SET);
        return (set as VisualSetType) || 'moon'; // Default moon
    } catch (e) { return 'moon'; }
};

export const setVisualSet = async (setType: VisualSetType) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.VISUAL_SET, setType);
    } catch (e) { console.error(e); }
};

// --- TIMER RELIABILITY ---

export interface TimerState {
    status: 'IDLE' | 'RUNNING' | 'PAUSED';
    endTime: number | null;
    pausedRemaining: number | null;
    mode: TimerMode;
    lastTick: number; // Timestamp of last processed tick
    initialDuration: number;
    currentPreset: TimerPreset;
}

export const getSecondsBuffer = async (): Promise<number> => {
    try {
        const val = await AsyncStorage.getItem(STORAGE_KEYS.SECONDS_BUFFER);
        return val ? parseFloat(val) : 0;
    } catch (e) { return 0; }
};

export const setSecondsBuffer = async (seconds: number) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.SECONDS_BUFFER, seconds.toString());
    } catch (e) { console.error(e); }
};

export const getTimerState = async (): Promise<TimerState | null> => {
    try {
        const val = await AsyncStorage.getItem(STORAGE_KEYS.TIMER_STATE);
        return val ? JSON.parse(val) : null;
    } catch (e) { return null; }
};

export const setTimerState = async (state: TimerState | null) => {
    try {
        if (state) {
            await AsyncStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(state));
        } else {
            await AsyncStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
        }
    } catch (e) { console.error(e); }
};