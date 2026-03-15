import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:9999/admin/test-games', { waitUntil: 'networkidle0' });
  const dimensions = await page.evaluate(() => {
    const squares = Array.from(document.querySelectorAll('.aspect-square'));
    if (squares.length === 0) return 'No squares found';
    return { 
        totalSquares: squares.length,
        rects: squares.slice(0, 3).map(sq => {
            const r = sq.getBoundingClientRect();
            return { w: r.width, h: r.height, diff: Math.abs(r.width - r.height) };
        })
    };
  });
  console.log(JSON.stringify(dimensions, null, 2));
  await browser.close();
})();
