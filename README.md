# David H. Fabro — Operations Automation Portfolio

## Project purpose

This is the public-facing proof-of-work portfolio for David H. Fabro. Its primary function is to showcase operational systems, case-study thinking, Smart Factory strategy, architecture, controls, maturity, and outcomes—not to reproduce an online résumé. Experience and credentials remain secondary evidence behind the work.

The portfolio also connects demonstrated work to repeatable operational problem patterns. That structure is intended to validate whether the same capabilities could support future independent operational-systems services without presenting an established consulting company or hard sales funnel.

The repository is published for professional evaluation. Copyright and reuse boundaries are documented in `COPYRIGHT.md`; publication does not grant a production-deployment or redistribution license.

The primary brand is intentionally personal. `Fabro Operational Systems` is stored only as an exploratory future-business value in `scripts/site-config.js`; it is not presented as an established firm.

## Public evidence and fictional data

Numerical scenario inputs and demonstration workload sizes are independently invented; they are not transformed versions of confidential employer figures. Public case studies emphasize transferable problem-solving, control ownership, architecture, risk and verification. They do not present fictional examples as employer achievements. Private exports and numerical audit ledgers are never published to the repository.

## Technology stack

- Semantic HTML5
- Modern CSS with responsive, dark/light, reduced-motion, and print styles
- Small, dependency-free vanilla JavaScript layer
- Synthetic HTML/CSS product visuals and architecture diagrams
- Restrictive browser content policy and no-referrer policy on every page
- No backend, tracking, analytics, package manager, or external runtime dependency

This dependency-free static architecture avoids an unnecessary package and build lifecycle while remaining easy to maintain and portable across common static hosts.

## Run locally

Because the site uses clean directory routes, run it through the included local static server from this project folder:

```powershell
node .\tools\serve.mjs
```

Then open:

```text
http://127.0.0.1:4173/
```

Stop the server with `Ctrl+C`.

The preview binds only to loopback and denies private inputs, Git metadata, temporary files, and tooling. No installation or package download is needed when Node.js is available.

## Build instructions

There is no compilation or bundling step. The source files are the production files. A production check consists of serving the folder and verifying that all local routes and assets return successfully.

When Node.js is available, run the included no-dependency validation command before publishing:

```powershell
node .\tools\validate-site.mjs
node .\tools\test-system-data.mjs
node .\tools\test-system-page-build.mjs
```

It checks local links and fragments, duplicate IDs, required launch artifacts, demo security and sharing metadata, shared demo navigation, common leakage indicators, and JavaScript syntax. The same validator runs automatically on pushes and pull requests through a least-privilege GitHub Actions workflow whose checkout dependency is pinned to an immutable commit.

Seven system pages are assembled from `tools/build-system-pages.mjs`. Edit that source when changing their metadata or static framing, then run `node tools/build-system-pages.mjs` to regenerate them. `node tools/build-system-pages.mjs --check` detects drift without writing files. The rebuild-safety test also verifies that regeneration preserves the shared workspace/help hooks and that check mode rejects an edited output without overwriting it; CI runs this test before release.

## Browser quality checks

The pull-request workflow also runs Playwright 1.62.1 and axe-core 4.14.0 in a temporary CI tools directory. These are development-only auditors; nothing is added to the published site's runtime. The workflow checks all 30 pages at desktop/mobile sizes in both themes, exercises discovery and keyboard navigation, protects Ladder identity and device-mode behavior, and screens 14 portfolio shell pages for WCAG 2.2 AA violations.

To reuse an existing local installation, set `PLAYWRIGHT_MODULE` to its module directory and `AXE_CORE_PATH` to its `axe.min.js` file. Set `BROWSER_CHANNEL=msedge` to use installed Edge, or leave it unset for Playwright Chromium. Then run:

```text
node tools/test-browser.mjs
node tools/test-gallery.mjs
node tools/run-regressions.mjs
node tools/audit-accessibility.mjs
node tools/audit-demo-accessibility.mjs
```

