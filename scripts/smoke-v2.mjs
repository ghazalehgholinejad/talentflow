// Explicit, opt-in live smoke. Creates only fictional demo records; no real mail.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base=process.argv[2];
if(!base||!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Supply local site URL, e.g. http://127.0.0.1:5174');
async function call(action,payload={},candidate=false){const r=await fetch(new URL(candidate?'/api/candidate':'/api/talentflow',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(90000)});const d=await r.json();if(!r.ok||!d.ok)throw new Error(`${action}: ${d.error||r.status}`);return d.result;}
await call('snapshot');console.log('PASS: n8n table read');
const job=await call('createJob',{requestId:randomUUID(),title:'آزمون فنی — مهندس یادگیری ماشین',department:'آزمایشی',location:'محلی',goal:'آزمون ذخیره مدل و گزارش؛ داده ساختگی',skills:'Python, PyTorch, MLOps',minExperience:3,passScore:70});
await call('updateJob',{jobId:job.id,status:'active',confirmed:true});console.log('PASS: create and activate persisted job');
await call('syncResumes');
const snapshot=await call('snapshot');
for(const c of snapshot.candidates.filter(c=>c.source==='mock-drive'))await call('verifyCandidate',{candidateId:c.id,confirmed:true});
const shortlist=await call('runScreening',{jobId:job.id,limit:2,minScore:70});assert.equal(shortlist.count,2);console.log('PASS: exactly 2 job-specific matches');
const app=await call('updateApplication',{applicationId:shortlist.applications[0].id,status:'approved',note:'تأیید آزمایشی توسط آزمون خودکار؛ فرد ساختگی'});
const token=app.session.token;
const session=await call('getInterview',{token},true);assert.equal(session.questions.length,5);
for(const q of session.questions)await call('saveAnswer',{token,questionId:q.id,text:'این متن پاسخ نمونه ساختگی برای آزمون خودکار است. ابتدا معیار موفقیت و فرض‌های مسئله را مشخص کردم، سپس راهکارها را آزمایش کردم و نتیجه را به صورت یک گزارش قابل بررسی در اختیار تیم گذاشتم. این متن برای ارزیابی یک فرد واقعی نیست و فقط مسیر ذخیره و امتیاز ماک را بررسی می‌کند.',source:'mock-stt'},true);
const finished=await call('finishInterview',{token},true);assert.equal(finished.status,'completed');assert.ok(Number.isFinite(finished.evaluation.score));
const report=await call('recruiterReport',{applicationId:app.id});assert.equal(report.session.evaluation.score,finished.evaluation.score);
assert.equal((await call('getInterview',{token},true)).answers.length,5);
assert.equal((await call('finishInterview',{token},true)).evaluation.score,finished.evaluation.score);
const rejected=await call('updateApplication',{applicationId:shortlist.applications[1].id,status:'rejected',note:'رد آزمایشی برای کنترل جلوگیری از تکرار؛ فرد ساختگی'});assert.equal(rejected.status,'rejected');
assert.equal((await call('runScreening',{jobId:job.id,limit:2,minScore:70})).count,0);
console.log('PASS: HR, interview, 5 persisted answers, final score, reload, retry, rejection guard');
console.log(JSON.stringify({jobId:job.id,applicationId:app.id,score:finished.evaluation.score,note:'Fictional test rows retained for inspection; no email sent.'}));
