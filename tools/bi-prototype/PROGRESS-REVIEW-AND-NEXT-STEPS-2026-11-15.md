# Phase 2 progress review and next steps

Reviewed November 15, 2026. Evidence inspected: source code, current local manifests, and nine saved passing validation reports. Passing suites were not rerun merely to count them; they were executed during their respective implementation milestones. Phase 2 remains in the portfolio workspace, outside the published-source checkout. The existing portfolio checkout is clean at this review. No production deployment is part of this planning step.

## Assessment

The direction matches the clarified objective: automate repeatable business rules and prevent inconsistent data at entry, then use BI to investigate trusted records. Four bounded local experiences work. They demonstrate their stated controls; they are not yet one integrated application, a native BI product, or a deployable ERP integration. Do not assign an overall completion percentage across these different maturity levels.

| Workstream | Verified local status | Principal gap |
| --- | --- | --- |
| Historical P2P analysis | Full source downloaded/checksummed; 76,349 orders, 251,734 cases, 1,595,923 events reconciled; quality profile and eligibility/sensitivity definitions; interactive analysis | Native semantic model/report and richer supported process measures |
| Governed purchasing entry | Item + work request derive coding; approved/effective policy checks; exception owner; idempotent staging; snapshots preserve prior coding | Staged requisition does not create an approved PO or share state with the other pages |
| ERP cost and matching | Split cost distributions; distinct commitment/receipt/invoice/payment measures; partial receipt and matching controls; separate simulated payment roles | Fixed fictional starting POs; limited transaction types, no native GL or persistent authorization |
| Invoice intake | Supplier/PO identity checks; inherited coding; duplicate and combined-quantity screening; local CSV sorting; owned queues | Single-line scope; no document extraction, persistent exception resolution, or actual posting |

Current evidence records 29 rule-test groups (8 ERP + 9 coding + 12 intake), 32 width/theme screens (8 per experience), and 46 browser interaction checks (8 historical + 12 ERP + 12 guided + 14 intake), all passing. Source-data and export reconciliation checks also pass. These are separate denominators, not an aggregated certification score. The batch sample's 3 ready / 12 held rows deliberately exercise exceptions and are not an operational automation benchmark.

## Priority findings

1. **Integration gap — highest product priority.** Guided entry owns `session.entries`, ERP controls own `ERP.seed()` state, and invoice intake reads a new fixed snapshot. Coding is demonstrated and explained, but it is not yet carried through one actual simulated transaction. Link navigation does not establish shared data lineage.
2. **Document grain needs expansion before capture integration.** Intake currently treats one row as one single-line invoice and safely holds repeated references as duplicate/multi-line review. A legitimate multi-line invoice must eventually have one header, separate lines, and explicit PO/receipt allocations. Do not expand parsing around the current flat-row assumption.
3. **Exceptions are identified but cannot complete a controlled resolution loop.** Reasons and owners exist; persistent assignment, approved correction, re-evaluation, resolution history, and aged backlog are not implemented. No automated posting should be added before current-state checks and duplicate protection span this lifecycle.
4. **Native BI is still missing.** Current charts are browser interfaces. CSV model-preparation tables exist, but PBIP/PBIX, semantic relationships, DAX measures, native report rendering, and Desktop refresh validation do not. This should be a scheduled milestone, not indefinitely postponed behind more workflow pages.
5. **Version control and CI apply to Phase 1, not yet to Phase 2.** Local Phase 2 test scripts are working, but the new code has not entered a scoped repository branch or the hosted pipeline. Raw source files and large research exports must stay outside public packaging. Host-specific tool paths need portable environment settings before CI integration.
6. **Production integration prerequisites remain unknown.** Actual ERP vendor/version/API, capture tooling, account permissions, authenticated roles, and licensing have not been verified. Browser role switches and fictional finance approvals demonstrate behavior; they do not enforce real access control.

These are known maturity gaps, not claims that the passing local tests failed. Preserve validated rules and fixtures while fixing the seams between them.

