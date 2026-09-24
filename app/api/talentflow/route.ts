import { callGateway, validateLocalRequest } from '@/lib/n8n-gateway';

export async function GET(request: Request) {
  const issue = validateLocalRequest(request);
  if (issue) return Response.json({ok:false,error:issue},{status:403});
  try { return Response.json(await callGateway({action:'snapshot'}),{headers:{'Cache-Control':'no-store'}}); }
  catch(e) { return Response.json({ok:false,error:e instanceof Error ? e.message : 'اتصال برقرار نشد'},{status:503}); }
}

export async function POST(request: Request) {
  const issue = validateLocalRequest(request);
  if (issue) return Response.json({ok:false,error:issue},{status:403});
  try {
    const raw = await request.text();
    if (raw.length > 50000) return Response.json({ok:false,error:'حجم درخواست بیش از حد مجاز است'},{status:413});
    let body;
    try { body = JSON.parse(raw); } catch { return Response.json({ok:false,error:'JSON نامعتبر است'},{status:400}); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ok:false,error:'درخواست نامعتبر است'},{status:400});
    return Response.json(await callGateway(body),{headers:{'Cache-Control':'no-store'}});
  } catch(e) { return Response.json({ok:false,error:e instanceof Error ? e.message : 'عملیات ناموفق بود'},{status:502}); }
}
