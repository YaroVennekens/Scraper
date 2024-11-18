import puppeteer from "puppeteer";
import fs from "fs";

function Woning(Link, typeWoning, Locatie, Prijs, woningOppervlakte, slaapkamers, badkamers, perceel, epc, bouwjaar) {
    this.Link = Link;
    this.typeWoning = typeWoning;
    this.Locatie = Locatie;
    this.Prijs = Prijs;
    this.woningOppervlakte = woningOppervlakte;
    this.slaapkamers = slaapkamers;
    this.badkamers = badkamers;
    this.perceel = perceel;
    this.epc = epc;
    this.bouwjaar = bouwjaar;
}

async function scrapeDomestic() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36');

    await page.goto('https://www.domestic.be/nl/te-koop/woningen', { waitUntil: 'networkidle0' });

    const woningen = await page.$$eval('.grid-content', (rows) => {
        return rows.map((row) => {
            const typeWoning = row.querySelector('.category')?.innerText || null;
            const city = row.querySelector('.city')?.innerText || null;
            const price = row.querySelector('.price')?.textContent.trim().replace('€', '').replace('.', '') || 'De prijs is niet vermeld';
            const woningOppervlakte = row.querySelector('.area')?.innerText.replace('m²', '').replace('.', '') || 'De woning oppervlakte is niet vermeld';
            const slaapKamers = row.querySelector('.rooms')?.innerText.replace('\n', '').replace('kamers', '') || 'Aantal slaapkamers is niet veremeld';
            const badKamers = row.querySelector('.bathrooms')?.innerText.replace('\n', '').replace('badkamers', '') || 'Aantal badkamers is niet vermeld';
            const perceel = row.querySelector('.groundarea')?.innerText.replace('m²', '').replace('.', '') || 'Bouwgrond oppervlakte is niet vermeld';
            const link = row.querySelector('.property-contents')?.href || null;

            return {
                Link: link,
                typeWoning: typeWoning,
                Locatie: city,
                Prijs: price,
                woningOppervlakte: woningOppervlakte,
                slaapkamers: slaapKamers,
                badkamers: badKamers,
                perceel: perceel
            };
        });
    });

    let bestaandeData = [];
    if (fs.existsSync('domestic.json')) {
        try {
            const fileData = fs.readFileSync('domestic.json', 'utf8');
            bestaandeData = JSON.parse(fileData);
        } catch (error) {
            console.error('Error parsing file:', error);
        }
    }

    for (const woning of woningen) {
        await page.goto(woning.Link, { waitUntil: 'networkidle0' });

        const epc = await page.evaluate(() => {
            const element = Array.from(document.querySelectorAll('.details-content dt'));
            const epcClassElement = element.find(data => data.textContent.trim() === 'EPC klasse');
            return epcClassElement ? epcClassElement.nextElementSibling.innerText : 'Geen EPC klasse vermeld';
        });
        const bouwjaar = await page.evaluate(() => {
            const dt = Array.from(document.querySelectorAll('.details-content dt'))
                .find(dt => dt.textContent.trim() === 'Bouwjaar');
            return dt ? dt.nextElementSibling.innerText : 'Het Bouwjaar is niet vermeld';
        });

        const woningData = new Woning(
            woning.Link,
            woning.typeWoning,
            woning.Locatie,
            woning.Prijs,
            woning.woningOppervlakte,
            woning.slaapkamers,
            woning.badkamers,
            woning.perceel,
            epc,
            bouwjaar
        );
        bestaandeData.push(woningData);
    }
    const filteredWoning = bestaandeData.filter((woningData) => {
        let epc = woningData.epc.toLocaleLowerCase();
        return epc === "a" ;

    });
    console.log(filteredWoning);
    fs.writeFileSync('domestic.json', JSON.stringify(filteredWoning, null, 2));
    await browser.close();
}
export { scrapeDomestic };
