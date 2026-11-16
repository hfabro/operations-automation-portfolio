# UBL invoice adapter: SYN-UBL-2.1-NET-1

This static-browser adapter executes extraction from a bounded subset of UBL 2.1 Invoice XML. It extends the existing temporary source-document inbox, not the ERP journal or historical/time cohorts. All sample business records are fictional. The profile follows element definitions and namespaces from the [OASIS UBL 2.1 standard](https://docs.oasis-open.org/ubl/os-UBL-2.1/UBL-2.1.html). It does not execute full XSD, Peppol or EN 16931 validation and makes no standards-certification claim.

## Source of truth and runtime

`preview/ubl-invoice-rules.js` owns namespace-aware parsing, the explicit profile and source-path navigation. `preview/ubl-invoice-samples.js` owns the authored fictional XML examples. `inbox-rules.js` dispatches by admitted envelope media type: `text/plain` retains SYN-INVOICE-TEXT/1; `application/xml` invokes the XML adapter. Browser local files may report `text/xml`; the .xml intake normalizes that envelope media type to `application/xml` without changing content. The existing source envelope, UTF-8/hash contract, matching modules and saved-journal schemas remain unchanged.

Parsing uses the native browser DOMParser in application/xml mode. No dependency, remote service, schema fetch, network permission, external upload or production ERP connection is added. Node can load the modules and execute the independent text path; XML parsing requires a browser DOMParser. CI exercises that native path in Chromium, Firefox and WebKit. Browser tests compare normalized fields and financial outcomes with independently authored text payloads, not a claimed Node DOM implementation.

## Admitted structure

| Source | Required profile meaning |
|---|---|
| Invoice root | Invoice in `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2`; CBC/CAC use their UBL CommonBasicComponents-2/CommonAggregateComponents-2 namespaces |
| Header | UBLVersionID 2.1, ID, real civil IssueDate, InvoiceTypeCode 380, DocumentCurrencyCode |
| Supplier/customer | Exactly one AccountingSupplierParty/Party/PartyIdentification/ID and customer equivalent; explicit fictional customer SYN-CO-01 |
| Monetary total | Exactly one LineExtensionAmount, TaxExclusiveAmount, TaxInclusiveAmount and PayableAmount, all positive exact-cent amounts and equal |
| InvoiceLine | 1–20 lines, each with a unique source ID, explicit InvoicedQuantity, LineExtensionAmount, OrderLineReference/LineID, Item/Name and Price |
| Quantity/price | Whole quantity 1–1,000; unitCode EA; PriceAmount in header currency; explicit BaseQuantity 1 with unitCode EA; no inferred units or conversion |
| PO identity | Full buyer ERP line key, e.g. SYN-PO-0001/001, directly in OrderLineReference/LineID; no guessed order/line concatenation or supplier-to-account mapping |

Optional admitted metadata: valid DueDate, bounded Note, bounded PartyName/Name, and zero-only TaxTotal/TaxAmount. DueDate is retained extraction evidence only; this inbox does not compute aging. A quantity such as 1.000 is admitted as the whole number 1. Nonzero fractional quantities are not. Every monetary element requires currencyID matching DocumentCurrencyCode. There is no FX conversion; an otherwise valid EUR invoice reaches the existing currency/identity hold. Each line extension must equal quantity × unit price; aggregate header-versus-line disagreement reaches the existing document-data hold.

Required element cardinality is exact. Repetition remains ambiguous even when values agree. Prefix spelling is irrelevant: matching uses namespace URI, local name and direct-child relationships. This profile does not enforce all XSD sequence/type constraints and must not be treated as an XML schema validator. Unknown supplier or PO identities remain subject to existing owned matching holds.

Only namespace declarations and the relevant currencyID/unitCode attributes are admitted. Scheme IDs, external schema attributes, unsupported elements/attributes, monetary adjustments, nonzero tax, tax subtotals, prepayments, charges/allowances, attachments, extensions, billing/correction references and unsupported units go to owned extraction review. They are not silently stripped to make a document pass. Aggregate elements permit admitted children and whitespace only. Basic values cannot contain nested elements.

## Encoding, bounds and safety

The existing 20-source, 32 KiB-per-source, 512 KiB-total limits apply. XML must be well formed and UTF-8 (or omit its encoding declaration). Before DOM parsing, DTD/entity declarations and processing instructions other than the XML declaration are rejected. Foreign element namespaces, more than 512 elements, depth beyond 12 and more than 12 attributes per element fail the profile. Rendering uses textContent; XML or its escaped metadata never becomes executable HTML. No external schema/entity fetch is part of extraction.

These are conservative admission rules for this portfolio simulation. A legitimate UBL document outside this subset requires review; rejection does not establish that it is invalid under the complete UBL standard. No general XML, PDF/image/email OCR or probabilistic invoice understanding is claimed.

## Lineage and governed projection

Original UTF-8 bytes remain the SHA-256 identity and exact download evidence, including BOM and line endings. XML field `raw` is decoded DOM character data or an attribute value, not a claim of byte-identical lexical spelling. Field evidence adds a root-inclusive `sourcePath` of namespaceURI/localName/one-based sibling index, optional `sourceAttribute`, and `valueOrigin`. XML sourceLine remains null. Clicking a field resolves that path against the unchanged source and shows an inert DOM-serialized excerpt. Serialization may change namespace declarations, entity spelling or whitespace; it never replaces the raw file or fingerprint.

Revision 1 is a declared adapter-scope value for original Invoice documents, marked `derived`, with no fabricated source element. Supplier corrections and credit notes are outside this XML profile; a text-format revision targeting an XML original also remains AP revision review without a correction proposal; UBL references are not converted into the text adapter's independently approved price-revision path. The normalized original document uses the same company/supplier/invoice/date/currency/net/PO-line/quantity/price model as text intake. Only that model reaches existing Journey/InvoiceDocuments controls. Coding comes from approved PO account/allocations. Extraction neither posts nor authorizes nor pays, and never replaces saved journals.

Exact-copy detection is across unchanged bytes; business duplicate detection is across normalized identity, including XML versus text sources. Loading XML examples replaces only this page's temporary batch. Default text examples and their review workflow remain available through Reset to fictional inbox.

## Authored batch and verification

The separate XML batch has nine file items, one exact copy, two extraction reviews and six distinct original invoice documents: one ready for AP review and five held. Deliberate outcomes include unsupported KGM units, nonzero tax, unmatched aggregate total, insufficient receipts, currency mismatch and two different-byte business duplicates. Original XML does not create a pending supplier correction. These are designed examples, not measured automation or financial performance.

Run `node tools/test-bi-ubl-inbox.mjs` in the established Playwright/axe environment. It covers the native parser in each selected engine, known normalized/financial results, equivalent namespace prefixes, ambiguous and missing values, hostile/unsupported XML, limits, source paths/attributes, inert rendering, real File uploads, exact BOM/CRLF hash/download, cross-format duplicates, rejected-import recovery, ten responsive/theme states, accessibility scans and untouched workflow journals. Run the existing text inbox model/browser tests as regression coverage. Generated public assets must pass deterministic rebuild and site validation before release; deployed bytes and representative live behavior require verification after publication.
