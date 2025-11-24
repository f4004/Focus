import { GoogleSheetsService } from './GoogleSheetsService';
import { getDailyFocusTime, setDailyFocusTime, getUnsyncedFocusTime, clearUnsyncedFocusTime, getHabits, STORAGE_KEYS, setRemoteFocusBaseline, getRemoteFocusBaseline } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SyncManager = {
    // 1. READ: Fetch from sheet. 
    // If today exists, load it. Else 0.
    // This is a "Hard Pull" - it replaces local state.
    async readFromSheet() {
        try {
            console.log('[SYNC] Reading from Sheet...');
            const sheetRows = await GoogleSheetsService.getSheetData();

            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const dateStr = `${dd}-${mm}-${yyyy}`;

            let remoteTodayMinutes = 0;
            let foundToday = false;

            for (const row of sheetRows) {
                if (row.date === dateStr) {
                    remoteTodayMinutes = row.focusMinutes || 0;
                    foundToday = true;
                    break;
                }
            }

            console.log('[SYNC] Read Complete. Cloud value for today:', remoteTodayMinutes);
            return { success: true, totalMinutes: remoteTodayMinutes, foundToday };
        } catch (error) {
            console.error('[SYNC] Read Failed', error);
            return { success: false, error };
        }
    },

    // 2. WRITE: Remote + Unsynced -> Upload
    async writeToSheet() {
        try {
            console.log('[SYNC] Writing to Sheet...');

            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const dateStr = `${dd}-${mm}-${yyyy}`;
            const todayISO = today.toISOString().split('T')[0];

            // 1. Get Unsynced Delta
            const unsynced = await getUnsyncedFocusTime();
            if (unsynced === 0) {
                console.log('Nothing to sync.');
                return { success: true, message: 'No new data' };
            }

            // 2. Get Current Remote State
            const sheetRows = await GoogleSheetsService.getSheetData();
            let rowIndex = -1;
            let remoteValue = 0;

            for (let i = 0; i < sheetRows.length; i++) {
                if (sheetRows[i].date === dateStr) {
                    rowIndex = i + 2;
                    remoteValue = sheetRows[i].focusMinutes || 0;
                    break;
                }
            }

            // 3. Calculate New Total
            const newTotal = remoteValue + unsynced;

            // 4. Prepare Data
            const habits = await getHabits();
            const habitStatus = habits[todayISO] || 'not_done';

            const rowData = {
                date: dateStr,
                focusMinutes: newTotal,
                habitStatus: habitStatus
            };

            // 5. Write
            if (rowIndex !== -1) {
                await GoogleSheetsService.updateRow(rowIndex, rowData);
            } else {
                await GoogleSheetsService.appendRow(rowData);
            }

            // 6. Update Local State to reflect we are synced
            await clearUnsyncedFocusTime();
            await setDailyFocusTime(newTotal); // Ensure local display matches the new total

            console.log('Write Complete', rowData);
            return { success: true };

        } catch (error) {
            console.error('Write Failed', error);
            return { success: false, error };
        }
    }
};
