export async function api<T>(action: string, payload: Record<string,unknown> = {}, candidate = false): Promise<T> {
  const response = await fetch(candidate ? '/api/candidate' : '/api/talentflow', {
    method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ ...payload, action }),
  });
  const raw: unknown = await response.json().catch(()=>null);
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string,unknown> : null;
  if (!response.ok || data?.ok !== true) throw new Error(typeof data?.error === 'string' ? data.error : 'ارتباط قطع شد؛ نتیجه ذخیره‌شده را با تازه‌سازی بررسی کنید.');
  return data.result as T;
}
