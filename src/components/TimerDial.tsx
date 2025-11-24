import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface TimerDialProps {
    size: number;
    duration: number;
    maxDuration: number;
    onUpdate: (newDuration: number) => void;
    onComplete: () => void;
    isRunning: boolean;
    children?: React.ReactNode;
}

const TimerDial: React.FC<TimerDialProps> = ({
    size,
    duration,
    maxDuration,
    onUpdate,
    onComplete,
    isRunning,
    children
}) => {
    const { colors } = useTheme();
    const strokeWidth = 20;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const progress = Math.min(Math.max(duration / maxDuration, 0), 1);
    const strokeDashoffset = circumference - progress * circumference;

    // Use ref to avoid stale closures
    const propsRef = useRef({ isRunning, maxDuration, onUpdate, onComplete });

    useEffect(() => {
        propsRef.current = { isRunning, maxDuration, onUpdate, onComplete };
    });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !propsRef.current.isRunning,
            onMoveShouldSetPanResponder: () => true, // Always capture movement once started
            onPanResponderTerminationRequest: () => false, // Don't let others steal
            onPanResponderMove: (evt) => {
                const { isRunning, maxDuration, onUpdate } = propsRef.current;
                if (isRunning) return;

                const { locationX, locationY } = evt.nativeEvent;
                const dx = locationX - center;
                const dy = locationY - center;

                let angle = Math.atan2(dy, dx);
                let degrees = angle * (180 / Math.PI);
                degrees += 90;
                if (degrees < 0) degrees += 360;

                const newProgress = degrees / 360;
                let newTime = Math.round(newProgress * maxDuration);

                // Simple 1-minute snapping only - smooth like a potentiometer
                newTime = Math.round(newTime / 60) * 60;

                onUpdate(Math.max(0, newTime));
            },
            onPanResponderRelease: () => {
                propsRef.current.onComplete();
            }
        })
    ).current;

    return (
        <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
            <Svg width={size} height={size}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                    <Circle
                        stroke={colors.border}
                        cx={center}
                        cy={center}
                        r={radius}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <Circle
                        stroke={colors.primary}
                        cx={center}
                        cy={center}
                        r={radius}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </G>
            </Svg>

            {!isRunning && (
                <View
                    style={[
                        styles.knobContainer,
                        {
                            width: size,
                            height: size,
                            transform: [{ rotate: `${progress * 360}deg` }]
                        }
                    ]}
                    pointerEvents="none"
                >
                    <View style={[styles.knob, { backgroundColor: colors.text }]} />
                </View>
            )}

            <View style={styles.centerContent} pointerEvents="box-none">
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    knobContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        justifyContent: 'flex-start',
        alignItems: 'center',
        zIndex: 10,
    },
    knob: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginTop: -6,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 7,
    },
    centerContent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    }
});

export default TimerDial;
