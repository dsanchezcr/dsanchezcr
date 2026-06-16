// Updates the COLONES-RATE marker in the READMEs using David's own
// open-source package: https://github.com/dsanchezcr/ColonesExchangeRate
import ColonesExchangeRate from '@dsanchezcr/colonesexchangerate';
import { replaceBetweenMarkers } from './lib/markers.mjs';

const FILES = ['README.md', 'README.es.md', 'README.pt.md'];

function fmt(n) {
  const num = Number(n);
  return Number.isFinite(num)
    ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(n);
}

async function main() {
  const converter = new ColonesExchangeRate();

  const [usd, eur] = await Promise.all([
    converter.getDollarExchangeRate().catch(() => null),
    converter.getEuroExchangeRate().catch(() => null),
  ]);

  if (!usd && !eur) {
    console.log('No exchange-rate data available; leaving content unchanged.');
    return;
  }

  const date = usd?.date || eur?.date || new Date().toISOString().slice(0, 10);
  const lines = [`> **🇨🇷 Costa Rica exchange rate** — updated \`${date}\``, '>'];

  if (usd) {
    lines.push(`> - 💵 **1 USD** = ₡${fmt(usd.sale)} _(sale)_ · ₡${fmt(usd.purchase)} _(purchase)_`);
  }
  if (eur) {
    if (eur.colones != null) {
      lines.push(`> - 💶 **1 EUR** = ₡${fmt(eur.colones)}`);
    } else if (eur.dollars != null) {
      lines.push(`> - 💶 **1 EUR** = $${fmt(eur.dollars)}`);
    }
  }
  lines.push('>', '> <sub>Powered by my own package [`@dsanchezcr/colonesexchangerate`](https://github.com/dsanchezcr/ColonesExchangeRate)</sub>');

  const block = lines.join('\n');

  let changed = false;
  for (const file of FILES) {
    if (await replaceBetweenMarkers(file, 'COLONES-RATE', block)) {
      console.log(`Updated COLONES-RATE in ${file}`);
      changed = true;
    }
  }
  if (!changed) console.log('No marker changes were necessary.');
}

main().catch((err) => {
  console.error('Failed to update exchange rate:', err);
  process.exitCode = 1;
});
