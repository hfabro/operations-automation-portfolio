# Connected multi-line invoice intake

`preview/invoice-batch.html` previews structured fictional invoices against a purchasing context, then stages all documents atomically into the shared journal. It does not post invoices, authorize payment, move funds or extract PDF/email content.

The guided sample is read-only until explicitly staged. It has nine CSV lines grouped into eight invoice headers: one ready and seven held. Holds include a price discrepancy, missing PO, unsupported currency, both copies of a supplier-reference duplicate, and both competing quantities on one filter PO. The ready invoice spans two approved pump POs with separate repair/equipment coding.

## File and staging contracts

- Exact CSV columns: documentId, entityId, supplierId, invoiceReference, currency, headerNet, lineNumber, poLineId, quantity, unitPrice. Entity is SYN-CO-01. Limits are 256 KiB, 200 data rows, 50 headers and 1–20 contiguous numbered lines per header.
- Header fields must agree across a document. Amounts use exact cents; quantities use whole units 1–1,000. Quoted delimiters/quotes and UTF-8 BOM are supported by the shared strict CSV parser. Existing single-line parsing retains its original default schema and limits.
- A blank PO is retained in the original source row and represented internally by an explicitly unmatched reference, not a guessed PO or accounting code. Approved supplier/PO identity, coding, distributions and receipt checks still come from the existing rules.
- Malformed files, header conflicts, unsupported columns and duplicate/missing line ordinals reject the new preview. A valid positive declared header that disagrees with its lines is retained as an owned document hold.
- The complete candidate set is evaluated with existing pending documents. Duplicate references and jointly excessive quantities hold all affected candidates; input order does not choose a winner. Existing pending records whose review would change are disclosed before staging.
- Source rows, planned import commands, source revision and original/proposed command checkpoints accompany the preview. The source journal is replayed before calculation. Before staging, the preview is rebuilt from its source rows and checked for changed commands/results. A changed current journal requires a fresh preview.
- Stable batch/document command IDs make retries idempotent. A document-ID collision cannot partially import a batch. Existing unrelated transactions survive current-journal staging. Already posted documents are labeled separately from ready AP candidates.

The guided context includes approved POs and acceptances. Using it to replace a different nonempty current purchasing journal requires explicit confirmation. Maintenance and work journals are preserved and may refer to the prior context. Ordinary preview/import errors do not overwrite saved data or the prior valid preview. Unreadable saved purchasing state is not silently replaced with empty data.

## Financial reconciliation

The ready two-line document totals $2,500: $1,250 repairs and $1,250 equipment. Separate AP posting, payment approval and settlement through the existing purchasing page allocate paid amounts once: Facilities $2,125 / Production $375. The report reads those same journal facts. Before posting, no invoice liability or paid cash is fabricated.

The full sample's unposted USD line value is $6,600, with one unsupported-currency document excluded from USD measures. Declared header values are document context and are not repeated as monetary cost-center facts. Queue counts are distinct headers by primary reason, while line details retain other reasons and inherited coding.

## Verification

Thirteen batch-rule groups verify grouping, exact arithmetic, read-only preview, atomic/idempotent staging, duplicate/competition symmetry, source revision checks, file contracts, collisions, tampered previews, effects on existing reviews and financial allocations through settlement.

Eight width/theme screens and 28 browser assertions cover source selection, owned queues, multi-line coding evidence, import preservation, AP/stale-source gates, repeat staging, preserved maintenance/work records, posting/settlement, BI reconciliation, posted-state labeling, replacement cancellation and effects on existing pending reviews. Automated accessibility screening covers initial and populated states; desktop/mobile screenshots are visually inspected.

The portable runner contains 22 executable rule/export/browser groups. The dedicated hosted BI job invokes this runner. This browser-only simulation demonstrates deterministic data-integrity controls, not authenticated production AP, OCR, tax/credit/FX processing or actual enterprise integration.

Import integrity: malformed UTF-8 is rejected before parsing, preserving existing journals and the prior valid view. Invalid bytes are not replaced inside references or review notes.
