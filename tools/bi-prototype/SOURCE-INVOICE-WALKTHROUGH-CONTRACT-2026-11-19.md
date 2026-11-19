# Source invoice to dashboard: selected-document walkthrough

This additive HTML/CSS/JavaScript increment connects existing inbox staging, purchasing controls and BI detail. It introduces no journal schema, command, financial formula or automatic financial action. The hub still exposes the existing sixteen BI routes.

## Navigation and ownership

After explicit inbox staging, each retained receipt has native links to `connected-journey.html?invoice=<documentId>#invoice-trail` and `business-report.html?source=current&invoice=<documentId>#report-document-detail`. The purchasing link covers its full handoff card; the separate BI link remains independently operable. Links do not seed, reset, approve or pay anything.

Purchasing selects a valid linked document through its existing dropdown/change path. The read-only trail follows the same selection and existing `journey:render` event. A missing linked document never becomes another trail on a role change; the visitor must explicitly select a document. Existing workflow controls remain available. The trail requires a saved journal equivalent to the displayed workflow and a validated retained source receipt. Missing/damaged storage, a document without a receipt, an unsaved/different workflow or async source/selection changes produce an unavailable trail. No guided source or zero financial position is substituted.

The trail download includes selected-document facts and the full purchasing checkpoint for replay, with this scope stated in the UI. It rechecks exact saved-value ownership, the displayed checkpoint and selected document. Refresh is explicit and read-only. No maintenance/work/purchasing storage write is added by the trail. Existing native AP posting, separate payment authorization and Treasury settlement remain authoritative.

## Data model and grains

`InvoiceTrail.build(raw, documentId)` restores the journal, verifies fingerprint receipt lineage and uses the existing report compiler for current invoice-line allocations and approved PO coding. It retains the original receipt/import alongside current document version/header and current PO request/work-order/account/policy snapshots. A reviewed correction can change current invoice values while preserving the original source identity.

Document financial amounts come only from its linked posted records: posted net, unpaid net and paid net. Unposted calculated line value uses the current active document lines and their declared currency; it is not posted liability. Header disagreement remains visible separately. Withdrawn invoices retain evidence while contributing no pending value. Unresolved PO references never receive guessed coding. Non-USD pending values are labeled separately from posted USD amounts. Posted = unpaid + paid; these stages are not summed as separate purchases. Paid cost does not establish maintenance completion.

The linked BI view opens the selected document detail. Dashboard KPIs keep the full current journal and existing cost-center/account/project filters. The entry notice explicitly states this distinction. Missing document IDs show no substitute detail. With an invoice entry, absent/damaged purchasing hides financial figures rather than manufacturing an empty source. Native report selection/filter interactions continue to clear detail as before; explicit current refresh reopens the entry document. Returning from an invoice-entry report to purchasing retains the displayed document ID without writing or normalizing the journal. Unqueried report handoff behavior is preserved.

Fingerprint receipts do not archive original files or prove production authentication. Original bytes remain in the inbox evidence download. All business records/actions are fictional; no real ERP, native Power BI, OCR, paid connector or backend is involved.

## Verification

`node tools/test-bi-invoice-trail.cjs` covers exact receipt/coding lineage, pending vs liability, separate financial owners/stages, per-invoice vs whole-journal payments, multi-PO integer-cent allocations, header disagreement, reviewed corrections, unresolved/non-USD holds, withdrawn records and unavailable/non-receipted sources.

`node tools/test-bi-invoice-trail-browser.mjs` uses the established Playwright/axe environment. It verifies a non-first linked document, native actions, BI scope/return navigation, raw-value and async ownership guards, missing-target acknowledgment, absent/damaged sources, unrelated journal preservation, inbox handoff and responsive light/dark accessibility. Preserve existing source-staging and report-handoff gates. Publication requires all six candidate/post-merge checks, deployed-byte comparison and live acceptance.
