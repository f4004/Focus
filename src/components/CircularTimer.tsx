import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    useAnimatedStyle,
    withRepeat,
    withLinear,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const TIMER_SIZE = width * 0.75; // Slightly larger than before
const STROKE_WIDTH = 15;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
    totalDuration: number; // in seconds
    timeLeft: number; // in seconds
    mode: 'focus' | 'break';
    children?: React.ReactNode;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
    totalDuration,
    timeLeft,
    mode,
    children,
}) => {
    const { colors } = useTheme();
    const progress = useSharedValue(0);
    const rotation = useSharedValue(0);

    // Derived values
    const strokeColor = mode === 'focus' ? '#2196F3' : '#4CAF50'; // Blue for focus, Green for break

    // Update progress when time changes
    useEffect(() => {
        // Calculate progress (0 to 1)
        // We want the circle to shrink.
        // Full: offset = 0. Empty: offset = CIRCUMFERENCE.

        const targetOffset = CIRCUMFERENCE * (1 - (timeLeft / totalDuration));

        progress.value = withTiming(targetOffset, {
            duration: 1000,
            easing: Easing.linear,
        });
    }, [timeLeft, totalDuration]);

    // Rotation animation
    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, {
                duration: 20000, // Slow rotation
                easing: Easing.linear,
            }),
            -1, // Infinite
            false // Do not reverse
        );
    }, []);

    const animatedProps = useAnimatedProps(() => {
        return {
            strokeDashoffset: progress.value,
        };
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotateZ: `${rotation.value}deg` }],
        };
    });

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.svgContainer, animatedStyle]}>
                <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
                    <G rotation="-90" origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}>
                        {/* Background Circle */}
                        <Circle
                            cx={TIMER_SIZE / 2}
                            cy={TIMER_SIZE / 2}
                            r={RADIUS}
                            stroke={colors.border} // Use theme border color or a light gray
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                        />
                        {/* Foreground Circle */}
                        <AnimatedCircle
                            cx={TIMER_SIZE / 2}
                            cy={TIMER_SIZE / 2}
                            r={RADIUS}
                            stroke={strokeColor}
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                            strokeDasharray={CIRCUMFERENCE}
                            animatedProps={animatedProps}
                            strokeLinecap="round"
                        />
                    </G>
                </Svg>
            </Animated.View>

            {/* Centered Time Text or Children */}
            <View style={styles.textContainer}>
                {children ? children : (
                    <Text style={[styles.timerText, { color: colors.text }]}>
                        {formatTime(timeLeft)}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: TIMER_SIZE,
        height: TIMER_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    svgContainer: {
        position: 'absolute',
        width: TIMER_SIZE,
        height: TIMER_SIZE,
    },
    textContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerText: {
        fontSize: 64,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
        letterSpacing: 2,
    },
});
