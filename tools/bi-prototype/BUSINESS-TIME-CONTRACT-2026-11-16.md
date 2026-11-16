# Business-time foundation, version 1

This is an independent, explicitly fictional 90-day cohort for trends/aging. It does not reconstruct a visitor's saved session, join BPI research to company data, or establish actual business performance. The source foundation is also used by `business-trends.html`, a read-only visitor view with explicit period/cutoff controls, owned aging and source drill-through. Its browser worker uses the same model; it does not read or replace saved journals.

## Source of truth and lifecycle

`tools/build_business_time_fixture.cjs` owns the authored event definitions; `fixtures/business-time-v1.json` and `preview/business-time-data.js` are their deterministic UTF-8 JSON/browser projections. The latter contains only this explicitly fictional cohort and is admitted to the public build for the local calculation worker. The builder uses no random values, wall clock or network. Run it with `--check` for drift verification, or explicitly with `--write` after reviewing source changes. `preview/business-time-rules.js` validates/replays/projects the fixture using unchanged coding, purchasing, invoice, machine and work rules. The admitted terms policy is defined once in this module and captured in the fixture. Core operational rules and persisted browser-journal schemas remain unchanged; the public projection explicitly admits the trend route and its fictional data/model assets.

```powershell
node tools/bi-prototype/tools/build_business_time_fixture.cjs --check
node tools/test-bi-business-time.cjs
```

## Closed source envelope

| Field | Definition |
|---|---|
| `format`, `version`, `fictional` | `SIMULATED-BUSINESS-TIME`, 1, true |
| `scenarioId`, `companyId` | Stable scenario namespace and admitted fictional company `SYN-CO-01` |
| `currency` | USD reporting currency; unsupported source invoices remain held without conversion |
| `calendar` | America/Chicago, calendar days, inclusive business-date cutoff |
| `window` | ISO `start`, `end`, `defaultAsOf`; exactly 90 civil dates |
| `policySnapshots` | Exact admitted Finance, maintenance, work and terms snapshots |
| `description` | Bounded source/simulation explanation |
| `events` | At most 250 uniquely identified events, including an explicitly empty cohort if authored |

The supplied cohort is August 18–November 15, 2026: 52 events, with 46 purchasing, two maintenance and four work commands. Finance-rule validity must cover the declared business date, not merely the existing engine's fixed evaluation date. Changes to policy provenance require an explicitly admitted contract/scenario revision, not silent recoding.

Each event contains only `id`, `companyId`, `domain`, `occurredAt`, `recordedAt`, `businessDate`, `dependsOn`, `command` and, for an original invoice import only, `invoiceDates`. Commands contain `type`, `actor`, `payload`; the source event ID becomes the core command ID. Source references are canonical and dependency edges point to actual prior events in the same company/cohort. Unknown fields, repeated IDs, forward/cyclic or missing business dependencies and unsupported roles/actions are rejected.

The graph binds approval to request, receipts to PO/prior receipts, imports to known PO sources, invoice decisions to prior document decisions, posting to accepted material/service, and work decisions to reviewed conditions, material acceptance and prior execution/disposition. Missing PO references are admissible only as visible owned holds. Work checkpoints are injected from the validated replay; fixture payloads cannot supply replacement purchasing/maintenance snapshots.

## Clock meanings and boundaries

- `occurredAt` and `recordedAt` are canonical UTC strings. Occurrence order is nondecreasing; recorded order is strict; recording cannot precede occurrence.
- `businessDate` must match both timestamps in America/Chicago and fall in the declared window. Version 1 excludes delayed-day capture and backdated commands; it is not a bitemporal/restatement model.
- Queries accept optional ISO `from` and `asOf` dates inside the window, with `from <= asOf`. Omitted values use the declared defaults. Explicit null, malformed or out-of-window values fail; they never substitute a later snapshot.
- A cutoff includes events through that complete business date. Period flows include dates from `from` through `asOf`; the opening balance uses events before `from`. Civil-date arithmetic deliberately differs from dividing elapsed hours by 24 across DST.
- Current core journal `audit.simulatedAt` values are generated teaching diagnostics. They are retained only inside their original replay/checkpoint meaning and never drive business aging or period grouping.
- The existing condition and post-work observation windows remain on November 15. Reviews cannot precede the admitted complete condition window. Accepted verification cannot precede the admitted post-work window's end. These observations are never relocated into earlier months.

The complete fixture is validated even for an earlier cutoff. Later valid events remain in source history but are absent from cutoff facts, balances and source checkpoints. The result may report a count of excluded future events; that is source coverage, not a prediction.

