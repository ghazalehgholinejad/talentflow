# Verification — TalentFlow v2

This report distinguishes source/runtime checks from cloud activation. It is NOT a certificate of production readiness.

## Portfolio packaging check — 2026-09-23

- Expanded the README and added résumé wording, a technical walkthrough, a GitHub preparation checklist and a roadmap.
- Created an allowlisted source archive excluding `.env.local`, private configured workflows, legacy dashboard copies, build output and Git history. The staged hosting config omits the original project identifier; the working project's hosting config is unchanged.
- The packaging check found no occurrence of the locally configured webhook secret in staged files. A targeted scan also found none of the known personal/account identifiers checked. These checks are not a comprehensive secret-scanner certification; review the archive before public sharing.
- Workflow tests (8), TypeScript and lint passed in the working project.
- The staged source built successfully with `npm run build:local`, using a symlink to the already installed dependencies. A fresh network install was not tested.
- All 15 tests passed against that staged build with `node --test tests/*.test.mjs`. The first sandboxed attempt passed 14 tests but could not open the local port required by the rendering test; the rerun with local-port access passed all 15.
- No GitHub repository was created or pushed, no cloud workflows were changed, and no live cloud lifecycle was tested during this packaging pass.

## Earlier runtime verification — 2026-09-12

## Passed

- TypeScript check (`npx tsc --noEmit`).
- Frontend/Worker build (`npm run build:local`).
- 15 automated tests: actual Worker HTML rendering in Miniflare; 8 domain/generated-workflow tests; 4 UI component/style contracts; 2 local-proxy security/response-validation tests.
- Domain lifecycle: job draft/activation, fictional sample ingestion, human verification, exactly two job-specific matches for the supplied ML fixture, HR-created session, 5 saved text answers, final mock evaluation and recruiter report.
- Domain negative/retry checks: rejected pair exclusion, repeat seed/job request, independent job matching, invalid tokens, expiry, missing answers, invalid HR transitions, duplicate email, completed answer immutability and resume after reload.
- Every generated n8n graph's node references and embedded Code syntax checked. Empty Data Table sentinel, authorization-before-read and persistence-before-response paths checked structurally.
- Local development server ran on `http://127.0.0.1:5174/` with HTTP 200.
- Runtime proxy error caused by unsupported `redirect:error` was corrected to `manual` with explicit redirect rejection.
- Configured n8n gateway not being published correctly produces an explicit error instead of fabricated success.
- Browser inspection of the local settings page confirmed the correct inactive-connection state and the two-file setup instructions. No connected-state success was fabricated.

## Not yet verified / requires cloud setup

- Import, execution of setup 00, and Publish of gateway 10 on the target cloud account have not been confirmed. No successful live lifecycle is claimed.
- `scripts/smoke-v2.mjs` has been supplied for the live lifecycle, but it has not passed against the cloud account at this report's writing.
- A passing pure-domain test uses a test harness; it is not proof that n8n Data Table nodes have run. Complete the two-file import and run the live smoke before presenting a connected demonstration.
- Browser connected-state forms, recording permission, installed Persian speech voices, and a full live UI journey still require verification with the cloud gateway active.

## Explicit product boundaries

External providers are mocked; scores are illustrative, not valid employment assessments. No actual email delivery, Drive download, PDF/OCR, STT or uploaded audio retention. No multiuser/public deployment or distributed transaction guarantees. See RUN_V2_FA.md and ARCHITECTURE_V2.md.

## Reproduce

```bash
npm ci
npm run setup:n8n
# Import/execute 00 and Import/Publish 10 from n8n/local-configured in the same project.
npm run dev -- --port 5174 --strictPort
# In a second terminal:
node scripts/smoke-v2.mjs http://127.0.0.1:5174
```

The smoke intentionally retains fictional records for inspection. No records are deleted and no email is sent.
