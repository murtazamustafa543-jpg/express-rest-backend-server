const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE_URL = 'https://books.toscrape.com';
const CATALOGUE_URL = `${BASE_URL}/catalogue`;
const CACHE_DIR = path.join(__dirname, '../cache');
const USER_AGENT = 'FlyRankInternshipA9/1.0 (https://github.com/murtazamustafa543-jpg/express-rest-server)';

async function fetchPage(url) {
  const filename = url.replace(/[^a-z0-9]/gi, '_') + '.html';
  const cachePath = path.join(CACHE_DIR, filename);

  if (fs.existsSync(cachePath)) {
    console.log(`CACHE HIT: ${url}`);
    const html = fs.readFileSync(cachePath, 'utf-8');
    return html;
  }

  console.log(`FETCH: ${url}`);
  const response = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
    timeout: 10000
  });

  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${url} — status ${response.status}`);
  }

  fs.writeFileSync(cachePath, response.data);

  await new Promise(resolve => setTimeout(resolve, 500));

  return response.data;
}

async function discoverBookUrls() {
  const bookUrls = new Set();
  let currentPageUrl = `${CATALOGUE_URL}/page-1.html`;
  let cataloguePages = 0;

  while (cataloguePages < 3) {
    const html = await fetchPage(currentPageUrl);
    const $ = cheerio.load(html);
    cataloguePages++;

    $('h3 a').each((i, el) => {
      const relativeUrl = $(el).attr('href');
      const absoluteUrl = new URL(relativeUrl, currentPageUrl).href;
      const cleanUrl = absoluteUrl.replace('catalogue/catalogue/', 'catalogue/');
      bookUrls.add(cleanUrl);
    });

    const nextLink = $('.next a').attr('href');
    if (!nextLink || cataloguePages === 3) break;

    currentPageUrl = new URL(nextLink, currentPageUrl).href;
    currentPageUrl = currentPageUrl.replace('catalogue/catalogue/', 'catalogue/');
  }

  return { bookUrls: [...bookUrls], cataloguePages };
}

// Extract raw data from a single book page
function extractBookData(html, productUrl, sourcePage) {
  const $ = cheerio.load(html);

  // Title
  const title = $('h1').text().trim();

  // Price
  const price_text = $('.price_color').first().text().trim();

  // Availability
  const availability_text = $('.availability').first().text().trim();

  // Rating — stored as a word class e.g. "Three"
  const ratingClass = $('.star-rating').attr('class') || '';
  const rating_text = ratingClass.replace('star-rating', '').trim();

  // Description — some books don't have one
  const descriptionEl = $('#product_description ~ p');
  const description = descriptionEl.length > 0 ? descriptionEl.text().trim() : null;

  return {
    title,
    product_url: productUrl,
    price_text,
    availability_text,
    rating_text,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString()
  };
}

async function main() {
  try {
    const { bookUrls, cataloguePages } = await discoverBookUrls();

    console.log(`catalogue_pages=${cataloguePages}`);
    console.log(`discovered=${bookUrls.length}`);
    console.log(`unique_urls=${bookUrls.length}`);

    const rawRecords = [];

    for (const url of bookUrls) {
      const html = await fetchPage(url);
      const record = extractBookData(html, url, url);
      rawRecords.push(record);
    }

    console.log(`detail_pages=${rawRecords.length}`);
    console.log('\nSample record:');
    console.log(JSON.stringify(rawRecords[0], null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();