Every demo shares a task-specific help disclosure and a confirmed full-session restart. Its existing application controls remain specific to the workflow.

`tools/test-engine-compatibility.mjs` checks all 30 routes at four widths in both theme preferences, then exercises representative navigation and workflow paths. `tools/audit-demo-accessibility.mjs` screens all 15 demo entries and their expanded help disclosures. Both default to Chromium; set `BROWSER_ENGINE=firefox` or `BROWSER_ENGINE=webkit` to use a matching installed Playwright test browser. `BROWSER_CHANNEL` applies only to Chromium. CI runs the Firefox and WebKit checks as separate jobs using the same pinned development tools. The WebKit test build does not replace physical Safari/iOS acceptance. Follow the [Playwright browser installation instructions](https://playwright.dev/docs/browsers) when setting up these optional development browsers.

The maintained workflow runner lists the focused tests in `tools/run-regressions.mjs`; individual scripts can be run separately to investigate a failure. CI uses the same runner, including notification draft/cancel/submit/reset behavior, identity, record locking, guided controls, report filters, and evidence handling.

Each browser check starts and stops its own loopback preview (ports 4174, 4175, 4184, 4186, 4188–4193, 4195–4198, 4201, 4204, 4207, and 4209; override with `TEST_PORT`). The connected-rules check is a dependency-free unit test and does not start a server. The ordinary preview accepts `PORT` and otherwise uses 4173. Reports and screenshots go to ignored `tmp/` directories; never commit these directories. Automated accessibility results supplement keyboard and visual inspection and do not certify conformance. Physical touch devices, assistive technology, and other browser engines need separate validation.

The Work library uses `data-work-kind` (`implemented`, `analytics`, or `architecture`) on each project card. Its optional search and maturity filters use native controls, announce result counts, preserve shareable `q`/`maturity` query parameters, and show all projects when JavaScript is unavailable. Add new cards to the evidence table as well as the library, and update the library summary count.

For release and recovery steps, see [Release and recovery](RELEASE.md).

## Deployment options

The folder can be deployed unchanged to any static host, including:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel
- Azure Static Web Apps
- Any conventional static web server

The prepared GitHub Pages production URL is:

```text
https://hfabro.github.io/operations-automation-portfolio/
```

Canonical, Open Graph, Twitter image, and structured-data URLs are configured for that address. Update those values if the site later moves to a custom domain.

## Edit brand and contact content

Update `scripts/site-config.js` for:

- primary name and descriptor
- exploratory future-business name
- email (optional; intentionally blank in the public build)
- LinkedIn URL
- location
- resume URL

The confirmed LinkedIn value has been populated from supplied information. The email value is intentionally blank so the public page directs contact through LinkedIn without exposing an email address. The public location is intentionally generalized to the Chicago Metropolitan Area. A GitHub account exists, but its public link is intentionally omitted until the profile is professionally aligned with the portfolio.

The concise homepage lives in `index.html`. Major content is organized into task-focused hubs:

- `work/` — selected systems, maturity labels, evidence map, and detailed case studies
- `demos/` — the complete interactive proof lab
- `approach/` — delivery method, independent-build model, AI controls, and security
- `smart-factory/` — maturity, roadmap, IT/OT, governance, and value-realization approach
- `about/` — results, experience progression, capabilities, credentials, and contact

Shared presentation lives in `styles.css`, hub and case-study layouts live in `assets/hubs.css`, and the homepage, Work gallery, and Systems index have page-specific styles in `assets/home.css`, `assets/gallery.css`, and `assets/systems.css`. `assets/polish.css` provides the shared rounded treatment on portfolio pages. Shared interaction behavior lives in `scripts/app.js`.

## Interactive demonstrations

Primary implemented-system recreations are available at:

- `/demos/plant-operations-hub/`
- `/demos/facility-leaks/`
- `/demos/ladder-inspection/`
- `/demos/digital-kanban/`
- `/demos/toolbox-talks/`
- `/demos/ehs-control/`
- `/demos/electrical-analytics/`
- `/demos/forklift-fleet/`

The hub also links to the intentionally simple `/demos/service-intake/` form. Supporting architecture and concept demonstrations remain available at:

- `/demos/compliance-workflow/`
- `/demos/cmms-lifecycle/`
- `/demos/telemetry-explorer/`
- `/demos/connected-operations/`
- `/demos/building-operations/`
- `/demos/smart-factory-roadmap/`

The original eight demos retain optional guided runs. The shared `scripts/demo-guide.js` configuration points to real interactive controls and advances on confirmed state signals where required. The new platform recreations use direct, labeled task steps instead of an additional guide overlay.

The systems library uses `scripts/demo-series.js` and `assets/demo-series.css` for previous/next navigation. The simple service form returns directly to the hub. Canvas-style workflows retain `scripts/canvas-sim.js` and `assets/canvas-sim.css`; new SharePoint, Forms, and Power BI recreations intentionally use different platform-appropriate interfaces.

### Maintaining the recreated systems

- `scripts/operations-data.js`: deterministic fictional interval and fleet fixtures.
- `scripts/operations-systems.js`: portal, report calculations, and browser-only workflow state.
- `assets/operations-systems.css`: source-platform-inspired presentation.
- `assets/demo-polish.css`: shared demo framing and product-interface styling for Canvas and operational system recreations.
- `assets/platform-fidelity.css`: targeted ladder and physical Kanban refinements.
- `tools/build-system-pages.mjs`: assembles the seven new static HTML wrappers. Run only when changing wrapper metadata or structure; edit the generator rather than generated wrapper files.
- `tools/test-system-data.mjs`: verifies interval identity, energy integration, fleet records, and charging-model arithmetic.

Private visual inputs are ignored and never part of the release. Do not deploy this entire working directory indiscriminately: publish the reviewed Git tree. Temporary implementation helpers are not supported build tools and must not be committed. No Microsoft authentication, live list, upload, equipment control, or report service is connected.

The ladder inspection demo demonstrates:

- QR-style asset identification without requesting camera access
- a structured six-point inspection
- required-response validation
- deterministic exception and corrective-action rules
- simulated evidence attachment
- separate asset and inspection-occurrence records
- synthetic workflow events, inspection history, and reporting readiness
- clean-pass and safety-exception scenarios

Demo content is separated into:

- `demos/ladder-inspection/index.html` — semantic interface structure
- `demos/ladder-inspection/demo.css` — isolated responsive presentation
- `demos/ladder-inspection/demo-data.js` — synthetic asset, checklist, history, and architecture data
- `demos/ladder-inspection/demo.js` — client-side workflow and deterministic rules

The demonstration has no backend and does not submit, transmit, or retain visitor inputs. Refreshing or resetting the page clears the scenario.

The compliance workflow demo adds a second system pattern: a stable requirement master generating unique scheduled occurrences. It validates completion evidence, exception notes, ownership, lifecycle changes, simulated reminders, and audit-history preservation using fully synthetic records.

The digital Kanban demo is a synthetic recreation of an implemented canvas-app pattern. It demonstrates QR route resolution, direct-item and multi-item stock points, a composite open-request key for duplicate prevention, snapshotted request context, a controlled restocker queue, refill completion, and session history. It does not expose source-system data or connect to SharePoint.

The telemetry explorer adds an analytical pattern. It provides five synthetic equipment profiles, 30-minute state modeling, accessible interval data, metric switching, a modeled peak-demand overlay, fleet comparison, and explicitly bounded decision-support interpretations. It does not connect to a live API or attribute production savings.

The connected-operations console adds a Manufacturing 4.0 pattern. It provides two synthetic assets and four operating scenarios: stable operation, repeated microstops, quality drift, and material starvation. The interface decomposes OEE, visualizes machine states and modeled rate, shows illustrative loss categories and a contextualized event stream, evaluates illustrative escalation rules against fictional samples, event times, or loss minutes, and keeps the final decision with accountable people. OEE components are scenario assumptions shared by both assets; the interval and loss examples are separate and do not calculate those components. It does not connect to PLC, SCADA, MES, historian, edge, CMMS, or production-control systems and does not claim deployed predictive maintenance.

The CMMS lifecycle demo is a clean-room synthetic recreation of a broader local front-end prototype. It demonstrates asset and PM-plan selection, versioned template snapshots, unique occurrences, technician execution, threshold validation, evidence state, sign-off, supervisor disposition, capacity context, and transparent reliability prioritization. It has no live CMMS or ERP connection, does not persist records, and does not claim an enterprise deployment or predictive-maintenance capability.

The Building Operations Command Center generalizes a map-based reporting pattern into building-wide and machine-level visualization. Its code-native, CAD-style synthetic schematics use recognizable drafting conventions, equipment footprints, spatial markers, and a revision block without reproducing a real facility layout. Visitors can filter synthetic report types, select spatial markers, move reports through acknowledgement, work-request, and verified-resolution states, and create a browser-only observation. It is explicitly SCADA-inspired visualization—not a BMS, SCADA, PLC, alarm-management, or equipment-control implementation.

The Smart Factory Roadmap Studio adds the transformation-management layer. Visitors can compare three synthetic plant profiles, select a strategic priority, review an eight-domain maturity assessment, see a synthetic use-case backlog reorder using an inspectable scoring model, and examine a gated foundation-to-sustainment roadmap. It also includes a platform-neutral IT/OT reference architecture and cross-functional governance model. It is an architecture and prioritization prototype—not a claim of enterprise MES, SCADA, PLC, digital-twin, OT-cybersecurity, or multi-site deployment experience.

The eight legacy interactive routes retain their validated behavior; their application surfaces now use the shared Microsoft-style finishing layer. Ladder and Kanban remain implemented-system recreations, not supporting concepts. New implemented-system recreations use platform-specific layouts rather than extending the Canvas shell to every report and portal. Transactional workflows use phone-oriented navigation, while analytics, maintenance, connected-operations, spatial-response, and roadmap experiences use tablet or workspace-oriented screens. Role-appropriate phone, tablet, and full-system experience modes preserve the working controls and controlled state changes while showing how a frontline user, planner, supervisor, analyst, facilities leader, or transformation manager would encounter the operating model. The telemetry chart also supports pointer/touch inspection and keyboard interval navigation; the Kanban workflow explicitly hands a submitted requester signal into the restocker view.

## Navigation model

The site uses a hub-and-spoke information architecture:

- the homepage provides a concise orientation, three selected cases, and paths to the complete work and systems libraries
- global navigation stays consistent across all portfolio hubs and case studies
- Work, Demos, Approach, Smart Factory, and About each have a dedicated URL
- long hub and case-study pages include a contextual “On this page” navigation
- individual case studies use breadcrumbs and previous/next paths
- every demo includes a return path to its case, work context, or operating hub; the main series also provides previous/next navigation

On desktop, the contextual navigation remains sticky beside the content. On smaller screens it becomes a native expandable disclosure instead of a persistent bottom bar, leaving more viewport space for the work itself. A keyboard-accessible back-to-top control appears after the visitor moves beyond the opening content.

## Add another case study

1. Copy an existing folder under `work/` and give the new case a short, descriptive URL slug.
2. Update the canonical and Open Graph URLs, title, description, breadcrumbs, case navigation, and maturity label.
3. Preserve the evidence pattern: operational problem, constraints, approach, architecture, controls/failure modes, outcome, and lessons.
4. Add the summary card to `work/index.html`; add it to the homepage only if it is one of the few strongest proofs.
5. Link a synthetic demo only when there is a meaningful workflow or decision to operate.
6. Add the new route to `sitemap.xml` and the required-artifact list in `tools/validate-site.mjs` if it is launch-critical.
7. Use only sanitized descriptions and synthetic data; verify every maturity and measurable claim before publishing.
8. Test the page with keyboard and pointer input at 375px, 768px, and 1440px widths.

## Resume

The `/resume/` route links to `resume/david-h-fabro-resume.pdf`, a public-safe derivative of the supplied résumé. The public copy removes the phone number and generalizes the location; the original Word document remains outside the site checkout.

`tools/export-resume-pdf.ps1` requires the explicit `-ConfirmPublicSafeSource` switch. Before using it, create a source copy with private contact details removed. The switch is a deliberate safety gate, not an automated privacy guarantee; always extract and review the finished PDF text before publishing it.

## Privacy and confidentiality

All project descriptions are sanitized. All interface previews, lists, records, asset identifiers, dates, and charts are synthetic representations created for this portfolio. The site must never include employer credentials, internal URLs, proprietary documents, employee information, private asset identifiers, confidential data, or screenshots from real company systems.

Interactive demonstrations must follow the same rule. Demo data should remain visibly synthetic, require no production credentials, and avoid camera, upload, or external-system permissions unless a future version has a documented and privacy-reviewed reason for them.

The public site is intentionally static and uses a restrictive Content Security Policy: scripts and assets are limited to the site itself, network connections are disabled, forms cannot submit, and embedded frames, objects, media, and workers are blocked. This reduces browser-side attack surface, but it does not replace dependency review if third-party services are added later.

`SECURITY.md` defines a bounded vulnerability-reporting policy, and `/.well-known/security.txt` publishes the canonical reporting route. Neither document represents a bug-bounty program, security-service offering, or authorization to test third-party systems.

The current GitHub Pages response provides HTTPS and HSTS, while the project-controlled CSP and referrer policy are delivered in the HTML. A CSP delivered through a `<meta>` element cannot enforce `frame-ancestors` or report-only collection. If stronger response-header controls such as `frame-ancestors`, `Permissions-Policy`, and `X-Content-Type-Options` become a priority, move the static files behind a host or edge layer that supports repository-defined response headers rather than implying those controls are active here.

## Pre-publication checklist

- If an email address is added later, confirm that it is intended for internet-wide distribution and monitor it for spam or phishing.
- Re-scan the résumé PDF after every replacement to confirm that no phone number or precise home location has returned.
- Verify the scope, timeframe, and attribution of every result metric.
- Confirm project maturity labels.
- Confirm all public workload sizes, fleet examples and energy figures are independently fictional, explicitly labeled, and cannot be reverse-mapped to employer information.
- Confirm the GitHub Pages URL or replace it with the selected custom domain.
- Re-run responsive, accessibility, console, and broken-link checks on the selected host.

## Microsoft ecosystem presentation

`scripts/workflow-contracts.js` holds public bilingual five-question quiz fixtures, pure scoring/report metrics, and fictional spatial grid coordinates. `scripts/workflow-recreations.js` renders the leak location/details/response workflow and Toolbox Talks material/quiz/snapshot workflow. Both load before `operations-systems.js`; do not replace them with static illustrations. Ladder cycle/disposition/history logic remains in its route's `demo.js`. Run the system-data tests after fixture changes.

`assets/microsoft-surfaces.css` is the shared presentation-only layer, loaded after route CSS. It separates Canvas workflows, SharePoint pages, Forms questionnaires, and Power BI-style reports from portfolio branding. `scripts/operations-systems.js` sets `data-platform` when switching an operational view to a reporting snapshot. Preserve those markers when adding views. Public navigation says Systems; `/demos/` URLs stay stable. No Microsoft tenant shell, trademark logo, account profile, or live integration is simulated.

Phone/tablet modes use a bounded, keyboard-focusable main scrollport in `assets/device-preview.css`, with internal vertical scrolling and local horizontal table scrolling. System mode remains a normal page. Facility Leak uses its own bounded Canvas surface in `microsoft-surfaces.css`. Connected Operations and Smart Factory are full workspaces, not simulated devices. Do not introduce large minimum heights or nested vertical form/gallery scrollers that expand the outer device. Test bottom actions and confirmations after changing content density.
