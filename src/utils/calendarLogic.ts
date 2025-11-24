import { DayStatus } from './storage';

export interface CalendarDay {
    date: string; // YYYY-MM-DD
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
}

export const getDaysInMonth = (year: number, month: number): CalendarDay[] => {
    const date = new Date(year, month, 1);
    const days: CalendarDay[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Previous month padding
    const firstDayOfWeek = date.getDay(); // 0 = Sunday
    const prevMonth = new Date(year, month, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, prevMonth.getDate() - i);
        days.push({
            date: d.toISOString().split('T')[0],
            day: d.getDate(),
            isCurrentMonth: false,
            isToday: d.toISOString().split('T')[0] === today,
        });
    }

    // Current month
    while (date.getMonth() === month) {
        days.push({
            date: date.toISOString().split('T')[0],
            day: date.getDate(),
            isCurrentMonth: true,
            isToday: date.toISOString().split('T')[0] === today,
        });
        date.setDate(date.getDate() + 1);
    }

    // Next month padding
    const lastDayOfWeek = new Date(year, month + 1, 0).getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
            date: d.toISOString().split('T')[0],
            day: d.getDate(),
            isCurrentMonth: false,
            isToday: d.toISOString().split('T')[0] === today,
        });
    }

    return days;
};

export const calculateStreak = (habits: Record<string, DayStatus['status']>): number => {
    let streak = 0;
    const today = new Date();

    // Check from yesterday backwards (or today if completed)
    // If today is completed, start from today. If not, start from yesterday.
    // If today is missed, streak is 0 (unless we only count up to yesterday).
    // Usually streak includes today if done.

    let current = new Date();
    const todayStr = current.toISOString().split('T')[0];

    if (habits[todayStr] === 'completed') {
        streak++;
    } else if (habits[todayStr] === 'missed') {
        return 0;
    }

    // Move to yesterday
    current.setDate(current.getDate() - 1);

    while (true) {
        const dateStr = current.toISOString().split('T')[0];
        const status = habits[dateStr];

        if (status === 'completed') {
            streak++;
        } else if (status === 'skipped') {
            // Continue but don't increment
        } else {
            // Missed or none breaks streak
            break;
        }
        current.setDate(current.getDate() - 1);
    }

    return streak;
};

export const getMonthlyStats = (
    habits: Record<string, DayStatus['status']>,
    days: CalendarDay[]
) => {
    let completed = 0;
    let missed = 0;
    let skipped = 0;

    days.forEach(day => {
        if (day.isCurrentMonth) {
            const status = habits[day.date];
            if (status === 'completed') completed++;
            else if (status === 'missed') missed++;
            else if (status === 'skipped') skipped++;
        }
    });

    return { completed, missed, skipped };
};
