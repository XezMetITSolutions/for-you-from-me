import puppeteer from 'puppeteer-core';

async function verifyLive() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  console.log('Opening live site...');
  await page.goto('https://for-you-from-me.pages.dev', { waitUntil: 'networkidle2' });

  console.log('Waiting 2 seconds for faster intro...');
  await new Promise(r => setTimeout(r, 2200));

  console.log('Clicking the button with mouse on live site...');
  await page.click('#btnStart');

  console.log('Waiting for stage 1 transition...');
  await new Promise(r => setTimeout(r, 1500));

  const state = await page.evaluate(() => {
    return {
      stage0: document.getElementById('stage0')?.className,
      stage1: document.getElementById('stage1')?.className,
      starCount: document.getElementById('starCount')?.innerText
    };
  });
  console.log('Live Verification Result:', state);

  await browser.close();
}

verifyLive().catch(console.error);
