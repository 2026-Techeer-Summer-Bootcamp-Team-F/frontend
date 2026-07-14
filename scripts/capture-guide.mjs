import { chromium } from 'playwright';

const TOKEN = process.env.TOKEN;
const BASE  = 'http://localhost:5173';

// 튜토리얼 + 스크린샷 설정
const LS = {
  hackie_token:          TOKEN,
  tutorial_done_repos:   'true',
  tutorial_done_analysis:'true',
  tutorial_done_report:  'true',
};

const SHOTS = [
  { file: 'step01-login.png',      url: '/',                        auth: false, delay: 800  },
  { file: 'step02-repos.png',      url: '/repos',                   auth: true,  delay: 2000 },
  { file: 'step03-agreement.png',  url: '/agreement?repo=demo-org%2Fcustomer-support-bot&url=https%3A%2F%2Fgithub.com%2Fdemo-org%2Fcustomer-support-bot', auth: true, delay: 800 },
  { file: 'step04-register.png',   url: '/projects/new',            auth: true,  delay: 800  },
  { file: 'step05-report.png',     url: '/report/46',               auth: true,  delay: 3000 },
];

const browser = await chromium.launch({ headless: true });

for (const shot of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

  // localStorage 세팅 (auth 필요한 페이지)
  if (shot.auth) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(ls => {
      for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
    }, LS);
  }

  await page.goto(BASE + shot.url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(shot.delay);

  const outPath = `D:/Techeer BootCamp/frontend/public/guide/${shot.file}`;
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`✓ ${shot.file}`);
  await ctx.close();
}

await browser.close();
console.log('완료');
