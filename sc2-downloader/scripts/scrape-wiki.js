const cheerio = require('cheerio');

const WIKI_URLS = {
  protoss: 'https://starcraft.fandom.com/wiki/StarCraft_II_unit_quotations/Protoss',
  terran: 'https://starcraft.fandom.com/wiki/StarCraft_II_unit_quotations/Terran',
  zerg: 'https://starcraft.fandom.com/wiki/StarCraft_II_unit_quotations/Zerg',
};

async function fetchPage(url) {
  const response = await fetch(url);
  return response.text();
}

function parseWikiPage(html) {
  const $ = cheerio.load(html);
  const sections = [];
  let currentSection = null;
  let currentUnit = null;
  let currentCategory = null;

  // Find the main content
  const content = $('#mw-content-text');

  // Category name patterns - look for text before quote lists
  const categoryPatterns = [
    /^Trained/i,
    /^When attacked/i,
    /^Selected/i,
    /^Move order/i,
    /^Attack order/i,
    /^Ordered to attack/i,
    /^Repeatedly selected/i,
    /^Other lines/i,
    /^Confirming/i,
    /^Entering/i,
    /^Exiting/i,
    /^Death/i,
    /^Pissed/i,
    /^Error/i,
    /^Feedback/i,
    /^Hallucination/i,
    /^Warp/i,
    /^Launch/i,
    /^Ready/i,
    /^Morph/i,
    /^Engaging/i,
    /^Cloaked/i,
    /^Abilit/i,
    /^Nuke/i,
    /^Tactical/i,
    /^EMP/i,
    /^Snipe/i,
    /^Siege/i,
    /^Tank mode/i,
    /^Yamato/i,
    /^Jump/i,
    /^Stim/i,
    /^Building/i,
    /^Repairing/i,
    /^Research/i,
    /^Upgrade/i,
    /^Scanner/i,
    /^Call/i,
    /^Supply/i,
    /^MULE/i,
    /^Load/i,
    /^Unload/i,
    /^Lift/i,
    /^Land/i,
    /^Auto/i,
    /^Cloak/i,
    /^Decloak/i,
    /^Bunker/i,
  ];

  function matchesCategory(text) {
    return categoryPatterns.some(pattern => pattern.test(text.trim()));
  }

  // Process all elements in order
  // Note: Zerg uses H2 for sections and H3 for units, while Protoss/Terran use H3/H4
  content.find('h2, h3, h4, h5, p, ul').each((_, element) => {
    const $el = $(element);
    const tagName = element.tagName.toLowerCase();

    // H2 = Main section for Zerg pages
    if (tagName === 'h2') {
      const sectionName = $el.find('.mw-headline').text().trim();
      if (sectionName && !sectionName.includes('References') && !sectionName.includes('Navigation') && !sectionName.includes('Contents') && !sectionName.includes('See also')) {
        currentSection = {
          name: sectionName,
          units: []
        };
        sections.push(currentSection);
        currentUnit = null;
        currentCategory = null;
      }
    }

    // H3 = Main section for Protoss/Terran OR Unit name for Zerg
    if (tagName === 'h3') {
      const headlineName = $el.find('.mw-headline').text().trim();
      if (headlineName && !headlineName.includes('References') && !headlineName.includes('Navigation') && !headlineName.includes('Contents')) {
        // Check if we already have a section from H2 - if so, this is a unit
        if (currentSection) {
          currentUnit = {
            name: headlineName,
            categories: []
          };
          currentSection.units.push(currentUnit);
          currentCategory = null;
        } else {
          // No section yet, so this H3 is a section (Protoss/Terran style)
          currentSection = {
            name: headlineName,
            units: []
          };
          sections.push(currentSection);
          currentUnit = null;
          currentCategory = null;
        }
      }
    }

    // H4 = Unit name for Protoss/Terran OR Sub-unit for Zerg
    if (tagName === 'h4' && currentSection) {
      const unitName = $el.find('.mw-headline').text().trim();
      if (unitName) {
        currentUnit = {
          name: unitName,
          categories: []
        };
        currentSection.units.push(currentUnit);
        currentCategory = null;
      }
    }

    // H5 = Sub-unit or variant (e.g., "High Templar (Wings of Liberty and Versus)")
    if (tagName === 'h5' && currentSection) {
      const subUnitName = $el.find('.mw-headline').text().trim();
      if (subUnitName) {
        currentUnit = {
          name: subUnitName,
          categories: []
        };
        currentSection.units.push(currentUnit);
        currentCategory = null;
      }
    }

    // P = Might contain category name (e.g., "Trained", "When attacked:", "Selected:")
    if (tagName === 'p' && currentUnit) {
      const text = $el.text().trim();
      if (matchesCategory(text)) {
        currentCategory = {
          name: text.replace(/:$/, '').trim(),
          quotes: []
        };
        currentUnit.categories.push(currentCategory);
      }
    }

    // UL = Quote list
    if (tagName === 'ul' && currentUnit) {
      // Check if there's a preceding sibling that indicates category
      const prevP = $el.prev('p');
      if (prevP.length && matchesCategory(prevP.text())) {
        // Category already set from p element above
      } else if (!currentCategory) {
        // Default category
        currentCategory = {
          name: 'Quotes',
          quotes: []
        };
        currentUnit.categories.push(currentCategory);
      }

      // Extract quotes from list items
      $el.children('li').each((_, li) => {
        const $li = $(li);

        // Find audio element
        const $audio = $li.find('audio');
        if ($audio.length) {
          const audioUrl = $audio.attr('src');

          // Get quote text - everything after the audio element
          // Clone and remove the audio-button span to get clean text
          const $clone = $li.clone();
          $clone.find('.audio-button').remove();
          $clone.find('audio').remove();
          let quoteText = $clone.text().trim();

          // Clean up the text
          quoteText = quoteText.replace(/^\s*/, '').trim();

          if (audioUrl && quoteText) {
            if (!currentCategory) {
              currentCategory = {
                name: 'Quotes',
                quotes: []
              };
              currentUnit.categories.push(currentCategory);
            }
            currentCategory.quotes.push({
              text: quoteText,
              audioUrl: audioUrl
            });
          }
        }
      });
    }
  });

  // Clean up empty entries
  for (const section of sections) {
    section.units = section.units.filter(unit => {
      unit.categories = unit.categories.filter(cat => cat.quotes.length > 0);
      return unit.categories.length > 0;
    });
  }

  return sections.filter(s => s.units.length > 0);
}

