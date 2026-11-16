# Portfolio BI projection

The projection contains generated portfolio pages at `/business-intelligence/`. The visitor hub is `/business-intelligence/`; fourteen related demonstrations include Finance policy review, the source-document inbox, business trends, the management overview, machine intelligence, connected purchasing, browser BI, work execution, connected batch intake, governed coding, focused invoice sorting, ERP controls, inspectable data/methods and historical purchasing research.

This is a source integration prepared for review. A draft branch and generated routes do not merge or publish themselves. The production site changes only through the separately authorized release workflow.

## One source of business behavior

`tools/bi-prototype/preview/` remains the canonical simulation source. `tools/build-bi-pages.mjs` produces the public projection: fifteen HTML pages, explicitly referenced local scripts/styles/CSV, a portfolio framing stylesheet and the research-data license notice. It remaps the prototype hub to `index.html` and the historical research page to `historical-analysis.html`; their query strings and fragments remain intact. Public scripts retain the same rules, fixtures and journal keys.

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

`tools/test-bi-public.mjs` runs the real generated pages through this server. Full mode checks fifteen routes at 320/375/768/1024/1440 pixels in both themes, with automated accessibility screening at narrow/desktop widths. Journey checks cover machine → request → purchasing/payment → BI → work verification, connected batch staging, source/license downloads, theme persistence, native keyboard/touch entry and all four discovery surfaces. It also verifies private-route exclusions.

The existing BI CI job retains all 22 component rule/export/browser groups and adds the public acceptance. Firefox/WebKit jobs keep their route compatibility scans and add `--journeys-only` public BI checks. Source CI verifies deterministic generation, safe rebuild behavior and the financial dictionary/reconciliation contracts. The data-and-methods page inspects six tables from the selected validated purchasing checkpoint, with explicit ownership, grain, fields, relationships, actual rows, financial-stage definitions and 14 computed key/reference/reconciliation/currency checks. Empty checks are distinguished from passes; unresolved references, header mismatches and unsupported currencies remain visible holds. Current-journal deep entry, example isolation, download lineage and corrupt/absent-journal behavior run in public acceptance. This financial inspector does not imply a cross-journal certification of machine or work evidence. Hosted and local outcomes are recorded with the exact review head, outside generated public content. Automated accessibility screening does not establish comprehensive conformance.

Cross-engine control sizing: native menu-list painting is bounded at select fields; keyboard focus stays inside the control. A 320-pixel fallback-font regression retains all work-purpose options and validates inherited coding after selection. Primary-navigation assertions explicitly include the new BI entry.

## Current and retained work context

`preview/work-context.js` is a read-only projection of the unchanged work, maintenance and purchasing journals. It validates recorded work and compares its captured source checkpoints with the current journals using canonical policy/envelope metadata and the complete ordered command prefix. Matching revisions, request/PO IDs or command IDs alone do not establish ancestry. Appending financial actions to the same journal keeps work linked; replacing a journal, including with changed receipt content at the same revision, does not.

The hub counts only the latest independently verified work version per condition, separated into linked-current, retained-earlier and unavailable-context groups. Work and machine views qualify lifecycle decisions with the same context. A missing, damaged or non-replayable current source is unavailable; it is not treated as a successful empty source. Explicit empty-string checkpoints are rejected. Prior decisions and captured checkpoints remain intact; historical verification does not complete a replacement purchasing scenario.

Combined and standalone work evidence exports add `contextEvidence` with per-version comparison results, captured/current revision references and latest-case counts. Persisted journal schemas and commands are unchanged. Standalone work evidence can retain valid historical work while identifying unavailable current sources; the combined bundle keeps its existing hold when a current journal is damaged. Inspection never repairs, replaces or creates saved journals. The source check `tools/test-bi-work-context.cjs` covers command-content ancestry, extensions, replacements, missing/invalid sources, multiple versions and immutability. Public acceptance checks consistency across hub, machine/work views and both exports after batch replacement and source damage.


## Connected visitor story

The public projection inserts a presentation-only connected-story guide on the hub and four connected stages. `BI_STORY` in the generator owns the route labels and short instructions. Native numbered links indicate page location, not completed work. They do not create, replace or reset journals. The report destination explicitly selects `source=current&measure=paid`, while the separate guided report examples remain available. Existing component routes and case-study discovery are preserved.

The fresh pump walkthrough now demonstrates a deliberate receipt hold: import a one-unit invoice before acceptance, inspect the hold, accept the unit against its linked PO, then post/authorize/pay that same invoice. Source evidence continues into the current-journal report and explicit work verification. Build checks cover step routes/current-location metadata. Public acceptance follows the native start, invoice hold/resolution and current-report links, with keyboard/no-JavaScript navigation retained. The guide is portfolio framing; canonical rule modules and persisted journal formats are unchanged.


## Management overview

`management-overview.html` adds a read-only position/ownership/work-evidence view using the existing financial and work-context models. Its guided `SYN-MANAGEMENT-1` snapshot replays existing commands: four approved PO lines across three cost centers, five distinct invoices (three held), a separate fifth requisition held for missing coding policy, paid and unpaid costs, and technician work awaiting explicit verification. The declared financial totals are approved $5,950; open $4,650; received-uninvoiced $1,400 within open; posted $1,300 = unpaid $50 + paid $1,250. They are stages, not additive purchases or savings.

Primary invoice-owner groups partition held documents once. Coding coverage uses approved PO lines only and discloses held requisitions separately. Work figures use the current/retained/unavailable context comparison. Null or unreadable journals do not become example or zero data; readable sections remain available, and full export requires all three validated sources. The current-journal query is `?source=current`. Guided exploration, metric selection, owner filtering and downloads never write saved journals. Financial action timestamps are not repurposed for aging, trends or claimed efficiency.

