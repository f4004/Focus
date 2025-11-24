import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Share, Switch, ScrollView, ImageBackground, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useTimer } from '../hooks/useTimer';
import { useMusic } from '../context/MusicContext';
import { useTheme } from '../context/ThemeContext';
import {
    Settings, Play, Pause, RotateCcw, Volume2, VolumeX,
    Moon, Sun, Music, Plus, Trash2, ImageIcon, Palette, Check,
    Brain, Coffee, Edit2, Eye, EyeOff, PlayCircle, PauseCircle, Target, Upload, Download, X, RefreshCw as RefreshIcon
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportData, importData } from '../utils/SyncService';
import { getVisualSet, setVisualSet, getEmojiForProgress, VISUAL_SET_ORDER, type VisualSetType } from '../utils/storage';
import { SyncManager } from '../services/SyncManager';
import { PRESETS, DEFAULT_PRESET } from '../utils/timerLogic';
import { TimePickerModal } from '../components/TimePickerModal';
import StatsModal from '../components/StatsModal';
import { CircularProgress } from '../components/CircularProgress';
import { MoonPhaseDisplay } from '../components/MoonPhaseDisplay';

const MOTIVATIONAL_SENTENCES = [
    "One more page is all it takes to stay in the game.",
    "Future you is built in the next five minutes—keep going.",
    "Stopping is a habit; so is finishing—choose the better one.",
    "Momentum isn’t magic; it’s the next tiny step.",
    "You don’t need motivation, just the next sentence.",
    "Discomfort fades—progress stays.",
    "If you quit now, you restart later. If you continue, you grow now.",
    "Small effort, repeated, becomes power.",
    "You’ve already shown up—finish the moment."
];

