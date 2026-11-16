# Portfolio BI projection

The draft branch now contains generated portfolio pages at `/business-intelligence/`. The visitor hub is `/business-intelligence/`; ten related demonstrations include machine intelligence, connected purchasing, browser BI, work execution, connected batch intake, governed coding, focused invoice sorting, ERP controls, inspectable data/methods and historical purchasing research.

This is a source integration prepared for review. A draft branch and generated routes do not merge or publish themselves. The production site changes only through the separately authorized release workflow.

## One source of business behavior

`tools/bi-prototype/preview/` remains the canonical simulation source. `tools/build-bi-pages.mjs` produces the public projection: eleven HTML pages, explicitly referenced local scripts/styles/CSV, a portfolio framing stylesheet and the research-data license notice. It remaps the prototype hub to `index.html` and the historical research page to `historical-analysis.html`; their query strings and fragments remain intact. Public scripts retain the same rules, fixtures and journal keys.

The generator precomputes the complete plan before writing. Asset admission is limited to declared basename scripts/styles and the fictional invoice sample CSV. It does not copy raw research, curated exports, tools, generated test evidence or unreferenced files. Source/output hashes and route metadata are retained in `tools/bi-public-manifest.json`. Generated text uses UTF-8 without BOM and LF line endings.

Generate after editing canonical simulation content or the shared BI shell:

```powershell
node tools/build-bi-pages.mjs
node tools/build-bi-pages.mjs --check
node tools/test-bi-page-build.mjs
```

Do not hand-edit generated business rules. Check mode rejects drift and unexpected output without overwriting it. Regeneration repairs declared files; it does not silently delete unrecognized files. Source admission failures stop planning before writes.

## Portfolio discovery and framing

The existing primary navigation now includes Business Intelligence. Native full-card links on Home, Demos, Work and Smart Factory open the showcase. Original Work filters/card counts and demonstration URLs are preserved. The longer navigation switches to its menu at tablet widths; Escape/outside focus retain the existing behavior.

Generated pages use portfolio framing, breadcrumbs, canonical/social metadata, license links and the shared theme preference. An explicit light/dark choice overrides operating-system preference across navigation. Non-scripted pages retain readable context and native demonstration links with a clear simulation fallback.

Historical public data remains separate from the fictional company. BPI Challenge 2019 attribution and CC BY 4.0 terms remain visible in the research disclosure and downloadable notice. The general portfolio copyright restriction does not override those data rights. All company transactions, machine observations and work outcomes remain independently fictional.

## Project-path preview and verification

The existing loopback server accepts an optional validated single-directory mount, matching a GitHub Pages project URL:

```powershell
$env:BASE_PATH = '/operations-automation-portfolio'
$env:PORT = '4173'
node tools/serve.mjs
```

Open `http://127.0.0.1:4173/operations-automation-portfolio/business-intelligence/`. Stop the server when finished and clear `BASE_PATH` before using an unprefixed preview. Node and auditors are author-side tools verified on this workstation, not assumptions about an employer's corporate PC.

The mount preserves exclusions for tools, Git metadata, temporary files and private references. Only the approved fictional CSV download gains its required static MIME support; arbitrary JSON and research folders are not opened to the browser.

`tools/test-bi-public.mjs` runs the real generated pages through this server. Full mode checks eleven routes at 320/375/768/1024/1440 pixels in both themes, with automated accessibility screening at narrow/desktop widths. Journey checks cover machine → request → purchasing/payment → BI → work verification, connected batch staging, source/license downloads, theme persistence, native keyboard/touch entry and all four discovery surfaces. It also verifies private-route exclusions.

The existing BI CI job retains all 22 component rule/export/browser groups and adds the public acceptance. Firefox/WebKit jobs keep their route compatibility scans and add `--journeys-only` public BI checks. Source CI verifies deterministic generation, safe rebuild behavior and the financial dictionary/reconciliation contracts. The data-and-methods page inspects six tables from the selected validated purchasing checkpoint, with explicit ownership, grain, fields, relationships, actual rows, financial-stage definitions and 14 computed key/reference/reconciliation/currency checks. Empty checks are distinguished from passes; unresolved references, header mismatches and unsupported currencies remain visible holds. Current-journal deep entry, example isolation, download lineage and corrupt/absent-journal behavior run in public acceptance. This financial inspector does not imply a cross-journal certification of machine or work evidence. Hosted and local outcomes are recorded with the exact review head, outside generated public content. Automated accessibility screening does not establish comprehensive conformance.

Cross-engine control sizing: native menu-list painting is bounded at select fields; keyboard focus stays inside the control. A 320-pixel fallback-font regression retains all work-purpose options and validates inherited coding after selection. Primary-navigation assertions explicitly include the new BI entry.
