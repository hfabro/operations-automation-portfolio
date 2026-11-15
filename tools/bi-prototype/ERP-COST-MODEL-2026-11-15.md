# ERP-centered purchasing and cost model

## Product decision

The controlled P2P showcase is ERP-centered and vendor-neutral. PO lines are the purchasing control anchor. The original BPI public event log remains a separate historical analysis; it does not supply these fictional GL/cost-center assignments, invoice amounts, or control results. No live ERP or native Power BI connection has been made.

PO-first is the demonstration default. Real non-PO expenses, credit notes, and other exceptions require explicit policies and separate flows rather than invented PO links. Those exceptions are acknowledged but not implemented in this slice. Requisition approval and PO creation are upstream future work; the current model starts with already approved POs.

## What a bucket means

| Dimension | Purpose | Fictional example |
| --- | --- | --- |
| Entity / currency | Accounting boundary; no mixed-currency totals | SYN-CO-01 / USD |
| Site | Physical location | Lakeside |
| Department and cost center | Accountable organization and cost assignment | Facilities / FAC-100 |
| Spend category | Procurement classification | MRO consumables |
| Account | Financial classification in this teaching model | 6100 · Maintenance supplies |
| Project | Cross-department initiative | CAP-026 |
| Asset and work order | Operational reason for purchasing | PUMP-04 / WO-410 |

These are dimensions, not interchangeable categories. The same cost can be viewed by project, cost center, and asset without being added three times. Capital/operating labels are fictional scenario classifications, not an accounting-policy determination.

Distributions live beneath the PO line. Shares total exactly 10,000 basis points (100%). The example pump purchase is $2,500, allocated $1,750 to Facilities and $750 to Production. A project association does not duplicate its $2,500 cost. Exact-cent allocations use integer arithmetic, deterministic remainder handling, and invoice-specific settlement allocation. Unpaid cents are derived from the allocated invoice less allocated paid cents, preserving reconciliation even for partial payments and penny remainders.

## Stage definitions

| Measure | Formula in this slice | Interpretation |
| --- | --- | --- |
| Approved PO value | Approved quantity × PO unit price | Original approved purchasing amount |
| Open PO commitment | (Approved quantity − posted invoice quantity) × PO unit price | Unbilled purchasing balance, not a journal-entry balance |
| Received-not-invoiced proxy | (Accepted quantity − posted invoice quantity) × PO unit price | Receipt-based proxy, included in open commitment |
| Posted net invoices | Sum of posted invoice quantities × invoice unit prices | Net invoice value; not necessarily expense recognition |
| Unpaid invoice balance | Posted net invoice value − allocated paid amount | Outstanding amount within the fictional records |
| Cash paid | Recorded payment allocations | Settlement stage; no real funds movement |

Do not add commitments, receipts, invoices, and payments as separate costs. Posted invoice value always equals unpaid plus paid at both total and cost-center levels. Tolerated invoice-price differences mean PO-basis values do not automatically reconcile to actual invoice values without a variance bridge. A full GL, inventory valuation, accrual accounting, asset capitalization policy, and budget consumption are not implemented.

## Workflow now implemented

1. Select a PO line and inspect its allocations and operational context.
2. An invoice exceeding accepted uninvoiced quantity is held.
3. Receiving can accept the remaining quantity. A service line uses an accepted service milestone rather than a goods delivery.
4. AP validates quantity and an inclusive 1% unit-price tolerance, checks a normalized supplier invoice reference across the scenario, and posts an eligible invoice.
5. A separate Approver role authorizes payment.
6. Treasury can record simulated settlement after authorization.
7. Cost-stage summaries and session history update. Restart requires confirmation; cancellation preserves state.

Roles are illustrative mode switches in the same browser; they are not identity management or enforceable segregation of duties. All seed balances are independently fictional. History begins with session actions; no fabricated user history is attached to seed records.

## BI modeling preparation

`tools/export_erp_model.cjs` exports six separately identified fictional tables to `curated/fictional-erp/`: PO lines, cost distributions, accepted-receipt summaries, invoice lines, payment allocations, and a derived cost-stage ledger. Their manifest declares grain, currency, unit, starting-state scope, and the requirement to aggregate child facts before combining them. Initial receipt summaries are not presented as a full receipt event history. The export is reproducible from `ERP.seed()` and does not change when visitors use session controls.

This is a preparation layer for a future Power BI model, not a native semantic-model artifact. The public-log event model and fictional financial model will remain distinct. Keep third-party CC BY source data outside any blanket restrictive portfolio-code license when integrating the previews.

## Verification

- Eight rule/reconciliation groups passed, including exact-cent distributions, partial-payment remainders, invalid quantities/distributions, receipt gates, tolerance boundaries, duplicate references, immutable transitions, role gates, and separate authorization/payment.
- Eight ERP layout/theme checks passed (320, 375, 768, 1440 pixels × light/dark); no outer-page overflow or reported axe rule violations.
- Twelve ERP browser workflow checks passed across both themes.
- Existing real-data preview passed its eight layout/theme and eight interaction checks after adding reciprocal links.
- Screenshots inspected; production portfolio unchanged. Physical devices, screen readers, native ERP and Power BI execution remain unverified.

## Remaining extensions

Approved budget vs actual and forecast; change-order/cancellation controls; returns and credit notes; taxes/freight/discounts; multiple currencies; time-based commitments; native ERP field mappings; persistent authorization; and native Power BI artifacts. Add these with explicit business contracts rather than implying that the current fictional model already implements them.

## First-party reference patterns

- Financial dimensions and accounting distributions: https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/accounting-distributions
- PO/receipt/invoice matching: https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/accounts-payable-invoice-matching

These illustrate established ERP patterns. This portfolio does not claim a Dynamics 365 implementation or identical configuration.
