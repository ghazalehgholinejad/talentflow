# TalentFlow v2 architecture

## Runtime

Browser (React, Persian RTL) → same-origin local HTTP proxy → authenticated n8n production webhook → Data Table read → pure action planner → Data Table upserts → response → authoritative refresh.

No D1 or R2 is used by v2 application routes. Old endpoints return 410. The retained Vinext starter still declares unused bindings for compatibility; the new website stores no business data there. Frontend React state is only a display cache. No localStorage database. No fallback that invents success when n8n fails.

`n8n/source/engine.mjs` is the single business source, embedded by `scripts/generate-v2-workflows.mjs` into n8n Code nodes. It is imported by tests, NOT by the application runtime. `10_Website_Gateway` dispatches all actions. Independent 01–09 workflows are optional alternate entrypoints, not dependencies of 10. Each follows the same read/validate/persist/respond graph.

## Data Table

`talentflow_v2_records`: string columns `key`, `kind`, `payload`. n8n supplies system id/timestamps. Logical kinds: job, candidate, application. Payload is versioned-by-release JSON. Session, answers, evaluation, invitation and append-only history live in the application payload, making HR/session and final-score transitions single-row writes. UI IDs are strings; never cast to numbers. Application ID is deterministic per job/candidate. Default example candidates have stable IDs. Job retries reuse requestId. Completed interview requests return the existing evaluation.

Upsert matches exact key. Planner fails on duplicate keys or malformed JSON rather than silently hiding corrupt records. No automatic deletion or schema migration. The setup only creates/reuses the isolated table. Existing older TalentFlow tables remain intact and are not migrated.

## Actions

| Action | Inputs | Result |
|---|---|---|
| snapshot | — | jobs, candidates, applications |
| createJob | title, department, location, skills[], goal, minExperience, passScore, requestId | draft job |
| updateJob | jobId, status active/closed, confirmed for active | saved job |
| syncResumes | — | count and newly inserted fictional candidates |
| importCandidate | name, email, skills, experience, resumeText | unverified candidate |
| verifyCandidate | candidateId, confirmed | verified candidate |
| runScreening | jobId, limit 1–40, minScore 0–100 | new applications and count |
| updateApplication | applicationId, status, note; server-generated sessionToken | saved decision, optionally session |
| createInterview | approved applicationId; server-generated sessionToken | existing or new session |
| getInterview | token | minimal candidate-facing session, no token/email/history |
| questionAudio | token, questionId | question text + browser-speech provider |
| saveAnswer | token, questionId, text, source | session with persisted answer |
| finishInterview | token | completed session with mock evaluation |
| recruiterReport | optional applicationId | persisted report + related job/candidate |

Envelope: `{ok:true, version:"talentflow-v2", mock:true, result}`. Validation failures contain `ok:false,error`. Respond follows successful Data Table persistence, never runs in parallel with it. The no-write branch supports empty results/reads/validation errors. `alwaysOutputData` ensures an empty table still reaches the planner.

## Security and limits

- `setup:n8n` generates 32 cryptographic random bytes as shared secret, preserves it on reconfiguration, embeds it only in private local import copies and .env.local. Public templates fail closed. Configured JSON is secret-bearing and must not be shared.
- n8n checks the header before reading tables. Execution payload saving is disabled to reduce accidental retention of tokens and resumes; operational errors can still appear in execution metadata. Secret remains readable to n8n workflow editors.
- The local server uses loopback, rejects other hosts/cross-origin requests, checks content type and body size. This is not multiuser authentication. Do not tunnel or publicly deploy it.
- Candidate API restricts actions; token required for each candidate operation, seven-day expiry, completed answers immutable. Recruiter-facing snapshot is privileged within the local workstation. Do not run on an untrusted shared machine.
- Single-process promise serialization reduces local read/modify/write races. It is not a database transaction or distributed lock. Separate direct calls and multiple website processes are unsupported. Shortlist/seed can partially save on failure; stable IDs/upserts make re-running safe from duplicate pairs, but no rollback is claimed.
- All reads load the complete demo table. This is intentionally small-dataset architecture, not scalable hiring infrastructure.

## Replacing mock providers

Current provider outputs are explicit in source and UI. To integrate paid/real services, extract the mock-producing sections of createJob, syncResumes, questions, screening, finishInterview and invitation into provider nodes while preserving the above persistence contract. Validate every external response before planning writes. Store provider/model/prompt/rubric version and evidence. Never let model text issue HR approval. Retries need idempotency and audit policy. Add transcript/audio retention and access controls before real recordings or private resumes.

LLM output schemas to preserve: job {description,skills,goal}; screening {score 0–100,matchedSkills,missingSkills,note,provider,rubricVersion}; questions [{id,text,competency}]; evaluation {score,dimensions:[{competency,score,evidence}],summary,threshold,aboveThreshold,provider,rubricVersion}. STT must supply text + source; sending a recording currently does NOT exist. Mail provider must set status sent only after provider acceptance; current status is simulated.

Set provider live only after implementing and testing those nodes. This release deliberately rejects N8N_MODE other than mock.

## Verification

`npm run workflows:build`: regenerate shareable templates without secrets.

`npm run test:workflow`: domain/state/idempotency/security tests plus graph/Code syntax tests; these do not replace execution inside a real n8n instance.

`npm run lint`, `npx tsc --noEmit`, `npm run build:local`: source/static/build checks.

Live end-to-end smoke: `node scripts/smoke-v2.mjs http://127.0.0.1:5174`. This explicitly creates only fictional demo rows on the connected n8n account; it never emails anyone. Do not use it with real candidate data. A successful result proves round-trip persistence as observed through n8n API actions, not all concurrency or provider behavior.
