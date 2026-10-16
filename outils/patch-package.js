'use strict';
// Ajoute la protection à ton package.json SANS toucher à ton numéro de version.
const fs = require('fs');
const f = 'package.json';
const p = JSON.parse(fs.readFileSync(f, 'utf8'));
p.devDependencies = p.devDependencies || {};
p.devDependencies['@electron/fuses'] = '^1.8.0';
p.build = p.build || {};
p.build.afterPack = 'build/after-pack.js';
p.build.nsis = Object.assign({}, p.build.nsis, { runAfterFinish: true });
if (typeof p.repository === 'string') p.repository = p.repository.replace('TON_PSEUDO_GITHUB', 'ToonsTV');
fs.writeFileSync(f, JSON.stringify(p, null, 2) + '\n');
console.log('package.json mis à jour (version conservée : ' + p.version + ')');