## Milestone 1 — Consolidate one vertical purchasing journey

**Next implementation priority.** Introduce one versioned fictional domain store with a documented state schema. Keep existing pure coding, matching, allocation, and triage logic; adapt them to read and transition the same records. Use a shared application workspace/control surface or a small shared controller rather than adding another independent page with its own seed state.

Define source of truth, keys, ownership, and grains before UI changes:

- Approved master-data/policy snapshots with effective dates and owners.
- Requisition header/line; versioned coding distributions; explicit approval decision.
- PO header/line linked to the source requisition version.
- Accepted receipt/service event with signed quantity and source line ID.
- Invoice document/header and line with stable document/hash identity and normalized supplier reference.
- Invoice-to-PO/receipt allocations, exception/review events, and settlement allocations.
- Explicit action history, snapshot/schema version, and refresh/export version.

Design request IDs and idempotency keys across steps, not just within a single form. Separate staging, approval, posting and settlement. Revalidate current accepted quantity and invoice identity when posting; sorting against a past snapshot is insufficient. Check schema on save/load. For public demonstration, local session persistence or validated export/import may be sufficient; do not add a backend just to connect a showcase. Never persist employer or personal data.

**Acceptance journey:** select a catalog pump and approved work request → derive the existing 70/30 coding → stage requisition → obtain an explicit simulated purchasing approval → create a linked PO without retyping codes → record one of two units received → import a two-unit invoice → hold for receipt shortage → record remaining acceptance → re-evaluate the same invoice → post once under matching controls → authorize and simulate settlement → inspect reconciled costs and unchanged coding lineage. Reload/retry must not duplicate records or cash. A held request must not generate a PO.

This proves the user's primary goal: requester/purchaser variation does not change the coding for the same approved context. A legitimate policy/context change is traceable, not silently overwritten.

## Milestone 2 — Document-level intake and owned exception resolution

Support a legitimate invoice with multiple lines and, where allowed, more than one PO reference. Distinguish duplicate document identity from multiple lines of the same document. Reconcile header totals to line totals. Introduce due dates, receipt timestamps, and tax/charge/credit fields only with explicit policies, sign conventions, and tests; implement incrementally in that order rather than claiming full accounting coverage immediately.

Each exception needs a stable ID, owner, reason, current status, created/resolved timestamps, authorized resolution, and before/after evaluation. Correct the governed source where appropriate (such as accepted receipt or approved PO revision), then re-run matching. Preserve the original invoice and its extracted metadata; do not edit history to make the batch appear cleaner. A duplicate candidate needs review/disposition, not automatic deletion.

**Acceptance:** a multi-line invoice imports as one document; a genuine duplicate is held; a corrected receipt resolves the same exception; a price variance remains held until an approved disposition; reruns do not duplicate postings; totals do not fan out when invoice/receipt/payment child tables join.

Document capture has its own feasibility gate: inspect supported structured formats and text PDFs first; then evaluate scanned-page OCR only if needed and permitted. Prepare fictional source documents with known answers for evaluation. Measure document/field accuracy, uncertain-field routing, and wrong-supplier/PO false acceptance, not just whether some text was extracted. No mailbox monitoring, third-party transfer, paid capture, or premium connector is assumed.

## Milestone 3 — Genuine BI deliverable and automation scorecard

After the core contracts stabilize, verify installed/available Power BI Desktop and supported source formats. Build a native semantic model and report, preferably maintainable project source where supported, then refresh/render/test it in Desktop. Text definitions alone do not establish runtime acceptance. Keep native Power BI claims separate from the public HTML interface.

Maintain two clearly separated evidence tracks:

1. Historical real-data process analysis: observed creation/clearing spans, policy cohorts, source coverage, missing actors, supported activity/variant/rework definitions, and sensitivity. Do not infer current backlog or actual financial savings from anonymized data.
2. Fictional operational/financial model: coding distributions, approved commitments, receipt proxies, posted invoices, unpaid/paid amounts, exception reasons and lineage. Label scenario values and simulated timing explicitly.

