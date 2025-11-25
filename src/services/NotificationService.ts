import notifee, { 
    AndroidImportance, 
    AndroidVisibility, 
    // AndroidForegroundServiceType <-- Remove this import, it crashes Android 10
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
                // CHANGE: Use DEFAULT or HIGH. LOW causes services to be killed.
                importance: AndroidImportance.DEFAULT, 
                visibility: AndroidVisibility.PUBLIC,
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

        const androidConfig = isPaused ? {
            // PAUSED: Standard Notification
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
            // RUNNING: Foreground Service
            channelId: this.channelId,
            asForegroundService: true,
            ongoing: true,
            autoCancel: false,
            onlyAlertOnce: true,
            color: mode === 'focus' ? '#4CAF50' : '#2196F3',
            // REMOVED: foregroundServiceTypes (Crashes Android 10, handled by Manifest)
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

        try {
            if (isPaused) {
                await notifee.stopForegroundService();
            }

            await notifee.displayNotification({
                id: this.notificationId,
                title: `${mode === 'focus' ? 'Focus' : 'Break'} • ${timeString} remaining`,
                body: isPaused ? 'Timer Paused' : `Up next: ${nextMode}`,
                android: {
                    ...androidConfig,
                    visibility: AndroidVisibility.PUBLIC,
                    showTimestamp: true,
                },
                ios: {
                    foregroundPresentationOptions: {
                        banner: true,
                        list: true,
                        badge: false,
                        sound: false,
                    },
                },
            });
        } catch (error) {
            console.error("Notification Error:", error);
        }
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
