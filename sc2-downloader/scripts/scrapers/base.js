const cheerio = require('cheerio');

async function fetchPage(url) {
  const response = await fetch(url);
  return response.text();
}

function loadHtml(html) {
  return cheerio.load(html);
}

function countQuotes(sections) {
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
  return { totalUnits, totalQuotes };
}

function cleanSections(sections) {
  for (const section of sections) {
    section.units = section.units.filter(unit => {
      unit.categories = unit.categories.filter(cat => cat.quotes.length > 0);
      return unit.categories.length > 0;
    });
  }
  return sections.filter(s => s.units.length > 0);
}

module.exports = { fetchPage, loadHtml, countQuotes, cleanSections };
