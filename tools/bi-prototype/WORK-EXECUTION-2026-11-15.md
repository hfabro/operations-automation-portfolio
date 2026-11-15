# Recorded maintenance work and independent verification

`preview/work-execution.html` completes the fictional condition-to-action story with accepted-material readiness, recorded technician work and an independent verification decision. It is a functioning browser workflow, not a claim that work was performed on actual equipment.

## Controlled lifecycle

- A condition must have been reviewed/released and handed to the exact governed purchasing request.
- Purchasing must have approved that request and recorded its material acceptance. Another request's receipt does not satisfy the gate. Invoice posting/payment is not required for this work scenario.
- A technician records a unique completion reference, explicit canonical UTC time and task note. The recorded time must be on or after the source acceptance. Validated maintenance and purchasing command checkpoints are retained with this action.
- Normal-looking readings alone do not close work. A separate simulated verifier explicitly accepts the latest work version or returns it for rework with a reason.
- Acceptance requires the admitted fictional 10:00–10:30 UTC observation window after recorded completion: 30 complete good RUN-state minutes, good vibration at/below the teaching threshold and no asset exclusions. This is a scenario policy, not an equipment or safety standard.
- A returned review requires a new completion reference/version. Previous tasks and decisions remain visible. Stale work IDs, duplicate references and changed command IDs cannot overwrite the trail. Verified work cannot silently be replaced.

The material-ready example creates reviewed maintenance context, one requisition, an approved $1,250 PO and its acceptance. It creates no invoice, payment or work completion. Loading it replaces the three local fictional journals only through an explicit action and confirmation when records exist. The existing journals are restored if a storage write fails and recovery succeeds.

## Source of truth and data grains

The work journal is separate from the established maintenance and purchasing journals. `work-rules.js` contains pure readiness, transition, status and replay logic. `work-samples.js` supplies a separately invented post-work snapshot. The earlier machine fixture is unchanged.

| Artifact | Grain / meaning |
| --- | --- |
| Recorded work | One execution version for one condition case, approved work package and exact request/PO line. Includes accepted-material evidence and source revisions. |
| Verification decision | One explicit verifier disposition for that work version. A returned disposition does not claim accepted observation evidence. |
| Verification observations | One fictional asset/tag/UTC event/sequence sample. 180 accepted observations across two assets; reviewed-asset acceptance cites 60 state/vibration source IDs. |
| Embedded source checkpoints | Validated as-of maintenance/purchasing commands retained with execution, not new financial movements to aggregate. |
| Work checkpoint | Replayable commands plus the fixed work-policy snapshot. Source snapshots and state are regenerated/validated on recovery. |

The demonstration can retain multiple work versions for rework, but the current verified-completion count is distinct by case. It is not the count of all technician actions or all accepted observations. There is no claimed actual repair duration, avoided downtime, throughput gain or savings.

## Browser behavior and supportability

Storage key: `portfolio-phase2-work-v1`. Invalid imports preserve all journals. A rejected saved work journal is unavailable and cannot be overwritten by normal workflow actions. Valid checkpoint import replaces only the work journal after explicit confirmation when needed; purchasing and maintenance remain unchanged. Before a decision, the current stored work journal is compared with the visible snapshot so a stale page cannot accept a newer unseen version. Work execution rereads current linked source journals.

The machine view displays the same independent work lifecycle. The hub links the eighth demonstration, shows distinct verified work completions, and exports a separately namespaced work checkpoint/model alongside purchasing, maintenance and the machine fixture. Ordinary work and verification decisions do not alter purchasing or maintenance commands, post costs, or rewrite original machine readings.

Native HTML/CSS/JavaScript follow the existing no-network content policy. Roles illustrate separate responsibilities; they do not authenticate people or establish actual segregation of duties. Browser journaling is inspectable recovery, not tamper-proof enterprise evidence.

## Verification

Thirteen work-rule groups cover exact linked material/PO gates, UTC/order/role/reason validation, retained provenance before payment, explicit verification, stale work/evidence rejection, rework versions, idempotence, policy/replay consistency, immutable source journals and invalid source checkpoints.

Work browser checks cover eight width/theme screens and 26 interaction assertions, including a three-version returned/reworked/accepted example, stale-decision protection, source preservation, exports, corrupt-storage recovery and shared hub/machine status. Expanded populated states receive automated accessibility screening; desktop/mobile screenshots are visually inspected. The hub's revised coverage includes eight layouts and 19 assertions.

The complete portable runner contains 20 executable rule/export/browser groups. Hosted acceptance runs them through the existing BI job. Automated screening is not comprehensive accessibility conformance or physical equipment acceptance.
