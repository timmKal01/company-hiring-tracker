const USER_AGENT = 'CompanyHiringTracker/0.1 (+contact: hiring-tracker-admin@example.com)';

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 15_000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller.signal });
        } catch (err) {
            lastError = err.name === 'AbortError' ? new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`) : err;
            if (attempt < MAX_ATTEMPTS) {
                await sleep(1000 * 2 ** (attempt - 1));
                continue;
            }
            throw lastError;
        } finally {
            clearTimeout(timeoutId);
        }
        if (res.ok) return res.json();
        if (!TRANSIENT_STATUSES.has(res.status)) {
            throw new Error(`Request failed: ${url} (${res.status})`);
        }
        lastError = new Error(`Request failed: ${url} (${res.status})`);
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
    throw lastError;
}

async function fetchGreenhouse(slug, includeDescription) {
    // content=true is requested unconditionally: it's the same call either way, and it's the
    // only way Greenhouse includes the `departments` field, which we want regardless of whether
    // the caller wants the full description text.
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
    const data = await fetchJson(url);
    return (data.jobs ?? []).map((job) => ({
        company: slug,
        ats: 'greenhouse',
        jobId: String(job.id),
        title: job.title,
        location: job.location?.name ?? null,
        department: job.departments?.[0]?.name ?? null,
        commitment: null,
        url: job.absolute_url,
        postedAt: job.first_published ?? null,
        updatedAt: job.updated_at ?? null,
        description: includeDescription ? (job.content ?? null) : null,
    }));
}

/** Crawl-delay: 1 per api.lever.co/robots.txt is naturally satisfied since we make one request per board. */
async function fetchLever(slug, includeDescription) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
    const data = await fetchJson(url);
    return (data ?? []).map((job) => ({
        company: slug,
        ats: 'lever',
        jobId: String(job.id),
        title: job.text,
        location: job.categories?.location ?? job.country ?? null,
        department: job.categories?.team ?? null,
        commitment: job.categories?.commitment ?? null,
        url: job.hostedUrl,
        postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
        updatedAt: null,
        description: includeDescription ? (job.descriptionPlain ?? null) : null,
    }));
}

export async function fetchBoard({ ats, slug }, includeDescription) {
    if (ats === 'greenhouse') return fetchGreenhouse(slug, includeDescription);
    if (ats === 'lever') return fetchLever(slug, includeDescription);
    throw new Error(`Unknown ats type: ${ats}. Expected "greenhouse" or "lever".`);
}
