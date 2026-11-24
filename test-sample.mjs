// TruthLens — test-sample.mjs
// Exercises analyze.js under Node and asserts the exact expected numbers.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { analyzeReadme, SAMPLE_README, SAMPLE_FILES, CLEAN_README } = require('./analyze.js');

let failures = 0;
function check(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!cond) failures++;
}

function countSeverity(result, severity) {
  return result.findings.filter((f) => f.severity === severity).length;
}

// --- Sample README: the planted flaws must land on exact numbers. ---
const sample = analyzeReadme(SAMPLE_README, SAMPLE_FILES);
console.log('Sample findings: ' + JSON.stringify(sample.findings, null, 2));
check('sample score is 54', sample.score === 54, 'got ' + sample.score);
check('sample grade is "Needs work"', sample.grade === 'Needs work', 'got ' + sample.grade);
check('sample has exactly 6 issue findings', countSeverity(sample, 'issue') === 6,
  'got ' + countSeverity(sample, 'issue'));
check('sample has at least 1 note finding', countSeverity(sample, 'note') >= 1,
  'got ' + countSeverity(sample, 'note'));

// --- Clean README with an empty file list: perfect score, no issues. ---
const clean = analyzeReadme(CLEAN_README, '');
check('clean score is 100', clean.score === 100, 'got ' + clean.score);
check('clean has 0 issue findings', countSeverity(clean, 'issue') === 0,
  'got ' + countSeverity(clean, 'issue'));

// --- This repo's own README with no file list: must also be spotless. ---
const repoReadme = readFileSync(new URL('./README.md', import.meta.url), 'utf8');
const own = analyzeReadme(repoReadme, '');
if (countSeverity(own, 'issue') > 0) {
  console.log('Repo README findings: ' + JSON.stringify(own.findings, null, 2));
}
check('repo README score is 100', own.score === 100, 'got ' + own.score);
check('repo README has 0 issue findings', countSeverity(own, 'issue') === 0,
  'got ' + countSeverity(own, 'issue'));

console.log(failures === 0 ? 'ALL TESTS PASSED' : failures + ' TEST(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
