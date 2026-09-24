import { callGateway, publicActions, validateLocalRequest } from '@/lib/n8n-gateway';
export async function POST(request: Request) {
  const issue = validateLocalRequest(request);
  if (issue) return Response.json({ok:false,error:issue},{status:403});
  try {
    const raw = await request.text();
    if (raw.length > 20000) return Response.json({ok:false,error:'پاسخ بیش از حد طولانی است'},{status:413});
    const body = JSON.parse(raw);
    if (!body || !publicActions.includes(body.action)) return Response.json({ok:false,error:'عملیات مجاز نیست'},{status:400});
    return Response.json(await callGateway(body),{headers:{'Cache-Control':'no-store'}});
  } catch(e) { return Response.json({ok:false,error:e instanceof Error ? e.message : 'عملیات ناموفق بود'},{status:502}); }
}
