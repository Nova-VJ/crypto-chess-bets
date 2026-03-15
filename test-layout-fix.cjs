const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 }); // Standard monitor size
  await page.goto('http://localhost:9999/admin/test-games', { waitUntil: 'networkidle0' });
  
  const screenshotPath = 'C:\\Users\\patri\\.gemini\\antigravity\\brain\\e76a571e-9bc7-43d9-8e59-1e7cf5356136\\check_layout_fix.webp';
  await page.screenshot({ path: screenshotPath, type: 'webp', quality: 90 });
  
  console.log('Verification image saved to: ' + screenshotPath);
  await browser.close();
})();
