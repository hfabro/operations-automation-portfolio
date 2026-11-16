# Independent Finance mapping workbench

The workbench demonstrates controlled resolution of a missing item/work-purpose mapping. It is an independent fictional snapshot, SYN-POLICY-REVIEW-1, using the unchanged coding resolver and pinned SYN-MASTER-1 baseline. It never edits another demonstration's master, saved ERP-style journals or original captured request. Role/person selectors illustrate controls, not production authentication or an actual accounting-policy determination.

## Source and ownership

`policy-review-rules.js` owns the closed append-only journal, proposal/review validation, dated coding evaluation, impact preview and evidence recovery. `policy-review.html/css/js` own presentation and temporary tab state. Finance analysts propose and Finance approvers independently decide. The proposer/reviewer person IDs must differ even if the same person changes role. The source identities are fictional Person A and Person B.

The journal stores format/version, the exact admitted baseline snapshot and at most 40 source commands. Each command contains a stable ID, type, actor role/person, ISO business date and closed payload. At most ten proposals are admitted by the model; the interactive evidence format supports the single MAP-001 / Person A/B example. Command dates are nondecreasing within the declared 2026 teaching window. Duplicate IDs are idempotent only for identical command content. Restore replays all commands and rejects altered baselines, invalid roles, overlapping approvals and unsupported fields.

## Mapping rules and dates

Proposals use admitted item/work-purpose/account references and one to three approved cost centers. Departments are derived from the controlled reference data. Unique positive integer basis-point shares must total exactly 10,000. No free-text account override, vendor-only inference or nearest-match fallback is admitted. This version adds mappings; it does not replace/revoke existing approved rules or recode old journals.

The scenario's change-decision date is November 16, 2026. The original November 15 request is ITEM-ENGINEERING / WORK-REPAIR, quantity one, catalog value USD 2,000. It retains NO_APPROVED_MAPPING under SYN-MASTER-1. The proposed illustrative account is 6105 Equipment repairs with an explicitly selected Finance distribution. Default effectiveness is November 17 inclusive through January 1, 2027 exclusive. Pending and rejected rules remain inactive. Approval cannot establish retroactive effectiveness and rechecks overlaps against other approved proposals. A late pending proposal can still be rejected. Original inputs, held result, policy version and owner remain unchanged.

The dated new calculation uses admitted approvals known through that date and the half-open effective interval. Before approval/start or at/after an earlier configured end, the new request remains held. A successful calculation is a coded draft only: it does not approve procurement, create a PO/commitment, post an invoice or pay. Policy metadata links the result to the original baseline plus the independently approved proposal/rule version.

## Bounded impact and recovery

Impact compares the baseline and proposed rule across the 15 defined catalog/work-purpose pairs at quantity one. The illustrative proposal changes one pair once effective. Other controls, including closed-project holds, remain enforced. Pending/rejected previews are explicitly hypothetical; they do not activate a mapping. Counts describe reference coverage, not real request populations, operating savings or production impact.

Evidence includes baseline, source commands, both evaluations, proposal/review provenance, tested date, impact and current view selection. JSON recovery accepts at most 128 KiB, replays source commands, recalculates all outputs and compares the complete expected evidence. Modified derived results, unknown identities, source-policy changes and unsupported fields fail before replacing the temporary workbench. Downloads are local files; reload/reset clears tab state, and there is no automatic persistence or shared-journal write. This provides consistency/replay evidence, not signed identity authenticity.

## Verification and publication

`test-bi-policy-review.cjs` covers independent roles/persons, approval/rejection, future/exclusive dates, late rejection, overlap, approved centers and exact shares, immutable original results, idempotency, baseline tampering, impact scope/project controls and source-replayed recovery. `test-bi-policy-review.mjs` covers the generated project-path interface, both themes/five widths, expanded evidence accessibility, actual downloads/restores, rejected tampered exports, source-context isolation and native touch/keyboard discovery. The existing public BI and canonical showcase suites continue to cover the established demonstrations.

Publication follows the reviewed source/CI/preflight workflow and the owner's release authorization. Retain the prior published baseline for recovery and verify deployed bytes and representative live workflows after release. This isolated additive demonstration does not change the established policy or journal schemas used by other portfolio routes.
