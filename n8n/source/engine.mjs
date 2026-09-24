// This module executes INSIDE n8n Code nodes. The website never runs business logic.
// Pure planning: Data Table nodes perform every read/write before HTTP success.
export const VERSION = 'talentflow-v2';
export const ACTIONS = ['snapshot', 'createJob', 'updateJob', 'syncResumes', 'importCandidate', 'verifyCandidate', 'runScreening', 'updateApplication', 'createInterview', 'getInterview', 'saveAnswer', 'finishInterview', 'questionAudio', 'recruiterReport'];

export function execute(input, rows, context = {}) {
  const now = context.now || new Date().toISOString();
  const writes = new Map();
  const records = new Map();
  for (const row of rows) {
    if (!row.key) continue; // n8n alwaysOutputData empty sentinel
    if (records.has(row.key)) throw new Error('Duplicate record key: repair the table before continuing');
    const parsed = JSON.parse(row.payload);
    records.set(row.key, { kind: row.kind, data: parsed });
  }
  const error = (message) => { throw new Error(message); };
  const str = (value, label, max = 1000) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max) error(`مقدار «${label}» معتبر نیست`);
    return value.trim();
  };
  const number = (value, min, max, label) => {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) error(`مقدار «${label}» باید بین ${min} و ${max} باشد`);
    return Number(value);
  };
  const list = (value) => (Array.isArray(value) ? value : String(value || '').split(/[,،\n]/)).map(x => String(x).trim()).filter(Boolean).slice(0, 30);
  const all = (kind) => [...records.values()].filter(x => x.kind === kind).map(x => x.data);
  const get = (kind, id) => {
    const row = records.get(`${kind}:${id}`);
    return row?.kind === kind ? JSON.parse(JSON.stringify(row.data)) : error('رکورد پیدا نشد؛ صفحه را تازه کنید');
  };
  const save = (kind, data) => {
    data.updatedAt = now;
    const row = { key: `${kind}:${data.id}`, kind, payload: JSON.stringify(data) };
    writes.set(row.key, row);
    records.set(row.key, { kind, data });
    return data;
  };
  const event = (record, action, note = '') => {
    record.history ||= [];
    record.history.push({ at: now, action, note });
  };
  const requestId = () => str(input.requestId, 'شناسه درخواست', 100);
  const makeId = (prefix) => `${prefix}_${requestId()}`;
  const pairId = (jobId, candidateId) => `${jobId}~${candidateId}`;
  const snapshot = () => ({ jobs: all('job'), candidates: all('candidate'), applications: all('application') });
  const applicationView = (app) => ({ ...app, candidate: get('candidate', app.candidateId), job: get('job', app.jobId) });
  const authenticateInterview = () => {
    const token = str(input.token, 'لینک مصاحبه', 128);
    if (token.length < 32) error('لینک مصاحبه معتبر نیست');
    const app = all('application').find(a => a.session?.token === token);
    if (!app || !['approved', 'interviewed', 'hired', 'rejected_after_interview'].includes(app.status)) error('لینک مصاحبه نامعتبر یا لغو شده است');
    if (Date.parse(app.session.expiresAt) < Date.parse(now)) error('اعتبار لینک مصاحبه تمام شده است');
    return JSON.parse(JSON.stringify(app));
  };
  const publicInterview = (app) => ({
    id: app.session.id, candidateName: get('candidate', app.candidateId).name,
    jobTitle: get('job', app.jobId).title, status: app.session.status,
    questions: app.session.questions, answers: app.session.answers,
    evaluation: app.session.evaluation || null, expiresAt: app.session.expiresAt,
  });
  const questions = (candidate, job) => [
    { id: 'q1', competency: 'تجربه مرتبط', text: `برای نقش «${job.title}»، یک پروژه مرتبط با ${job.skills[0]} را با سهم شخصی و نتیجه قابل‌اندازه‌گیری توضیح دهید.` },
    { id: 'q2', competency: 'مهارت تخصصی', text: `در رزومه شما مهارت ${candidate.skills[0] || job.skills[0]} آمده است. یک تصمیم فنی دشوار درباره آن و دلیل انتخاب خود را شرح دهید.` },
    { id: 'q3', competency: 'حل مسئله', text: `برای رسیدن به هدف «${job.goal}» با داده یا اطلاعات ناقص چه فرض‌هایی را ابتدا آزمایش می‌کنید؟` },
    { id: 'q4', competency: 'همکاری', text: 'یک اختلاف حرفه‌ای در تیم را شرح دهید؛ چه کردید و نتیجه چه شد؟' },
    { id: 'q5', competency: 'برنامه اجرایی', text: `در ۹۰ روز اول نقش ${job.title} چه خروجی مشخص و قابل‌سنجشی تحویل می‌دهید؟` },
  ];
  const provisionSession = (app) => {
    if (app.session) return app;
    const token = str(input.sessionToken, 'توکن تصادفی جلسه', 128);
    if (!/^[a-f0-9]{64}$/.test(token)) error('توکن امن جلسه ارسال نشده است');
    const candidate = get('candidate', app.candidateId), job = get('job', app.jobId);
    app.session = { id: `session_${app.id}`, token, status: 'ready', createdAt: now,
      expiresAt: new Date(Date.parse(now) + 7 * 86400000).toISOString(),
      questions: questions(candidate, job), answers: [], evaluation: null, provider: 'mock' };
    app.invitation = { provider: 'mock', status: 'simulated', to: candidate.email, at: now,
      subject: `دعوت به مصاحبه ${job.title}`, message: 'ارسال ایمیل شبیه‌سازی شده است؛ لینک را از سایت باز یا کپی کنید.' };
    event(app, 'interview_created', 'پرسش‌های ماک ساخته شد؛ ایمیل واقعی ارسال نشد');
    return app;
  };
  if (!ACTIONS.includes(input.action)) error('عملیات ناشناخته است');
  let result;
  switch (input.action) {
    case 'snapshot': result = snapshot(); break;
    case 'createJob': {
      const id = makeId('job');
      if (records.has(`job:${id}`)) { result = get('job', id); break; }
      const title = str(input.title, 'عنوان شغل', 150), skills = list(input.skills);
      if (!skills.length) error('حداقل یک مهارت ضروری وارد کنید');
      const goal = str(input.goal, 'هدف شغل', 2000);
      result = save('job', { id, title, department: str(input.department, 'واحد', 150),
        location: str(input.location, 'محل همکاری', 200), goal, skills,
        minExperience: number(input.minExperience ?? 0, 0, 50, 'سابقه'),
        passScore: number(input.passScore ?? 70, 0, 100, 'حدنصاب مصاحبه'),
        description: `شرح شغل آزمایشی: ${title}\nهدف: ${goal}\nمهارت‌های ضروری: ${skills.join('، ')}\nاین متن توسط الگوی ماک تولید شده و نیازمند تأیید مسئول استخدام است.`,
        status: 'draft', rubricVersion: 'mock-skill-overlap-v1', provider: 'mock', createdAt: now,
        history: [{ at: now, action: 'draft_created' }] }); break;
    }
    case 'updateJob': {
      const job = get('job', input.jobId);
      if (!['active', 'closed'].includes(input.status)) error('وضعیت شغل نامعتبر است');
      if (input.status === 'active' && input.confirmed !== true) error('تأیید انسانی شرح شغل لازم است');
      job.status = input.status; event(job, 'job_status', input.status); result = save('job', job); break;
    }
    case 'syncResumes': {
      // Only the external Drive/LLM output is simulated; these rows are persisted.
      const samples = [
        ['demo_ml_1', 'داوطلب آزمایشی یک', 'demo.one@example.com', ['Python', 'PyTorch', 'MLOps', 'SQL', 'Docker', 'FastAPI'], 6],
        ['demo_ml_2', 'داوطلب آزمایشی دو', 'demo.two@example.com', ['Python', 'PyTorch', 'MLOps', 'SQL', 'React', 'Figma'], 4],
        ['demo_design', 'داوطلب آزمایشی سه', 'demo.three@example.com', ['Figma', 'UX Research', 'Design Systems'], 3],
      ];
      const added = [];
      for (const [id, name, email, skills, experience] of samples) {
        if (records.has(`candidate:${id}`)) continue;
        added.push(save('candidate', { id, name, email, skills, experience, verified: false,
          resumeText: `رزومه نمونه ساختگی. مهارت‌ها: ${skills.join('، ')}. سابقه ادعایی ${experience} سال.`,
          source: 'mock-drive', createdAt: now, history: [{ at: now, action: 'mock_ingest' }] }));
      }
      result = { count: added.length, candidates: added }; break;
    }
    case 'importCandidate': {
      const email = str(input.email, 'ایمیل', 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error('ایمیل معتبر نیست');
      if (all('candidate').some(c => c.email === email)) error('رزومه این ایمیل قبلاً ثبت شده است');
      const skills = list(input.skills); if (!skills.length) error('مهارت‌ها را وارد کنید');
      result = save('candidate', { id: makeId('candidate'), name: str(input.name, 'نام', 150), email, skills,
        experience: number(input.experience, 0, 50, 'سابقه'), resumeText: str(input.resumeText, 'متن رزومه', 30000),
        verified: false, source: 'manual-text', createdAt: now, history: [{ at: now, action: 'manual_ingest' }] }); break;
    }
    case 'verifyCandidate': {
      const candidate = get('candidate', input.candidateId);
      if (input.confirmed !== true) error('تأیید اطلاعات رزومه لازم است');
      candidate.verified = true; event(candidate, 'human_verified'); result = save('candidate', candidate); break;
    }
    case 'runScreening': {
      const job = get('job', input.jobId);
      if (job.status !== 'active') error('ابتدا شرح شغل را تأیید و فعال کنید');
      const limit = number(input.limit, 1, 40, 'تعداد خروجی');
      if (!Number.isInteger(limit)) error('تعداد خروجی باید عدد صحیح باشد');
      const minScore = number(input.minScore, 0, 100, 'حداقل امتیاز');
      const candidates = all('candidate').filter(c => c.verified && !records.has(`application:${pairId(job.id, c.id)}`));
      const ranked = candidates.map(c => {
        const found = job.skills.filter(s => c.skills.some(cs => cs.toLowerCase() === s.toLowerCase()));
        const missing = job.skills.filter(s => !found.includes(s));
        const score = Math.round(80 * found.length / job.skills.length + 20 * (job.minExperience === 0 ? 1 : Math.min(1, c.experience / job.minExperience)));
        return { c, found, missing, score };
      }).filter(x => x.score >= minScore).sort((a,b) => b.score - a.score || a.c.id.localeCompare(b.c.id)).slice(0, limit);
      const applications = ranked.map(({c, found, missing, score}) => save('application', {
        id: pairId(job.id, c.id), jobId: job.id, candidateId: c.id, status: 'suggested', createdAt: now,
        screening: { score, matchedSkills: found, missingSkills: missing, minScore, limit,
          rubricVersion: job.rubricVersion, provider: 'mock', note: 'امتیاز آزمایشی تطبیق واژه‌ای مهارت‌ها؛ ارزیابی واقعی AI نیست.' },
        history: [{ at: now, action: 'shortlisted' }], session: null, invitation: null,
      }));
      result = { count: applications.length, applications, note: applications.length ? 'فهرست در جدول ذخیره شد' : 'داوطلب جدید واجد شرایط نیست؛ تأیید رزومه، حدنصاب و سابقه بررسی همین شغل را کنترل کنید.' }; break;
    }
    case 'updateApplication': {
      const app = get('application', input.applicationId);
      const status = input.status;
      if (!['approved', 'rejected', 'hired', 'rejected_after_interview'].includes(status)) error('تصمیم نامعتبر است');
      if (app.status === status) { result = app; break; }
      const allowed = app.status === 'suggested' ? ['approved','rejected'] : app.status === 'interviewed' ? ['hired','rejected_after_interview'] : [];
      if (!allowed.includes(status)) error('این تغییر وضعیت مجاز نیست');
      const note = str(input.note, 'دلیل تصمیم مسئول استخدام', 2000);
      app.status = status; app.decisionNote = note; event(app, status, note);
      if (status === 'approved') provisionSession(app);
      result = save('application', app); break;
    }
    case 'createInterview': {
      const app = get('application', input.applicationId);
      if (app.status !== 'approved') error('مصاحبه فقط بعد از تأیید مسئول استخدام ساخته می‌شود');
      result = save('application', provisionSession(app)); break;
    }
    case 'getInterview': result = publicInterview(authenticateInterview()); break;
    case 'questionAudio': {
      const app = authenticateInterview(), q = app.session.questions.find(q => q.id === input.questionId);
      if (!q) error('سؤال نامعتبر است');
      result = { text: q.text, language: 'fa-IR', provider: 'browser-speech', mock: true }; break;
    }
    case 'saveAnswer': {
      const app = authenticateInterview(), session = app.session;
      if (session.status === 'completed') error('مصاحبه پایان یافته و پاسخ‌ها قابل تغییر نیستند');
      if (!session.questions.some(q => q.id === input.questionId)) error('سؤال نامعتبر است');
      const text = str(input.text, 'پاسخ', 10000);
      const answer = { questionId: input.questionId, text, at: now, source: input.source === 'mock-stt' ? 'mock-stt' : 'typed' };
      session.answers = [...session.answers.filter(a => a.questionId !== answer.questionId), answer];
      session.status = 'in_progress'; event(app, 'answer_saved', answer.questionId);
      save('application', app); result = publicInterview(app); break;
    }
    case 'finishInterview': {
      const app = authenticateInterview(), session = app.session;
      if (session.status === 'completed') { result = publicInterview(app); break; }
      if (session.answers.length !== session.questions.length || session.questions.some(q => !session.answers.some(a => a.questionId === q.id))) error('ابتدا پاسخ همه سؤال‌ها را ثبت کنید');
      // Deliberately explicit mock: length-based score is NOT an employment assessment.
      const dimensions = session.questions.map(q => {
        const answer = session.answers.find(a => a.questionId === q.id);
        const wordCount = answer.text.split(/\s+/).length;
        return { competency: q.competency, score: Math.min(95, 40 + Math.min(55, wordCount)), evidence: answer.text.slice(0, 160) };
      });
      const score = Math.round(dimensions.reduce((n,d) => n + d.score, 0) / dimensions.length);
      session.evaluation = { score, dimensions, provider: 'mock', rubricVersion: 'mock-answer-length-v1',
        threshold: get('job', app.jobId).passScore, aboveThreshold: score >= get('job', app.jobId).passScore,
        summary: 'نمره نمایشی بر اساس طول پاسخ‌ها است، نه کیفیت یا شایستگی فرد. تصمیم استخدام فقط با مسئول انسانی است.', at: now };
      session.status = 'completed'; session.completedAt = now; app.status = 'interviewed';
      event(app, 'interview_completed', 'گزارش ماک ذخیره شد؛ در انتظار تصمیم انسانی');
      save('application', app); result = publicInterview(app); break;
    }
    case 'recruiterReport': result = input.applicationId ? applicationView(get('application', input.applicationId)) : { applications: all('application').map(applicationView) }; break;
  }
  return { writes: [...writes.values()], response: { ok: true, version: VERSION, mock: true, result } };
}
