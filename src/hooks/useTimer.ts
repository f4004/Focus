import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimerMode, TimerPreset, PRESETS, DEFAULT_PRESET } from '../utils/timerLogic';
import {
    markTodayCompleted,
    addFocusTime,
    getDailyFocusTime as getStorageDailyTime,
    setDailyFocusTime as setStorageDailyTime,
    getDailyGoal,
    getStreak,
    getShowStreak,
    STORAGE_KEYS
} from '../utils/storage';
import { useMusic } from '../context/MusicContext';
import { notificationService } from '../services/NotificationService';
import { DeviceEventEmitter } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';

export const useTimer = () => {
    const { duckVolume, restoreVolume } = useMusic();

    // --- State ---
    const [mode, setMode] = useState<TimerMode>('focus');
    const [timeLeft, setTimeLeft] = useState((PRESETS[0] || DEFAULT_PRESET).focusDuration * 60);
    const [initialDuration, setInitialDuration] = useState((PRESETS[0] || DEFAULT_PRESET).focusDuration * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [currentPreset, setCurrentPreset] = useState<TimerPreset>(PRESETS[0] || DEFAULT_PRESET);

    const [dailyFocusTime, setDailyFocusTime] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(60);
    const [streak, setStreak] = useState(0);
    const [showStreak, setShowStreak] = useState(true);

    const [isMuted, setIsMuted] = useState(false);
    const [autoStart, setAutoStart] = useState(false);
    const [customSoundUri, setCustomSoundUri] = useState<string | null>(null);

    // --- Refs ---
    const soundObjectRef = useRef<Audio.Sound | null>(null);
    const warningSoundRef = useRef<Audio.Sound | null>(null);

    // CRITICAL: This ref tracks exactly when we last updated the timer
    const lastProcessedTimeRef = useRef<number>(Date.now());
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const notificationIdRef = useRef<string | null>(null);

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Request Permission FIRST
                await notificationService.requestPermissions(); 
                
                await configureAudio();
                await configureNotifications();
                await loadSettings();
                await loadDailyFocusTime();
            } catch (e) {
                console.log('Init error:', e);
            }
        };
        init();
   
        return () => {
            // Cleanup sounds safely
            if (soundObjectRef.current) soundObjectRef.current.unloadAsync();
            if (warningSoundRef.current) warningSoundRef.current.unloadAsync();
        };
    }, []);

    // --- AppState Handling (Background Fix) ---
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App has come to the foreground!
                if (isRunning) {
                    const now = Date.now();
                    const timePassedInSec = (now - lastProcessedTimeRef.current) / 1000;

                    // 1. Update countdown
                    const newTimeLeft = Math.max(0, timeLeft - timePassedInSec);
                    setTimeLeft(newTimeLeft);

                    // 2. Credit focus time missed while backgrounded
                    if (mode === 'focus' && timePassedInSec >= 1) {
                        // We use a simpler heuristic here: just credit the elapsed time
                        // The interval loop below handles the precise "minute-by-minute" updates
                        // This catch-up prevents the "random" counting feeling
                        const minutesToCredit = Math.floor(timePassedInSec / 60);
                        if (minutesToCredit > 0) {
                            addFocusTime(minutesToCredit);
                            setDailyFocusTime(prev => prev + minutesToCredit);
                        }
                    }

                    // Reset reference to NOW so we don't double count
                    lastProcessedTimeRef.current = now;
                }

                // Always refresh daily stats on resume
                loadDailyFocusTime();
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [isRunning, timeLeft, mode]);

    // --- Notification Action Handling ---
    useEffect(() => {
        // Handle Foreground Actions (e.g. user taps button while app is open/visible)
        const unsubscribeForeground = notifee.onForegroundEvent(({ type, detail }) => {
            if (type === EventType.ACTION_PRESS && detail.pressAction) {
                handleNotificationAction(detail.pressAction.id);
            }
        });

        // Handle Background Actions (via DeviceEventEmitter from App.tsx)
        const subscription = DeviceEventEmitter.addListener('notificationAction', (actionId) => {
            handleNotificationAction(actionId);
        });

        return () => {
            unsubscribeForeground();
            subscription.remove();
        };
    }, [isRunning]); // Re-bind if needed, or use refs for stable handlers

    const handleNotificationAction = (actionId: string) => {
        console.log('Handling action:', actionId);
        if (actionId === 'pause') {
            setIsRunning(false);
            notificationService.updateNotification(timeLeft, initialDuration, mode, true);
        } else if (actionId === 'resume') {
            setIsRunning(true);
            // Notification will be updated by the loop or startTimer
        } else if (actionId === 'stop') {
            resetTimer();
        }
    };

    // --- Main Timer Loop (The "Calculator" Logic) ---
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning && timeLeft > 0) {
            // Set the reference point immediately when starting
            lastProcessedTimeRef.current = Date.now();

            interval = setInterval(() => {
                const now = Date.now();
                const deltaMs = now - lastProcessedTimeRef.current;
                const deltaSec = deltaMs / 1000;

                if (deltaSec >= 1) {
                    // At least 1 second has passed
                    const newTimeLeft = Math.max(0, timeLeft - Math.floor(deltaSec));
                    setTimeLeft(newTimeLeft);

                    // Check if a full minute has passed for stats
                    // We accumulate elapsed time. If delta is huge (lag), this catches it.
                    if (mode === 'focus') {
                        // Simple check: did we cross a minute boundary?
                        // Better: Credit 1 min for every 60s of accumulated run time
                        // Ideally, store "accumulatedSeconds" ref, but simpler for now:
                        // Just rely on the fact that this runs roughly every second.
                        // Ideally, we check storage logic.
                        // Let's stick to the robust solution:
                        // We only add time if we haven't finished yet.
                        if (newTimeLeft > 0 && Math.floor(timeLeft / 60) !== Math.floor(newTimeLeft / 60)) {
                            // A minute boundary was crossed!
                            addFocusTime(1);
                            setDailyFocusTime(prev => prev + 1);
                        }
                    }

                    // Update the reference time, BUT keep the remainder ms to avoid drift
                    // (Subtracting the processed integer seconds from Now is safer)
                    lastProcessedTimeRef.current = now;

                    if (newTimeLeft === 0) {
                        handleTimerComplete();
                    } else {
                        // Update notification progress
                        // We don't want to spam the bridge, so maybe every second is fine for local,
                        // but for notification progress bar, 1s is good.
                        if (isRunning) {
                            notificationService.updateNotification(newTimeLeft, initialDuration, mode, false);
                        }
                    }
                }
            }, 1000); // Check every second
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft, mode]);

    // --- Helpers ---

    const configureAudio = async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: true,
                interruptionModeIOS: InterruptionModeIOS.DuckOthers,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                playThroughEarpieceAndroid: false,
            });
        } catch (e) { console.error('Audio setup failed', e); }
    };

    const configureNotifications = async () => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
            }),
        });
    };

    const loadDailyFocusTime = async () => {
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const minutes = await getStorageDailyTime(today);
            if (!isNaN(minutes)) setDailyFocusTime(minutes);

            const goal = await getDailyGoal();
            setDailyGoal(goal);

            const s = await getStreak();
            setStreak(s);

            const show = await getShowStreak();
            setShowStreak(show);
        } catch (e) {
            console.error("Load stats failed", e);
        }
    };

    const loadSettings = async () => {
        try {
            const savedSound = await AsyncStorage.getItem('user_custom_sound');
            if (savedSound) setCustomSoundUri(savedSound);
        } catch (e) { console.error(e); }
    };

    const handleTimerComplete = async () => {
        setIsRunning(false);

        duckVolume();
        if (!isMuted) await playSound();

        if (mode === 'focus') {
            await markTodayCompleted();
            await loadDailyFocusTime(); // Sync UI

            // Auto-switch to break
            setMode('break');
            setTimeLeft(currentPreset.breakDuration * 60);
            setInitialDuration(currentPreset.breakDuration * 60);
        } else {
            // Auto-switch to focus
            setMode('focus');
            setTimeLeft(currentPreset.focusDuration * 60);
            setInitialDuration(currentPreset.focusDuration * 60);
        }

        if (autoStart) {
            startTimer(mode === 'focus' ? currentPreset.breakDuration * 60 : currentPreset.focusDuration * 60);
        }
    };

    const playSound = async () => {
        try {
            if (soundObjectRef.current) {
                await soundObjectRef.current.unloadAsync();
            }
            // Use default or custom
            if (customSoundUri) {
                const { sound } = await Audio.Sound.createAsync({ uri: customSoundUri });
                soundObjectRef.current = sound;
                await sound.playAsync();
            } else {
                // Play system default via notification or a local asset if you have one
            }
        } catch (error) {
            console.log('Sound play error', error);
        }
    };

    // --- Actions ---

    const startTimer = async (duration?: number) => {
        const dur = duration || timeLeft;
        setTimeLeft(dur);
        lastProcessedTimeRef.current = Date.now(); // RESET TIME REFERENCE
        setIsRunning(true);
        restoreVolume();

        // Schedule notification
        // const endTime = Date.now() + dur * 1000;
        // const id = await Notifications.scheduleNotificationAsync({
        //     content: {
        //         title: mode === 'focus' ? 'Focus Session Complete!' : 'Break Over!',
        //         body: mode === 'focus' ? 'Time to take a break.' : 'Ready to focus again?',
        //     },
        //     trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endTime) },
        // });
        // notificationIdRef.current = id;

        // Start Persistent Notification
        await notificationService.startFocusNotification(dur, initialDuration, mode, false);
    };

    const toggleTimer = () => {
        if (isRunning) {
            setIsRunning(false);
            if (notificationIdRef.current) {
                Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
            }
            // Update notification to paused state
            notificationService.updateNotification(timeLeft, initialDuration, mode, true);
        } else {
            startTimer();
        }
    };

    const resetTimer = () => {
        setIsRunning(false);
        if (notificationIdRef.current) {
            Notifications.cancelScheduledNotificationAsync(notificationIdRef.current);
        }
        notificationService.cancelNotification();
        const resetTime = mode === 'focus' ? currentPreset.focusDuration * 60 : currentPreset.breakDuration * 60;
        setTimeLeft(resetTime);
    };

    const changePreset = (preset: TimerPreset) => {
        setCurrentPreset(preset);
        setIsRunning(false);
        setMode('focus');
        setTimeLeft(preset.focusDuration * 60);
        setInitialDuration(preset.focusDuration * 60);
    };

    const setDuration = (seconds: number) => {
        setTimeLeft(seconds);
        setInitialDuration(seconds);
    };

    const switchMode = (newMode: TimerMode) => {
        setMode(newMode);
        const newTime = newMode === 'focus' ? currentPreset.focusDuration * 60 : currentPreset.breakDuration * 60;
        setTimeLeft(newTime);
        setInitialDuration(newTime);
        setIsRunning(false);
    };

    return {
        mode,
        timeLeft,
        initialDuration,
        isRunning,
        currentPreset,
        dailyFocusTime,
        isMuted,
        setIsMuted,
        autoStart,
        setAutoStart,
        customSoundUri,
        setCustomSound: setCustomSoundUri,
        startTimer,
        toggleTimer,
        resetTimer,
        changePreset,
        setDuration,
        refreshDailyFocusTime: loadDailyFocusTime,
        dailyGoal,
        setDailyGoal,
        streak,
        showStreak,
        toggleShowStreak: () => setShowStreak(!showStreak),
        switchMode
    };
};

