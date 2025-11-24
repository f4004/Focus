import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { X, BarChart2, Calendar, Clock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { getDailyFocusTime, STORAGE_KEYS } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StatsModalProps {
    visible: boolean;
    onClose: () => void;
}

interface DailyStat {
    date: string;
    minutes: number;
    dayName: string;
}

const StatsModal: React.FC<StatsModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const [weeklyStats, setWeeklyStats] = useState<DailyStat[]>([]);
    const [totalFocusTime, setTotalFocusTime] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            loadStats();
        }
    }, [visible]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEYS.FOCUS_STATS);
            const stats: Record<string, number> = data ? JSON.parse(data) : {};
            
            // Calculate last 7 days
            const last7Days: DailyStat[] = [];
            const today = new Date();
            let total = 0;

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const dateStr = d.toLocaleDateString('en-CA');
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const minutes = stats[dateStr] || 0;
                
                last7Days.push({
                    date: dateStr,
                    minutes,
                    dayName
                });
                total += minutes;
            }

            setWeeklyStats(last7Days);
            setTotalFocusTime(total);
        } catch (error) {
            console.error('Failed to load stats', error);
        } finally {
            setLoading(false);
        }
    };

    const maxMinutes = Math.max(...weeklyStats.map(s => s.minutes), 60); // Min 60 for scale

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Focus Stats</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* Summary Card */}
                    <View style={[styles.card, { backgroundColor: colors.surface }]}>
                        <View style={styles.cardHeader}>
                            <Clock size={20} color={colors.primary} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Last 7 Days</Text>
                        </View>
                        <Text style={[styles.bigStat, { color: colors.text }]}>
                            {Math.floor(totalFocusTime / 60)}h {totalFocusTime % 60}m
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Focus Time</Text>
                    </View>

                    {/* Chart */}
                    <View style={[styles.card, { backgroundColor: colors.surface, flex: 1 }]}>
                        <View style={styles.cardHeader}>
                            <BarChart2 size={20} color={colors.primary} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Activity</Text>
                        </View>
                        
                        <View style={styles.chartContainer}>
                            {weeklyStats.map((stat, index) => {
                                const heightPercentage = (stat.minutes / maxMinutes) * 100;
                                const isToday = index === 6;
                                
                                return (
                                    <View key={stat.date} style={styles.barContainer}>
                                        <View style={styles.barWrapper}>
                                            <View 
                                                style={[
                                                    styles.bar, 
                                                    { 
                                                        height: `${Math.max(heightPercentage, 2)}%`, // Min height for visibility
                                                        backgroundColor: isToday ? colors.primary : colors.border 
                                                    }
                                                ]} 
                                            />
                                        </View>
                                        <Text style={[styles.dayLabel, { color: isToday ? colors.primary : colors.textSecondary }]}>
                                            {stat.dayName}
                                        </Text>
                                        <Text style={[styles.minLabel, { color: colors.textSecondary }]}>
                                            {stat.minutes}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50, // Status bar
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    bigStat: {
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 200,
        alignItems: 'flex-end',
        paddingTop: 20,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    barWrapper: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 8,
    },
    bar: {
        width: 12,
        borderRadius: 6,
    },
    dayLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    minLabel: {
        fontSize: 10,
    }
});

export default StatsModal;
