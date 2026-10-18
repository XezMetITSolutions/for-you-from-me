import puppeteer from 'puppeteer-core';

async function testGame() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto('https://for-you-from-me.pages.dev', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Dispatching click event via evaluate...');
  const res = await page.evaluate(() => {
    const btn = document.getElementById('btnStart');
    if (!btn) return 'no btn';
    btn.click();
    return 'clicked';
  });
  console.log('Evaluate result:', res);

  await new Promise(r => setTimeout(r, 2000));

  const stageInfo = await page.evaluate(() => {
    return {
      stage0: document.getElementById('stage0')?.className,
      stage1: document.getElementById('stage1')?.className,
    };
  });
  console.log('Stages after evaluate click:', stageInfo);

  await browser.close();
}

testGame().catch(console.error);