Use a star-schema/declared-grain approach, stable keys and relationships, a measure dictionary, units/currency, date roles, and reconciliation checks. Account for invoices with multiple allocations without duplicating header value. Source snapshots and refresh time remain visible.

The automation scorecard should cover coding coverage, first-pass matching, manual touches, exception age by reason/owner, coding corrections, duplicate candidates resolved, and process elapsed time. Define numerator, denominator, eligibility, period, and exclusions before publishing a rate. Do not call the 15-row test batch's ready proportion a touchless rate. Native sharing/embed decisions are separate from building the report.

**Acceptance:** representative report values reconcile to independent calculations and source records; drill-through preserves entity/currency/cohort; refresh succeeds in the native tool; screenshots/rendered evidence are inspected; browser and native outputs reconcile for shared measures.

## Milestone 4 — Machine-data feasibility and one defensible replay

Return to the other original Phase 2 domain after the P2P journey and BI model have a stable pattern. Confirm a usable NIST capture, access/reuse terms, actual tags, timestamps, units, quality fields, and available context. Preserve unrelated public datasets as separate evidence; use fictional mappings only in a visibly fictional integrated scenario.

Implement read-only capture/replay with deterministic clock, tag-to-asset mapping, unit/time normalization, missing/stale/invalid states, and source inspection. Start with measures the data supports. OEE needs its real denominator/output inputs; prediction claims need failure labels and evaluated performance. Neither a replay nor a browser animation establishes live SCADA connectivity.

**Acceptance:** one machine observation can be traced through quality checks to a supported operational insight and an owned review action. Missing or bad data cannot silently produce a healthy condition. No production control write-back.

## Milestone 5 — Portfolio integration and authorized release

Start a scoped branch/checkpoint workflow during Milestone 1, rather than leaving source tracking until the end. Consolidate demo tooling into a documented runner and portable auditor configuration. Preserve existing Phase 1 regression checks; add data contracts, state transitions, import boundaries, cost reconciliation, rule versions, current-state revalidation and the complete new journey.

At release, integrate a BI hub and coherent navigation, not four unexplained technical demos. Clearly label public historical data, fictional company records, replayed data, assumptions, and genuine native BI artifacts. Keep source-attribution/license notices separate from portfolio-code restrictions. Package only small reviewed datasets; exclude the 729 MB raw XES log, large research exports, caches, and internal evidence.

Complete responsive/browser/accessibility checks and owner review, then use the existing protected PR/publication process. Verify deployed bytes and live behavior; preserve recovery revision and evidence. No publication approval is requested by this progress review because the integrated release candidate is not yet built.

## Scope and pacing decisions

- Next work is **one connected purchasing journey with coding preserved end-to-end**. No additional standalone dashboard pages before this works.
- Reuse tested pure rules. Refactor shared state, document grain and adapters deliberately; do not rewrite the portfolio or adopt React solely for appearance.
- Put code/contracts/tests into a recoverable source checkpoint early. Preserve raw data and source hashes outside public packaging.
- Do not add live ERP access, paid services, mailbox capture, AI Builder or premium connectors without verifying available and permitted capabilities.
- No full-scope completion date is asserted before the shared-state/document contracts and native-tool feasibility gates pass. Judge progress by acceptance evidence, not number of screens.

## First-party references checked for the plan

- Power BI project source: https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-overview
- Vendor invoice header/line and receipt handling: https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/vendor-invoices-overview
- Automation and resubmission: https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/auto-vendr-invc-process
- AI Builder licensing: https://learn.microsoft.com/en-us/ai-builder/administer-licensing

Microsoft describes PBIP as report/semantic-model definitions in text files. That supports a source-controlled artifact approach but does not establish local tool availability. Its licensing documentation identifies flows using AI Builder actions as premium; existing Office 365 capabilities alone must not be treated as verified OCR entitlement.
