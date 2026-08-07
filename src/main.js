import { Actor, log } from 'apify';
import { fetchBoard } from './boards.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { boards = [], keywordFilter = [], includeDescription = false } = input;

if (boards.length === 0) {
    throw new Error('No boards provided.');
}

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const BOARD_QUERIED_EVENT = 'board-queried';

function matchesKeywords(title, keywords) {
    if (!keywords || keywords.length === 0) return true;
    const lower = title.toLowerCase();
    return keywords.some((k) => lower.includes(k.toLowerCase()));
}

for (const board of boards) {
    let jobs;
    try {
        jobs = await fetchBoard(board, includeDescription);
    } catch (err) {
        log.warning(`Failed to fetch board`, { board, error: err.message });
        continue;
    }

    const filtered = jobs.filter((job) => matchesKeywords(job.title, keywordFilter));

    if (filtered.length > 0) {
        await Actor.pushData(filtered.map((job) => ({ ...job, discoveredAt: new Date().toISOString() })));
    }
    await Actor.charge({ eventName: BOARD_QUERIED_EVENT });

    log.info(`Fetched board`, { company: board.slug, ats: board.ats, totalJobs: jobs.length, matchedJobs: filtered.length });
}

await Actor.exit();
