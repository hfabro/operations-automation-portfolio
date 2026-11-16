# Source-document invoice inbox, version 1

The visitor view demonstrates executed extraction from an explicitly supported plain-text invoice grammar and bounded UBL 2.1 XML profile, SHA-256 source fingerprints, retained supplier revisions and governed invoice matching. It is an independent fictional scenario, `SYN-DOC-INBOX-1 / SYN-CO-01`, separate from the business-time cohort, saved browser journals and BPI research. It performs no PDF/image/email OCR, external upload, financial posting or payment.

## Source and architecture

`preview/inbox-samples.js` owns the fictional UTF-8 source strings and baseline command-replayed purchasing/receipt journal. `preview/inbox-rules.js` owns extraction, exact-byte identity and source-to-command projection, delegating invoice/multi-line/duplicate/receipt/price/correction controls to unchanged `InvoiceIntake`, `Journey` and `InvoiceDocuments` modules. `document-inbox.html/css/js` provide the browser view. Source artifacts are admitted through the existing public-page generator; no new dependency or backend is required.

Sources are closed envelopes containing `id`, `name`, `mediaType`, `content`, `order`, `receivedAt`, `receivedAtUnknownReason`. IDs and intake-order values are unique; order is a declared processing ordinal, not elapsed time. The media type is text/plain or application/xml. The XML adapter/profile and source-path semantics are specified in [UBL-INVOICE-PROFILE-2026-11-16.md](UBL-INVOICE-PROFILE-2026-11-16.md); the following text grammar remains unchanged. The limit is 20 sources, 32 KiB per UTF-8 source and 512 KiB total. Known capture timestamps are canonical UTC; unknown capture timestamps require an explicit reason. Local file input preserves UTF-8 BOM and line-ending bytes and supplies an unknown capture timestamp rather than inventing a business receipt time. Invalid UTF-8, unsupported file types and oversized file collections are rejected before replacing the current temporary inbox.

SHA-256 is calculated from the exact UTF-8 encoded content using browser Web Crypto or the equivalent Node runtime interface. No whitespace, Unicode normalization, BOM removal or newline conversion occurs before hashing. Filenames do not establish identity. Exact source downloads use the original content unchanged. Rendering adds line numbers only for display. Web Crypto requires a secure context such as HTTPS or the local loopback preview.

## Executed extraction grammar

```text
SYN-INVOICE-TEXT/1
Entity: SYN-CO-01
Supplier: SYN-SUP-01
Invoice: EXAMPLE-001
Currency: USD
Revision: 1
Invoice-Date: 2026-11-15
Net-Total: 1250.00
Line 1: SYN-PO-0001/001 | 1 | 1250.00
```

Required header fields occur exactly once. Currency has three letters; company must be the admitted fictional entity. Reference fields are bounded canonical identifiers, normalized by trimming and uppercasing while retaining original text. Invoice date must be a real ISO civil date. Amounts use the existing positive exact-cent parser; quantities are whole numbers 1–1,000. Lines are contiguous unique ordinals 1–20, with exactly PO-reference/quantity/unit-price components. Header/line total disagreement proceeds to the existing document-data hold rather than being silently repaired.

An optional `Memo:` is retained source text. Blank lines and lines beginning `#` are allowed. An initial UTF-8 BOM is accepted for grammar recognition while retained in the fingerprint. Other labels/instructions are review issues, including attempted account/cost-center overrides. Repeated fields are ambiguous even when their values agree. Missing/invalid/ambiguous values do not receive guessed replacements. Each extracted field retains its path, raw value, normalized typed value, one-based source line and status; missing values have no source-line claim. Multiple issues remain visible under a single primary source-review owner.

This is a fixed-format parser, not general invoice understanding, probabilistic AI or OCR. Uploaded .txt files must use this same declared grammar. Capture timestamps and invoice dates are source evidence; this view does not infer aging, due dates or cycle-time improvement from them.

## Distinct identities, revisions and matching

- **Exact copy:** identical SHA-256; later intake item links to the earlier source and creates no second invoice document. The first declared intake order establishes the retained source. This does not establish which real-world invoice arrived first.
- **Business duplicate:** different bytes but the same normalized company/supplier/invoice reference. Distinct original documents are passed to the existing document evaluator, which holds all competing originals. A changed filename or memo is not approval to pay twice.
- **Supplier revision:** revision 2 names the exact original hash using `Supersedes-SHA256:`. It must identify one valid original, the same business identity, one proposed revision, later intake order and no reversed known capture times. Unlinked/competing/cross-identity revisions remain owned review items.

The text adapter admits source revisions 1 and 2 and the existing price/header-net correction control only. Original and revision must both use text/plain; XML originals and cross-format corrections remain AP revision-review items without a correction proposal. Currency, invoice date, PO references, line counts and quantities cannot change through that control. A supported revision becomes an AP proposal against the original document; original prices remain active and the document is held for purchasing review. Only an explicit Purchasing approver decision with a reason, bound to the source ID and current hash, can approve or reject. Approval retains both source files, both invoice versions and the independent review, then reruns matching. Rejection retains the original version and its remaining price/receipt/data holds. Unsupported revision changes remain visible and never silently alter the original. This inbox has no posting action; source review does not settle or authorize an invoice.

All original imports use the current `Journey.importDocument` action. Its document evaluator supplies duplicate, receipt, total, currency/supplier, PO-reference and combined-quantity holds. Coding comes from the linked approved PO account/allocations; no source text or vendor-only inference supplies an expense bucket. Role selectors demonstrate simulated controls, not production authentication.

## Grains and authored checks

The default text batch has 13 source items and eight distinct staged original invoice documents. The separate XML examples replace only the temporary batch and have their own authored counts in the UBL profile. One source item is an exact copy, two need extraction review, one is an unlinked revision and one is a valid price revision pending independent review. Initially one document is ready for AP review and seven are held. The valid multi-line invoice is USD 2,500. The price-original invoice stays at USD 1,350 with a proposed USD 1,250 revision. Approving that revision yields two ready and six held documents, with both USD 1,350/1,250 versions retained. No invoice has been posted or paid.

Owner/disposition filters count source items. Document outcome counts use distinct original invoice documents, not source files, revision files, reasons or invoice lines. Source and document IDs are qualified by scenario/company in exported evidence. Evidence includes original content, fingerprints, field lineage, matching outcomes, reviews and replayable baseline/proposed checkpoints. The proposed checkpoint is a read-only hypothetical journal; it is never written into saved workflow storage.

## Verification and release

Run `node tools/test-bi-inbox.cjs` for independent hash/queue/version goldens, source-line evidence, ambiguity, exact versus business duplicates, governed coding, correction roles/source binding, rejected proposals, revision ancestry, encoding/size/schema limits and immutable replay. Browser checks operate on the generated project-path page, exercise original downloads and uploads, field-to-source navigation, independent approval/rejection, source/document grains, preserved storage, filtering, accessible themes/layouts, invalid imports, failure states and no-JavaScript native links.

Release verification includes exact-candidate checks followed by deployed-byte and representative live acceptance. The source envelope and journal formats should remain stable; future PDF/OCR support requires an executed, supportable extraction path, explicit source confidence/exception handling and its own validation before it can be claimed.
