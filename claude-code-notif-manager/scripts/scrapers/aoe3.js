const { fetchPage, loadHtml, countQuotes, cleanSections } = require('./base');

const WIKI_BASE = 'https://ageofempires.fandom.com/wiki/';

const CIVILIZATIONS = [
  { id: 'british', name: 'British', page: 'British/Dialogue_lines' },
  { id: 'french', name: 'French', page: 'French_(Age_of_Empires_III)/Dialogue_lines' },
  { id: 'spanish', name: 'Spanish', page: 'Spanish_(Age_of_Empires_III)/Dialogue_lines' },
  { id: 'portuguese', name: 'Portuguese', page: 'Portuguese_(Age_of_Empires_III)/Dialogue_lines' },
  { id: 'dutch', name: 'Dutch', page: 'Dutch/Dialogue_lines' },
  { id: 'germans', name: 'Germans', page: 'Germans/Dialogue_lines' },
  { id: 'russians', name: 'Russians', page: 'Russians/Dialogue_lines' },
  { id: 'ottomans', name: 'Ottomans', page: 'Ottomans_(Age_of_Empires_III)/Dialogue_lines' },
];

// Known category prefixes, ordered longest-first so "Gather Coin" matches before "Gather"
const CATEGORY_PREFIXES = [
  'Gather Coin', 'Gather Fruit', 'Gather Meat', 'Gather Wood',
  'Select', 'Move', 'Attack', 'Build', 'Farm',
  'Claim', 'Disabled', 'Ransomed', 'Revived',
];

const SKIP_SECTIONS = ['Contents', 'References', 'Navigation', 'Trivia', 'See also'];

function parseCategory(text) {
  // Strip optional gender prefix (Female/Male) since the unit H3 already captures that
  let cleaned = text.replace(/^(?:Female|Male)\s+/, '');

  for (const prefix of CATEGORY_PREFIXES) {
    if (cleaned.startsWith(prefix)) {
      // Strip category prefix and optional number
      let rest = cleaned.slice(prefix.length).trim();
      rest = rest.replace(/^\d+\s*/, '');
      return { category: prefix, quoteText: rest.trim() };
    }
  }

  // Fallback: no recognized category
  return { category: 'Other', quoteText: text.trim() };
}

function parseWikiPage(html) {
  const $ = loadHtml(html);
  const content = $('#mw-content-text');

  const sections = [];
  let currentSection = null;
  let currentUnit = null;

  content.find('h2, h3, ul').each((_, element) => {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'h2') {
      const name = $el.find('.mw-headline').text().trim();
      if (!name || SKIP_SECTIONS.includes(name)) return;

      currentSection = { name, units: [] };
      sections.push(currentSection);
      currentUnit = null;
    }

    if (tagName === 'h3' && currentSection) {
      const name = $el.find('.mw-headline').text().trim();
      if (!name || SKIP_SECTIONS.includes(name)) return;

      currentUnit = { name, categories: [] };
      currentSection.units.push(currentUnit);
    }

    if (tagName === 'ul' && currentSection) {
      const quotes = [];

      $el.children('li').each((_, li) => {
        const $li = $(li);
        const $audio = $li.find('audio');
        if (!$audio.length) return;

        const audioUrl = $audio.attr('src');
        if (!audioUrl) return;

        // Get clean text by removing audio elements
        const $clone = $li.clone();
        $clone.find('.audio-button, audio, span:has(audio)').remove();
        const rawText = $clone.text().trim();
        if (!rawText) return;

        const { category, quoteText } = parseCategory(rawText);
        quotes.push({ category, text: quoteText || rawText, audioUrl });
      });

      if (quotes.length === 0) return;

      // If no H3 unit exists under this H2, create one using the section name
      if (!currentUnit) {
        currentUnit = { name: currentSection.name, categories: [] };
        currentSection.units.push(currentUnit);
      }

      // Group quotes by category and add to current unit
      const categoryMap = {};
      for (const q of quotes) {
        if (!categoryMap[q.category]) {
          categoryMap[q.category] = [];
        }
        categoryMap[q.category].push({ text: q.text, audioUrl: q.audioUrl });
      }

      for (const [catName, catQuotes] of Object.entries(categoryMap)) {
        // Check if category already exists on the unit (from a previous <ul>)
        let existing = currentUnit.categories.find(c => c.name === catName);
        if (existing) {
          existing.quotes.push(...catQuotes);
        } else {
          currentUnit.categories.push({ name: catName, quotes: catQuotes });
        }
      }
    }
  });

  return cleanSections(sections);
}

async function scrapeCivilization(civ) {
  const url = WIKI_BASE + civ.page;
  console.log(`  Fetching ${civ.name}...`);
  const html = await fetchPage(url);
  const sections = parseWikiPage(html);
  const { totalUnits, totalQuotes } = countQuotes(sections);
  console.log(`  ${civ.name}: ${sections.length} sections, ${totalUnits} units, ${totalQuotes} quotes`);
  return sections;
}

async function scrape() {
  console.log('Scraping Age of Empires III (European civilizations)...\n');

  const allSections = [];

  for (const civ of CIVILIZATIONS) {
    const sections = await scrapeCivilization(civ);
    // Each civilization becomes a section within the european faction
    // Wrap all units from this civ into a single section named after the civ
    const civUnits = sections.flatMap(s =>
      s.units.map(u => ({
        ...u,
        // Prefix unit name with unit type section if multiple sections exist
        name: sections.length > 1 ? `${u.name}` : u.name,
      }))
    );

    if (civUnits.length > 0) {
      allSections.push({
        name: civ.name,
        units: civUnits,
      });
    }
  }

  const factions = {
    european: { sections: allSections },
  };

  // Overall summary
  console.log('\n=== Overall Summary ===');
  const { totalUnits, totalQuotes } = countQuotes(allSections);
  console.log(`Total civilizations: ${allSections.length}`);
  console.log(`Total units: ${totalUnits}`);
  console.log(`Total quotes: ${totalQuotes}`);

  return { factions };
}

module.exports = { scrape };
