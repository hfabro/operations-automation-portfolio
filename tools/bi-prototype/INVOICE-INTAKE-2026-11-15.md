# Automatic invoice intake and coding consistency

## Objective

Prevent cost-code variation caused by different requesters, purchasers, or supplier-name spellings. The financial assignment is governed by approved business context and preserved on the PO line. Vendor identity establishes the supplier; it does not independently decide the account. A legitimate difference in purpose can produce different coding through an approved rule.

Upstream governed entry and downstream invoice intake are linked demonstrations. They are not yet a persistent, end-to-end ERP application.

## Implemented local slice

`preview/invoice-intake.html` sorts a fictional batch or a locally selected UTF-8 CSV. One row represents one single-line invoice. Files remain in the browser session; the page performs no network requests and makes no financial postings. The sample is intentionally exception-heavy, not a benchmark of automation effectiveness.

The batch checks:

1. Required fields, input limits, legal-entity boundary, whole-unit quantity, exact-cent price, and USD currency.
2. Approved supplier ID or one exact registered supplier alias. Unknown IDs, ambiguous aliases, and conflicting IDs/names are held. Filename, fuzzy name similarity, and requester identity never determine supplier or cost coding.
3. PO line existence and supplier ownership. Cost assignments are copied from the approved fictional PO snapshot, with valid account and department/cost-center distributions. Missing PO means policy review, not a guessed vendor-default account.
4. Supplier invoice reference against posted invoice records and the complete incoming batch. All members of repeated reference/document-ID groups are held, preserving original reasons. Such groups are potential duplicates or unsupported multi-line documents, not automatically proven duplicate payments.
5. Accepted uninvoiced quantity, PO quantity balance, and the demonstration's inclusive 1% unit-price tolerance. No universal industry tolerance is claimed.
6. Combined batch demand: individually eligible invoices are also held if they jointly exceed the same PO line's accepted uninvoiced quantity. All competing candidates are held; file order never chooses a winner.

Primary queues: ready for AP review; supplier identity; PO reference; non-PO policy; duplicate/multi-line; receipt or service acceptance; price variance; combined quantity; and document data review. Each row retains source metadata, reasons, owner, snapshot version, and inherited assignments where verified.

The supplier snapshot includes controlled name aliases. The same fictional pump supplier has both a project-upgrade PO coded to equipment and a routine-repair PO coded to repairs. The selected PO, not the person or invoice description, preserves that distinction. Supplier-specific item codes should eventually map to governed internal item/category identifiers upstream; this slice does not infer those mappings from free text.

## CSV contract and limits

Exact columns: `documentId,entityId,supplierId,supplierName,invoiceReference,poLineId,quantity,unitPrice,currency`.

Sample: `preview/invoice-sample.csv`. Maximum 1,000 rows, 256 KiB. Standard escaped quotes, quoted commas/newlines, CRLF and UTF-8 BOM are supported. Malformed structure, wrong headers, excess sizes, and invalid UTF-8 are rejected without replacing the previous good sorted batch. Row-level control failures stay visible as exceptions. Imported cost-code fields are rejected; they cannot override the PO.

Repeating the sample action replaces the current result; it does not append invoices or reserve receipts. The deterministic snapshot is `SYN-INTAKE-SNAPSHOT-1`. The sorting operation is read-only and order-independent for acceptance decisions. Full posting must revalidate current ERP state because this snapshot does not lock receipt capacity against concurrent processes.

## Verified results

- Twelve pure-rule/import groups passed, covering supplier aliases, coding inheritance, non-PO handling, duplicate groups, combined quantities, exact tolerance boundaries, malformed input, limits, and unchanged ERP state.
- The 15-row sample produces 3 ready-for-review rows and 12 held rows: 2 identity, 2 PO reference, 1 non-PO, 3 duplicate/multi-line, 2 receipt, 1 price, and 1 document-data review. Nine rows inherit valid PO coding, including held rows; inheritance does not make them eligible for posting.
- Eight layout/theme checks and fourteen browser interaction checks passed in installed Edge. No outer-page overflow, page errors, or reported axe rule violations in the tested layouts. These results do not certify full accessibility or physical devices.
- The three previously existing BI views were rechecked after adding reciprocal navigation. Their existing guided-entry, ERP workflow, and historical-analysis checks passed.
- Desktop screenshot inspected. No production portfolio files, account settings, or paid services changed.

Evidence: `evidence/invoice-rules-validation.json`, `evidence/invoice-browser-validation.json`, `evidence/invoice-desktop.png`; structured sample output: `curated/fictional-invoice-triage.json`.

## Actual document capture and next steps

This implementation sorts structured invoice metadata; it does not extract text from PDFs, apply OCR to scanned pages, monitor mailboxes, or actually move files into folders. In a native architecture, capture/extraction supplies verified document metadata, and this governed layer validates and routes it. Microsoft documents that OCR providers or Invoice capture return machine-readable metadata that can enter Accounts payable automation: https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/auto-vendr-invc-process.

Next: establish available document formats, capture tools and permissions; retain immutable source documents and document IDs; verify extracted supplier/PO/amount fields and confidence; support multiple lines, tax/charges/credits and due dates; persist owned queues with aging and authorized corrections; re-run matching after approved fixes; and connect to native ERP staging under existing controls. Do not assume AI Builder, premium connectors, OCR services, or an ERP API is licensed or available.
