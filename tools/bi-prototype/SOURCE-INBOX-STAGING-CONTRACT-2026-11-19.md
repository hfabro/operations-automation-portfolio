# Source-invoice staging and fingerprint receipts

This HTML/CSS/JavaScript simulation adds an explicit AP stage action after the captured-purchasing preview. It appends original invoice documents to the same still-owned saved journal. It does not create a PO/receipt, override approved coding, post an invoice, authorize payment or settle it. Existing purchasing controls perform those separate actions. Guided supplier revisions remain separate.

## Persistence choice

Preserve the validated version-1 journal, command payload and consumers. A staged original uses the existing `importDocument` command with ID `SOURCE-INBOX:<canonical-origin-checkpoint-SHA256>:<exact-source-SHA256>`. Its document ID remains `CTXDOC-<SHA256(origin-hash + ':' + source-hash)>` in uppercase. The existing source label stores `Source SHA256 <source-hash>`. These lengths fit the established command/document/label limits.

`InboxReceipts.inspect(raw)` restores the journal, validates the reserved command namespace, verifies each origin against the command prefix before its first import, checks document identity/source label, rejects repeated source fingerprints and derives the receipt from the retained original import. Current status may advance through posting/authorization/payment; original import fields remain available. No extra storage key, schema migration, new command type or dependency is introduced. Receipts survive normal journal reload/export/restore because they are carried by existing commands.

**This is fingerprint retention, not automatic original-file archival.** Purchasing retains the source hash, origin identity, normalized original import and document association. Filename, exact file bytes, extraction lineage and capture time remain in the temporary inbox and its full evidence download. The UI states this before staging/navigation; fingerprint-only downloads are labeled separately. Reattachment verifies SHA-256 and extracted original fields against the saved receipt. A missing original cannot be recovered from its hash. Receipts demonstrate inspectable lineage, not production authentication or signed audit evidence.

## Stage contract

`DocumentInbox.stage(preview, currentRaw, actor)` requires AP and a current captured-preview format. It reconstructs source envelopes, reruns capture/extraction/matching and compares the complete rebuilt model. Extraction/revision-review items block the entire selection. Exact copies are suppressed; reattached staged originals are recognized. Held originals can be staged as held documents; AP posting remains subject to existing matching rules.

Planned imports are regenerated from validated sources, using the reserved receipt IDs. A first stage requires exact raw saved-value ownership. A retry with a changed saved value succeeds only when the complete canonical baseline plus all planned imports is an exact prefix of current purchasing. It returns the newer raw value untouched, preserving downstream actions. Partial imports, conflicting payloads, unrelated replacement journals, changed commands and same-revision reformatting before first stage are rejected. No caller-supplied proposed checkpoint is blindly saved. Existing 1,000-command and 1 MiB limits remain enforced.

The UI rechecks exact source ownership after async work and immediately before its single purchasing write. Context epochs cancel abandoned operations. It verifies the saved value before reporting success. A write exception retains the valid preview for retry; a write followed by an unreadable/mismatched value is reported as unconfirmed, without automatic rollback or a false unchanged claim. Maintenance/work journals are never written. After staging, the original preview remains evidence; recapture is required for a new selection. Evidence downloads include a separately labeled staging result and original source files.

## Verification

Pure checks cover AP role, unchanged schema and financial controls, receipt replay, later retries, reattachment, business duplicates with changed bytes, stale/malformed sources, edited previews, mixed inadmissible selections, exact copies, receipt conflicts and partial imports. Browser acceptance exercises keyboard staging, one-key writes, receipt export/inspection, reload/reattachment, native purchasing post/authorize/pay, storage failures, source races, abandoned async work, extraction holds, unrelated journal preservation and responsive light/dark accessibility.

Run `node tools/test-bi-inbox-staging.cjs` and `node tools/test-bi-inbox-staging-browser.mjs` with the established browser/axe environment. Preserve the existing guided text/XML, captured-preview and shared business-rule gates. Public release requires all six candidate/post-merge gates and deployed-byte/live acceptance. No real ERP, native Power BI, OCR, paid service or backend is involved.
