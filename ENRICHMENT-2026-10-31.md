# Evidence-led portfolio enrichment

## Scope and review status

This branch is based on PR #1's validated `cceaeb3` checkpoint. It adds three case studies and an illustrative financial decision lab while retaining the existing dependency-free static architecture and interactive demonstrations. The branch is intended for a separate, stacked pull request targeting PR #1's branch; it must not be merged or deployed without sponsor authorization.

The supplied private research consists of cumulative secondary-source extracts of operational documents and communications. The underlying records were not directly accessed or independently re-audited in this development session. The private 24-item integration brief was subsequently supplied and mapped item by item in a private inventory outside Git. The mapping identifies implemented P1 coverage and deliberately deferred P2/P3 items; it is not an independent verification of the underlying records or permission to disclose further figures.

## Evidence-based changes

| Portfolio area | Public treatment | Evidence and limits |
| --- | --- | --- |
| Facilities Digital Operations | New case study and links to existing synthetic portal, leak, and compliance workflows | The extract describes a portal linking several tools and communications. It does not establish one shared database or a consolidated verified financial return. Workflow operating status varies. |
| Financial, energy, and capital decisions | New decision-support case and qualitative synthetic decision lab | The extract describes program calculations, planning scenarios, alternatives, and decision gates. Program-calculated energy differs from metered realization; cost is an estimate. The modeled planning total is not published as achieved savings. No source prices or confidential vendor comparisons are presented. |
| Bilingual Toolbox Talks | New case study linked to the existing synthetic bilingual workflow | The extract describes materials, quizzes, acknowledgments, completion reporting, and data-quality concerns. Modeled capacity is not verified payroll savings and is not annualized from the available period. The public quiz is not certification. |
| Ladder inspection | Clarifies documented departmental workflow and unresolved target-system decision | Functional implementation is distinct from a broader rollout; no financial outcome is claimed. Existing identity, inspection, exception, history, and device logic remain untouched. |
| Compliance and Kanban | Adds status and financial-result boundaries | A rollout-ready description is not proof of every downstream deployment; replenishment communications do not establish realized savings. |
| Forklift telemetry | Adds pilot and data-quality constraints | Modeled charging timing is not an approved operating change; a configuration concern requires reconciliation before reliance. No modeled amount is presented as actual savings. |
| Maintenance architecture | Clarifies prototype and system-of-record boundary | The browser prototype remains synthetic and offline; future integration requires business and IT review. |

The existing public compressed-air statement remains limited to a program-calculated energy figure and estimated annual cost, not independently demonstrated metered reductions. No unpublished planning total, labor-capacity valuation, source names, tenant URLs, source screenshots, vendor prices, or private documents are included. Authorship or involvement in source artifacts is not treated as proof of sole ownership, production deployment, or executive approval.

## Verification and maintainability

- The Work library has 13 entries, including seven detailed cases. Its search/filter state remains URL-shareable and degrades to the full library without JavaScript. The homepage points to all three new cases; `sitemap.xml` contains their routes.
- The financial decision lab uses native `<details>` controls and a progressively enhanced, keyboard-accessible overlap selector. Its fictional qualitative scenarios have no backend, production records, monetary inputs, or calculated savings total; the static examples remain available without JavaScript. Existing production/demo scripts are not refactored.
- Static validation, synthetic-data tests, Playwright browser coverage, automated accessibility screening, and representative desktop/mobile screenshot review must be run on the exact branch head. Record actual results in the pull request; automated accessibility checks are not a conformance certification.
- The workflow includes PR #1's branch as an additional pull-request target so the stacked PR can run the same validation before PR #1 is merged. Once its base is retargeted to main, the main-branch trigger applies. Check exact-head CI after either change.

## Remaining work and rollback

The 24-item brief is mapped to existing, new, or deferred portfolio coverage; detailed capital/infrastructure and procurement narratives remain a future phase. Original financial and operational records remain private and were not directly audited. Unresolved source conflicts, new project-specific financial figures, internal operating vulnerabilities, and a future-dated rollout reference remain excluded. Screen-reader, physical touch, Safari/Firefox, and real-world usage validation remain outside this branch's automated evidence. The résumé is out of scope.

If a released change needs to be rolled back, use a normal revert commit after authorization, run the existing checks, and verify the affected public routes. Do not reset or force-push production. Preserve PR #1 and its separate history.
