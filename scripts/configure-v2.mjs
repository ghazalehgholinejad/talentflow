import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { generateWorkflows } from './generate-v2-workflows.mjs';

let previous = '';
try { previous = await readFile('.env.local', 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const current = Object.fromEntries(previous.split('\n').filter(line => /^[A-Z_]+=/.test(line)).map(line => [line.slice(0,line.indexOf('=')), line.slice(line.indexOf('=')+1)]));
const argument = process.argv.indexOf('--url');
let answer;
if (argument !== -1) answer = process.argv[argument + 1];
else {
  const rl = createInterface({ input, output });
  answer = (await rl.question(`آدرس اصلی n8n Cloud${current.N8N_BASE_URL ? ` [${current.N8N_BASE_URL}]` : ''}: `)).trim() || current.N8N_BASE_URL;
  rl.close();
}
let url;
try { url = new URL(answer); } catch { console.error('آدرس معتبر نیست.'); process.exit(1); }
if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))) {
  console.error('آدرس باید HTTPS یا HTTP روی localhost باشد و شامل نام کاربری یا رمز نباشد.'); process.exit(1);
}
const secret = current.N8N_WEBHOOK_SECRET?.length >= 32 ? current.N8N_WEBHOOK_SECRET : randomBytes(32).toString('hex');
const updates = { N8N_BASE_URL: url.origin, N8N_MODE: 'mock', N8N_WEBHOOK_SECRET: secret };
const remaining = previous.split('\n').filter(line => !Object.keys(updates).some(k => line.startsWith(`${k}=`))).join('\n').trim();
await writeFile('.env.local', `${remaining ? remaining+'\n' : ''}${Object.entries(updates).map(([k,v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
await generateWorkflows({ secret, directory: 'n8n/local-configured' });
console.log('تنظیمات ذخیره شد. کلید محرمانه روی صفحه نمایش داده نمی‌شود.');
console.log('در n8n فایل‌های n8n/local-configured/00_Setup.json و 10_Website_Gateway.json را Import کن.');
console.log('00: Execute workflow. سپس 10: Publish (یا Active در نسخه قدیمی).');
console.log('فایل‌های local-configured و .env.local محرمانه‌اند؛ برای دیگران نفرست.');
console.log('اجرا: npm run dev — سپس در سایت «بررسی اتصال» را بزن.');
