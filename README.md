# TruthLens — README Lie Detector

TruthLens checks the claims a README makes, right in your browser. Paste a
README, optionally add the project's file list, and TruthLens scores how
honest the document is: do its internal links actually land anywhere, do the
files it references exist, does the license it claims have a matching file
behind it?

Everything runs locally. There is no server, no build step, and nothing you
paste ever leaves the page.

## Run it

Open `index.html` in any browser, or serve this folder with any static file
server, for example:

```bash
python3 -m http.server 8080
```

Then visit the local address the server prints. Opening the file directly
also works for the paste and sample flows; the "Analyze this repo's README"
button needs a served page because browsers block file fetches from local
files.

## What it checks

- **Internal anchors** — section links that point at headings which do not
  exist (GitHub-style heading slugs).
- **Image alt text** — images with no alternative text for screen readers.
- **Placeholder promises** — phrases that signal an unfinished document. The
  exact phrases live inside the code block below on purpose, so this very
  README stays clean when TruthLens analyzes it:

```text
coming soon, todo, fixme, wip, under construction, lorem ipsum
```

- **License cross-check** — a license claimed in prose with no matching
  license file in the file list you provide. With no file list, this check
  reports a note instead of a penalty.
- **Missing files** — relative links and images that name files absent from
  the file list you provide.
- **Version consistency** — more than one distinct version string in one
  document earns a note (never a penalty).

Each issue subtracts points (with per-check caps); a clean document scores
100 and is graded "Solid".

## Features

- One-click sample README with planted flaws, so the report has something to
  find.
- One-click clean README that scores a perfect 100.
- Analyze any pasted README, with or without a file list.
- Analyze this repository's own README as a self-check.
- Score, letter-style grade, grouped findings with line numbers and quoted
  evidence, and a passed-checks list.

## Verified with Kane CLI

TruthLens was built by an AI coding agent and verified with Kane CLI, in a
closed loop:

1. The agent builds a feature.
2. Kane CLI drives a real browser through the matching flow (the flow files
   live in the `flows` folder) and reports pass or fail with evidence.
3. A failed run drives the next fix — the finding, not a guess, decides what
   changes.
4. The flow is re-run until it passes.

The verification panel inside the app lists the Kane runs: the sample flow,
the clean flow, the license cross-check flow, and the panel flow itself.

## Tech notes

- Zero dependencies: plain HTML, CSS, and JavaScript.
- `analyze.js` is pure logic with no DOM access, so it runs identically in
  the browser and under Node — `test-sample.mjs` exercises it directly.
- Works from a local file, a local server, or any static host.

## License

Released under the MIT License. See the LICENSE file in this repository for
the full text.

### Verification log

First full verification round, run against the locally served app on
24 November 2026. All four flows passed in a real browser driven by Kane CLI:

- Sample README flow — passed. [Run evidence](https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874MEMEYYME8DKJE5XH4WYQ/dashboard/share/US_8AH3YKLDDD2E2QTT14I7A0Z1USXXFAYWIS55T642TTMU0UHEAJMF0NV2P5DL0RHI?type=summary&agentView=true&fqdn=summary-page)
- Clean README flow — passed. [Run evidence](https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874PJ6J8CQS29T14EXK8DZ1/dashboard/share/US_6CJDUB1LORZXTAJ7HNZWI36B9FUMXP7K872YUL9HX0V0RA4HSK2XVZQ1Z4CG83KM?type=summary&agentView=true&fqdn=summary-page)
- License cross-check flow — passed. [Run evidence](https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874REBKY79APPQHMW0TQ9TH/dashboard/share/US_YY0LW5XQK15IHTZRHRSX8WBJCRCZQ898TQWOVKU5LO1MWBY0DHEWAU436UV7B1BG?type=summary&agentView=true&fqdn=summary-page)
- Verification panel flow — passed. [Run evidence](https://test-manager.lambdatest.com/projects/01M873S7PH10P67H4PTMW6ZTV8/test-cases/01M874T753TSC2PSQ1NF9ZYYZP/dashboard/share/US_JRF5V4YYUBBA9F5LG5M18DOT0VLCQFLYQKXND0KHV5KBJHX7QTOVUALN0NU2C7D7?type=summary&agentView=true&fqdn=summary-page)

The loop also caught real faults before the app flows ever ran. The first
Kane runs against a public test page failed with a network tunnel verdict;
those verdicts named the broken layer precisely (a proxy setting in the
agent sandbox), the setup was corrected from the verdict text, and the
rerun passed. The four app flows then passed against the corrected setup
with no code changes in between, which is the point of the loop: Kane
separates environment faults from product faults, and the agent fixes
only the layer the evidence blames.
