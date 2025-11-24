import { useEffect, useRef } from 'react';
import VolumeManager from 'react-native-volume-manager';

interface VolumeControlsConfig {
    enabled: boolean;
    onResume: () => void;
    onPause: () => void;
    onReset: () => void;
    isRunning: boolean;
}

export const useVolumeControls = ({ enabled, onResume, onPause, onReset, isRunning }: VolumeControlsConfig) => {
    const lastVolumeChange = useRef<number>(0);
    const lastVolume = useRef<number>(0);
    const volumeDownCount = useRef<number>(0);

    useEffect(() => {
        if (!enabled || !isRunning) return;

        let subscription: any;

        const setupVolumeListener = async () => {
            try {
                // Get initial volume
                const { volume } = await VolumeManager.getVolume();
                lastVolume.current = volume;

                // Listen for volume changes
                subscription = VolumeManager.addVolumeListener((result: { volume: number }) => {
                    const now = Date.now();
                    const timeSinceLastChange = now - lastVolumeChange.current;
                    const volumeDelta = result.volume - lastVolume.current;

                    // Detect volume direction
                    if (Math.abs(volumeDelta) > 0.01) {
                        if (volumeDelta > 0) {
                            // Volume UP pressed -> Resume
                            onResume();
                            volumeDownCount.current = 0;
                        } else {
                            // Volume DOWN pressed
                            if (timeSinceLastChange < 500 && volumeDownCount.current === 1) {
                                // Double tap detected -> Reset
                                onReset();
                                volumeDownCount.current = 0;
                            } else {
                                // Single tap -> Pause
                                onPause();
                                volumeDownCount.current = 1;

                                // Reset double tap counter after timeout
                                setTimeout(() => {
                                    volumeDownCount.current = 0;
                                }, 500);
                            }
                        }

                        // Restore original volume to prevent actual volume change
                        setTimeout(async () => {
                            try {
                                await VolumeManager.setVolume(lastVolume.current);
                            } catch (error) {
                                console.error('Failed to restore volume:', error);
                            }
                        }, 50);

                        lastVolumeChange.current = now;
                    }

                    lastVolume.current = result.volume;
                });
            } catch (error) {
                console.error('Failed to setup volume listener:', error);
            }
        };

        setupVolumeListener();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, [enabled, isRunning, onResume, onPause, onReset]);
};
