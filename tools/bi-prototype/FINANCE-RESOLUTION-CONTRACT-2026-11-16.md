# Connected Finance resolution contract

Browser-only fictional portfolio extension, based on published main `9a18049`. The existing independent Finance example and all version-1 purchasing checkpoints must remain replayable.

## Source and decisions

Management transfers an exact held request using declared source mode, request ID and SHA-256 of the canonical purchasing checkpoint. A hash is source identity, not authentication. The receiving workbench reconstructs the explicit guided example or reads the actual current journal. Missing, damaged or changed content cannot silently become the example. A retained coding-hold evidence JSON can also be imported and replay-validated. The original request must be Held / NO_APPROVED_MAPPING; other controls remain owned holds.

Finance proposal/review reuse the existing append-only policy journal. The proposal targets the captured item/work purpose, with an admitted account, positive unique cost-center shares totaling 10,000 basis points and a nonempty effective interval. Approval requires a different person and cannot introduce retroactive effectiveness. Existing approved mappings cannot be replaced or overlapped. Date checks distinguish pending, rejected, future, effective and expired decisions.

## Purchasing boundary

A new `stagePolicyRequest` purchasing command derives its input from the existing held request and replays the embedded Finance journal. Only an effective independently approved mapping that resolves this exact context may create a new Coded draft. It does not approve a PO, receive goods, post an invoice or authorize/pay it. The original request's input, result and object remain unchanged. The new request carries the original request ID and approved-policy provenance. Only one reviewed replacement draft per held request is supported; repeated identical commands remain idempotent and conflicting IDs/stale revisions fail.

The purchasing journal keeps its baseline policy snapshot and schema version 1. Finance decisions live in the new command payload, replayed on restore. Existing commands and their prior results retain their behavior. This increment applies a dated approved snapshot to an explicit replacement draft; it does not claim global master-data rollout, revocation or automatic recoding of other requests.

The workbench works on a separate copy of the captured purchasing checkpoint. Before an explicit handoff to shared purchasing, the complete current saved checkpoint must still match the captured source. A guided example cannot replace a saved journey without explicit visitor confirmation. Damaged or changed current sources are preserved and block handoff. Checkpoint downloads remain available without writing shared journals.

## Derived presentation

Purchasing explains the original hold and replacement relationship. Approved PO lines retain the new request's captured rule/version/date; invoice allocations and reports reuse existing calculations. Management separates original holds with reviewed replacements from actionable unmapped requests; it does not double-count a retained hold as a new unresolved decision. Original history stays inspectable and exportable.

## Acceptance

Prove legacy checkpoint/model parity; correct request quantities and target identity; independent approval, effective-date and conflict gates; no guessed/vendor-only coding; original request/PO immutability; exact source-content changes at the same revision; absent/damaged storage; replay/tamper rejection; idempotency and duplicate replacements; stale Finance/workflow handoffs; reviewed PO-to-invoice-to-paid allocations with posted = unpaid + paid. Verify keyboard/touch, responsive light/dark layouts, inert text and restrictive CSP in the established three-engine CI workflow. Every declared result is simulated; no native application, live ERP, backend or paid service is required.

## Teaching-clock causality

Legacy journals retain their exact generated timestamps. A reviewed-draft command advances the illustrative purchasing clock to at least its explicit policy evaluation date; subsequent commands advance monotonically. A reviewed PO therefore cannot appear to predate its Finance decision merely because the legacy teaching clock starts on November 15. These remain fictional event timestamps, not elapsed-time or performance measurements.
