import { useState, useEffect, useRef } from 'react';
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
    
    // Stats
    const [dailyFocusTime, setDailyFocusTime] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(60);
    const [streak, setStreak] = useState(0);
    const [showStreak, setShowStreak] = useState(true);

    // Settings
    const [isMuted, setIsMuted] = useState(false);
    const [autoStart, setAutoStart] = useState(false);
    const [customSoundUri, setCustomSoundUri] = useState<string | null>(null);

    // --- Refs ---
    const soundObjectRef = useRef<Audio.Sound | null>(null);
    const silentSoundRef = useRef<Audio.Sound | null>(null);
    const lastProcessedTimeRef = useRef<number>(Date.now());
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const notificationIdRef = useRef<string | null>(null);

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            try {
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
            if (soundObjectRef.current) soundObjectRef.current.unloadAsync();
            if (silentSoundRef.current) silentSoundRef.current.unloadAsync();
        };
    }, []);

    // --- Audio Setup ---
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

    const startSilentAudio = async () => {
        try {
            if (silentSoundRef.current) return;
            // Ensure this file exists in your assets!
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/silent_audio.mp3'),
                { isLooping: true, shouldPlay: true, volume: 0 }
            );
            silentSoundRef.current = sound;
        } catch (error) {
            console.warn('Silent audio failed. Notification might disappear on Android 10+. Error:', error);
        }
    };

    const stopSilentAudio = async () => {
        try {
            if (silentSoundRef.current) {
                await silentSoundRef.current.stopAsync();
                await silentSoundRef.current.unloadAsync();
                silentSoundRef.current = null;
            }
        } catch (error) { console.log('Stop silent audio error', error); }
    };

    // --- Events ---
    useEffect(() => {
        const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
            if (type === EventType.ACTION_PRESS && detail.pressAction) {
                handleNotificationAction(detail.pressAction.id);
            }
        });
        const sub = DeviceEventEmitter.addListener('notificationAction', handleNotificationAction);
        return () => { unsubscribe(); sub.remove(); };
    }, [isRunning, timeLeft, mode]);

    const handleNotificationAction = (actionId: string) => {
        if (actionId === 'pause') toggleTimer(); // Use toggle logic
        else if (actionId === 'resume') startTimer();
        else if (actionId === 'stop') resetTimer();
    };

    // --- Timer Loop ---
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning && timeLeft > 0) {
            lastProcessedTimeRef.current = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                const deltaSec = (now - lastProcessedTimeRef.current) / 1000;
                
                if (deltaSec >= 1) {
                    const newTime = Math.max(0, timeLeft - Math.floor(deltaSec));
                    setTimeLeft(newTime);
                    
                    if (mode === 'focus' && newTime > 0 && Math.floor(timeLeft/60) !== Math.floor(newTime/60)) {
                        addFocusTime(1);
                        setDailyFocusTime(p => p + 1);
                    }
                    
                    lastProcessedTimeRef.current = now;
                    if (newTime === 0) handleTimerComplete();
                    else notificationService.updateNotification(newTime, initialDuration, mode, false);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft, mode]);

    // --- Actions ---
    const startTimer = async (duration?: number) => {
        const dur = duration || timeLeft;
        setTimeLeft(dur);
        lastProcessedTimeRef.current = Date.now();
        setIsRunning(true);
        restoreVolume();
        
        // 1. Play silent audio (Required for Android 10+ Foreground Service)
        await startSilentAudio();
        
        // 2. Start Notification
        await notificationService.startFocusNotification(dur, initialDuration, mode, false);
    };

    const toggleTimer = async () => {
        if (isRunning) {
            setIsRunning(false);
            // STOP audio when paused (Android 10 will kill service if we don't)
            await stopSilentAudio(); 
            // Update notification to "Paused" state (Standard notification)
            notificationService.updateNotification(timeLeft, initialDuration, mode, true);
        } else {
            startTimer();
        }
    };

    const resetTimer = async () => {
        setIsRunning(false);
        await stopSilentAudio();
        notificationService.cancelNotification();
        const resetTime = mode === 'focus' ? currentPreset.focusDuration * 60 : currentPreset.breakDuration * 60;
        setTimeLeft(resetTime);
    };

    // --- Helpers (Unchanged) ---
    const configureNotifications = async () => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
        });
    };
    const loadDailyFocusTime = async () => {
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const m = await getStorageDailyTime(today);
            if (!isNaN(m)) setDailyFocusTime(m);
            setDailyGoal(await getDailyGoal());
            setStreak(await getStreak());
            setShowStreak(await getShowStreak());
        } catch {}
    };
    const loadSettings = async () => {
        try {
            const s = await AsyncStorage.getItem('user_custom_sound');
            if (s) setCustomSoundUri(s);
        } catch {}
    };
    const handleTimerComplete = async () => {
        setIsRunning(false);
        await stopSilentAudio();
        duckVolume();
        if (!isMuted) await playSound();
        
        if (mode === 'focus') {
            await markTodayCompleted();
            await loadDailyFocusTime();
            setMode('break');
            setTimeLeft(currentPreset.breakDuration * 60);
            setInitialDuration(currentPreset.breakDuration * 60);
        } else {
            setMode('focus');
            setTimeLeft(currentPreset.focusDuration * 60);
            setInitialDuration(currentPreset.focusDuration * 60);
        }
        if (autoStart) startTimer(mode === 'focus' ? currentPreset.breakDuration * 60 : currentPreset.focusDuration * 60);
    };
    const playSound = async () => {
        try {
            if (soundObjectRef.current) await soundObjectRef.current.unloadAsync();
            if (customSoundUri) {
                const { sound } = await Audio.Sound.createAsync({ uri: customSoundUri });
                soundObjectRef.current = sound;
                await sound.playAsync();
            }
        } catch {}
    };
    const changePreset = (preset: TimerPreset) => {
        setCurrentPreset(preset);
        setIsRunning(false);
        stopSilentAudio();
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
        stopSilentAudio();
    };

    return { mode, timeLeft, initialDuration, isRunning, currentPreset, dailyFocusTime, isMuted, setIsMuted, autoStart, setAutoStart, customSoundUri, setCustomSound: setCustomSoundUri, startTimer, toggleTimer, resetTimer, changePreset, setDuration, refreshDailyFocusTime: loadDailyFocusTime, dailyGoal, setDailyGoal, streak, showStreak, toggleShowStreak: () => setShowStreak(!showStreak), switchMode };
};
