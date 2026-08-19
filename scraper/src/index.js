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
    console.log(`Response size: ${html.length} bytes`);
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
  console.log(`Response size: ${response.data.length} bytes`);

  await new Promise(resolve => setTimeout(resolve, 500));

  return response.data;
}

// Find all book URLs across 3 catalogue pages
async function discoverBookUrls() {
  const bookUrls = new Set(); // Set automatically removes duplicates
  let currentPageUrl = `${CATALOGUE_URL}/page-1.html`;
  let cataloguePages = 0;

  while (cataloguePages < 3) {
    const html = await fetchPage(currentPageUrl);
    const $ = cheerio.load(html);
    cataloguePages++;

    // Find all book links on this page
    $('h3 a').each((i, el) => {
      const relativeUrl = $(el).attr('href');
      // Convert relative URL to absolute
      const absoluteUrl = new URL(relativeUrl, currentPageUrl).href;
      // Fix double catalogue in URL
      const cleanUrl = absoluteUrl.replace('catalogue/catalogue/', 'catalogue/');
      bookUrls.add(cleanUrl);
    });

    // Find the next page link
    const nextLink = $('.next a').attr('href');
    if (!nextLink || cataloguePages === 3) break;

    currentPageUrl = new URL(nextLink, currentPageUrl).href;
    currentPageUrl = currentPageUrl.replace('catalogue/catalogue/', 'catalogue/');
  }

  return { bookUrls: [...bookUrls], cataloguePages };
}

async function main() {
  try {
    const { bookUrls, cataloguePages } = await discoverBookUrls();

    console.log(`catalogue_pages=${cataloguePages}`);
    console.log(`discovered=${bookUrls.length}`);
    console.log(`unique_urls=${bookUrls.length}`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();