## Invoice dates and terms

An original import supplies `invoiceOn`, `receivedOn`, `dueOn` and `unknownReasons`. Every date is valid ISO or explicit null. Each null requires a bounded reason; known dates cannot also carry an unknown reason. Invoice/receipt dates cannot follow import, and invoice date cannot follow a known inbox receipt date.

`SYN-TERMS-1` is a fictional Finance-owned policy: calendar net 30 for suppliers 01/02 and net 45 for supplier 03, effective during 2026. A known invoice date and admitted applicable supplier term must produce the exact supplied due date. Otherwise due date remains explicitly unknown. Its policy/rule ID is retained. These are scenario terms, not assertions about external commercial practice.

Supplier price corrections retain the original date source, receipt age and document history. Correction approval does not itself create posted-value flow. This version has no date-amendment event; a later date repair would require explicit source/version governance.

## Measures, grains and identities

| Result | Grain / control |
|---|---|
| Event evidence | One event, qualified by scenario/company |
| Financial balances | Approved PO line × cost center at cutoff, using the existing exact-cent model |
| Financial activity | Event × PO line × cost center × measure; each approval/post/payment delta counted once |
| Document dates/unpaid | One retained document at cutoff; do not duplicate headers across lines/allocations |
| Held aging/owners | One currently held document under its primary owner; reason tags can overlap |
| Work evidence | Retained execution versions, with latest-version flags and dated independent decisions |

Relationship keys are unambiguous JSON-encoded tuples containing scenario, company, kind and source identity. Matching raw IDs across independent examples does not establish a join. IDs and source checkpoints are retained for inspection; consumers must use qualified keys to combine facts.

Amounts use nonnegative safe integer cents. The supported net-USD period identity is:

`opening unpaid + posted in period - paid in period = closing unpaid`

The existing as-of identity remains `posted = unpaid + paid`. Stock snapshots are not summed as transaction flows. Commitments use approved quantity/price basis; this is not a complete GL, tax/credit, FX, partial-settlement or accounting-close model.

Posted unpaid balances partition exactly into known overdue (due date before cutoff), known not-yet-due (including equality), and unknown-due amount. A missing due date is not zero overdue. Held-document ages use days since source invoice receipt, with 0–7 / 8–30 / 31–60 / 61+ / unknown buckets. Unsupported-currency invoices can be counted in review queues but do not contribute to USD financial flows/balances.

## Declared scenario controls

At November 15, approved value is $8,450; open commitment $2,250; received-not-invoiced $250 within open; posted net $6,200 = paid $4,050 + unpaid $2,150. Unpaid comprises $100 overdue, $50 not yet due and $2,000 with unknown due date. Three held documents have two known receipt ages and one unknown. Six approved PO lines retain policy provenance; a separate seventh requisition remains held for missing mapping. Two work execution versions retain a return followed by independent acceptance of the latest version.

| Period | Opening unpaid | Posted flow | Paid flow | Closing unpaid |
|---|---:|---:|---:|---:|
| Aug 18–31 | $0 | $300 | $0 | $300 |
| September | $300 | $2,500 | $300 | $2,500 |
| October | $2,500 | $2,100 | $2,500 | $2,100 |
| Nov 1–15 | $2,100 | $1,300 | $1,250 | $2,150 |

## Verification and future UI gate

Model checks cover all 90 daily cutoffs, independent financial goldens, due/unknown boundaries, owner/document partition, corrections/withdrawals, multi-line and split allocations, qualified identities, null/empty/invalid inputs, DST/Chicago dates, chronology/dependencies, role/policy/source tampering, future invalid events, fixed observation clocks and immutable checkpoint recovery. Browser parity compares complete model hashes with Node in isolated Edge/Firefox/WebKit contexts as configured; it does not claim a new UI or production CSP acceptance.

The trend route must expose cohort, units, period/cutoff, measure definition, date availability and source drill-through. It must distinguish this cohort from browser-session snapshots, and must not claim measured savings, avoided failures, OEE, actual operating efficiency or a complete physical-work backlog. The visitor view computes calendar-month slices intersecting the selected period, never sums stock balances, and exports only cutoff-included authored events and source checkpoints. A pending/invalid/failed calculation hides previous figures and disables export. Browser tests cover the actual project-path worker, source inspection, query boundaries, downloads, read-only storage, accessible states and responsive themes. Public deployment remains a separate explicit publication decision.
