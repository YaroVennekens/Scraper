import puppeteer from "puppeteer";
import fs from "fs";

function Laptop(naam, prijs, reviews, beschikbaarheid, link, processor, ram, opslag, scherm) {
  this.naam = naam;
  this.prijs = prijs;
  this.reviews = reviews;
  this.beschikbaarheid = beschikbaarheid;
  this.processor = processor;
  this.ram = ram;
  this.opslag = opslag;
  this.scherm = scherm;
  this.link = link;
}

async function scrapeLaptops() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');
  await page.goto('https://www.coolblue.be/nl/laptops/filter/besturingssysteem:macos,windows', { waitUntil: 'networkidle0' });

  const products = await page.$$eval('.product-card', (rows) => {
    return rows.map((row) => {
      const priceText = row.querySelector('.sales-price__current')?.textContent.trim() || '0';
      const prijs = parseFloat(priceText.replace('-,', '').replace('€', '').replace(',', '').replace('.', ''));
      return {
        productTitle: row.querySelector('.product-card__title')?.textContent.trim(),
        prijs: prijs,
        beschikbaarheid: row.querySelector('.icon-with-text__text')?.textContent.trim() || 'Niet beschikbaar',
        reviews: row.querySelector('.review-rating__reviews')?.textContent.trim() || 'Geen reviews',
        link: row.querySelector('.link')?.href,
      };
    });
  });
  let existingData = [];
  if (fs.existsSync('laptops.json')) {
    try {
      const fileData = fs.readFileSync('laptops.json', 'utf8');
      existingData = JSON.parse(fileData);
    } catch (error) {
      console.error('Error parsing file:', error);
    }

  for (const laptop of products) {
    await page.goto(laptop.link, { waitUntil: 'networkidle0' });
    const ram = await page.$eval('.data-table__table tr:nth-child(3) td:nth-child(2)', el => el.textContent.trim().replace('GB', ''));
    const processor = await page.$eval('.data-table__table tr:nth-child(2) td:nth-child(2)', el => el.textContent.trim());
    const scherm = await page.$eval('.data-table__table tr:nth-child(1) td:nth-child(2)', el => el.textContent.trim());
    const opslag = await page.$eval('.data-table__table tr:nth-child(4) td:nth-child(2)', el => el.textContent.trim());

    const laptopData = new Laptop(
        laptop.productTitle,
        laptop.prijs,
        laptop.reviews,
        laptop.beschikbaarheid,
        laptop.link,
        processor,
        ram,
        opslag,
        scherm
    );
    existingData.push(laptopData);
  }

  const filterLaptops = existingData.filter((laptopData) => {
    let prijs = (parseInt(laptopData.prijs));
    let ram = (parseInt(laptopData.ram));
    return (prijs >= 750 && !(prijs > 2000) && (ram >= 16)) ;
  });
  console.log('Done fatching data');
  fs.writeFileSync(filePath, JSON.stringify(filterLaptops, null, 2));

  await browser.close();
}

export { scrapeLaptops };}
