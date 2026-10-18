import puppeteer from 'puppeteer-core';

async function checkClickTarget() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  await page.goto('https://for-you-from-me.pages.dev', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 4000));

  const target = await page.evaluate(() => {
    const btn = document.getElementById('btnStart');
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const elAtPoint = document.elementFromPoint(cx, cy);
    return {
      btnId: btn.id,
      elAtPointTag: elAtPoint?.tagName,
      elAtPointId: elAtPoint?.id,
      elAtPointClass: elAtPoint?.className,
      isSame: elAtPoint === btn
    };
  });
  console.log('Element at button coordinates:', target);

  await browser.close();
}

checkClickTarget().catch(console.error);
