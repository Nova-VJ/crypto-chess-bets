const rawCoachApiBaseUrl = import.meta.env.VITE_COACH_API_URL?.trim() ?? '';

const normalizedCoachApiBaseUrl = rawCoachApiBaseUrl.replace(/\/+$/, '');

let wakePromise: Promise<void> | null = null;

type WakeOptions = {
  attempts?: number;
  delayMs?: number;
};

type FetchCoachApiOptions = {
  retries?: number;
  retryDelayMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableStatus = (status: number) => status === 502 || status === 503 || status === 504;

export function coachApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedCoachApiBaseUrl
    ? `${normalizedCoachApiBaseUrl}${normalizedPath}`
    : normalizedPath;
}

export async function ensureCoachApiAwake(options: WakeOptions = {}) {
  if (!normalizedCoachApiBaseUrl) return;

  const attempts = options.attempts ?? 6;
  const delayMs = options.delayMs ?? 5000;

  if (!wakePromise) {
    wakePromise = (async () => {
      let lastError: unknown;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const response = await fetch(coachApiUrl('/api/health'), {
            method: 'GET',
            cache: 'no-store',
          });

          if (response.ok) {
            return;
          }

          lastError = new Error(`Coach API health returned ${response.status}`);
        } catch (error) {
          lastError = error;
        }

        if (attempt < attempts - 1) {
          await sleep(delayMs);
        }
      }

      throw lastError ?? new Error('Coach API did not wake up in time.');
    })();
  }

  try {
    await wakePromise;
  } finally {
    wakePromise = null;
  }
}

export async function fetchCoachApi(
  path: string,
  init?: RequestInit,
  options: FetchCoachApiOptions = {},
) {
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 4000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(coachApiUrl(path), init);

      if (attempt < retries && isRetriableStatus(response.status)) {
        lastError = new Error(`Coach API returned ${response.status}`);
        await ensureCoachApiAwake({ attempts: 4, delayMs: retryDelayMs });
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        throw error;
      }

      await ensureCoachApiAwake({ attempts: 4, delayMs: retryDelayMs });
    }
  }

  throw lastError ?? new Error('Coach API request failed.');
}
