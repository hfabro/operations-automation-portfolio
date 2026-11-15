# Multi-line invoice and reviewed-correction scenario

## Presentation goal

Show a prospective employer/client how consistent coding and automated checks handle realistic purchasing exceptions. Every document, supplier response, approval and financial result in this example is simulated. The scenario needs no live ERP or company-system access.

## Visitor journey

Use **Load two-line invoice scenario** on the connected purchasing page. This creates a replayable fictional journal with an approved two-pump upgrade and an approved one-pump routine repair from the same supplier. The upgrade retains its 70/30 Facilities/Production split and equipment account; the repair retains the repairs account and Facilities cost center.

One supplier invoice contains both PO references. It starts at $3,850 net, with two independent issues: only one of the upgrade's two units is accepted, and the repair unit is billed at $1,350 against the $1,250 agreed PO price.

1. Receiving accepts the remaining upgrade unit. The receipt issue resolves automatically, while the repair-price discrepancy remains held.
2. AP loads a simulated revised invoice with the repair price corrected to $1,250 and header net $3,750. This stages a proposal; original values remain in force.
3. Purchasing approver reviews the proposal. Approval creates document version 2 and reruns all checks. Rejection leaves version 1 unchanged and records the reason.
4. AP posts the whole eligible document atomically. Two invoice-line records share one supplier invoice reference and document ID. They are not treated as duplicate invoices.
5. Separate simulated authorization and settlement update both line allocations together. The final $3,750 paid is $3,000 Facilities and $750 Production, with equipment and repairs classifications preserved by their PO lines.

## Model and controls

- A document has one header, 1–20 lines, retained versions, optional proposed correction, review decisions, evaluation history and posted-line links.
- Quantities, price precision, supplier/PO ownership, current receipt capacity, duplicate document references and header/line totals are checked.
- Several lines against the same PO must fit combined capacity. Several otherwise eligible documents cannot jointly consume the same receipt balance.
- Correction proposals can change line unit prices and declared net only. They cannot change the supplier, PO references, quantities or financial coding. An incorrect revised total remains held even if the proposal is approved; review does not override matching rules.
- Posting validates the whole document before deriving new ERP line records. No partially posted invoice is retained if any line fails. Payment controls operate on all linked records as one document.
- A duplicate/replaced unposted document can be withdrawn with a reason. It stays in the journal, releases eligible competing documents for re-evaluation and cannot be posted.
- Existing single-line commands/checkpoints still replay, and the earlier single-line browser journey remains tested.

## Verification

Ten new rule groups cover separate accounts, receipt/price independence, pending/approved/rejected corrections, header totals, atomic posting/settlement, duplicate withdrawal, shared-PO capacity, immutable quantities/coding, stale versions and limits. Eight light/dark/width screens and sixteen browser scenario assertions passed, including populated-state accessibility screening. The original single-line rule groups passed again. Full-suite and hosted results are captured with the draft review checkpoint.

The expanded implementation reuses ERP matching/financial validation and the command journal. A document-level coordinator handles multi-line totals, duplicate identity and atomic posting; the original flat CSV intake remains a scoped single-line component demonstration. It does not claim full PDF/OCR extraction or arbitrary document ingestion.

Original documents are simulated metadata and records, not uploaded or generated supplier PDFs. Version labels are explicit. Browser roles and storage illustrate process behavior rather than enterprise access control. Tax, freight, discounts, credits, FX and complex invoice allocations remain optional future simulation scenarios, not prerequisites for live integration.

See `SIMULATION-SCOPE.md` for the user's clarified scope across the whole project.
