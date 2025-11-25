import notifee, { 
    AndroidImportance, 
    AndroidVisibility, // <--- Added for Lock Screen
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
                visibility: AndroidVisibility.PUBLIC, // <--- Show on Lock Screen
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

        // 1. Prepare configuration
        // We split logic: "Running" needs a Service, "Paused" is just a notification.
        const androidConfig = isPaused ? {
            // PAUSED STATE
            channelId: this.channelId,
            ongoing: false, // Dismissible
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
            // RUNNING STATE
            channelId: this.channelId,
            asForegroundService: true, // Requires Service Type & Audio
            ongoing: true, // Pinned
            autoCancel: false,
            onlyAlertOnce: true,
            color: mode === 'focus' ? '#4CAF50' : '#2196F3',
            // Define Service Type for Android 10-14 safety
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

        try {
            // 2. If we are Pausing, we MUST stop the service first
            // Otherwise Android thinks the service is "stuck"
            if (isPaused) {
                await notifee.stopForegroundService();
            }

            // 3. Display the notification
            await notifee.displayNotification({
                id: this.notificationId,
                title: `${mode === 'focus' ? 'Focus' : 'Break'} • ${timeString} remaining`,
                body: isPaused ? 'Timer Paused' : `Up next: ${nextMode}`,
                android: {
                    ...androidConfig,
                    visibility: AndroidVisibility.PUBLIC, // <--- Key for Lock Screen
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
