const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { z } = require('zod');

const BASE_URL = 'https://books.toscrape.com';
const CATALOGUE_URL = `${BASE_URL}/catalogue`;
const CACHE_DIR = path.join(__dirname, '../cache');
const OUTPUT_DIR = path.join(__dirname, '../output');
const USER_AGENT = 'FlyRankInternshipA9/1.0 (https://github.com/murtazamustafa543-jpg/express-rest-server)';

// Schema for a valid book record
const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string(),
  price_gbp: z.number(),
  availability_text: z.string(),
  rating_text: z.string(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string()
});

async function fetchPage(url) {
  const filename = url.replace(/[^a-z0-9]/gi, '_').slice(0, 100) + '.html';
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

function extractBookData(html, productUrl, sourcePage) {
  const $ = cheerio.load(html);

  const title = $('h1').text().trim();
  const price_text = $('.price_color').first().text().trim();
  const availability_text = $('.availability').first().text().trim();
  const ratingClass = $('.star-rating').attr('class') || '';
  const rating_text = ratingClass.replace('star-rating', '').trim();
  const descriptionEl = $('#product_description ~ p');
  const description = descriptionEl.length > 0 ? descriptionEl.text().trim() : null;

  // Convert "£51.77" to 51.77
  const price_gbp = parseFloat(price_text.replace('£', '').trim());

  return {
    title,
    product_url: productUrl,
    price_text,
    price_gbp,
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

    const validRecords = [];
    const errorRecords = [];

    for (const url of bookUrls) {
      const html = await fetchPage(url);
      const raw = extractBookData(html, url, url);

      // Validate against schema
      const result = BookSchema.safeParse(raw);

      if (result.success) {
        validRecords.push(result.data);
      } else {
        errorRecords.push({
          url,
          reason: result.error.message
        });
      }
    }

    // Save valid records — use product_url as identity to avoid duplicates
    const unique = Object.values(
      Object.fromEntries(validRecords.map(r => [r.product_url, r]))
    );

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'books.json'),
      JSON.stringify(unique, null, 2)
    );

    if (errorRecords.length > 0) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, 'errors.json'),
        JSON.stringify(errorRecords, null, 2)
      );
    }

    console.log(`valid_records=${unique.length}`);
    console.log(`invalid_records=${errorRecords.length}`);
    console.log('\nSample record:');
    console.log(JSON.stringify(unique[0], null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();