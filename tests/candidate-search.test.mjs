import assert from 'node:assert/strict';
import test from 'node:test';
import { filterApplications, matchesSearch, normalizeSearch } from '../lib/candidate-search.ts';

const data = {
  candidates: [
    {id:'c1',name:'علي كريمي',email:'ali@example.test',skills:['Python','تحلیل داده']},
    {id:'c2',name:'سارا',email:'sara@example.test',skills:['Figma']},
  ],
  jobs:[{id:'j1',title:'مهندس داده',department:'فناوری',location:'تهران',skills:['SQL']},
    {id:'j2',title:'طراح',department:'محصول',location:'دورکار',skills:['UX']}],
  applications:[{id:'a1',candidateId:'c1',jobId:'j1',status:'suggested'},
    {id:'a2',candidateId:'c2',jobId:'j2',status:'approved'},
    {id:'a3',candidateId:'c1',jobId:'j2',status:'rejected'}],
};
const filter=(overrides={})=>filterApplications(data,{query:'',jobId:'',status:'',...overrides}).map(a=>a.id);

test('normalizes Persian letters, marks, half spaces and whitespace',()=>{
  assert.equal(normalizeSearch('  عَلِي كـريمي  '),'علی کریمی');
  assert.ok(matchesSearch('برنامه‌نویس','برنامه نویس'));
  assert.ok(matchesSearch('Python',' ＰＹＴＨＯＮ '));
});
test('combines search, job, and status without modifying source order or data',()=>{
  const before=JSON.stringify(data);
  assert.deepEqual(filter({query:'علی Python',jobId:'j1',status:'suggested'}),['a1']);
  assert.deepEqual(filter({query:'علی',jobId:'j1',status:'approved'}),[]);
  assert.equal(JSON.stringify(data),before);
});
test('searches email, skills and job information, all query terms required',()=>{
  assert.deepEqual(filter({query:'ALI@EXAMPLE.TEST SQL تهران'}),['a1']);
  assert.deepEqual(filter({query:'دورکار Figma'}),['a2']);
  assert.deepEqual(filter({query:'Python Figma'}),[]);
});
test('empty filters restore all applications and whitespace query matches all',()=>{
  assert.deepEqual(filter(),['a1','a2','a3']);
  assert.deepEqual(filter({query:'  \n '}),['a1','a2','a3']);
});
test('unknown or removed filters return no matches, never silently broaden results',()=>{
  assert.deepEqual(filter({jobId:'removed'}),[]);
  assert.deepEqual(filter({status:'unknown'}),[]);
});
test('missing candidate and job references do not crash or fabricate search matches',()=>{
  const orphan={id:'a4',candidateId:'missing',jobId:'missing',status:'suggested'};
  const snapshot={...data,applications:[orphan]};
  assert.deepEqual(filterApplications(snapshot,{query:'',jobId:'',status:''}),[orphan]);
  assert.deepEqual(filterApplications(snapshot,{query:'undefined',jobId:'',status:''}),[]);
});
test('literal punctuation is not interpreted as regex',()=>{
  assert.equal(matchesSearch('Python','.*'),false);
});
