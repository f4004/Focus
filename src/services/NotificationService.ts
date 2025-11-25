import notifee, { 
    AndroidImportance, 
    AndroidForegroundServiceType 
} from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationService {
    private channelId: string = 'focus-timer-channel';
    private notificationId: string = 'ongoing-timer';

    constructor() {
        this.createChannel();
    }

    async createChannel() {
        if (Platform.OS === 'android') {
            await notifee.createChannel({
                id: this.channelId,
                name: 'Focus Timer',
                importance: AndroidImportance.LOW, 
                vibration: false,
                sound: undefined,
            });
        }
    }

    async requestPermissions() {
        await notifee.requestPermission();
    }

    async startFocusNotification(
        timeLeft: number,
        totalDuration: number,
        mode: 'focus' | 'break',
        isPaused: boolean = false
    ) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const nextMode = mode === 'focus' ? 'Break' : 'Focus';

        // 1. Config based on state
        // Android 10+ Optimization: Only run "Service" when actually running/playing
        const androidConfig = isPaused ? {
            // PAUSED STATE: Standard notification, dismissible
            channelId: this.channelId,
            ongoing: false, 
            autoCancel: false,
            onlyAlertOnce: true,
            color: mode === 'focus' ? '#4CAF50' : '#2196F3',
            progress: {
                max: totalDuration,
                current: totalDuration - timeLeft,
                indeterminate: false,
            },
            actions: [
                { title: 'Resume', pressAction: { id: 'resume' } },
                { title: 'Stop', pressAction: { id: 'stop' } },
            ],
        } : {
            // RUNNING STATE: Foreground Service (Pinned)
            channelId: this.channelId,
            asForegroundService: true,
            ongoing: true,
            autoCancel: false,
            onlyAlertOnce: true,
            color: mode === 'focus' ? '#4CAF50' : '#2196F3',
            // Critical for Android 10/14 "Media" types
            foregroundServiceTypes: [AndroidForegroundServiceType.MEDIA_PLAYBACK],
            progress: {
                max: totalDuration,
                current: totalDuration - timeLeft,
                indeterminate: false,
            },
            actions: [
                { title: 'Pause', pressAction: { id: 'pause' } },
                { title: 'Stop', pressAction: { id: 'stop' } },
            ],
        };

        // 2. If Paused, we must STOP the service first to avoid "Media Service not playing" crash
        if (isPaused) {
            await notifee.stopForegroundService();
        }

        // 3. Display/Update the notification
        await notifee.displayNotification({
            id: this.notificationId,
            title: `${mode === 'focus' ? 'Focus' : 'Break'} • ${timeString} remaining`,
            body: isPaused ? 'Timer Paused' : `Up next: ${nextMode}`,
            android: androidConfig,
            ios: {
                foregroundPresentationOptions: {
                    banner: true,
                    list: true,
                    badge: false,
                    sound: false,
                },
            },
        });
    }

    async updateNotification(
        timeLeft: number,
        totalDuration: number,
        mode: 'focus' | 'break',
        isPaused: boolean = false
    ) {
        await this.startFocusNotification(timeLeft, totalDuration, mode, isPaused);
    }

    async cancelNotification() {
        await notifee.stopForegroundService();
        await notifee.cancelNotification(this.notificationId);
    }
}

export const notificationService = new NotificationService();
