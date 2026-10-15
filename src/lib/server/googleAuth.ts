import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

/** Klien autentikasi yang dipakai googleapis. */
type GoogleAuthClient = OAuth2Client | GoogleAuth;

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
type GoogleAuth = InstanceType<typeof google.auth.GoogleAuth>;

let cachedAuth: GoogleAuthClient | null = null;
let cachedAuthMode: 'oauth' | 'service-account' | null = null;

function createServiceAccountAuth(): GoogleAuthClient | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  let credentials: Record<string, string>;
  try {
    credentials = JSON.parse(raw);
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON yang valid.');
  }

  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

function isInvalidGrant(error: unknown): boolean {
  const value = error as { code?: unknown; message?: unknown; response?: { data?: unknown } };
  return /invalid[_ ]grant/i.test(
    `${String(value?.code || '')} ${String(value?.message || '')} ${JSON.stringify(value?.response?.data || '')}`,
  );
}

/**
 * Autentikasi Google.
 *
 * Prioritaskan OAuth2 (refresh token) karena service account tidak punya kuota
 * penyimpanan Drive. Fallback ke service account untuk instalasi lokal.
 */
function resolveAuth(): GoogleAuthClient {
  if (cachedAuth) return cachedAuth;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const client = new google.auth.OAuth2(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    cachedAuth = client;
    cachedAuthMode = 'oauth';
    return cachedAuth;
  }

  const serviceAccount = createServiceAccountAuth();
  if (!serviceAccount) {
    throw new Error(
      'Kredensial Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN atau GOOGLE_SERVICE_ACCOUNT_JSON.',
    );
  }

  cachedAuth = serviceAccount;
  cachedAuthMode = 'service-account';
  return cachedAuth;
}

async function withGoogleAuthFallback<T>(
  operation: (auth: GoogleAuthClient) => Promise<T>,
): Promise<T> {
  const auth = resolveAuth();
  try {
    return await operation(auth);
  } catch (error) {
    if (cachedAuthMode !== 'oauth' || !isInvalidGrant(error)) throw error;

    const fallback = createServiceAccountAuth();
    if (!fallback) {
      throw new Error(
        'Token Google OAuth tidak berlaku (invalid_grant). Perbarui GOOGLE_REFRESH_TOKEN atau sediakan GOOGLE_SERVICE_ACCOUNT_JSON dengan akses ke Drive dan Spreadsheet.',
      );
    }

    console.warn('[google] OAuth invalid_grant, mencoba service account cadangan.');
    cachedAuth = fallback;
    cachedAuthMode = 'service-account';
    return operation(fallback);
  }
}

function getDrive(auth: GoogleAuthClient = resolveAuth()) {
  return google.drive({ version: 'v3', auth });
}

function getSheets(auth: GoogleAuthClient = resolveAuth()) {
  return google.sheets({ version: 'v4', auth });
}

export function withDriveFallback<T>(operation: (drive: ReturnType<typeof getDrive>) => Promise<T>) {
  return withGoogleAuthFallback(auth => operation(getDrive(auth)));
}

export function withSheetsFallback<T>(operation: (sheets: ReturnType<typeof getSheets>) => Promise<T>) {
  return withGoogleAuthFallback(auth => operation(getSheets(auth)));
}

export async function verifyGoogleAccess(): Promise<void> {
  await withGoogleAuthFallback(async auth => {
    const result = await auth.getAccessToken();
    const token = typeof result === 'string' ? result : result.token;
    if (!token) throw new Error('Google tidak memberikan access token.');
  });
}

export function getSpreadsheetId(): string {
  const id = process.env.SPREADSHEET_UTAMA_ID || process.env.GOOGLE_SHEET_ID || '';
  if (!id) throw new Error('GOOGLE_SHEET_ID belum dikonfigurasi.');
  return id;
}

export function getMainFolderId(): string {
  const id = process.env.FOLDER_UTAMA_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  if (!id) throw new Error('FOLDER_UTAMA_ID belum dikonfigurasi.');
  return id;
}
