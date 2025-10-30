import { json } from '@sveltejs/kit';
import { google } from 'googleapis';
import { GOOGLE_SA_EMAIL, GOOGLE_SA_KEY, SHEET_ID } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Authenticate
		const auth = new google.auth.GoogleAuth({
			credentials: {
				client_email: GOOGLE_SA_EMAIL,
				private_key: GOOGLE_SA_KEY.replace(/\\n/g, '\n')
			},
			scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
		});

		const sheets = google.sheets({ version: 'v4', auth });

		// Fetch both tabs in parallel
		const [studentsResponse, connectionsResponse] = await Promise.all([
			sheets.spreadsheets.values.get({
				spreadsheetId: SHEET_ID,
				range: 'Students!A:D' // ID, FirstName, LastName, Gender
			}),
			sheets.spreadsheets.values.get({
				spreadsheetId: SHEET_ID,
				range: 'Connections!A:Z' // display name, id, friend ids...
			})
		]);

		const studentsRows = studentsResponse.data.values;
		const connectionsRows = connectionsResponse.data.values;

		if (!studentsRows || studentsRows.length < 2) {
			return json({ error: 'No student data found' }, { status: 404 });
		}

		// Parse Students tab (skip header row)
		const students = studentsRows.slice(1).map(row => ({
			id: row[0]?.trim() || '',
			firstName: row[1]?.trim() || '',
			lastName: row[2]?.trim() || '',
			gender: row[3]?.trim() || ''
		}));

		// Parse Connections tab
		// Expected format: id, friendids comma separated
		const connections: Record<string, string[]> = {};
		
		if (connectionsRows && connectionsRows.length > 1) {
			for (let i = 1; i < connectionsRows.length; i++) {
				const row = connectionsRows[i];
				const studentId = row[0]?.trim(); // Column B is id
				
				if (!studentId) continue;
				
				const friendIds: string[] = [];
				for (let j = 1; j < row.length; j++) {
					const friendId = row[j]?.trim();
					if (friendId) {
						friendIds.push(friendId);
					}
				}
				
				connections[studentId] = friendIds;
			}
		}

		return json({
			success: true,
			students,
			connections,
			studentCount: students.length,
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('Google Sheets API Error:', error);
		return json(
			{
				error: 'Failed to fetch data from Google Sheets',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};