import notifee, { AndroidCategory, AndroidImportance, EventType } from '@notifee/react-native';

class LockScreenNotificationService {
    private static channelId = 'timer-foreground';
    private static notificationId = 'timer-active';
    private static isInitialized = false;

    static async initialize() {
        if (this.isInitialized) return;

        try {
            // Create notification channel
            await notifee.createChannel({
                id: this.channelId,
                name: 'Timer Controls',
                importance: AndroidImportance.LOW, // Low importance = no sound
                sound: undefined,
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize notification service:', error);
        }
    }

    static async showTimerNotification(
        timeLeft: number,
        mode: 'focus' | 'break',
        isRunning: boolean,
        onPlay: () => void,
        onPause: () => void,
        onReset: () => void
    ) {
        await this.initialize();

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const modeText = mode === 'focus' ? '🎯 Focus' : '☕ Break';
        const title = `${modeText} Timer`;
        const body = `${timeString} ${isRunning ? 'remaining' : '(paused)'}`;

        try {
            await notifee.displayNotification({
                id: this.notificationId,
                title,
                body,
                android: {
                    channelId: this.channelId,
                    category: AndroidCategory.ALARM,
                    ongoing: isRunning, // Makes it non-dismissible when running
                    onlyAlertOnce: true,
                    progress: {
                        max: 100,
                        current: 0, // We don't show progress bar, just the time
                    },
                    actions: [
                        {
                            title: isRunning ? '⏸ Pause' : '▶ Play',
                            pressAction: {
                                id: isRunning ? 'pause' : 'play',
                            },
                        },
                        {
                            title: '⏹ Reset',
                            pressAction: {
                                id: 'reset',
                            },
                        },
                    ],
                },
            });

            // Set up event listener for button presses
            notifee.onBackgroundEvent(async ({ type, detail }) => {
                if (type === EventType.ACTION_PRESS) {
                    if (detail.pressAction?.id === 'play') {
                        onPlay();
                    } else if (detail.pressAction?.id === 'pause') {
                        onPause();
                    } else if (detail.pressAction?.id === 'reset') {
                        onReset();
                    }
                }
            });

        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }

    static async updateNotification(timeLeft: number, mode: 'focus' | 'break', isRunning: boolean) {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const modeText = mode === 'focus' ? '🎯 Focus' : '☕ Break';
        const title = `${modeText} Timer`;
        const body = `${timeString} ${isRunning ? 'remaining' : '(paused)'}`;

        try {
            await notifee.displayNotification({
                id: this.notificationId,
                title,
                body,
                android: {
                    channelId: this.channelId,
                    category: AndroidCategory.ALARM,
                    ongoing: isRunning,
                    onlyAlertOnce: true,
                    actions: [
                        {
                            title: isRunning ? '⏸ Pause' : '▶ Play',
                            pressAction: {
                                id: isRunning ? 'pause' : 'play',
                            },
                        },
                        {
                            title: '⏹ Reset',
                            pressAction: {
                                id: 'reset',
                            },
                        },
                    ],
                },
            });
        } catch (error) {
            console.error('Failed to update notification:', error);
        }
    }

    static async hideNotification() {
        try {
            await notifee.cancelNotification(this.notificationId);
        } catch (error) {
            console.error('Failed to hide notification:', error);
        }
    }

    static async cleanup() {
        await this.hideNotification();
    }
}

export default LockScreenNotificationService;
