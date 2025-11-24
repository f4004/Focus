// @ts-ignore
import { KJUR } from 'jsrsasign';
import credentials from '../config/google-credentials.json';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '16unPwN9bSiekn2JRh__BMa4Nr_xDjuQ-SQb0Csk68Tg'; // From User Request

interface SheetRow {
  date: string;
  focusMinutes: number;
  habitStatus: string;
}

export const GoogleSheetsService = {
  accessToken: null as string | null,
  tokenExpiry: 0,

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: credentials.client_email,
      scope: SCOPES.join(' '),
      aud: credentials.token_uri,
      exp: now + 3600,
      iat: now,
    };

    const header = { alg: 'RS256', typ: 'JWT' };
    const sHeader = JSON.stringify(header);
    const sClaim = JSON.stringify(claim);

    const sJWS = KJUR.jws.JWS.sign(null, sHeader, sClaim, credentials.private_key);

    try {
      const response = await fetch(credentials.token_uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${sJWS}`,
      });

      const data = await response.json();
      if (data.access_token) {
        this.accessToken = data.access_token as string;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Buffer of 1 min
        return this.accessToken;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Auth Error:', error);
      throw error;
    }
  },

  async getSheetData(): Promise<SheetRow[]> {
    const token = await this.getAccessToken();
    const range = 'Sheet1!A2:C'; // Assuming headers are in row 1
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!data.values) return [];

      return data.values.map((row: any[]) => ({
        date: row[0],
        focusMinutes: parseInt(row[1] || '0', 10),
        habitStatus: row[2] || 'not_done',
      }));
    } catch (error) {
      console.error('Fetch Sheet Error:', error);
      throw error;
    }
  },

  async updateRow(rowIndex: number, rowData: SheetRow) {
    const token = await this.getAccessToken();
    const range = `Sheet1!A${rowIndex}:C${rowIndex}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

    const body = {
      values: [[rowData.date, rowData.focusMinutes, rowData.habitStatus]],
    };

    try {
      await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('Update Row Error:', error);
      throw error;
    }
  },

  async appendRow(rowData: SheetRow) {
    const token = await this.getAccessToken();
    const range = 'Sheet1!A:C';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const body = {
      values: [[rowData.date, rowData.focusMinutes, rowData.habitStatus]],
    };

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('Append Row Error:', error);
      throw error;
    }
  }
};
