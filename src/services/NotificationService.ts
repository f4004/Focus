import notifee, { AndroidImportance, AndroidColor, EventType, Event } from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationService {
    private channelId: string = 'focus-timer-channel';

    constructor() {
        this.createChannel();
    }

    async createChannel() {
        if (Platform.OS === 'android') {
            await notifee.createChannel({
                id: this.channelId,
                name: 'Focus Timer',
                importance: AndroidImportance.LOW, // Low importance to prevent sound/vibration on every update
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
        
        const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;
        
        // Determine next mode info
        const nextMode = mode === 'focus' ? 'Break' : 'Focus';
        // Note: We might need to pass next duration if we want it accurate, 
        // but for now generic "Up next" is okay or we can pass it in.
        
        await notifee.displayNotification({
            id: 'ongoing-timer',
            title: `${mode === 'focus' ? 'Focus' : 'Break'} • ${timeString} remaining`,
            body: isPaused ? 'Timer Paused' : `Up next: ${nextMode}`,
            android: {
                channelId: this.channelId,
                asForegroundService: true, // Critical for persistence
                ongoing: true,
                autoCancel: false,
                onlyAlertOnce: true,
                color: mode === 'focus' ? '#4CAF50' : '#2196F3',
                progress: {
                    max: totalDuration,
                    current: totalDuration - timeLeft,
                    indeterminate: false,
                },
                actions: [
                    {
                        title: isPaused ? 'Resume' : 'Pause',
                        pressAction: {
                            id: isPaused ? 'resume' : 'pause',
                        },
                    },
                    {
                        title: 'Stop',
                        pressAction: {
                            id: 'stop',
                        },
                    },
                ],
            },
            ios: {
                // iOS Live Activities are different, standard notification for now
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
        // Re-use start to update
        await this.startFocusNotification(timeLeft, totalDuration, mode, isPaused);
    }

    async cancelNotification() {
        await notifee.stopForegroundService();
        await notifee.cancelNotification('ongoing-timer');
    }
}

export const notificationService = new NotificationService();
