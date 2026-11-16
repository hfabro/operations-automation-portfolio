# Connected purchasing journey checkpoint

Scope clarification: the entire portfolio is a simulated presentation for prospective employers/clients. Company-system access and live operational deployment are not required; see `SIMULATION-SCOPE.md`. Earlier integration-roadmap language is historical, not a completion prerequisite.
Implemented November 15, 2026. `preview/connected-journey.html` now runs the previously separate coding, ERP, and intake rules through a single fictional domain journal. The earlier focused pages remain available as component demonstrations; they do not share this journal and are not presented as connected records.

## Working journey

Requester selects catalog item/work request/quantity → coded requisition snapshot → explicit simulated purchasing authorization → linked PO without recoding → partial acceptance → invoice hold → second acceptance → re-evaluation of the same document → current-state posting → separate payment authorization → simulated settlement → reconciled cost-center ledger.

The two-pump acceptance example ends with $2,500 posted and paid, split $1,750 Facilities / $750 Production. Commitments and unpaid balance reach zero. Before approval the coded request creates no commitment. Before settlement, posting/authorization do not increase cash paid. The initial receipt hold remains in document evaluation history after it resolves.

## Source of truth and controls

- One state schema (`schemaVersion: 1`) and validated command journal drive requests, POs, receipts, invoice headers/lines, evaluations, posted records, settlement state, and audit entries.
- Existing `Coding`, `ERP`, and `InvoiceIntake` pure rules are reused; no independent copy of matching or allocation logic was introduced.
- Each PO retains its source-request ID, approved coding snapshot and finance-policy/master versions. Reconciliation verifies coding against that approved request.
- Stable command IDs make exact retries idempotent. Different content under the same command ID is rejected. Optimistic revision checks reject a stale requested write within the single-store model.
- Acceptance references are unique per PO line. Quantity must fit the remaining order. Receipt totals reconcile to acceptance records.
- Invoice documents have a header and explicit line identity. This slice admits exactly one line; it does not yet provide full multi-line support.
- Pending documents re-evaluate after acceptance changes and posting. Duplicate references and competing pending quantities are evaluated together. Posting rechecks current state and delegates to existing ERP validation.
- Purchasing, Receiving, AP, payment-approval, and Treasury actions have separate simulated role gates. These mode switches are not authentication or enterprise access control.

## Recovery

Session storage retains a serialized journal where supported. Download/upload provides a separate recoverable checkpoint. Restore rebuilds derived state by replaying commands against the fixed fictional policy snapshot; it does not trust an imported ledger cache. Unsupported schemas, altered policy snapshots, invalid actions, and repeated command IDs in an imported journal are rejected. Failed import preserves the current valid in-memory state.

Browser storage is not shared with other users or tabs as an enterprise database. Revision checks do not provide database locking or distributed concurrency protection. Browser users can alter local code; this is not tamper-proof audit evidence. Session-storage failure is reported, with checkpoint download available. Timestamps use an explicit simulated clock and do not measure real cycle time.

## Verification

- Eight connected domain groups passed: request/PO lineage, held-request and role controls, immutable/idempotent commands, stale writes, receipt-hold resolution, full settlement reconciliation, competing/duplicate invoices, and recovery/schema/policy boundaries.
- Eight Edge width/theme screens passed (320, 375, 768, 1440 × light/dark).
- Twenty browser journey/recovery checks passed, plus automated accessibility screening of the populated settled state. No reported violations, outer-page overflow, or page errors in those checks. This is not complete accessibility certification.
- Desktop settled-state screenshot inspected.
- A portable suite runner and environment-based Playwright/axe/browser/Python configuration replace workstation-specific browser tool paths.

## Scope remaining

Real identity/permissions, budget validation, production supplier policy, document/OCR capture, full multi-line/tax/credit handling, persistent owned exception queues, controlled corrections, native ERP integration, native Power BI artifacts, and machine-data integration remain further milestones. No production site merge or deployment is part of this checkpoint.

## Development commands

`node tools/run_checks.cjs --rules-only` runs dependency-free rule tests and fictional export reconciliation. `node tools/run_checks.cjs` also runs the five browser suites. Set `PLAYWRIGHT_MODULE` and `AXE_CORE_PATH` to existing auditor installations when they are not locally resolvable; optionally set `BROWSER_CHANNEL` and `PYTHON_COMMAND`. CI installs the same pinned test tools as the main portfolio and runs Chromium. Full raw-dataset reconstruction remains a deliberate local operation rather than a 729 MB download on every code push.
