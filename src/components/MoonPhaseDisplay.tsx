import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MoonPhaseDisplayProps {
    size?: number;
    progress: number; // 0 to 1
}

export const MoonPhaseDisplay: React.FC<MoonPhaseDisplayProps> = ({
    size = 16,
    progress
}) => {
    const getPhaseEmoji = (p: number) => {
        if (p < 0.2) return '🌑';
        if (p < 0.4) return '🌒';
        if (p < 0.6) return '🌓';
        if (p < 0.8) return '🌔';
        return '🌕';
    };

    return (
        <View style={styles.container}>
            <Text style={{ fontSize: size }}>{getPhaseEmoji(progress)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
