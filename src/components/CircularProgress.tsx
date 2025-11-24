import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
    size: number;
    strokeWidth: number;
    progress: number; // 0 to 1
    color: string;
    backgroundColor?: string;
    children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    size,
    strokeWidth,
    progress,
    color,
    backgroundColor = 'rgba(255,255,255,0.1)',
    children
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={styles.svg}>
                {/* Background Circle */}
                <Circle
                    stroke={backgroundColor}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Circle */}
                <Circle
                    stroke={color}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    svg: {
        transform: [{ rotateZ: '0deg' }],
    },
});
