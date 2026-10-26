// Rigenera schedules.js da schedules/*.json:  node tools/build-schedules.mjs
import fs from 'node:fs';
const dir = new URL('../schedules/', import.meta.url);
const all = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(new URL(f, dir))));
fs.writeFileSync(new URL('../schedules.js', import.meta.url), '// GENERATO da tools/build-schedules.mjs – non modificare a mano\nwindow.OFFICIAL_SCHEDULES=' + JSON.stringify(all) + ';\n');
console.log('schedules.js:', all.map(s => s.id + ' (' + s.messe.length + ' messe)').join(', '));