export default function TimerScreen() {
    const { theme, toggleTheme } = useTheme();
    const [customPrimaryColor, setCustomPrimaryColor] = useState<string | null>(null);

    const colors = theme === 'dark' ? {
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        textSecondary: '#AAAAAA',
        primary: customPrimaryColor || '#4CAF50',
        border: '#333333',
        error: '#CF6679',
    } : {
        background: '#F5F5F5',
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#666666',
        primary: customPrimaryColor || '#4CAF50',
        border: '#E0E0E0',
        error: '#B00020',
    };

    const {
        mode,
        switchMode,
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
        setCustomSound,
        startTimer,
        toggleTimer,
        resetTimer,
        changePreset,
        setDuration,
        refreshDailyFocusTime,
        dailyGoal,
        setDailyGoal,
        streak,
        showStreak,
        toggleShowStreak
    } = useTimer();

    const {
        playlist,
        addToPlaylist,
        removeFromPlaylist,
        toggleMusic,
        isPlaying: isMusicPlaying,
        isMusicEnabled,
        setIsMusicEnabled
    } = useMusic();

    const [isEditing, setIsEditing] = useState(false);
    const [editTime, setEditTime] = useState('');
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [statsVisible, setStatsVisible] = useState(false);
    const [isTimerHidden, setIsTimerHidden] = useState(false);

    // Sync State
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importText, setImportText] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);

    // Background Image State
    const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
    const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);

    // Visual Set State
    const [visualSet, setVisualSetState] = useState<VisualSetType>('moon');
    const [quote, setQuote] = useState('');

    useEffect(() => {
        loadBackgroundSettings();
        loadVisualSet();
        // Set initial quote
        setQuote(MOTIVATIONAL_SENTENCES[Math.floor(Math.random() * MOTIVATIONAL_SENTENCES.length)]);
    }, []);

    // --- HELPER FUNCTIONS ---

    // 1. FIX: Format time correctly to remove decimals
    const formatTime = (secondsInput: number) => {
        const totalSeconds = Math.floor(secondsInput);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // 2. FIX: Handle Play Press to rotate quote
    const handlePlayPress = () => {
        if (!isRunning) {
            // Only change the quote when STARTING the timer
            const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_SENTENCES.length);
            setQuote(MOTIVATIONAL_SENTENCES[randomIndex]);
        }

        // Logic to handle Pause/Play vs Reset behavior
        if (!canPause && isRunning) {
            resetTimer();
        } else {
            toggleTimer();
        }
    };

    const loadBackgroundSettings = async () => {
        try {
            const savedBg = await AsyncStorage.getItem('timer_background_image');
            const savedBlur = await AsyncStorage.getItem('timer_background_blur');
            if (savedBg) setBackgroundImageUri(savedBg);
            if (savedBlur) setIsBackgroundBlurred(JSON.parse(savedBlur));
        } catch (error) {
            console.error('Failed to load background settings', error);
        }
    };

    const loadVisualSet = async () => {
        const saved = await getVisualSet();
        setVisualSetState(saved);
    };

    const cycleVisualSet = async () => {
        const currentIndex = VISUAL_SET_ORDER.indexOf(visualSet);
        const nextIndex = (currentIndex + 1) % VISUAL_SET_ORDER.length;
        const nextSet = VISUAL_SET_ORDER[nextIndex];
        setVisualSetState(nextSet);
        await setVisualSet(nextSet);
    };

    const setBackgroundImage = async (uri: string | null) => {
        setBackgroundImageUri(uri);
        try {
            if (uri) {
                await AsyncStorage.setItem('timer_background_image', uri);
            } else {
                await AsyncStorage.removeItem('timer_background_image');
            }
        } catch (error) {
            console.error('Failed to save background image', error);
        }
    };

    const setBackgroundBlur = async (blur: boolean) => {
        setIsBackgroundBlurred(blur);
        try {
            await AsyncStorage.setItem('timer_background_blur', JSON.stringify(blur));
        } catch (error) {
            console.error('Failed to save background blur', error);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [9, 16],
                quality: 1,
            });

            if (!result.canceled) {
                setBackgroundImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const pickSound = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setCustomSound(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick sound');
        }
    };

    const handleExport = async () => {
        try {
            const json = await exportData();
            await Share.share({
                message: json,
                title: 'Focus Habit Backup',
            });
        } catch (error) {
            Alert.alert('Export Failed', 'Could not export data.');
        }
    };

    const handleImport = async () => {
        if (!importText.trim()) {
            Alert.alert('Error', 'Please paste the backup data first.');
            return;
        }

        try {
            const success = await importData(importText);
            if (success) {
                Alert.alert('Success', 'Data restored successfully! Please restart the app to see all changes.', [
                    {
                        text: 'OK', onPress: () => {
                            setImportModalVisible(false);
                            setImportText('');
                            setSettingsVisible(false);
                        }
                    }
                ]);
            } else {
                Alert.alert('Error', 'Invalid backup data.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to import data.');
        }
    };

    const safePreset = currentPreset || DEFAULT_PRESET;
    const canPause = initialDuration >= 12 * 60;

    const handleTimeSubmit = () => {
        const minutes = parseInt(editTime, 10);
        if (!isNaN(minutes) && minutes > 0) {
            setDuration(minutes * 60);
        }
        setIsEditing(false);
        setEditTime('');
    };

    const renderImportModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={importModalVisible}
            onRequestClose={() => setImportModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.alertContent, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.alertTitle, { color: colors.text }]}>Import Data</Text>
                    <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>
                        Paste your backup code below. This will overwrite your current data.
                    </Text>

                    <TextInput
                        style={[styles.importInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                        multiline
                        numberOfLines={6}
                        value={importText}
                        onChangeText={setImportText}
                        placeholder="Paste JSON here..."
                        placeholderTextColor={colors.textSecondary}
                    />

                    <View style={styles.alertButtons}>
                        <TouchableOpacity
                            style={[styles.alertButton, { backgroundColor: colors.border }]}
                            onPress={() => setImportModalVisible(false)}
                        >
                            <Text style={[styles.alertButtonText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.alertButton, { backgroundColor: colors.primary }]}
                            onPress={handleImport}
                        >
                            <Text style={[styles.alertButtonText, { color: '#FFF' }]}>Import</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderSettingsModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={settingsVisible}
            onRequestClose={() => setSettingsVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Settings</Text>
                        <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                        {/* Sync Section */}
                        <View style={styles.settingSection}>
                            <View style={styles.sectionHeader}>
                                <RefreshIcon size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Sync</Text>
                            </View>
                            <Text style={[styles.helperText, { color: colors.textSecondary, marginBottom: 12 }]}>
                                Manual Cloud Sync
                            </Text>

                            <View style={styles.settingRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: isSyncing ? colors.border : colors.primary, flex: 1, marginRight: 8 }]}
                                    onPress={async () => {
                                        setIsSyncing(true);
                                        const result = await SyncManager.readFromSheet();
                                        setIsSyncing(false);
                                        if (result.success) {
                                            const msg = result.foundToday
                                                ? `Cloud has ${result.totalMinutes}m for today`
                                                : `No data in cloud for today (would be 0m)`;
                                            Alert.alert('Cloud Value', msg);
                                        } else {
                                            Alert.alert('Read Failed', String(result.error));
                                        }
                                    }}
                                    disabled={isSyncing}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <Download size={16} color="#FFF" />
                                        <Text style={styles.actionButtonText}>Read Cloud</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: isSyncing ? colors.border : colors.primary, flex: 1, marginLeft: 8 }]}
                                    onPress={async () => {
                                        setIsSyncing(true);
                                        const result = await SyncManager.writeToSheet();
                                        setIsSyncing(false);
                                        if (result.success) {
                                            Alert.alert('Write Success', 'Data uploaded to sheet.');
                                            refreshDailyFocusTime();
                                        } else {
                                            Alert.alert('Write Failed', String(result.error));
                                        }
                                    }}
                                    disabled={isSyncing}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <Upload size={16} color="#FFF" />
                                        <Text style={styles.actionButtonText}>Write Cloud</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.helperText, { color: colors.textSecondary, marginTop: 12, marginBottom: 4 }]}>
                                Manual Backup (Legacy)
                            </Text>
                            <View style={styles.settingRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.border, marginRight: 8 }]}
                                    onPress={handleExport}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Upload size={16} color={colors.text} />
                                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Backup</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.border, marginLeft: 8 }]}
                                    onPress={() => setImportModalVisible(true)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Download size={16} color={colors.text} />
                                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Restore</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Daily Goal Section */}
                        <View style={styles.settingSection}>
                            <View style={styles.sectionHeader}>
                                <Target size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Goal</Text>
                            </View>

                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Goal (minutes)</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, width: 80, textAlign: 'center' }]}
                                    value={dailyGoal.toString()}
                                    onChangeText={(text) => {
                                        const val = parseInt(text, 10);
                                        if (!isNaN(val)) setDailyGoal(val);
                                    }}
                                    keyboardType="number-pad"
                                />
                            </View>

                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Show Streak</Text>
                                <Switch
                                    value={showStreak}
                                    onValueChange={toggleShowStreak}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={'#FFF'}
                                />
                            </View>
                        </View>

                        {/* Reset Focus Section */}
                        <View style={styles.settingSection}>
                            <View style={styles.sectionHeader}>
                                <RotateCcw size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Reset Focus Time</Text>
                            </View>
                            <Text style={[styles.helperText, { color: colors.textSecondary, marginBottom: 12 }]}>
                                Clear today's accumulated focus time
                            </Text>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.error }]}
                                onPress={async () => {
                                    Alert.alert(
                                        'Reset Focus Time',
                                        'Clear today\'s focus time to 0 minutes?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Reset',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    const { setDailyFocusTime, clearUnsyncedFocusTime } = await import('../utils/storage');
                                                    await setDailyFocusTime(0);
                                                    await clearUnsyncedFocusTime();
                                                    refreshDailyFocusTime();
                                                    Alert.alert('Success', 'Focus time reset to 0');
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Text style={styles.actionButtonText}>Reset to 0</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Playlist Section */}
                        <View style={styles.settingSection}>
                            <View style={styles.sectionHeader}>
                                <Music size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Playlist</Text>
                            </View>

                            <View style={styles.settingRow}>
                                <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Music</Text>
                                <Switch
                                    value={isMusicEnabled}
                                    onValueChange={setIsMusicEnabled}
                                    trackColor={{ false: colors.border, true: colors.primary }}
                                    thumbColor={'#FFF'}
                                />
                            </View>

                            {isMusicEnabled && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: colors.primary, marginBottom: 16 }]}
                                        onPress={addToPlaylist}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Plus size={16} color="#FFF" />
                                            <Text style={styles.actionButtonText}>Add Songs</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {playlist.map((song, index) => (
                                        <View key={index} style={[styles.playlistItem, { borderColor: colors.border }]}>
                                            <Text style={[styles.songName, { color: colors.text }]} numberOfLines={1}>
                                                {song.name}
                                            </Text>
                                            <TouchableOpacity onPress={() => removeFromPlaylist(song.uri)}>
                                                <Trash2 size={18} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {playlist.length === 0 && (
                                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                            No songs in playlist.
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>

                        {/* Background Section */}
                        <View style={styles.settingSection}>
                            <View style={styles.sectionHeader}>
                                <ImageIcon size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Background</Text>
                            </View>

                            <View style={styles.settingRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                    onPress={pickImage}
                                >
                                    <Text style={styles.actionButtonText}>Choose Image</Text>
                                </TouchableOpacity>
                                {backgroundImageUri && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: colors.error }]}
                                        onPress={() => setBackgroundImage(null)}
                                    >
                                        <Text style={styles.actionButtonText}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {backgroundImageUri && (
                                <View style={styles.settingRow}>
                                    <Text style={[styles.settingLabel, { color: colors.text }]}>Blur Background</Text>
                                    <Switch
                                        value={isBackgroundBlurred}
                                        onValueChange={setBackgroundBlur}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                        thumbColor={'#FFF'}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Sound Section */}
                        <View style={styles.settingSection}>
                            <View style={styles.sectionHeader}>
                                <Volume2 size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notification Sound</Text>
                            </View>

                            <View style={styles.settingRow}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                    onPress={pickSound}
                                >
                                    <Text style={styles.actionButtonText}>Choose Sound</Text>
                                </TouchableOpacity>
                                {customSoundUri && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, { backgroundColor: colors.error }]}
                                        onPress={() => setCustomSound(null)}
                                    >
                                        <Text style={styles.actionButtonText}>Reset</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {customSoundUri && (
                                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                    Custom sound selected
                                </Text>
                            )}
                        </View>

                        {/* Color Section */}
                        <View style={styles.settingSection}>
                            <View style={styles.sectionHeader}>
                                <Palette size={20} color={colors.primary} />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Timer Color</Text>
                            </View>

                            <View style={styles.colorGrid}>
                                {[
                                    '#4CAF50', // Default Green
                                    '#2196F3', // Blue
                                    '#9C27B0', // Purple
                                    '#E91E63', // Pink
                                    '#FF9800', // Orange
                                    '#00BCD4', // Cyan
                                    '#607D8B', // Blue Grey
                                ].map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: color },
                                            colors.primary === color && styles.selectedColor
                                        ]}
                                        onPress={() => setCustomPrimaryColor(color)}
                                    >
                                        {colors.primary === color && <Check size={16} color="#FFF" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const MainContent = () => (
        <View style={styles.contentContainer}>
            {/* Daily Focus Time Display */}
            <TouchableOpacity
                style={styles.dailyFocusContainer}
                onPress={() => setStatsVisible(true)}
            >
                <Text style={[styles.dailyFocusText, { color: colors.textSecondary }]}>
                    Today's Focus: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{dailyFocusTime}m</Text>
                    {showStreak && streak > 0 && (
                        <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>  🔥 {streak}</Text>
                    )}
                </Text>
            </TouchableOpacity>
            <MoonPhaseDisplay progress={initialDuration > 0 ? 1 - (timeLeft / initialDuration) : 0} size={20} />

            <View style={styles.header}>
                <View style={styles.statsContainer}>
                    {/* Sets UI Removed */}
                </View>

                <View style={styles.controlsRow}>
                    <TouchableOpacity
                        onPress={toggleTheme}
                        style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.1)', marginRight: 8 }]}
                    >
                        {theme === 'dark' ? (
                            <Moon size={24} color={colors.text} />
                        ) : (
                            <Sun size={24} color={colors.text} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setIsTimerHidden(!isTimerHidden)}
                        style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.1)', marginRight: 8 }]}
                    >
                        {isTimerHidden ? (
                            <EyeOff size={24} color={colors.text} />
                        ) : (
                            <Eye size={24} color={colors.text} />
                        )}
                    </TouchableOpacity>
                    {isMusicEnabled && (
                        <TouchableOpacity
                            onPress={toggleMusic}
                            style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.1)' }]}
                        >
                            {isMusicPlaying ? (
                                <PauseCircle size={24} color={colors.text} />
                            ) : (
                                <PlayCircle size={24} color={colors.text} />
                            )}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => setSettingsVisible(true)}
                        style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.1)' }]}
                    >
                        <Settings size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.timerContainer}>
                {isEditing ? (
                    <View style={styles.timerCircle}>
                        <TextInput
                            style={[styles.timeInput, { color: colors.text }]}
                            value={editTime}
                            onChangeText={setEditTime}
                            keyboardType="number-pad"
                            maxLength={3}
                            autoFocus
                            onBlur={handleTimeSubmit}
                            onSubmitEditing={handleTimeSubmit}
                            placeholder={Math.floor(timeLeft / 60).toString()}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
                ) : (
                    <TouchableOpacity
                        onLongPress={() => !isRunning && setIsTimePickerVisible(true)}
                        delayLongPress={300}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (!isRunning) {
                                setIsEditing(true);
                                setEditTime(Math.floor(timeLeft / 60).toString());
                            }
                        }}
                    >
                        <CircularProgress
                            size={300}
                            strokeWidth={8}
                            progress={initialDuration > 0 ? timeLeft / initialDuration : 0}
                            color={mode === 'focus' ? colors.primary : colors.textSecondary}
                            backgroundColor="rgba(255,255,255,0.1)"
                        >
                            {isTimerHidden ? (
                                <View style={styles.timeDisplay}>
                                    <TouchableOpacity onPress={cycleVisualSet}>
                                        <Text style={{ fontSize: 120 }}>
                                            {getEmojiForProgress(visualSet, initialDuration > 0 ? 1 - (timeLeft / initialDuration) : 0)}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => switchMode(mode === 'focus' ? 'break' : 'focus')}>
                                        <Text style={{
                                            color: mode === 'focus' ? colors.primary : colors.textSecondary,
                                            fontSize: 16,
                                            fontWeight: '600',
                                            marginTop: 16,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1
                                        }}>
                                            {mode === 'focus' ? 'Focus' : 'Break'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.timeDisplay}>
                                    <Text style={[styles.timerText, { color: colors.text }]}>
                                        {formatTime(timeLeft)}
                                    </Text>
                                    <TouchableOpacity onPress={() => switchMode(mode === 'focus' ? 'break' : 'focus')}>
                                        <Text style={{
                                            color: mode === 'focus' ? colors.primary : colors.textSecondary,
                                            fontSize: 16,
                                            fontWeight: '600',
                                            marginTop: -5,
                                            marginBottom: 5,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1
                                        }}>
                                            {mode === 'focus' ? 'Focus' : 'Break'}
                                        </Text>
                                    </TouchableOpacity>
                                    <View style={{ marginTop: 20, paddingHorizontal: 40 }}>
                                        <Text style={{
                                            color: colors.text,
                                            fontSize: 14,
                                            textAlign: 'center',
                                            fontStyle: 'italic',
                                            opacity: 0.8
                                        }}>
                                            {quote}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </CircularProgress>
                    </TouchableOpacity>
                )}
            </View>

            <TimePickerModal
                visible={isTimePickerVisible}
                onClose={() => setIsTimePickerVisible(false)}
                onSelect={(minutes: number) => setDuration(minutes * 60)}
                currentMinutes={Math.round(timeLeft / 60)}
                colors={colors}
            />


            <View style={styles.bottomControls}>
                <View style={styles.mainControls}>
                    {!isRunning && (
                        <TouchableOpacity
                            style={[styles.secondaryButton, { backgroundColor: 'rgba(0,0,0,0.1)' }]}
                            onPress={resetTimer}
                        >
                            <RotateCcw color={colors.text} size={24} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.playButton,
                            { backgroundColor: isEditing ? colors.textSecondary : colors.primary },
                            isEditing && { opacity: 0.5 }
                        ]}
                        // UPDATED: Use new handlePlayPress instead of raw toggleTimer
                        onPress={handlePlayPress}
                        disabled={isEditing}
                    >
                        {isRunning ? (
                            (!canPause) ? (
                                <RotateCcw color="#FFF" size={36} />
                            ) : (
                                <Pause color="#FFF" size={36} fill="#FFF" />
                            )
                        ) : (
                            <Play color="#FFF" size={36} fill="#FFF" />
                        )}
                    </TouchableOpacity>

                    {!isRunning && (
                        <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={[styles.secondaryButton, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                            {isMuted ? (
                                <VolumeX size={24} color={colors.text} />
                            ) : (
                                <Volume2 size={24} color={colors.text} />
                            )}
                        </TouchableOpacity>
                    )}
                </View >

                {!isRunning && (
                    <View style={styles.presets}>
                        {Object.values(PRESETS).map((preset) => (
                            <TouchableOpacity
                                key={preset.id}
                                style={[
                                    styles.presetButton,
                                    {
                                        backgroundColor: safePreset.id === preset.id ? colors.primary : 'rgba(0,0,0,0.1)',
                                        borderColor: 'transparent'
                                    }
                                ]}
                                onPress={() => changePreset(preset)}
                            >
                                {preset.id === 'pomodoro' ? <Brain size={20} color={safePreset.id === preset.id ? '#FFF' : colors.text} /> : <Coffee size={20} color={safePreset.id === preset.id ? '#FFF' : colors.text} />}
                                <Text style={[
                                    styles.presetText,
                                    { color: safePreset.id === preset.id ? '#FFF' : colors.text }
                                ]}>
                                    {preset.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View >
        </View >
    );

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
                {backgroundImageUri ? (
                    <ImageBackground source={{ uri: backgroundImageUri }} style={styles.backgroundImage} resizeMode="cover">
                        {isBackgroundBlurred && (
                            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                        )}
                        <View style={[styles.overlay, { backgroundColor: isBackgroundBlurred ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.4)' }]}>
                            <MainContent />
                        </View>
                    </ImageBackground>
                ) : (
                    <View style={[styles.container, { backgroundColor: colors.background }]}>
                        <MainContent />
                    </View>
                )}
                {renderSettingsModal()}
                {renderImportModal()}
                <StatsModal visible={statsVisible} onClose={() => setStatsVisible(false)} />
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        padding: 20,
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 40,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statsText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 8,
    },
    resetSetsButton: {
        padding: 4,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    iconButton: {
        padding: 10,
        borderRadius: 50,
    },
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerCircle: {
        width: 300,
        height: 300,
        borderRadius: 150,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    timeDisplay: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 64,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
        letterSpacing: 2,
    },
    timeInput: {
        fontSize: 64,
        fontWeight: 'bold',
        textAlign: 'center',
        minWidth: 150,
    },

    editHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        opacity: 0.8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    editHintText: {
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
    bottomControls: {
        width: '100%',
        alignItems: 'center',
        gap: 30,
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 40,
    },
    secondaryButton: {
        padding: 16,
        borderRadius: 50,
    },
    playButton: {
        padding: 30,
        borderRadius: 50,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginTop: 20,
    },
    presets: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    presetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        gap: 8,
    },
    presetText: {
        fontWeight: '600',
        fontSize: 15,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        maxHeight: '80%',
        elevation: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    modalScroll: {
        marginBottom: 20,
    },
    settingSection: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        fontSize: 16,
        minWidth: 100,
    },
    actionButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    playlistItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    songName: {
        fontSize: 16,
        flex: 1,
        marginRight: 16,
    },
    helperText: {
        fontSize: 14,
        marginTop: 4,
    },
    // Alert Styles inside Modal
    alertContent: {
        margin: 20,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        marginBottom: 'auto',
        marginTop: 'auto',
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    alertMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    importInput: {
        width: '100%',
        height: 120,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    alertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    alertButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    alertButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    dailyFocusContainer: {
        marginBottom: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20,
    },
    dailyFocusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedColor: {
        borderColor: '#FFF',
        borderWidth: 2,
    },
});
