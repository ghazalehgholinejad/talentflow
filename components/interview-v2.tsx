"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/talentflow-client';
import type { PublicInterview } from '@/lib/talentflow-types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

export default function InterviewV2({token}:{token:string}) {
  const [session,setSession]=useState<PublicInterview|null>(null),[index,setIndex]=useState(0),[text,setText]=useState(''),[source,setSource]=useState('typed');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[recording,setRecording]=useState(false),[audioUrl,setAudioUrl]=useState('');
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),urlRef=useRef(''),recordTimer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true);
  const load=useCallback(async()=>{
    setBusy(true);
    try {const value=await api<PublicInterview>('getInterview',{token},true);setSession(value);const next=value.questions.findIndex(q=>!value.answers.some(a=>a.questionId===q.id));const position=next<0?value.questions.length-1:next;setIndex(position);setText(value.answers.find(a=>a.questionId===value.questions[position]?.id)?.text||'');setError('');}
    catch(e){setError(e instanceof Error?e.message:'بارگذاری ناموفق');}finally{setBusy(false);}
  },[token]);
  // Fetch persisted interview state on mount; this is external synchronization.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;if(recordTimer.current)clearTimeout(recordTimer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());if(urlRef.current)URL.revokeObjectURL(urlRef.current);window.speechSynthesis?.cancel();};},[load]);
  const question=session?.questions[index];
  const dirty = !!question && text !== (session?.answers.find(a=>a.questionId===question.id)?.text || '');
  useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function selectQuestion(i:number) {
    if(!session)return;
    if(dirty&&!window.confirm('این پاسخ هنوز ذخیره نشده است. بدون ثبت، به سؤال دیگری برویم؟'))return;
    setIndex(i);setText(session.answers.find(a=>a.questionId===session.questions[i].id)?.text||'');setSource('typed');resetAudio();
  }
  const resetAudio=()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current='';setAudioUrl('');};
  async function save() {
    if(!question)return;setBusy(true);
    try {
      const value=await api<PublicInterview>('saveAnswer',{token,questionId:question.id,text,source},true);
      setSession(value);setError('');resetAudio();
      if(index<value.questions.length-1){const next=index+1;setIndex(next);setText(value.answers.find(a=>a.questionId===value.questions[next].id)?.text||'');setSource('typed');}
    } catch(e){setError(e instanceof Error?e.message:'پاسخ ذخیره نشد');}finally{setBusy(false);}
  }
  async function finish(){setBusy(true);try{const result=await api<PublicInterview>('finishInterview',{token},true);setSession(result);setError('');}catch(e){setError(e instanceof Error?e.message:'پایان مصاحبه ثبت نشد');}finally{setBusy(false);}}
  async function speak(){if(!question)return;setBusy(true);try{const result=await api<{text:string}>('questionAudio',{token,questionId:question.id},true);if(!('speechSynthesis' in window))throw new Error('مرورگر تبدیل متن به صدا ندارد؛ متن سؤال را بخوانید.');window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(result.text);utterance.lang='fa-IR';utterance.onerror=()=>setError('پخش صدای فارسی در این مرورگر در دسترس نیست؛ متن سؤال را بخوانید.');window.speechSynthesis.speak(utterance);}catch(e){setError(e instanceof Error?e.message:'پخش ناموفق');}finally{setBusy(false);}}
  async function record(){
    if(recording){recorder.current?.stop();return;}
    try {
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('ضبط صدا پشتیبانی نمی‌شود؛ پاسخ را تایپ کنید.');
      const media=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!alive.current){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;resetAudio();const chunks:BlobPart[]=[];const r=new MediaRecorder(media);recorder.current=r;
      r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      r.onstop=()=>{media.getTracks().forEach(t=>t.stop());if(recordTimer.current)clearTimeout(recordTimer.current);if(!alive.current)return;const url=URL.createObjectURL(new Blob(chunks,{type:r.mimeType}));urlRef.current=url;setAudioUrl(url);setRecording(false);};
      r.start();setRecording(true);recordTimer.current=setTimeout(()=>{if(r.state==='recording')r.stop();},120000);
    }catch(e){stream.current?.getTracks().forEach(t=>t.stop());setRecording(false);setError(e instanceof Error?e.message:'اجازه میکروفن داده نشده؛ می‌توانید تایپ کنید.');}
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:py-12"><header className="flex justify-between gap-3"><span className="text-xl font-bold">TalentFlow <span className="text-teal-600">Interview</span></span><span className="text-sm text-slate-500">مصاحبه آزمایشی</span></header>
    {error&&<div role="alert" className="rounded-xl bg-red-50 p-4 leading-8 text-red-900">{error}{!session&&<Button className="mr-3" disabled={busy} onClick={()=>void load()}>تلاش دوباره</Button>}</div>}
    {!session&&!error&&<p>در حال خواندن جلسه از n8n…</p>}
    {session&&<><div><h1 className="text-2xl font-bold">{session.jobTitle}</h1><p className="mt-3 text-slate-500">{session.candidateName} · اعتبار لینک تا {new Date(session.expiresAt).toLocaleDateString('fa-IR')}</p></div>
      {session.status==='completed'&&session.evaluation?<Card><CardHeader><CardTitle>مصاحبه و گزارش در n8n ذخیره شد</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-4xl font-bold text-teal-700">{session.evaluation.score} <span className="text-base">از ۱۰۰ · نمره ماک</span></p><p className="leading-8">{session.evaluation.summary}</p><p>نتیجه برای بررسی مسئول استخدام آماده است. این نمره به معنی قبول یا رد استخدام نیست.</p>{session.evaluation.dimensions.map(d=><div key={d.competency} className="flex justify-between border-b pb-3"><span>{d.competency}</span><span>{d.score}</span></div>)}<p className="text-sm text-slate-500">مسئول استخدام با تازه‌سازی صفحه «مصاحبه‌ها» همین گزارش را می‌بیند.</p></CardContent></Card>:<>
        <Progress value={100*session.answers.length/session.questions.length}/><p className="text-sm">{session.answers.length} از {session.questions.length} پاسخ در n8n ثبت شده است.</p>
        <div className="flex flex-wrap gap-2">{session.questions.map((q,i)=><Button key={q.id} disabled={busy||recording} variant={i===index?'default':'outline'} onClick={()=>selectQuestion(i)}>سؤال {i+1}{session.answers.some(a=>a.questionId===q.id)?' ✓':''}</Button>)}</div>
        {question&&<Card><CardHeader><p className="text-sm text-teal-700">{question.competency}</p><CardTitle className="text-xl leading-10">{question.text}</CardTitle></CardHeader><CardContent className="space-y-5"><Button variant="outline" disabled={busy||recording} onClick={()=>void speak()}>خواندن سؤال با صدای مرورگر</Button><label className="grid gap-3"><span>پاسخ شما</span><Textarea rows={7} maxLength={10000} value={text} onChange={e=>{setText(e.target.value);setSource('typed');}} placeholder="پاسخ را تایپ کنید؛ سپس «ثبت پاسخ» را بزنید."/></label><div className="rounded-xl bg-slate-50 p-4 text-sm leading-8">ضبط صدا فقط برای بازپخش روی همین صفحه است و فایل صوتی ارسال یا ذخیره نمی‌شود. بدون STT واقعی، متن پاسخ را خودتان وارد کنید یا برای نمایش، پاسخ نمونه ماک بگذارید.</div><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={()=>void record()}>{recording?'توقف ضبط':'ضبط آزمایشی (حداکثر ۲ دقیقه)'}</Button><Button variant="outline" disabled={busy||recording} onClick={()=>{setText('این پاسخ نمونه ساختگی برای آزمایش مسیر ثبت مصاحبه است. در پروژه نمونه، ابتدا مسئله را مشخص کردم، معیار موفقیت را با تیم تعیین کردم و پس از آزمایش چند راهکار، نتیجه را با داده مقایسه کردم. مسئولیت من طراحی راهکار و ارائه گزارش بود. این متن از فایل صوتی استخراج نشده و هیچ ادعای واقعی درباره سابقه داوطلب ندارد.');setSource('mock-stt');}}>قرار دادن پاسخ نمونه ماک</Button></div>{audioUrl&&<audio controls src={audioUrl} className="w-full"/>}<Button disabled={busy||recording||!text.trim()} onClick={()=>void save()}>{busy?'در حال ثبت…':'ثبت پاسخ در n8n'}</Button></CardContent></Card>}
        {dirty&&<p className="text-sm text-amber-800">متن فعلی هنوز ثبت نشده است؛ ابتدا «ثبت پاسخ در n8n» را بزنید.</p>}
        <Button className="w-full bg-teal-700" disabled={busy||recording||dirty||session.answers.length!==session.questions.length} onClick={()=>void finish()}>پایان مصاحبه و دریافت نمره ماک</Button>
      </>}
    </>}
  </main>;
}
