'use strict';

/*
 * TruthLens — analyze.js
 * Pure README analysis logic. No DOM, no dependencies.
 * Works in the browser (attaches to globalThis) and in Node (module.exports).
 */

// ---------------------------------------------------------------------------
// Sample data (also used by app.js and test-sample.mjs)
// ---------------------------------------------------------------------------

// Planted flaws in SAMPLE_README (do not "fix" — the numbers are the spec):
//   2 broken anchors (#faq, #api-reference)          -> -16
//   1 image with empty alt text                      ->  -4
//   1 placeholder phrase ("coming soon")             ->  -5
//   MIT License claimed, no LICENSE in SAMPLE_FILES  -> -15
//   ./docs/setup.md referenced but not in file list  ->  -6
//   2 distinct versions (1.2.0, 2.0.0)               -> note, no penalty
//   Total penalty 46 -> score 54, grade "Needs work", 6 issues + 1 note.
var SAMPLE_README = [
  '# RocketPie',
  '',
  'RocketPie bakes deployment pipelines at ludicrous speed. Current release: 1.2.0.',
  '',
  '## Features',
  '',
  '- One-command deploys',
  '- Automatic rollbacks',
  '- Warm caches for repeat builds',
  '',
  '## Getting Started',
  '',
  'See the [installation guide](#installation), the [configuration reference](#configuration), the [FAQ](#faq), and the [API reference](#api-reference) to get going. The full walkthrough lives in the [setup doc](./docs/setup.md).',
  '',
  '![RocketPie dashboard](https://example.com/rocketpie-dashboard.png)',
  '',
  '![](https://example.com/rocketpie-cli.png)',
  '',
  '## Installation',
  '',
  'Install the CLI:',
  '',
  '```bash',
  'npm install -g rocketpie',
  '```',
  '',
  '## Configuration',
  '',
  'RocketPie reads its settings from a config file in your project root.',
  '',
  '## Roadmap',
  '',
  'Native Windows support is coming soon.',
  '',
  '## Changelog',
  '',
  'Version 2.0.0 rewrote the baking engine. The 1.2.0 line stays in maintenance mode.',
  '',
  '## License',
  '',
  'RocketPie is released under the MIT License.',
  ''
].join('\n');

var SAMPLE_FILES = [
  'README.md',
  'package.json',
  'src/index.js',
  'src/cli.js',
  'docs/usage.md',
  ''
].join('\n');

// A minimal, honest README: scores 100 with 0 issues when the file list is
// empty (the license claim then becomes a note, not a penalty).
var CLEAN_README = [
  '# HonestWidget',
  '',
  'A tiny widget that does exactly what it says. Release 0.3.1 is the current version.',
  '',
  '## Usage',
  '',
  'Import the widget and call render once. Everything on this page is accurate.',
  '',
  '## License',
  '',
  'Released under the MIT License.',
  ''
].join('\n');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

var PLACEHOLDER_RE = /\b(coming soon|under construction|lorem ipsum|todo|fixme|wip)\b/i;
var VERSION_RE = /v?\d+\.\d+\.\d+/g;
var LICENSE_CLAIM_RE = /(MIT License|Apache License|\bGPL\b)/;
var LICENSE_BASENAMES = { 'license': true, 'license.md': true, 'license.txt': true, 'copying': true };

function slugifyHeading(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove punctuation except word chars, spaces, hyphens (keeps - and _)
    .replace(/\s+/g, '-');
}

function evidenceOf(line) {
  return line.trim().slice(0, 120);
}

function normalizePath(p) {
  var out = p.split('#')[0].split('?')[0];
  try { out = decodeURIComponent(out); } catch (e) { /* keep raw */ }
  while (out.indexOf('./') === 0) out = out.slice(2);
  if (out.charAt(0) === '/') out = out.slice(1);
  return out;
}

