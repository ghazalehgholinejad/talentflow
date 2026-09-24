# Roadmap

These are planned steps, not shipped features.

## 1. Verify the connected prototype

Import and execute setup, publish the gateway in the same n8n project, and run the live smoke with fictional data. Record the n8n version and results. Check persistence after reload and the full interview/report journey in the browser before claiming an end-to-end cloud demo.

## 2. Replace one mock provider at a time

Add a provider interface with validated responses, bounded retries, timeouts and explicit failure states. Start with job text or interview questions. Keep deterministic fixtures for tests. Do not present generated scores as validated hiring decisions.

## 3. Prepare for real users

Design authentication and roles, consent and retention rules, audit logging, deletion controls, rate limits and distributed concurrency handling. Revisit the JSON-record persistence model before multiuser deployment.

## 4. Improve reproducibility

Add a verified CI pipeline, an isolated integration environment and synthetic screenshots. Publish only measured results; no passing badges until their corresponding checks actually run.
