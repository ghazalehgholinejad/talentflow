const actions = ['snapshot','createJob','updateJob','syncResumes','importCandidate','verifyCandidate','runScreening','updateApplication','createInterview','getInterview','saveAnswer','finishInterview','questionAudio','recruiterReport'];
export const publicActions = ['getInterview','saveAnswer','finishInterview','questionAudio'];
let queue: Promise<unknown> = Promise.resolve();

export function config() {
  return { base: process.env.N8N_BASE_URL?.trim().replace(/\/$/, '') || '', secret: process.env.N8N_WEBHOOK_SECRET?.trim() || '', mode: process.env.N8N_MODE || 'mock' };
}

export function callGateway(body: Record<string, unknown>) {
  const run = async () => {
    const { base, secret, mode } = config();
    if (!base || secret.length < 32) throw new Error('ابتدا npm run setup:n8n را اجرا کنید و فایل‌های جدید را در n8n وارد کنید.');
    if (mode !== 'mock') throw new Error('اتصال سرویس واقعی هنوز تنظیم نشده؛ N8N_MODE باید mock باشد.');
    if (!actions.includes(String(body.action))) throw new Error('عملیات ناشناخته است');
    const url = new URL(base);
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw new Error('آدرس n8n امن یا معتبر نیست');
    const secretToken = [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 65_000);
    try {
      const response = await fetch(`${url.origin}/webhook/talentflow-v2`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-talentflow-secret': secret },
        body: JSON.stringify({ ...body, requestId: body.requestId || crypto.randomUUID(), sessionToken: secretToken }),
        signal: controller.signal, redirect: 'manual',
      });
      if (response.status >= 300 && response.status < 400) throw new Error('آدرس n8n به مقصد دیگری هدایت شد؛ آدرس اصلی حساب را در setup تنظیم کنید.');
      if (response.status === 404) throw new Error('ورک‌فلو TalentFlow v2 | 10 وارد یا Publish نشده است. فایل n8n/local-configured/10_Website_Gateway.json را Import و Publish کنید؛ Listen for test event کافی نیست.');
      const raw: unknown = await response.json().catch(() => null);
      const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string,unknown> : null;
      if (!response.ok || !data?.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'n8n نتوانست عملیات را کامل کند. جدول 00، کلید اتصال و آخرین Execution ورک‌فلو 10 را بررسی کنید.');
      if (data.version !== 'talentflow-v2' || !Object.hasOwn(data,'result')) throw new Error('پاسخ نسخه قدیمی یا ناسازگار n8n دریافت شد؛ موفقیت ثبت نشد.');
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('پاسخ n8n دیر رسید؛ ممکن است داده ذخیره شده باشد. ابتدا «تازه‌سازی» را بزنید و نتیجه را بررسی کنید.');
      throw error;
    } finally { clearTimeout(timer); }
  };
  // Single-process local demo: serialize read/modify/write requests. Not a distributed lock.
  const pending = queue.then(run, run);
  queue = pending.catch(() => undefined);
  return pending;
}

export function validateLocalRequest(request: Request) {
  const url = new URL(request.url);
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) return 'این نسخه مخصوص اجرای محلی است؛ آن را عمومی منتشر نکنید.';
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return 'درخواست از مبدأ غیرمجاز است';
  if (request.method === 'POST' && !request.headers.get('content-type')?.startsWith('application/json')) return 'درخواست باید JSON باشد';
  return null;
}
