import type { Application, Snapshot } from './talentflow-types';

/** Display-only matching: never modify stored names or hiring decisions. */
export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchesSearch(text: string, query: string): boolean {
  const haystack = normalizeSearch(text);
  return normalizeSearch(query).split(' ').filter(Boolean).every(term => haystack.includes(term));
}

export function filterApplications(
  data: Snapshot,
  filters: { query: string; jobId: string; status: string },
): Application[] {
  const candidates = new Map(data.candidates.map(candidate => [candidate.id, candidate]));
  const jobs = new Map(data.jobs.map(job => [job.id, job]));
  return data.applications.filter(application => {
    if (filters.jobId && application.jobId !== filters.jobId) return false;
    if (filters.status && application.status !== filters.status) return false;
    const candidate = candidates.get(application.candidateId);
    const job = jobs.get(application.jobId);
    return matchesSearch([
      candidate?.name, candidate?.email, ...(candidate?.skills ?? []),
      job?.title, job?.department, job?.location, ...(job?.skills ?? []),
    ].filter(Boolean).join(' '), filters.query);
  });
}
