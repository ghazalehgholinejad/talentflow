import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { execute, ACTIONS } from '../n8n/source/engine.mjs';

const token='a'.repeat(64), now='2026-09-11T12:00:00.000Z';
function harness(){const table=new Map();return {table, run(action,payload={}){const plan=execute({action,requestId:randomUUID(),sessionToken:token,...payload},[...table.values()],{now});for(const row of plan.writes)table.set(row.key,row);return plan.response.result;}};}
function setup(){const h=harness();const job=h.run('createJob',{title:'ML Engineer',department:'Tech',location:'Remote',goal:'Deploy model',skills:'Python, PyTorch, MLOps',minExperience:3});h.run('updateJob',{jobId:job.id,status:'active',confirmed:true});h.run('syncResumes');for(const c of h.run('snapshot').candidates)h.run('verifyCandidate',{candidateId:c.id,confirmed:true});return {h,job};}

test('full lifecycle persists 2 matches, HR session, five answers, score and report',()=>{
  const {h,job}=setup();const short=h.run('runScreening',{jobId:job.id,limit:2,minScore:70});assert.equal(short.count,2);
  assert.notEqual(short.applications[0].id,short.applications[1].id);
  let app=h.run('updateApplication',{applicationId:short.applications[0].id,status:'approved',note:'Demo HR approval'});
  assert.equal(app.invitation.status,'simulated');assert.equal(app.session.questions.length,5);
  assert.match(app.session.questions[0].text,/Python/);
  assert.equal(h.run('getInterview',{token}).candidateName,'داوطلب آزمایشی یک');
  for(const q of app.session.questions)h.run('saveAnswer',{token,questionId:q.id,text:'پاسخ آزمایشی با شواهد مرتبط برای آزمایش ثبت پاسخ و نمره در جدول n8n'});
  const completed=h.run('finishInterview',{token});assert.equal(completed.status,'completed');assert.ok(completed.evaluation.score>=0&&completed.evaluation.score<=100);
  assert.equal(h.run('recruiterReport',{applicationId:app.id}).session.evaluation.score,completed.evaluation.score);
  assert.deepEqual(h.run('finishInterview',{token}),completed);
  app=h.run('updateApplication',{applicationId:app.id,status:'hired',note:'Demo final human review'});assert.equal(app.status,'hired');
  assert.equal(h.run('snapshot').applications[0].status,'hired');
});
test('no initial fake data; sample ingestion and job request retries are idempotent',()=>{
  const h=harness();assert.deepEqual(h.run('snapshot'),{jobs:[],candidates:[],applications:[]});
  assert.equal(h.run('syncResumes').count,3);assert.equal(h.run('syncResumes').count,0);
  const p={requestId:'fixed',title:'Designer',department:'Design',location:'Remote',goal:'Design',skills:'Figma'};
  assert.equal(h.run('createJob',p).id,h.run('createJob',p).id);assert.equal(h.run('snapshot').jobs.length,1);
});
test('screening requires active job and human-reviewed resumes',()=>{
  const h=harness(),job=h.run('createJob',{title:'ML',department:'Tech',location:'Remote',goal:'Goal',skills:'Python'});
  assert.throws(()=>h.run('runScreening',{jobId:job.id,limit:2,minScore:0}),/تأیید/);
  h.run('updateJob',{jobId:job.id,status:'active',confirmed:true});h.run('syncResumes');
  assert.equal(h.run('runScreening',{jobId:job.id,limit:2,minScore:0}).count,0);
});
test('shortlist is job-specific; rejected candidates never reappear for same job',()=>{
  const {h,job}=setup();const short=h.run('runScreening',{jobId:job.id,limit:2,minScore:70});
  h.run('updateApplication',{applicationId:short.applications[0].id,status:'rejected',note:'Not a fit'});
  assert.equal(h.run('runScreening',{jobId:job.id,limit:2,minScore:70}).count,0);
  const designer=h.run('createJob',{title:'Designer',department:'Design',location:'Remote',goal:'Design',skills:'Figma, UX Research, Design Systems'});
  h.run('updateJob',{jobId:designer.id,status:'active',confirmed:true});
  const result=h.run('runScreening',{jobId:designer.id,limit:2,minScore:70});
  assert.equal(result.count,1);assert.equal(result.applications[0].candidateId,'demo_design');
});
test('token boundary, unanswered questions, and illegal decisions reject without writes',()=>{
  const {h,job}=setup();const a=h.run('runScreening',{jobId:job.id,limit:1,minScore:70}).applications[0];
  assert.throws(()=>h.run('createInterview',{applicationId:a.id}),/تأیید/);
  assert.throws(()=>h.run('updateApplication',{applicationId:a.id,status:'hired',note:'wrong'}),/مجاز/);
  assert.throws(()=>h.run('updateApplication',{applicationId:a.id,status:'approved',note:''}),/معتبر/);
  const app=h.run('updateApplication',{applicationId:a.id,status:'approved',note:'Reviewed'});
  const before=JSON.stringify([...h.table]);
  for(const action of ['getInterview','saveAnswer','finishInterview','questionAudio'])assert.throws(()=>h.run(action,{token:'b'.repeat(64)}),/نامعتبر/);
  assert.throws(()=>h.run('finishInterview',{token}),/همه/);
  assert.throws(()=>h.run('saveAnswer',{token,questionId:'bad',text:'hello'}),/سؤال/);
  assert.equal(JSON.stringify([...h.table]),before);
  const publicView=h.run('getInterview',{token});assert.equal(publicView.token,undefined);assert.equal(publicView.email,undefined);assert.equal(publicView.history,undefined);
  assert.equal(h.run('updateApplication',{applicationId:a.id,status:'approved',note:'Again'}).session.id,app.session.id);
});
test('answers resume after reload; repeated save updates not duplicates; completed answers immutable',()=>{
  const {h,job}=setup();const a=h.run('runScreening',{jobId:job.id,limit:1,minScore:70}).applications[0];
  const app=h.run('updateApplication',{applicationId:a.id,status:'approved',note:'Reviewed'});
  h.run('saveAnswer',{token,questionId:'q1',text:'First'});h.run('saveAnswer',{token,questionId:'q1',text:'Updated'});
  assert.equal(h.run('getInterview',{token}).answers.length,1);assert.equal(h.run('getInterview',{token}).answers[0].text,'Updated');
  for(const q of app.session.questions)h.run('saveAnswer',{token,questionId:q.id,text:'Answer text'});
  h.run('finishInterview',{token});assert.throws(()=>h.run('saveAnswer',{token,questionId:'q1',text:'Cheat'}),/پایان/);
  assert.throws(()=>execute({action:'getInterview',token},[...h.table.values()],{now:'2026-10-01T00:00:00Z'}),/اعتبار/);
});
test('validation rejects empty skills, invalid input, duplicate emails and prototype actions',()=>{
  const {h,job}=setup();assert.throws(()=>h.run('toString'),/ناشناخته/);
  for(const limit of [0,41,NaN,1.5])assert.throws(()=>h.run('runScreening',{jobId:job.id,minScore:0,limit}));
  assert.throws(()=>h.run('createJob',{title:'X',department:'X',location:'X',skills:'',goal:'X'}),/مهارت/);
  const p={name:'Test',email:'test@example.com',skills:'Python',experience:1,resumeText:'Demo only'};
  h.run('importCandidate',p);assert.throws(()=>h.run('importCandidate',p),/قبلاً/);
  assert.throws(()=>h.run('importCandidate',{...p,email:'bad'}),/ایمیل/);
});
test('all generated graphs compile, authorize before table reads, and persist before success',async()=>{
  const files=(await readdir(new URL('../n8n/release-v2/',import.meta.url))).filter(f=>f.endsWith('.json'));
  assert.equal(files.length,11);
  for(const file of files){
    const wf=JSON.parse(await readFile(new URL('../n8n/release-v2/'+file,import.meta.url),'utf8'));
    const names=new Set(wf.nodes.map(n=>n.name));assert.equal(names.size,wf.nodes.length);
    for(const connection of Object.values(wf.connections))for(const branch of connection.main)for(const edge of branch)assert.ok(names.has(edge.node));
    for(const n of wf.nodes.filter(n=>n.type==='n8n-nodes-base.code'))new vm.Script(`(function(){${n.parameters.jsCode}\n})`);
    if(file.startsWith('00'))continue;
    assert.equal(wf.connections['Website request'].main[0][0].node,'Authenticate before reading tables');
    assert.equal(wf.connections['Persist records (upsert)'].main[0][0].node,'Respond only after persistence');
    assert.equal(wf.nodes.find(n=>n.name==='Read authoritative Data Table').alwaysOutputData,true);
    const planner=wf.nodes.find(n=>n.name==='Validate and plan changes').parameters.jsCode;
    const result=vm.runInNewContext(`(function(){${planner}})()`,{$input:{all:()=>[]},$:()=>({first:()=>({json:{action:'snapshot'}})}),structuredClone});
    assert.equal(result[0].json.response.ok,true);
    assert.equal(result[0].json.response.result.jobs.length,0);
    const auth=wf.nodes.find(n=>n.name==='Authenticate before reading tables').parameters.jsCode;
    assert.throws(()=>vm.runInNewContext(`(function(){${auth}})()`,{$input:{first:()=>({json:{headers:{},body:{action:'snapshot'}}})}}),/setup/);
    assert.ok(ACTIONS.every(a=>planner.includes(a)));
  }
});
