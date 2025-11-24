export type TimerMode = 'focus' | 'break';

export interface TimerPreset {
    id: string;
    name: string;
    focusDuration: number; // in minutes
    breakDuration: number; // in minutes
    sets: number;
}

// Default preset to use as a fallback if PRESETS array is empty or undefined
export const DEFAULT_PRESET: TimerPreset = {
    id: 'pomodoro',
    name: 'Pomodoro',
    focusDuration: 25,
    breakDuration: 5,
    sets: 4
};

export const PRESETS: TimerPreset[] = [
    { id: 'pomodoro', name: 'Pomodoro', focusDuration: 25, breakDuration: 5, sets: 4 },
    { id: 'long', name: 'Long Focus', focusDuration: 50, breakDuration: 10, sets: 2 },
    { id: 'sprint', name: 'Quick Sprint', focusDuration: 15, breakDuration: 5, sets: 3 },
];

export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const calculateProgress = (current: number, total: number): number => {
    if (total === 0) return 0;
    return Math.max(0, Math.min(1, current / total));
};
