# Phase 2 direction: automate consistency at the point of work

The user's objective is to automate repeatable decisions and integrity checks so people do not repeatedly decide financial coding or interpret the same procedure differently. BI should consume consistent records produced by those controls, rather than depend on repeated dashboard cleanup.

## Working pattern

Business selection → approved reference data → exactly one valid policy → derived assignments → validated draft → controlled transaction → traceable reporting.

Only true business inputs belong with the requester. Accounting, ownership, routing, identifiers, units, and required evidence should derive from governed rules where the necessary context is known. An absent, conflicting, expired, or invalid mapping becomes a named exception; no guessed account or silent fallback is applied. Finance still owns the classification policy and resolves novel cases. Automating a bad mapping would repeat the error consistently, so rule ownership, testing, approval, versioning, and exception feedback are part of the design.

## New local demonstration

`preview/guided-entry.html` lets the requester select an approved catalog item, work request, and quantity. These are the only accepted input fields. Derived assignments are displayed as read-only outputs:

- Catalog: supplier, spend category, unit, and price.
- Work request: site, asset, work order, and project.
- Finance policy: account, treatment, department/cost-center splits, owner, rule version, and effective dates.

The same pump maps to the fictional capital-project account when purchased for the approved upgrade, or the repairs account for routine repair. Context is an approved work-request identifier, not a free-text assertion that the requester wants CAPEX treatment.

Missing mappings, conflicting effective policies, closed/unapproved or mismatched projects, blocked suppliers, invalid account/cost-center combinations, invalid allocation totals, and invalid quantities are held. Source-system or backend enforcement is not provided by this browser demonstration.

Staging snapshots both the inputs and the resulting coding, master version, policy version, and evaluation date. Future master changes do not rewrite the earlier staged record. A stable submission ID makes retries idempotent; reuse with changed inputs is rejected. A held record has a reason and owner but no invented financial assignments.

Ready records are **coded requisition drafts awaiting purchasing review**. They do not automatically create an approved PO or financial commitment. The separate downstream ERP demonstration remains based on approved starting POs. Automatic conversion, budget approval, and persistent audit linkage between these two demonstrations are future work, clearly disclosed in the interface.

## Verified checkpoint

- Nine governed-rule groups passed: deterministic mappings, contextual coding, blocked references/overrides, effective-date boundaries, ambiguity, master-data consistency, submission idempotency, immutable snapshots, and owned exceptions.
- Guided UI: eight width/theme screens and twelve workflow checks passed in Edge; no outer-page overflow, page errors, or reported axe rule violations in tested screens.
- Both linked existing views passed again: eight ERP screens/twelve workflow checks, and eight historical-analysis screens/eight interaction checks.
- Desktop screenshot inspected. Automated screens do not certify complete accessibility, physical devices, real ERP execution, or native BI runtime.

Artifacts: `preview/coding-rules.js`, `preview/guided-entry.js`, `preview/guided-entry.html`; tests under `tools/test_coding_rules.cjs` and `tools/test_guided_browser.cjs`; results under `evidence/coding-rules-validation.json` and `evidence/guided-browser-validation.json`; fictional master snapshot under `curated/governed-coding-master.json`.

No production files were changed or published. No real financial policy, employer data, or approval is represented by the fictional policies.

## Apply the pattern across the portfolio

| Repeatable decision/control | Intended automation | Current scope |
| --- | --- | --- |
| Purchase cost coding | Approved item + work request derive valid assignments | New working local demonstration |
| Receipt/invoice eligibility | Validate quantities, references and tolerances | Separate working fictional ERP demonstration |
| Requisition-to-PO conversion | Preserve coding snapshot, apply budget/purchasing approvals, avoid re-entry | Next integration milestone |
| Master-rule updates | Named owner, reviewed change, test impact, effective dates and approved release | Data versioning demonstrated; persistent change-approval workflow pending |
| Work completion | Require defined status, evidence and disposition before completion | Existing portfolio patterns; future cross-domain integration |
| Machine-data integrity | Approved tag/asset mapping, unit/time normalization, quality flags, missing-data handling | Planned machine-data milestone |
| BI publication | Reconcile measures and dimensions against source contracts before refresh | Full-data P2P pipeline checks exist; native Power BI artifacts pending |

Measure the resulting process with derived-coding coverage, exception reasons/aging, correction rate, manual touches, and rule-change regressions. Define cohorts and denominator before publishing a percentage. This checkpoint does not claim measured effort savings or business-wide automation rates.
