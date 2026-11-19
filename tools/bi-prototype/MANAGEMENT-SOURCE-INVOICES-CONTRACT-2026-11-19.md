# Management discovery of saved source invoices

The management overview now has a separate current-source invoice index across held, ready, posted, authorized, paid and withdrawn states. It does not change the financial model, the primary-owner hold queue, invoice counts or journal schema. The existing invoice-review section links to this index; the four-stop management review retains its established navigation.

## Source admission and ownership

`ManagementSourceInvoices.build(context)` requires explicit `source: current`, an available purchasing source, exact saved text and the checkpoint captured by management. It restores both, compares their engine-serialized checkpoints and validates retained receipts using the existing receipt inspector. Guided examples, absent/damaged/unreadable sources and mismatched snapshots never become a saved index or synthetic zero count. A valid purchasing source without retained receipts has a known empty subset; legacy invoices remain in existing management review but do not acquire invented file evidence.

The UI captures purchasing raw text during the existing management refresh and runs this read-only projection afterward. It works with purchasing alone; missing maintenance/work sources do not block it. Async epochs discard late results after source changes or guided/current switching. Exact raw ownership is rechecked after validation, before status filtering and before primary/auxiliary link activation. Focus/visibility changes invalidate stale links. No refresh or storage replacement is automatic. Existing management figures remain their captured snapshot until explicitly refreshed.

Native destinations carry the exact document ID to purchasing's existing invoice trail and current-source BI document detail. Appropriate existing report measures are selected for paid/posted states. Target views identify their current saved revision; a native context-menu open uses that saved destination. No link seeds, resets, approves, posts or pays anything. Saved/guided records are not joined by matching vendor or sequential PO identities.

## Grains and interaction

Each row represents one document with a validated retained fingerprint receipt. Rows are sorted by import command revision, newest first; up to sixty matching rows are displayed. Import sequence is not invoice aging or process-performance evidence. The separate status filter never changes the management financial measure, owner filter, allocation detail or selected hold. An unchanged explicit management refresh preserves those selections and the source-status filter; changed source contexts retain the overview's existing reset semantics.

The hold-owner queue still contains held documents only. Source-invoice counts are a different subset and are not added to hold or financial totals. Current invoice version/header metadata remain separate from the original source hash, including reviewed corrections. Links expose full lineage and source evidence through the established purchasing/BI views. Financial rules and KPI scope remain unchanged.

Purchasing retains fingerprints and normalized imports. Original file bytes require the inbox evidence download. Receipts do not archive originals or establish production authentication. This remains a fictional HTML/CSS/JavaScript presentation without real ERP, native Power BI, OCR, paid service or backend.

## Validation

`node tools/test-bi-management-source-invoices.cjs` verifies state coverage, exact destinations, scope and immutability, source admission, captured/saved mismatch, explicit equivalent refresh, valid receipt-free subsets, reviewed corrections and malformed receipts.

`node tools/test-bi-management-source-invoices-browser.mjs` uses the established browser/axe environment to verify guided/current separation, partial source availability, preserved selections, accessible layouts and selected-button hover states, native document handoffs, stale links, async source drift, guided switching, unavailable sources, invalid receipts and journal preservation. The selected management-source/owner button hover styling preserves the existing accessible selected color pair rather than inheriting the generic hover background. Existing management invoice-review checks remain regression gates.

Publish only after required candidate/post-merge CI, deployed-byte comparison and representative live acceptance. No broad whole-site audit or complete confidentiality clearance is claimed by these focused checks.

## Reproducible compatibility environment

Two candidate WebKit attempts exhausted the existing fifteen-minute job limit after slow regional Ubuntu dependency downloads. The Firefox/WebKit matrix now uses the official Playwright `v1.62.1-noble` image pinned by immutable OCI digest, matching the unchanged `playwright@1.62.1` package. The image supplies browsers/system libraries; the package and axe auditor are installed separately. Preparation verifies the exact package version and selected executable. All suites, assertions and timeouts are retained; no test retry or skip was added. Node/browser processes run together in the job container, so loopback preview servers need no exposed ports or external service.

The approach follows [Playwright's Docker documentation](https://playwright.dev/docs/docker) and [GitHub's container-job documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container). Future Playwright updates must update the image tag/digest and package together. Registry manifest/platform verification is retained privately with this release's evidence. This CI change does not affect deployed visitor files or require Docker on a visitor's computer.

The pinned WebKit environment exposed a decoded UTF-8 BOM difference in the existing XML upload test. The XML adapter now removes a leading BOM only from its native-parser working copy. Original source text, byte lengths, fingerprints and downloads remain unchanged. The existing BOM/CRLF upload assertion is retained, with a direct BOM parsing case added. All profile rejection and field-normalization checks remain.