async function scrapeRace(race) {
  const url = WIKI_URLS[race];
  if (!url) {
    throw new Error(`Unknown race: ${race}. Available: ${Object.keys(WIKI_URLS).join(', ')}`);
  }

  console.log(`Fetching ${race} wiki page...`);
  const html = await fetchPage(url);

  console.log(`Parsing ${race} page structure...`);
  const sections = parseWikiPage(html);

  // Count totals
  let totalUnits = 0;
  let totalQuotes = 0;
  for (const section of sections) {
    totalUnits += section.units.length;
    for (const unit of section.units) {
      for (const category of unit.categories) {
        totalQuotes += category.quotes.length;
      }
    }
  }

  console.log(`${race} summary:`);
  console.log(`  - Sections: ${sections.length}`);
  console.log(`  - Units: ${totalUnits}`);
  console.log(`  - Quotes: ${totalQuotes}`);

  return { sections, totalUnits, totalQuotes };
}

async function main() {
  const args = process.argv.slice(2);
  const race = args[0] || 'all';

  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '..', 'frontend', 'src', 'data', 'quotations.json');

  let output;

  if (race === 'all') {
    // Scrape all races
    const races = {};
    for (const raceName of Object.keys(WIKI_URLS)) {
      const data = await scrapeRace(raceName);
      races[raceName] = { sections: data.sections };
    }
    output = { races };

    // Overall summary
    console.log('\n=== Overall Summary ===');
    let grandTotalUnits = 0;
    let grandTotalQuotes = 0;
    for (const [raceName, data] of Object.entries(races)) {
      for (const section of data.sections) {
        grandTotalUnits += section.units.length;
        for (const unit of section.units) {
          for (const category of unit.categories) {
            grandTotalQuotes += category.quotes.length;
          }
        }
      }
    }
    console.log(`Total races: ${Object.keys(races).length}`);
    console.log(`Total units: ${grandTotalUnits}`);
    console.log(`Total quotes: ${grandTotalQuotes}`);
  } else {
    // Scrape single race
    const data = await scrapeRace(race);
    output = { races: { [race]: { sections: data.sections } } };
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten to: ${outputPath}`);
}

main().catch(console.error);
