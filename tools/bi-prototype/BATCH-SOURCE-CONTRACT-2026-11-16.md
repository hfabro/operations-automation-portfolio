# Invoice batch saved-source contract

This controller correction protects the fictional purchasing checkpoint used by the browser-only invoice batch demonstration. It does not change parsing, invoice grouping, queues, coding inheritance, matching, idempotent command IDs or financial calculations.

- Only a missing saved key represents a new journal. Empty and malformed values are unavailable sources and block staging, including guided replacement. The error directs visitors to the existing purchasing recovery workflow. A failed switch to current context retains the clearly labelled guided preview, rather than presenting guided figures as current records.
- Staging captures the complete saved value, restores it through the existing command replay and runs the existing batch source/preview checks. Immediately before writing, it compares the saved value again. Changes during the guided replacement confirmation, including deletion, empty or malformed values, block the write and retain the prior preview.
- Cancelling a guided replacement preserves all journals. A confirmed replacement of an unchanged source affects purchasing only. Maintenance and work checkpoints are retained. A failed read or write does not promote the preview to saved progress.
- The existing current-source preview guard still rejects changed command content at the same revision. Re-previewing uses that changed source. An already-staged retry may retain unrelated newer commands through the existing idempotent batch rules; it does not replace them with an older preview.

`node tools/test-bi-batch-source.mjs` verifies 14 source/staging groups and four responsive automated accessibility screens per browser engine. Existing batch/browser checks cover multi-line evidence, owned holds, separate posting/authorization/settlement and downstream cost-center reporting. All processing remains in HTML/CSS/JavaScript with fictional records and no external-system connection.