function basenameOf(p) {
  var parts = p.split('/');
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------

function analyzeReadme(readmeText, filesText) {
  var text = typeof readmeText === 'string' ? readmeText : '';
  var filesRaw = typeof filesText === 'string' ? filesText : '';
  var hasFileList = filesRaw.trim().length > 0;

  var fileSet = {};
  var fileLines = filesRaw.split('\n');
  for (var i = 0; i < fileLines.length; i++) {
    var f = fileLines[i].trim();
    if (f) fileSet[normalizePath(f)] = true;
  }

  var lines = text.split('\n');

  // Pass 1: fences, headings.
  var inFence = false;
  var fenceCount = 0;
  var fenceLanguages = [];
  var lineInFence = []; // per-line flag (content lines only, not the fence markers)
  var headingSlugs = {};
  var headingCount = 0;

  for (var li = 0; li < lines.length; li++) {
    var raw = lines[li];
    var fenceMatch = raw.match(/^\s*```+\s*([^\s`]*)/);
    if (fenceMatch) {
      if (!inFence) {
        fenceCount++;
        if (fenceMatch[1]) fenceLanguages.push(fenceMatch[1]);
      }
      inFence = !inFence;
      lineInFence[li] = false;
      continue;
    }
    lineInFence[li] = inFence;
    if (!inFence) {
      var h = raw.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
      if (h && h[1]) {
        headingSlugs[slugifyHeading(h[1])] = true;
        headingCount++;
      }
    }
  }

  var findings = [];
  var passed = [];
  var penalties = 0;

  // Pass 2: links & images.
  var anchorTotal = 0;
  var brokenAnchors = 0;
  var anchorPenalty = 0;
  var imageTotal = 0;
  var emptyAlt = 0;
  var altPenalty = 0;
  var externalCount = 0;
  var domainSet = {};
  var missingRefs = 0;
  var missingPenalty = 0;

  var anchorRe = /\[([^\]]*)\]\((#[^)\s]+)\)/g;
  var imageRe = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  var targetRe = /\]\(([^)\s]+)\)/g;

  for (var ln = 0; ln < lines.length; ln++) {
    var line = lines[ln];
    var lineNo = ln + 1;
    var m;

    // (a) internal anchors
    anchorRe.lastIndex = 0;
    while ((m = anchorRe.exec(line)) !== null) {
      anchorTotal++;
      var slug = m[2].slice(1);
      if (!headingSlugs[slug]) {
        brokenAnchors++;
        var pA = Math.min(8, Math.max(0, 24 - anchorPenalty));
        anchorPenalty += pA;
        findings.push({
          severity: 'issue',
          check: 'Broken anchor',
          message: 'Anchor ' + m[2] + ' does not match any heading',
          line: lineNo,
          evidence: evidenceOf(line)
        });
      }
    }

    // (b) images with empty alt text
    imageRe.lastIndex = 0;
    while ((m = imageRe.exec(line)) !== null) {
      imageTotal++;
      if (m[1].trim() === '') {
        emptyAlt++;
        var pB = Math.min(4, Math.max(0, 12 - altPenalty));
        altPenalty += pB;
        findings.push({
          severity: 'issue',
          check: 'Image alt text',
          message: 'Image has empty alt text: ' + m[2],
          line: lineNo,
          evidence: evidenceOf(line)
        });
      }
    }

    // all link/image targets: external stats (g) + missing files (e)
    targetRe.lastIndex = 0;
    while ((m = targetRe.exec(line)) !== null) {
      var target = m[1];
      if (/^https?:\/\//i.test(target)) {
        externalCount++;
        var hostMatch = target.match(/^https?:\/\/([^\/:?#]+)/i);
        if (hostMatch) domainSet[hostMatch[1].toLowerCase()] = true;
        continue;
      }
      if (/^(#|mailto:|tel:|data:)/i.test(target)) continue;
      if (target.indexOf('://') !== -1) continue;
      // relative reference
      var norm = normalizePath(target);
      var base = basenameOf(norm);
      if (!/\.[A-Za-z0-9]{1,10}$/.test(base)) continue; // only file-like refs
      if (hasFileList && !fileSet[norm]) {
        missingRefs++;
        var pE = Math.min(6, Math.max(0, 18 - missingPenalty));
        missingPenalty += pE;
        findings.push({
          severity: 'issue',
          check: 'Missing file',
          message: 'Referenced file not in the file list: ' + target,
          line: lineNo,
          evidence: evidenceOf(line)
        });
      }
    }
  }

  penalties += anchorPenalty + altPenalty + missingPenalty;

  if (anchorTotal === 0) passed.push('No internal anchors to check');
  else if (brokenAnchors === 0) passed.push('All ' + anchorTotal + ' internal anchors resolve');

  if (imageTotal === 0) passed.push('No images to check');
  else if (emptyAlt === 0) passed.push('All images have alt text');

  if (hasFileList && missingRefs === 0) passed.push('All referenced files are present in the file list');

  // (c) placeholder promises — skip fenced code blocks.
  var placeholderCount = 0;
  var placeholderPenalty = 0;
  for (var pl = 0; pl < lines.length; pl++) {
    if (lineInFence[pl]) continue;
    var pm = lines[pl].match(PLACEHOLDER_RE);
    if (pm) {
      placeholderCount++;
      var pC = Math.min(5, Math.max(0, 15 - placeholderPenalty));
      placeholderPenalty += pC;
      findings.push({
        severity: 'issue',
        check: 'Placeholder promise',
        message: 'Placeholder phrase found: "' + pm[0] + '"',
        line: pl + 1,
        evidence: evidenceOf(lines[pl])
      });
    }
  }
  penalties += placeholderPenalty;
  if (placeholderCount === 0) passed.push('No placeholder promises found');

  // (d) license cross-check.
  var licenseLine = -1;
  var licenseName = '';
  for (var lc = 0; lc < lines.length; lc++) {
    var lm = lines[lc].match(LICENSE_CLAIM_RE);
    if (lm) { licenseLine = lc + 1; licenseName = lm[0]; break; }
  }
  if (licenseLine !== -1) {
    if (!hasFileList) {
      findings.push({
        severity: 'note',
        check: 'license',
        message: 'License check skipped (no file list provided)',
        line: licenseLine,
        evidence: evidenceOf(lines[licenseLine - 1])
      });
    } else {
      var hasLicenseFile = false;
      for (var key in fileSet) {
        if (LICENSE_BASENAMES[basenameOf(key).toLowerCase()]) { hasLicenseFile = true; break; }
      }
      if (!hasLicenseFile) {
        penalties += 15;
        findings.push({
          severity: 'issue',
          check: 'license',
          message: 'License claimed but no LICENSE file in the file list',
          line: licenseLine,
          evidence: evidenceOf(lines[licenseLine - 1])
        });
      } else {
        passed.push('License claim (' + licenseName + ') backed by a LICENSE file in the file list');
      }
    }
  }

  // (f) version consistency — note only, no penalty.
  var versionFirstLine = {};
  var versionOrder = [];
  for (var vl = 0; vl < lines.length; vl++) {
    var vms = lines[vl].match(VERSION_RE);
    if (!vms) continue;
    for (var vi = 0; vi < vms.length; vi++) {
      var v = vms[vi].replace(/^v/, '');
      if (!(v in versionFirstLine)) {
        versionFirstLine[v] = vl + 1;
        versionOrder.push(v);
      }
    }
  }
  if (versionOrder.length > 1) {
    var second = versionOrder[1];
    findings.push({
      severity: 'note',
      check: 'Version consistency',
      message: 'Multiple version strings found: ' + versionOrder.join(', '),
      line: versionFirstLine[second],
      evidence: evidenceOf(lines[versionFirstLine[second] - 1])
    });
  } else if (versionOrder.length === 1) {
    passed.push('Single consistent version string: ' + versionOrder[0]);
  }

  // (g) external links summary.
  var domains = Object.keys(domainSet).sort();
  if (externalCount > 0) {
    passed.push('External links: ' + externalCount + ' across ' + domains.length +
      ' domain' + (domains.length === 1 ? '' : 's') + ' (' + domains.join(', ') + ')');
  } else {
    passed.push('External links: 0');
  }

  var score = Math.max(0, 100 - penalties);
  var grade = score >= 90 ? 'Solid'
    : score >= 70 ? 'Mostly honest'
    : score >= 40 ? 'Needs work'
    : 'Marketing fiction';

  return {
    score: score,
    grade: grade,
    findings: findings,
    passed: passed,
    stats: {
      anchors: anchorTotal,
      images: imageTotal,
      links: externalCount,
      domains: domains,
      fences: fenceCount,
      languages: fenceLanguages
    }
  };
}

// ---------------------------------------------------------------------------
// Exports: Node + browser
// ---------------------------------------------------------------------------

var TruthLens = {
  analyzeReadme: analyzeReadme,
  SAMPLE_README: SAMPLE_README,
  SAMPLE_FILES: SAMPLE_FILES,
  CLEAN_README: CLEAN_README
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TruthLens;
}
if (typeof window !== 'undefined') {
  window.TruthLens = TruthLens;
  window.analyzeReadme = analyzeReadme;
}
if (typeof globalThis !== 'undefined') {
  globalThis.TruthLens = TruthLens;
}