Source checks run `tools/test-bi-management.cjs`; public acceptance adds exact-position, ownership/coding denominator, allocation focus/detail, export/checkpoint, sample/current isolation and unavailable-source scenarios. Canonical hub discovery includes the new native full-card destination. Core purchasing, invoice, machine and work command/policy modules are unchanged.


Management inspection state: unchanged source refreshes and full downloads preserve the selected financial stage, invoice owner, allocation evidence and expanded coding holds. Source identity includes the complete validated source/checkpoint content and selected source mode; a changed command at the same revision does not preserve stale inspection. Changed sources reset source-specific selections. Full management exports include the inspected view selection alongside the complete model/checkpoints; they are not filtered financial totals. Native allocation buttons identify both PO line and cost center. Held-invoice buttons open source-bound, read-only document evidence: primary owner, declared source-currency net, retained invoice versions, correction decisions, evaluation history and line-by-cost-center PO allocations. An unchanged refresh and export preserve the inspected invoice; an excluding owner filter, changed complete source content, source-mode switch or unavailable source clears it. A selected invoice ID is included in the export view selection without filtering the complete exported model. Amounts are unposted source values, and unsupported currencies do not enter USD financial totals. All source labels/reasons are rendered as text.


## Business-time trends and aging

usiness-trends.html queries the independent fictional 90-day cohort through usiness-trends-worker.js. The generator explicitly admits that worker, the unchanged usiness-time-rules.js, and usiness-time-data.js, a deterministic browser projection owned by uild_business_time_fixture.cjs. Only fictional source and pinned policy data are included. No raw research, private inputs, external service, new package or saved-journal schema is admitted. The page allows same-origin workers while retaining the existing restrictive script/style/connect policies.

Period posted/paid flows and unpaid roll-forward reconcile to cutoff source events. Calendar-month slices intersect the selected range; closing balances are snapshots. Held-document owner/receipt-age filters do not change financial totals. Unknown dates remain visible. Metric, document, allocation, work and dependency controls lead to their actual source evidence. Downloads preserve inspection selection and include only cutoff-included original events/model checkpoints; they do not mutate journals.

	ools/test-bi-trends.mjs verifies actual generated project-path worker execution in the configured browser, both themes at five widths, expanded-source accessibility, monthly monetary goldens, unknown dates, earlier cutoffs, filtered downloads, invalid-query recovery, missing/invalid worker sources, explicit empty cohorts, untouched storage and native no-JavaScript discovery. Publication and deployed acceptance remain separate release steps.


## Source-document invoice inbox

`document-inbox.html` adds executed UTF-8 fixed-format invoice parsing, exact-byte SHA-256 identity, field-to-source line navigation, distinct file/document queues and source-bound independent price-revision decisions. Its public assets include the interface, `inbox-rules.js`, `inbox-samples.js`, `ubl-invoice-rules.js` and `ubl-invoice-samples.js`. The sample modules own the fictional source strings. Text files use the declared text grammar; XML files use the explicit net-only UBL 2.1 subset with namespace-aware field paths. All remain in page memory. The XML profile does not execute full XSD/Peppol validation. See `UBL-INVOICE-PROFILE-2026-11-16.md` for limits and lineage semantics. PDF/image/email OCR is explicitly unsupported. Existing coding, purchasing and invoice controls and journal schemas are unchanged; no extraction result posts, authorizes, pays or replaces saved journals. See the versioned document-inbox contract for source envelopes, encoding/size limits, duplicate/revision distinctions and verification.


## Combined visitor presentation

The hub groups the management snapshot, dated trends and source-document inbox under one management-perspective entry point. Native full-card destinations remain unchanged. Visible copy distinguishes the guided/current snapshot, independent 90-day cohort and separate temporary inbox. The original connected-story path continues to share its saved journals; moving between other evidence modes does not join their records. The implementation summary includes the executed trends and supported-text extraction capabilities with their source and OCR boundaries.

Local preview exclusions are not confidentiality controls for a public repository or legacy root GitHub Pages. Private inputs and generated QA evidence remain untracked. A release preflight checks the full changed source payload, repository/Pages identity, exact candidate, prior public bytes and recovery revision before requesting an explicit publication decision.


## Finance mapping review

The Finance workbench adds an independent, closed, append-only proposal/decision journal over the unchanged coding resolver. Existing approved rules cannot be replaced. Pending/rejected mappings do not code requests, approvals require a different person and cannot backdate effectiveness, and half-open effective dates govern explicit new checks. The original captured hold and saved journals remain unchanged. The workbench is temporary; downloads retain baseline, commands, versions and both evaluations. Role/person selectors demonstrate controls rather than production authentication.

## Reusable table handoff

The existing Data and methods route adds `data-methods-export.js` and complete six-table CSV/schema exports. The projection uses the unchanged validated dictionary/model; original JSON inspection remains available. Snapshot/source and file hashes, explicit types/null/escaping rules, complete-versus-preview row counts, held/empty checks and delayed-source invalidation are part of the contract. See `BI-TABLE-HANDOFF-2026-11-16.md`. This adds no visitor route, core financial rule, persisted journal format or native Power BI claim.

Management coding holds retain the captured request quantity, decision and policy identity. A focused JSON download contains that unchanged request and its validated purchasing checkpoint. The separate fixed Finance example is linked with an explicit scope boundary; it does not resolve the captured management hold, approve a rule, recode purchases or write journals.
