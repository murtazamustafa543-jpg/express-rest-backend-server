const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://books.toscrape.com';
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

async function main() {
  try {
    const html = await fetchPage(`${BASE_URL}/catalogue/page-1.html`);
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();