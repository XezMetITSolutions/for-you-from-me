import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Simple static server for 'out' folder
const outDir = 'C:\\Users\\IT Admin\\Downloads\\for-you-from-me\\out';
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(outDir, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(9876, async () => {
  console.log('Test server running at http://localhost:9876');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:9876', { waitUntil: 'networkidle2' });

  console.log('Waiting for typing animation...');
  await new Promise(r => setTimeout(r, 3800));

  console.log('Checking hit element at button center...');
  const hit = await page.evaluate(() => {
    const btn = document.getElementById('btnStart');
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const el = document.elementFromPoint(cx, cy);
    return {
      btnId: btn.id,
      hitTag: el?.tagName,
      hitId: el?.id,
      hitClass: el?.className,
      isButton: el === btn
    };
  });
  console.log('Hit test result:', hit);

  console.log('Executing actual mouse click on button...');
  await page.click('#btnStart');

  console.log('Waiting for stage transition...');
  await new Promise(r => setTimeout(r, 2000));

  const afterClick = await page.evaluate(() => {
    return {
      stage0_active: document.getElementById('stage0')?.classList.contains('active'),
      stage1_active: document.getElementById('stage1')?.classList.contains('active'),
    };
  });
  console.log('Stage 1 active status:', afterClick);

  await browser.close();
  server.close();
});
