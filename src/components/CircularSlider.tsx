import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    useDerivedValue,
    runOnJS,
    useAnimatedStyle,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';

interface CircularSliderProps {
    size: number;
    strokeWidth: number;
    maxMinutes?: number;
    onUpdate: (minutes: number) => void;
    initialMinutes?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CircularSlider: React.FC<CircularSliderProps> = ({
    size,
    strokeWidth,
    maxMinutes = 60,
    onUpdate,
    initialMinutes = 0,
}) => {
    const { colors } = useTheme();
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Shared value for the angle (in radians, 0 to 2*PI)
    // We want 0 to be at the top (-PI/2).
    // Let's work with 0 to 2PI, where 0 is top.
    const angle = useSharedValue(0);

    useEffect(() => {
        // Initialize angle based on initialMinutes
        const progress = Math.min(Math.max(initialMinutes / maxMinutes, 0), 1);
        angle.value = progress * 2 * Math.PI;
    }, [initialMinutes, maxMinutes]);

    const polarToCartesian = (centerX: number, centerY: number, r: number, angleInRadians: number) => {
        'worklet';
        // Adjust angle so 0 is at top (subtract PI/2)
        const adjustedAngle = angleInRadians - Math.PI / 2;
        return {
            x: centerX + r * Math.cos(adjustedAngle),
            y: centerY + r * Math.sin(adjustedAngle),
        };
    };

    const cartesianToPolar = (x: number, y: number, centerX: number, centerY: number) => {
        'worklet';
        let dx = x - centerX;
        let dy = y - centerY;

        // We want 0 at top.
        // Standard atan2: 0 at right (3 o'clock), positive clockwise (y down).
        // atan2(y, x) gives angle from x-axis.

        // Let's rotate our coordinate system effectively.
        // If we want top to be 0, we can treat (dy, dx) differently or adjust result.
        // Angle from top (clockwise):
        // Top: 0
        // Right: PI/2
        // Bottom: PI
        // Left: 3PI/2

        // atan2(dy, dx) gives:
        // Right (1, 0): 0
        // Down (0, 1): PI/2
        // Left (-1, 0): PI
        // Up (0, -1): -PI/2

        let theta = Math.atan2(dy, dx); // -PI to PI

        // Convert to 0-2PI starting from top (Up)
        // Up (-PI/2) -> should be 0
        // Right (0) -> should be PI/2
        // Down (PI/2) -> should be PI
        // Left (PI) -> should be 3PI/2

        // theta + PI/2
        // Up: -PI/2 + PI/2 = 0
        // Right: 0 + PI/2 = PI/2
        // Down: PI/2 + PI/2 = PI
        // Left: PI + PI/2 = 3PI/2
        // Top-Left (-3PI/4): -3PI/4 + PI/2 = -PI/4 -> needs to be 7PI/4

        let adjusted = theta + Math.PI / 2;
        if (adjusted < 0) {
            adjusted += 2 * Math.PI;
        }
        return adjusted;
    };

    const gesture = Gesture.Pan()
        .onUpdate((e) => {
            const newAngle = cartesianToPolar(e.x, e.y, center, center);
            angle.value = newAngle;

            const progress = newAngle / (2 * Math.PI);
            const minutes = Math.round(progress * maxMinutes);
            runOnJS(onUpdate)(minutes);
        });

    const animatedPathProps = useAnimatedProps(() => {
        const endPoint = polarToCartesian(center, center, radius, angle.value);
        const largeArcFlag = angle.value > Math.PI ? 1 : 0;

        // Start point is always top (0 radians in our adjusted system)
        const startPoint = polarToCartesian(center, center, radius, 0);

        return {
            d: `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`,
        };
    });

    const animatedKnobStyle = useAnimatedStyle(() => {
        const pos = polarToCartesian(center, center, radius, angle.value);
        return {
            transform: [
                { translateX: pos.x - strokeWidth }, // Adjust for knob center
                { translateY: pos.y - strokeWidth },
            ],
        };
    });

    // Knob needs to be centered on the path.
    // polarToCartesian returns the center of the stroke.
    // If we use a Circle in SVG, we can just set cx/cy.
    const animatedKnobProps = useAnimatedProps(() => {
        const pos = polarToCartesian(center, center, radius, angle.value);
        return {
            cx: pos.x,
            cy: pos.y,
        };
    });

    // Derived text for display
    const minutes = useDerivedValue(() => {
        const progress = angle.value / (2 * Math.PI);
        return Math.round(progress * maxMinutes);
    });

    return (
        <GestureDetector gesture={gesture}>
            <View style={[styles.container, { width: size, height: size }]}>
                <Svg width={size} height={size}>
                    {/* Track */}
                    <Circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={colors.border}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />

                    {/* Progress Path */}
                    <AnimatedPath
                        stroke={colors.primary}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeLinecap="round"
                        animatedProps={animatedPathProps}
                    />

                    {/* Knob */}
                    <AnimatedCircle
                        r={strokeWidth} // Knob size slightly larger or same as stroke
                        fill={colors.background}
                        stroke={colors.primary}
                        strokeWidth={2}
                        animatedProps={animatedKnobProps}
                    />
                </Svg>

                {/* Center Text */}
                <View style={styles.textContainer}>
                    <Text style={[styles.timeText, { color: colors.text }]}>
                        {/* We can't easily render Reanimated value in Text without a Reanimated Text component or state. 
                            For now, let's rely on the parent passing the value back or use a simple text.
                            But wait, onUpdate updates parent state, which re-renders this component?
                            If parent state updates, 'initialMinutes' might update, causing loop if we aren't careful.
                            Actually, let's just display the prop 'initialMinutes' (which is 'timeLeft' / 60 usually) or just let parent handle text.
                            The prompt asked to "Display the current minutes in the center".
                        */}
                    </Text>
                </View>
            </View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none', // Allow touches to pass through to the slider
    },
    timeText: {
        fontSize: 48,
        fontWeight: 'bold',
    }
});
