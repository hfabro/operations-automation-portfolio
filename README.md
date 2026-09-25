# David H. Fabro — Operations Automation Portfolio

## Project purpose

This is the public-facing proof-of-work portfolio for David H. Fabro. Its primary function is to showcase operational systems, case-study thinking, Smart Factory strategy, architecture, controls, maturity, and outcomes—not to reproduce an online résumé. Experience and credentials remain secondary evidence behind the work.

The portfolio also connects demonstrated work to repeatable operational problem patterns. That structure is intended to validate whether the same capabilities could support future independent operational-systems services without presenting an established consulting company or hard sales funnel.

The primary brand is intentionally personal. `Fabro Operational Systems` is stored only as an exploratory future-business value in `scripts/site-config.js`; it is not presented as an established firm.

## Technology stack

- Semantic HTML5
- Modern CSS with responsive, dark/light, reduced-motion, and print styles
- Small, dependency-free vanilla JavaScript layer
- Synthetic HTML/CSS product visuals and architecture diagrams
- Restrictive browser content policy and no-referrer policy on every page
- No backend, tracking, analytics, package manager, or external runtime dependency

This stack was selected because Node.js/npm were not available in the inspected environment and a dependency-free static site is the simplest stable architecture for portfolio v1.

## Run locally

The site works when `index.html` is opened directly. For a more production-like local URL, run the included PowerShell server from this project folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\serve.ps1
```

Then open:

```text
http://127.0.0.1:4173/
```

Stop the server with `Ctrl+C`.

## Build instructions

There is no compilation or bundling step. The source files are the production files. A production check consists of serving the folder and verifying that all local routes and assets return successfully.

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
- email
- LinkedIn URL
- location
- resume URL

Confirmed email and LinkedIn values have been populated from supplied information. The public location is intentionally generalized to the Chicago Metropolitan Area. A GitHub account exists, but its public link is intentionally omitted until the profile is professionally aligned with the portfolio.

Core portfolio copy lives in `index.html`. Presentation and responsive behavior live in `styles.css`. Interaction behavior lives in `scripts/app.js`.

## Interactive demonstrations

Synthetic proof-of-concept demos are available at:

- `/demos/ladder-inspection/`
- `/demos/compliance-workflow/`
- `/demos/digital-kanban/`
- `/demos/cmms-lifecycle/`
- `/demos/telemetry-explorer/`
- `/demos/connected-operations/`
- `/demos/building-operations/`
- `/demos/smart-factory-roadmap/`

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

The connected-operations console adds a Manufacturing 4.0 pattern. It provides two synthetic assets and four operating scenarios: stable operation, repeated microstops, quality drift, and material starvation. The interface decomposes OEE, visualizes machine states and modeled rate, classifies loss, preserves a contextualized event stream, applies inspectable deterministic escalation rules, and keeps the final decision with accountable people. It does not connect to PLC, SCADA, MES, historian, edge, CMMS, or production-control systems and does not claim deployed predictive maintenance.

The CMMS lifecycle demo is a clean-room synthetic recreation of a broader local front-end prototype. It demonstrates asset and PM-plan selection, versioned template snapshots, unique occurrences, technician execution, threshold validation, evidence state, sign-off, supervisor disposition, capacity context, and transparent reliability prioritization. It has no live CMMS or ERP connection, does not persist records, and does not claim an enterprise deployment or predictive-maintenance capability.

The Building Operations Command Center generalizes a map-based reporting pattern into building-wide and machine-level visualization. Visitors can filter synthetic report types, select spatial markers, move reports through acknowledgement, work-request, and verified-resolution states, and create a browser-only observation. It is explicitly SCADA-inspired visualization—not a BMS, SCADA, PLC, alarm-management, or equipment-control implementation.

The Smart Factory Roadmap Studio adds the transformation-management layer. Visitors can compare three synthetic plant profiles, select a strategic priority, review an eight-domain maturity assessment, see a synthetic use-case backlog reorder using an inspectable scoring model, and examine a gated foundation-to-sustainment roadmap. It also includes a platform-neutral IT/OT reference architecture and cross-functional governance model. It is an architecture and prioritization prototype—not a claim of enterprise MES, SCADA, PLC, digital-twin, OT-cybersecurity, or multi-site deployment experience.

## Navigation model

The homepage provides three complementary navigation surfaces:

- a concise primary navigation for major portfolio sections
- an audience-oriented portfolio map immediately after the hero
- a compact project directory that deep-links to and opens individual case studies

On smaller screens, a persistent four-destination quick rail keeps demos, projects, Smart Factory strategy, and contact within one tap. Demo cards become a touch-friendly horizontal rail and can be filtered by workflow, analytics, or strategy. Portfolio-guide and project-directory cards also use compact horizontal browsing on phones to reduce excessive page stacking.

Hash links to project cards are handled by `scripts/app.js`, so direct links and project-directory links expose the selected case study automatically. A keyboard-accessible back-to-top control appears after the visitor has moved beyond the opening content.

## Add another case study

1. Copy one existing `<details class="project-card">` block in `index.html`.
2. Give it a unique `id` and new case-study number.
3. Choose an accurate maturity label: `Implemented`, `Operational analytics`, `Architecture`, or `Concept / prototype`.
4. Include the same evidence pattern: Problem, Approach, Key Features, Engineering / Design Considerations, Outcome, Technologies.
5. Add a sanitized HTML/CSS architecture flow if it materially clarifies the system.
6. Use only synthetic data and verify every measurable claim before publishing.
7. Test the new card with keyboard and pointer input at mobile, tablet, and desktop widths.

## Resume

The `/resume/` route links to `resume/david-h-fabro-resume.pdf`, a public-safe derivative of the supplied résumé. The public copy removes the phone number and generalizes the location; the original Word document remains outside the site checkout.

`tools/export-resume-pdf.ps1` requires the explicit `-ConfirmPublicSafeSource` switch. Before using it, create a source copy with private contact details removed. The switch is a deliberate safety gate, not an automated privacy guarantee; always extract and review the finished PDF text before publishing it.

## Privacy and confidentiality

All project descriptions are sanitized. All interface previews, lists, records, asset identifiers, dates, and charts are synthetic representations created for this portfolio. The site must never include employer credentials, internal URLs, proprietary documents, employee information, private asset identifiers, confidential data, or screenshots from real company systems.

Interactive demonstrations must follow the same rule. Demo data should remain visibly synthetic, require no production credentials, and avoid camera, upload, or external-system permissions unless a future version has a documented and privacy-reviewed reason for them.

The public site is intentionally static and uses a restrictive Content Security Policy: scripts and assets are limited to the site itself, network connections are disabled, forms cannot submit, and embedded frames, objects, media, and workers are blocked. This reduces browser-side attack surface, but it does not replace dependency review if third-party services are added later.

## Pre-publication checklist

- Confirm that the public email address is intended for internet-wide distribution and monitor it for spam or phishing.
- Re-scan the résumé PDF after every replacement to confirm that no phone number or precise home location has returned.
- Verify the scope, timeframe, and attribution of every result metric.
- Confirm project maturity labels.
- Confirm that the 143 requirements, 500+ annual tasks, 42,000+ telemetry records, five forklifts, and energy-savings figures are safe and accurate for public disclosure.
- Confirm the GitHub Pages URL or replace it with the selected custom domain.
- Re-run responsive, accessibility, console, and broken-link checks on the selected host.
