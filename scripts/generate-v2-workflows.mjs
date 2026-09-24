import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function generateWorkflows({ secret = '__SET_SECRET__', directory = 'n8n/release-v2' } = {}) {
  const source = (await readFile(new URL('../n8n/source/engine.mjs', import.meta.url), 'utf8')).replaceAll('export ', '');
  await mkdir(directory, { recursive: true });
  const node = (name, type, parameters, x, y = 0, extra = {}) => ({ id: randomUUID(), name, type: `n8n-nodes-base.${type}`, typeVersion: type === 'dataTable' ? 1.1 : type === 'code' || type === 'if' ? 2 : type === 'webhook' ? 2 : 1, position: [x, y], parameters, ...extra });
  const connect = (connections, from, to, output = 0) => {
    connections[from] ||= { main: [] }; connections[from].main[output] ||= [];
    connections[from].main[output].push({ node: to, type: 'main', index: 0 });
  };
  const workflow = (name, nodes, connections) => ({ name, nodes, connections, active: false,
    settings: { executionOrder: 'v1', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none', executionTimeout: 60 }, pinData: {} });
  const setup = workflow('TalentFlow v2 | 00 Setup (run once)', [
    node('Run setup', 'manualTrigger', {}, 0),
    node('Create isolated records table', 'dataTable', { resource: 'table', operation: 'create', tableName: 'talentflow_v2_records', columns: { column: ['key','kind','payload'].map(name => ({ name, type: 'string' })) }, options: { createIfNotExists: true } }, 240),
  ], { 'Run setup': { main: [[{ node: 'Create isolated records table', type: 'main', index: 0 }]] } });
  await writeFile(path.join(directory, '00_Setup.json'), JSON.stringify(setup, null, 2));
  const groups = [
    ['01_Job_Creation', ['createJob','updateJob']], ['02_Resume_Ingest', ['syncResumes','importCandidate','verifyCandidate']],
    ['03_Shortlist', ['runScreening']], ['04_HR_Decision', ['updateApplication']], ['05_Interview_Generation', ['createInterview']],
    ['06_Interview_Context', ['getInterview']], ['07_Question_Audio', ['questionAudio']],
    ['08_Interview_Evaluation', ['saveAnswer','finishInterview']], ['09_Recruiter_Report', ['recruiterReport','snapshot']],
    ['10_Website_Gateway', null],
  ];
  for (const [name, allowed] of groups) {
    const guard = `const req = $input.first().json;
const secret = ${JSON.stringify(secret)};
if (secret === '__SET_SECRET__' || secret.length < 32) throw new Error('Run npm run setup:n8n then import n8n/local-configured/ files');
if (req.headers?.['x-talentflow-secret'] !== secret) throw new Error('Unauthorized');
const body = req.body;
if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid JSON request');
const allowed = ${JSON.stringify(allowed)};
if (allowed && !allowed.includes(body.action)) throw new Error('Action not supported by this workflow');
return [{json: body}];`;
    const nodes = [
      node('Website request', 'webhook', { httpMethod: 'POST', path: name.startsWith('10_') ? 'talentflow-v2' : `talentflow-v2-${name.slice(0,2)}`, responseMode: 'responseNode', options: {} }, 0, 0, { webhookId: randomUUID() }),
      node('Authenticate before reading tables', 'code', { jsCode: guard }, 220),
      node('Read authoritative Data Table', 'dataTable', { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'name', value: 'talentflow_v2_records' }, matchType: 'allConditions', filters: { conditions: [] }, returnAll: true }, 440, 0, { alwaysOutputData: true }),
      node('Validate and plan changes', 'code', { jsCode: `${source}\ntry { return [{json: execute($('Authenticate before reading tables').first().json, $input.all().map(i => i.json))}]; } catch (error) { return [{json: {writes: [], response: {ok:false, version: VERSION, error:error.message}}}]; }` }, 660),
      node('Has records to save', 'if', { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: randomUUID(), leftValue: '={{ $json.writes.length }}', rightValue: 0, operator: { type: 'number', operation: 'gt' } }], combinator: 'and' }, options: {} }, 880),
      node('Emit records', 'code', { jsCode: "return $('Validate and plan changes').first().json.writes.map(row => ({json: row}));" }, 1100, -140),
      node('Persist records (upsert)', 'dataTable', { resource: 'row', operation: 'upsert', dataTableId: { __rl: true, mode: 'name', value: 'talentflow_v2_records' }, matchType: 'allConditions', filters: { conditions: [{ keyName: 'key', condition: 'eq', keyValue: '={{ $json.key }}' }] }, columns: { mappingMode: 'defineBelow', value: Object.fromEntries(['key','kind','payload'].map(k => [k, `={{ $json.${k} }}`])), matchingColumns: [], schema: ['key','kind','payload'].map(k => ({ id: k, displayName: k, type: 'string', required: false, defaultMatch: false, display: true, readOnly: false, removed: false })), attemptToConvertTypes: false, convertFieldsToString: false }, options: {} }, 1320, -140),
      node('Respond only after persistence', 'respondToWebhook', { respondWith: 'json', responseBody: "={{ $('Validate and plan changes').first().json.response }}", options: { responseCode: "={{ $('Validate and plan changes').first().json.response.ok ? 200 : 400 }}" } }, 1540),
      node('Read me', 'stickyNote', { content: '## TalentFlow v2 — n8n + Data Tables\nOnly external service outputs are mocked. No in-browser database.\n00 creates an isolated table. 10 contains all actions; 01–09 are optional separate endpoints.\nGenerate a private import copy with npm run setup:n8n. Publish 10.\nMock scores are demonstration-only; HR makes the final decision.\nSingle recruiter demonstration, not concurrent production hiring.', height: 280, width: 650 }, 400, -400),
    ];
    const connections = {};
    for (const [a,b] of [['Website request','Authenticate before reading tables'],['Authenticate before reading tables','Read authoritative Data Table'],['Read authoritative Data Table','Validate and plan changes'],['Validate and plan changes','Has records to save'],['Has records to save','Emit records'],['Emit records','Persist records (upsert)'],['Persist records (upsert)','Respond only after persistence']]) connect(connections,a,b);
    connect(connections, 'Has records to save','Respond only after persistence',1);
    await writeFile(path.join(directory, `${name}.json`), JSON.stringify(workflow(`TalentFlow v2 | ${name}`, nodes, connections), null, 2));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateWorkflows();
