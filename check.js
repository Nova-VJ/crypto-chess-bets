import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER CAUGHT ERROR:', error.message));

  try {
      await page.goto('http://localhost:9999/admin/test-games', { waitUntil: 'networkidle0', timeout: 5000 });
  } catch (e) {
      console.log('Navigation error: ', e.message);
  }
  await browser.close();
})();
