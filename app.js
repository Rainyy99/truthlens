'use strict';

/*
 * TruthLens — app.js
 * DOM wiring for the README lie detector. Analysis lives in analyze.js.
 */

var TL = (typeof window !== 'undefined' && window.TruthLens) ||
         (typeof globalThis !== 'undefined' && globalThis.TruthLens);
var analyzeReadme = TL.analyzeReadme;
var SAMPLE_README = TL.SAMPLE_README;
var SAMPLE_FILES = TL.SAMPLE_FILES;
var CLEAN_README = TL.CLEAN_README;

// Kane CLI verification runs for this app. Each entry maps to a flow file in
// flows/ and is re-run against the live page after every fix round.
var KANE_RUNS = [
  { name: 'Sample README flow', status: 'passed', url: 'https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874MEMEYYME8DKJE5XH4WYQ/dashboard/share/US_8AH3YKLDDD2E2QTT14I7A0Z1USXXFAYWIS55T642TTMU0UHEAJMF0NV2P5DL0RHI?type=summary&agentView=true&fqdn=summary-page' },
  { name: 'Clean README flow', status: 'passed', url: 'https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874PJ6J8CQS29T14EXK8DZ1/dashboard/share/US_6CJDUB1LORZXTAJ7HNZWI36B9FUMXP7K872YUL9HX0V0RA4HSK2XVZQ1Z4CG83KM?type=summary&agentView=true&fqdn=summary-page' },
  { name: 'License cross-check flow', status: 'passed', url: 'https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874REBKY79APPQHMW0TQ9TH/dashboard/share/US_YY0LW5XQK15IHTZRHRSX8WBJCRCZQ898TQWOVKU5LO1MWBY0DHEWAU436UV7B1BG?type=summary&agentView=true&fqdn=summary-page' },
  { name: 'Verification panel flow', status: 'passed', url: 'https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874T753TSC2PSQ1NF9ZYYZP/dashboard/share/US_JRF5V4YYUBBA9F5LG5M18DOT0VLCQFLYQKXND0KHV5KBJHX7QTOVUALN0NU2C7D7?type=summary&agentView=true&fqdn=summary-page' }
];

function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderKaneRuns() {
  var ul = $('kane-runs');
  if (!ul) return;
  ul.innerHTML = KANE_RUNS.map(function (run) {
    var badge = '<span class="badge badge-' + escapeHtml(run.status) + '">' +
      escapeHtml(run.status) + '</span>';
    var label = run.url
      ? '<a href="' + escapeHtml(run.url) + '">' + escapeHtml(run.name) + '</a>'
      : escapeHtml(run.name);
    return '<li>' + label + ' ' + badge + '</li>';
  }).join('');
}

function clearReport() {
  $('score-block').hidden = true;
  $('report-summary').textContent = '';
  $('report-findings').innerHTML = '';
  $('passed-heading').hidden = true;
  $('report-passed').innerHTML = '';
  var hint = $('report-hint');
  hint.hidden = false;
  hint.textContent = '';
}

function renderMessage(msg) {
  clearReport();
  $('report-hint').textContent = msg;
}

function renderReport(result) {
  var issues = result.findings.filter(function (f) { return f.severity === 'issue'; });
  var notes = result.findings.filter(function (f) { return f.severity === 'note'; });

  $('report-hint').hidden = true;
  $('score-block').hidden = false;
  $('score-value').textContent = String(result.score);
  $('score-grade').textContent = result.grade;

  var summary;
  if (issues.length === 0) {
    summary = 'No issues found. ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') +
      ', ' + result.passed.length + ' checks passed.';
  } else {
    summary = issues.length + ' issue' + (issues.length === 1 ? '' : 's') + ', ' +
      notes.length + ' note' + (notes.length === 1 ? '' : 's') +
      ', ' + result.passed.length + ' checks passed.';
  }
  $('report-summary').textContent = summary;

  function findingItem(f) {
    var badge = '<span class="badge badge-' + f.severity + '">' + f.severity + '</span>';
    return '<li class="finding finding-' + f.severity + '">' + badge +
      ' <strong>' + escapeHtml(f.check) + '</strong> — ' + escapeHtml(f.message || '') +
      ' <span class="line-ref">line ' + f.line + '</span>' +
      '<br><code>' + escapeHtml(f.evidence) + '</code></li>';
  }

  var html = '';
  if (issues.length) {
    html += '<li class="group-heading">Issues</li>' + issues.map(findingItem).join('');
  }
  if (notes.length) {
    html += '<li class="group-heading">Notes</li>' + notes.map(findingItem).join('');
  }
  $('report-findings').innerHTML = html;

  if (result.passed.length) {
    $('passed-heading').hidden = false;
    $('report-passed').innerHTML = result.passed.map(function (p) {
      return '<li><span class="badge badge-passed">✓</span> ' + escapeHtml(p) + '</li>';
    }).join('');
  } else {
    $('passed-heading').hidden = true;
    $('report-passed').innerHTML = '';
  }
}

function runAnalysis() {
  var readme = $('readme-input').value;
  if (!readme.trim()) {
    renderMessage('Paste a README first.');
    return;
  }
  renderReport(analyzeReadme(readme, $('files-input').value));
}

document.addEventListener('DOMContentLoaded', function () {
  renderKaneRuns();

  $('sample-btn').addEventListener('click', function () {
    $('readme-input').value = SAMPLE_README;
    $('files-input').value = SAMPLE_FILES;
    runAnalysis();
  });

  $('clean-btn').addEventListener('click', function () {
    $('readme-input').value = CLEAN_README;
    $('files-input').value = '';
    runAnalysis();
  });

  $('analyze-btn').addEventListener('click', runAnalysis);

  $('own-btn').addEventListener('click', function () {
    fetch('./README.md')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        $('readme-input').value = text;
        $('files-input').value = '';
        runAnalysis();
      })
      .catch(function () {
        renderMessage('Could not load this repo\'s README.md from here (opening the file directly can block the fetch). Paste a README above and hit Analyze instead.');
      });
  });
});
