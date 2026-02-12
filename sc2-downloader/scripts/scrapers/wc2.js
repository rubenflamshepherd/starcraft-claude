const { fetchPage, loadHtml, countQuotes, cleanSections } = require('./base');

const WIKI_URL = 'https://warcraft.wiki.gg/wiki/Quotes_of_Warcraft_II';

// Heroes that belong to each faction (Beyond the Dark Portal expansion)
const ALLIANCE_HEROES = ['Alleria', 'Danath', 'Khadgar', 'Kurdran', 'Turalyon'];
const HORDE_HEROES = ['Deathwing', 'Dentarg', 'Grom Hellscream', 'Kargath Bladefist', 'Teron Gorefiend'];

function cleanQuoteText(text) {
  return text
    .replace(/▶️/g, '')
    .replace(/▶/g, '')
    .replace(/\bLink\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAudioUrls($, $el) {
  const urls = [];
  $el.find('audio source').each((_, source) => {
    const src = $(source).attr('src');
    if (src) urls.push(src);
  });
  if (urls.length > 0) return urls;
  // Fallback: look for <a> linking to .wav/.ogg
  $el.find('a').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (href.match(/\.(wav|ogg)(\?|$)/i)) {
      urls.push(href);
    }
  });
  return urls;
}

function parseWikiPage(html) {
  const $ = loadHtml(html);
  const content = $('#mw-content-text');

  let currentH3 = null;
  let currentUnit = null;
  let currentCategory = null;

  const h3Groups = {};

  // Process all relevant elements in DOM order
  // DL elements contain category names (Ready, What, Yes, etc.)
  // Some DL elements also contain inline audio (e.g., "Death sound")
  content.find('h3, h4, dl, ul').each((_, element) => {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'h3') {
      const headlineText = $el.find('.mw-headline').text().trim() || $el.text().trim();
      if (headlineText && !headlineText.includes('References') && !headlineText.includes('See also')) {
        currentH3 = headlineText;
        if (!h3Groups[currentH3]) {
          h3Groups[currentH3] = [];
        }
        currentUnit = null;
        currentCategory = null;
      }
    }

    if (tagName === 'h4' && currentH3) {
      const unitName = $el.find('.mw-headline').text().trim() || $el.text().trim();
      if (unitName) {
        currentUnit = {
          name: unitName,
          categories: [],
        };
        h3Groups[currentH3].push(currentUnit);
        currentCategory = null;
      }
    }

    // DL = category header (e.g., <dl><dt>Ready</dt></dl>)
    // Some DLs also contain inline audio (e.g., Death sound)
    if (tagName === 'dl' && currentUnit) {
      const $dt = $el.find('dt');
      const categoryName = cleanQuoteText($dt.clone().find('span, audio').remove().end().text());

      if (categoryName) {
        currentCategory = {
          name: categoryName,
          quotes: [],
        };
        currentUnit.categories.push(currentCategory);

        // Check if this DL also has inline audio
        const audioUrls = extractAudioUrls($, $el);
        for (const audioUrl of audioUrls) {
          currentCategory.quotes.push({
            text: categoryName,
            audioUrl,
          });
        }
      }
    }

    // UL = quote list
    if (tagName === 'ul' && currentUnit) {
      if (!currentCategory) {
        currentCategory = {
          name: 'Quotes',
          quotes: [],
        };
        currentUnit.categories.push(currentCategory);
      }

      $el.children('li').each((_, li) => {
        const $li = $(li);

        const audioUrls = extractAudioUrls($, $li);
        if (audioUrls.length === 0) return;

        // Get quote text: remove audio player elements
        const $clone = $li.clone();
        $clone.find('span:has(audio)').remove();
        $clone.find('audio, .ext-audiobutton').remove();

        const quoteText = cleanQuoteText($clone.text());

        if (quoteText) {
          // Some units (e.g., Knight/Paladin) have multiple audio per quote
          for (const audioUrl of audioUrls) {
            currentCategory.quotes.push({
              text: quoteText,
              audioUrl,
            });
          }
        }
      });
    }
  });

  return h3Groups;
}

function buildFactions(h3Groups) {
  const factions = {
    alliance: { sections: [] },
    horde: { sections: [] },
  };

  for (const [h3Name, units] of Object.entries(h3Groups)) {
    const lowerName = h3Name.toLowerCase();

    if (lowerName === 'alliance') {
      factions.alliance.sections.push({ name: 'Units', units });
    } else if (lowerName === 'horde') {
      factions.horde.sections.push({ name: 'Units', units });
    } else if (lowerName.includes('heroes') || lowerName.includes('beyond the dark portal')) {
      const allianceHeroes = [];
      const hordeHeroes = [];

      for (const unit of units) {
        const isAlliance = ALLIANCE_HEROES.some(h => unit.name.includes(h));
        const isHorde = HORDE_HEROES.some(h => unit.name.includes(h));

        if (isAlliance) {
          allianceHeroes.push(unit);
        } else if (isHorde) {
          hordeHeroes.push(unit);
        } else {
          console.warn(`Unknown hero faction for: ${unit.name}`);
          hordeHeroes.push(unit);
        }
      }

      if (allianceHeroes.length > 0) {
        factions.alliance.sections.push({ name: 'Heroes', units: allianceHeroes });
      }
      if (hordeHeroes.length > 0) {
        factions.horde.sections.push({ name: 'Heroes', units: hordeHeroes });
      }
    }
  }

  for (const faction of Object.values(factions)) {
    faction.sections = cleanSections(faction.sections);
  }

  return factions;
}

async function scrape() {
  console.log('Fetching Warcraft II wiki page...');
  const html = await fetchPage(WIKI_URL);

  console.log('Parsing page structure...');
  const h3Groups = parseWikiPage(html);

  console.log(`\nFound H3 sections: ${Object.keys(h3Groups).join(', ')}`);
  for (const [name, units] of Object.entries(h3Groups)) {
    console.log(`  ${name}: ${units.length} units`);
  }

  const factions = buildFactions(h3Groups);

  console.log('\n=== Overall Summary ===');
  let grandTotalUnits = 0;
  let grandTotalQuotes = 0;
  for (const [factionId, data] of Object.entries(factions)) {
    const { totalUnits, totalQuotes } = countQuotes(data.sections);
    console.log(`${factionId}: ${totalUnits} units, ${totalQuotes} quotes`);
    grandTotalUnits += totalUnits;
    grandTotalQuotes += totalQuotes;
  }
  console.log(`Total units: ${grandTotalUnits}`);
  console.log(`Total quotes: ${grandTotalQuotes}`);

  return { factions };
}

module.exports = { scrape };
