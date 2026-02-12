const fs = require('fs');
const path = require('path');

const SCRAPERS = {
  sc2: () => require('./scrapers/sc2'),
  wc2: () => require('./scrapers/wc2'),
};

const OUTPUT_DIR = path.join(__dirname, '..', 'frontend', 'src', 'data', 'games');

async function scrapeGame(gameId) {
  const getModule = SCRAPERS[gameId];
  if (!getModule) {
    console.error(`Unknown game: ${gameId}`);
    console.error(`Available games: ${Object.keys(SCRAPERS).join(', ')}`);
    process.exit(1);
  }

  const scraper = getModule();
  console.log(`\nScraping ${gameId}...\n`);
  const data = await scraper.scrape();

  const outputPath = path.join(OUTPUT_DIR, `${gameId}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nWritten to: ${outputPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'all';

  if (target === 'all') {
    for (const gameId of Object.keys(SCRAPERS)) {
      await scrapeGame(gameId);
    }
  } else {
    await scrapeGame(target);
  }
}

main().catch(console.error);
