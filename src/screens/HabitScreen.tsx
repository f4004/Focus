import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, PanResponder, Dimensions, LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getDaysInMonth, calculateStreak, getMonthlyStats, CalendarDay } from '../utils/calendarLogic';
import { getHabits, saveHabitStatus, DayStatus } from '../utils/storage';
import { ChevronLeft, ChevronRight, Flame, CheckCircle, XCircle, MinusCircle, CalendarClock } from 'lucide-react-native';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const HabitScreen = () => {
    const { colors } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [habits, setHabits] = useState<Record<string, DayStatus['status']>>({});
    const [streak, setStreak] = useState(0);
    const [calendarLayout, setCalendarLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    const loadData = useCallback(async () => {
        const data = await getHabits();
        setHabits(data);
        setStreak(calculateStreak(data));
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const toggleStatus = async (date: string) => {
        const currentStatus = habits[date];
        let nextStatus: DayStatus['status'] = 'completed';

        if (currentStatus === 'completed') nextStatus = 'missed';
        else if (currentStatus === 'missed') nextStatus = 'skipped';
        else if (currentStatus === 'skipped') nextStatus = 'planned';
        else if (currentStatus === 'planned') nextStatus = 'none';
        else nextStatus = 'completed';

        // Optimistic update
        const newHabits = { ...habits, [date]: nextStatus };
        setHabits(newHabits);
        setStreak(calculateStreak(newHabits));

        await saveHabitStatus(date, nextStatus);
    };

    const setPlannedStatus = async (date: string) => {
        if (habits[date] === 'planned') return; // Already planned

        const newHabits: Record<string, DayStatus['status']> = { ...habits, [date]: 'planned' };
        setHabits(newHabits);
        await saveHabitStatus(date, 'planned');
    };

    const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const stats = getMonthlyStats(habits, days);

    const getStatusColor = (status?: DayStatus['status']) => {
        switch (status) {
            case 'completed': return colors.success;
            case 'missed': return colors.error;
            case 'skipped': return colors.warning;
            case 'planned': return colors.primary;
            default: return 'transparent';
        }
    };

    const getStatusIcon = (status?: DayStatus['status']) => {
        switch (status) {
            case 'completed': return '😊';
            case 'missed': return '😞';
            case 'skipped': return '😐';
            case 'planned': return '📅';
            default: return null;
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt, gestureState) => {
                setIsPanning(true);
                handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
            onPanResponderMove: (evt, gestureState) => {
                handleTouch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
            },
            onPanResponderRelease: () => {
                setIsPanning(false);
            },
            onPanResponderTerminate: () => {
                setIsPanning(false);
            },
        })
    ).current;

    const handleTouch = (x: number, y: number) => {
        if (!calendarLayout) return;

        // Assuming 7 columns
        const colWidth = calendarLayout.width / 7;
        // Assuming rows based on days length (usually 5 or 6)
        const numRows = Math.ceil(days.length / 7);
        const rowHeight = colWidth; // Aspect ratio 1

        const col = Math.floor(x / colWidth);
        const row = Math.floor(y / rowHeight);

        if (col >= 0 && col < 7 && row >= 0 && row < numRows) {
            const index = row * 7 + col;
            if (index >= 0 && index < days.length) {
                const day = days[index];
                // Only allow setting future or current days to 'planned' via drag
                // Or maybe any day? User said "hold on a date... make them my tasks"
                // Let's allow any day but typically planned is for future.
                // Let's just set it.
                setPlannedStatus(day.date);
            }
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!isPanning}>

                {/* Streak Header */}
                <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.streakHeader}>
                        <Flame color={colors.warning} size={32} fill={colors.warning} />
                        <Text style={[styles.streakCount, { color: colors.text }]}>{streak}</Text>
                    </View>
                    <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                </View>

                {/* Calendar Header */}
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.monthTitle, { color: colors.text }]}>
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                        <ChevronRight color={colors.text} size={24} />
                    </TouchableOpacity>
                </View>

                {/* Days of Week */}
                <View style={styles.weekRow}>
                    {DAYS_OF_WEEK.map(day => (
                        <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>{day}</Text>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View
                    style={styles.calendarGrid}
                    onLayout={(e) => setCalendarLayout(e.nativeEvent.layout)}
                    {...panResponder.panHandlers}
                >
                    {days.map((day, index) => {
                        const status = habits[day.date];
                        const isFuture = new Date(day.date) > new Date();

                        return (
                            <TouchableOpacity
                                key={day.date}
                                style={[
                                    styles.dayCell,
                                    {
                                        backgroundColor: status && status !== 'none' ? getStatusColor(status) : (day.isCurrentMonth ? colors.surface : 'transparent'),
                                        opacity: day.isCurrentMonth ? 1 : 0.3,
                                        borderColor: day.isToday ? colors.primary : 'transparent',
                                        borderWidth: day.isToday ? 2 : 0,
                                    }
                                ]}
                                onPress={() => toggleStatus(day.date)}
                                // Disable default touchable opacity active opacity if panning to avoid flicker
                                activeOpacity={isPanning ? 1 : 0.2}
                            >
                                <Text style={[
                                    styles.dayText,
                                    { color: status && status !== 'none' ? '#FFF' : colors.text }
                                ]}>
                                    {day.day}
                                </Text>
                                {status && status !== 'none' && (
                                    <Text style={styles.statusEmoji}>{getStatusIcon(status)}</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                    Tip: Slide across days to mark them as planned!
                </Text>

                {/* Stats Summary */}
                <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.statsTitle, { color: colors.text }]}>Monthly Summary</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <CheckCircle color={colors.success} size={20} />
                            <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Done</Text>
                        </View>
                        <View style={styles.statItem}>
                            <XCircle color={colors.error} size={20} />
                            <Text style={[styles.statValue, { color: colors.text }]}>{stats.missed}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Missed</Text>
                        </View>
                        <View style={styles.statItem}>
                            <CalendarClock color={colors.primary} size={20} />
                            <Text style={[styles.statValue, { color: colors.text }]}>
                                {Object.values(habits).filter(s => s === 'planned').length}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Planned</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    streakCard: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    streakHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    streakCount: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    streakLabel: {
        fontSize: 14,
        marginTop: 5,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    navButton: {
        padding: 10,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    weekDay: {
        width: '14%',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    dayCell: {
        width: '14%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginVertical: 2,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    statusEmoji: {
        fontSize: 10,
        marginTop: 2,
    },
    hintText: {
        textAlign: 'center',
        fontSize: 12,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    statsContainer: {
        padding: 20,
        borderRadius: 16,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        gap: 5,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
    },
});

export default HabitScreen;
