# Simulated machine intelligence

`preview/machine-intelligence.html` adds a working observation-to-business story to the portfolio. Every source observation is deterministically invented. This is not a captured public trace, a connected PLC/SCADA application, or an equipment diagnostic tool.

## Visitor journey

1. Choose PUMP-04 or AHU-02 and replay a fixed UTC window, 08:00–08:30 on 15 November 2026.
2. Inspect run/stopped/unknown state, a vibration trend, and the observations behind each condition episode.
3. Review one owned maintenance case. Monitoring creates no requisition; release to an approved work package requires a reason and a separate simulated role.
4. As Maintenance planner, stage a single requisition using the existing governed coding policy. This links the condition to approved repair work package WO-413 / WORK-REPAIR. It does not invent a new work order, diagnose equipment, automatically select capital treatment or approve purchasing.
5. Continue through the existing purchasing page: purchasing approval → PO → acceptance → invoice matching/posting → separate payment authorization → settlement.
6. Return to inspect the exact request's cost stages, or use the existing BI report and drill through to the same request and finance rule.

The reviewed repair uses CODE-002, account 6105 Equipment repairs, and FAC-100. One fictional catalog unit is $1,250. Staging is a requisition, not a commitment; the $1,250 becomes open commitment only after purchasing approval. All example prices are fictional, not a repair quotation or a claim of savings.

## Data and measurement contracts

| Collection | Grain / control |
| --- | --- |
| Source rows | One fictional asset/tag/UTC timestamp/sequence observation, with explicit unit and quality. |
| Accepted observations | One unambiguous source observation. Identical IDs count once; conflicting IDs and ambiguous asset/tag/time records are quarantined in full. |
| Quarantine | One excluded source row with its ordinal, original content and reason. Exclusion counts describe the whole capture. |
| State intervals | One non-overlapping [start, end) interval per asset. Good state expires after 60 seconds. Missing, bad or uncertain state becomes UNKNOWN. |
| Condition episode | Three consecutive good one-minute vibration observations above the fictional threshold while a fresh good state is RUN. Source IDs and state-source IDs are retained. |
| Condition case | One asset/rule/day, grouping repeated episodes into one work request. This fixture uses one vibration rule and one day. |
| Maintenance journal | One validated review/handoff command. Separate from purchasing approval and financial events. |
| Cost bridge | The exact staged request ID → PO-line/cost-center allocations. Unrelated purchases on the same asset are excluded. |

Source reconciliation: **182 captured = 176 accepted + 6 excluded**. The six exclusions are one identical duplicate, both copies of one conflicting ID, one unknown asset, one unsupported unit, and one observation outside the half-open capture window. Two accepted observations carry Bad/Uncertain quality and remain visible; they cannot establish state or trigger a condition.

PUMP-04's complete 30-minute window contains **22 minutes RUN, 5 STOP, 3 UNKNOWN**. Known-state coverage is 27/30 = 90%; run share of known-state time is 22/27. These have different denominators. AHU-02 has 30 minutes RUN. No planned schedule, production count, ideal cycle time or quality yield exists, so no OEE, availability, lost units or avoided-failure result is claimed.

The teaching threshold is 5.5 mm/s RMS with three consecutive observations. It is an invented scenario policy, not an industry/manufacturer limit. Bad quality breaks persistence. The first episode is detected at 08:09; recurrence at 08:23 stays in the same condition case. A replay cutoff of 08:09 excludes the 08:09 observation, so it does not reveal the first episode early. A zero-minute window has unavailable ratios, not 100% coverage.

Source arrival order is deliberately shuffled. The projection sorts by event time, retains UTC and source sequence, and does not use future observations. The full-capture source/exclusion ledger is explicitly separate from replay-filtered operating measures. Trend segments do not bridge bad-quality observations or missing minutes. Temperature remains contextual only.

## State, recovery and boundaries

Pure modules separate deterministic samples, curation/intervals/conditions, maintenance commands, and the existing purchasing/report model. The interface uses native HTML, CSS and JavaScript under the existing no-network content policy. There is no new runtime service, package, paid connector or framework migration.

Maintenance storage uses `portfolio-phase2-machines-v1`. Purchasing keeps `portfolio-phase2-connected-v1`. Checkpoints validate schema, fixture/policy identity, roles, reasons, transitions, repeated command IDs and replay consistency. Invalid imports preserve both journals. A rejected saved journal is not silently replaced by an empty one. The explicit handoff writes the reviewed maintenance state and idempotent staged purchasing command with rollback on storage failure. This is browser recovery for a fictional demonstration, not authenticated or tamper-proof enterprise audit storage.

Reviewed mapping and quantities cannot be supplied as accounting overrides. Repeated handoffs reuse one stable request/command ID. Existing unrelated journal records are preserved. A conflicting purchasing request is held rather than recoded. A signal returning to normal, an invoice being paid, or an already staged requisition does not complete maintenance work or prove a repair; the separate work-execution/completion scenario is implemented in `preview/work-execution.html` with explicit technician and verifier actions. See `WORK-EXECUTION-2026-11-15.md`.

## Verification

Twelve rule groups cover reconciliation, intervals/gaps, replay boundaries, repeated episodes, invalid data/units/UTC, arrival order, role/reason gates, idempotent and collision-safe handoff, replay recovery, full financial lineage and unrelated-cost exclusion.

Browser acceptance covers eight width/theme screens and 32 interaction assertions, including the complete UI handoff through settlement and the existing BI report, quality evidence, pagination, exports, corrupt-storage recovery and preserved purchasing records. Automated accessibility screening covers initial and populated states. Desktop/mobile screenshots are visually inspected. It does not establish comprehensive accessibility certification.

The portable runner now contains 20 executable rule/export/browser groups, including all preceding scenarios. Hosted CI runs the same machine checks as part of the existing dedicated BI job.
