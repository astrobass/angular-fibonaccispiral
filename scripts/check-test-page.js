'use strict';

// test/test.html runs the same specs as Karma, but in a real browser, so CI
// never loads it. A missing <script src> fails silently in a browser -- the
// page just renders blank -- which is how it went unnoticed that Jasmine 3+
// had split boot.js into boot0.js and boot1.js.
//
// This checks every local asset the page references still exists, and that it
// pulls in the shared spec file rather than an inline copy of the specs.

const fs = require('fs');
const path = require('path');

const PAGE = path.join(__dirname, '..', 'test', 'test.html');
const SHARED_SPEC = 'fibSpiralSpec.js';

const html = fs.readFileSync(PAGE, 'utf8');
const pageDir = path.dirname(PAGE);
const problems = [];

const references = [];
const pattern = /(?:src|href)\s*=\s*"([^"]+)"/g;
let match;
while ((match = pattern.exec(html)) !== null) {
  references.push(match[1]);
}

const local = references.filter(function (ref) {
  return !/^(?:https?:)?\/\//.test(ref) && !ref.startsWith('data:');
});

local.forEach(function (ref) {
  if (!fs.existsSync(path.resolve(pageDir, ref))) {
    problems.push('missing asset: ' + ref);
  }
});

if (!local.some(function (ref) { return path.basename(ref) === SHARED_SPEC; })) {
  problems.push('does not load ' + SHARED_SPEC + ' (specs must not be duplicated inline)');
}

if (problems.length > 0) {
  console.error('test/test.html is broken:');
  problems.forEach(function (p) { console.error('  - ' + p); });
  process.exit(1);
}

console.log('test/test.html OK (' + local.length + ' local assets resolve, loads ' + SHARED_SPEC + ')');
