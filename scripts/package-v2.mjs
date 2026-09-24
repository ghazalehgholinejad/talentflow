import { mkdtemp, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const portfolio=process.argv.includes('--portfolio');
const temporary=await mkdtemp(path.join(tmpdir(),'talentflow-release-'));
const target=path.join(temporary,'TalentFlow-v2');await mkdir(target);
const includes=['package.json','package-lock.json','tsconfig.json','next.config.ts','vite.config.ts','postcss.config.mjs','eslint.config.mjs','components.json','drizzle.config.ts','worker-configuration.d.ts','.env.example','.gitignore','.openai/hosting.json','README.md','START_HERE_FA.md','RUN_TALENTFLOW.command',
  'app','build','worker','db','drizzle','vendor','public','hooks','components/ui','components/talentflow-v2.tsx','components/interview-v2.tsx',
  'lib/utils.ts','lib/n8n-gateway.ts','lib/talentflow-client.ts','lib/talentflow-types.ts',
  'scripts/build-verified.sh','scripts/sites-env.sh','scripts/install-ci.sh','scripts/configure-v2.mjs','scripts/generate-v2-workflows.mjs','scripts/smoke-v2.mjs','scripts/package-v2.mjs',
  'n8n/source','n8n/release-v2','tests','docs/RUN_V2_FA.md','docs/ARCHITECTURE_V2.md','docs/VERIFICATION_V2.md',
  'docs/RESUME.md','docs/TECHNICAL_WALKTHROUGH_FA.md','docs/GITHUB_PREPARATION_FA.md','docs/ROADMAP.md'];
for(const relative of includes){await mkdir(path.dirname(path.join(target,relative)),{recursive:true});await cp(path.join(root,relative),path.join(target,relative),{recursive:true,filter:p=>!p.endsWith('.DS_Store')});}
// A source archive should not carry the original hosting project's identity.
const hostingPath=path.join(target,'.openai/hosting.json');
const hosting=JSON.parse(await readFile(hostingPath,'utf8'));
delete hosting.project_id;
await writeFile(hostingPath,JSON.stringify(hosting,null,2)+'\n');
const local=await readFile('.env.local','utf8').catch(()=>'');
const secrets=local.split('\n').filter(l=>l.startsWith('N8N_WEBHOOK_SECRET=')).map(l=>l.slice(l.indexOf('=')+1)).filter(Boolean);
async function inspect(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const p=path.join(directory,entry.name);if(entry.isDirectory())await inspect(p);else{const content=await readFile(p);for(const secret of secrets)if(content.includes(Buffer.from(secret)))throw new Error('Secret detected in archive staging');}}}
await inspect(target);
const output=path.join(root,portfolio?'TalentFlow-Portfolio-Source.zip':'TalentFlow-v2-Source.zip');
execFileSync('zip',['-qr','-FS',output,'TalentFlow-v2'],{cwd:temporary});
execFileSync('unzip',['-tq',output],{stdio:'inherit'});
console.log(output);console.log('Staging retained for clean-build verification: '+target);
