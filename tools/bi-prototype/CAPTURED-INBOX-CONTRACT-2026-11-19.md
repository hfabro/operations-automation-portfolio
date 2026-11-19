# Captured purchasing invoice preview

This additive HTML/CSS/JavaScript increment connects supported source-file extraction to an explicitly captured browser-session purchasing journal. It is a **read-only simulation**. It does not stage documents into saved purchasing, post invoices, authorize payment, or connect to ERP. The independent guided inbox and its supplier-revision decisions retain their existing contract.

## Source and ownership

`InboxContext.capture(raw)` restores the version-1 command journal and computes separate exact saved-value, canonical checkpoint and policy-snapshot SHA-256 identities. PO display keys are qualified by the checkpoint hash. The journal does not establish a legal entity; `SYN-CO-01` remains an extraction-profile label, not integration evidence. Missing, empty, damaged or unreadable storage never becomes an example. A valid capture with no approved PO is inspectable but cannot preview files.

The UI explicitly captures `portfolio-phase2-connected-v1` from session storage. Switching between guided and captured contexts clears temporary files, reviews and results. Async capture/extraction uses an epoch and exact raw-value ownership check; current-context downloads recheck ownership. Focus, visibility and relevant storage events invalidate changed sources. No path writes a workflow journal.

## Additive model

`DocumentInbox.prepareCurrent(sources, savedRaw)` captures and replays the journal, including existing invoices. The closed version-1 command payload is unchanged. Original supported text/UBL invoices enter hypothetical `importDocument` commands; revision-2 sources remain owned revision-review items. No existing correction is approved or transported.

New document and command IDs use SHA-256 of canonical checkpoint identity plus exact source SHA-256. File name, source-item ID and intake order do not determine document identity. Imports use hash order for deterministic replay. Exact copies are suppressed within the selection; baseline source hashes are unavailable, so existing invoices use the existing business-duplicate and quantity controls. No cross-journal PO join is inferred.

Output format `SIMULATED-CAPTURED-INBOX-PREVIEW`, version 1, separates `documents`/counts (new hypothetical originals), `baselineDocuments` (captured status/queue/owner/reasons) and `affectedExisting` (before/after changes to those fields). Matching reuses existing invoice rules and approved coding snapshots. Proposed checkpoints are evidence, not a persistence authorization. The original `prepare` output format, keys, counts and baseline restriction remain unchanged.

The generated one-unit text sample uses a selected captured PO, supplier and unit price. Receipt and quantity constraints still apply; no receipt is invented. Its civil invoice date is explicitly fictional and capture time unknown. Local text/XML uploads retain existing size, UTF-8, extraction and evidence rules. No OCR or native Power BI is involved.

## Verification and lifecycle

Pure tests cover exact/canonical identity, absent/damaged/empty sources, baseline invoices, business duplicates, receipt/quantity holds, deterministic IDs and replay, inherited coding, source bytes, revision holds and legacy parity. Browser acceptance covers explicit switching, no writes, unavailable sources, baseline effects, async ownership changes, stale downloads, uploads, keyboard operation and responsive light/dark accessibility. Existing guided text/XML and connected purchasing suites remain regression gates.

The next separate increment is explicit guarded staging with a durable source-receipt lifecycle and retry/conflict semantics. This preview does not claim that capability. Public release requires source projection checks, required CI and deployed-byte/live verification.
