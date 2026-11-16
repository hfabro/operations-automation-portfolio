# Source-bound BI table handoff, version 1

The Data and methods view exports six complete CSV tables, a shared schema/source manifest and an optional JSON bundle containing the six CSV file contents plus that manifest. This makes the existing simulated financial model reusable outside the browser without changing operational logic or claiming a native Power BI report. The original inspected-model JSON download remains available.

## Source and ownership

`preview/data-methods-export.js` calls the unchanged `DataMethods.inspect` model from a validated purchasing state. It projects the fields already declared in that model's six contracts: approved PO lines, cost allocations, current invoice documents, invoice-line allocations, current exceptions and document evaluation history. No new measures, cross-cohort joins, inferred mappings or operational commands are introduced. The exporter does not read or write storage; the view captures the explicitly selected guided/current source and manages asynchronous completion.

The manifest retains the source choice, journal revision, captured policy version, full SHA-256 checkpoint identity, constructed audit as-of, replayable checkpoint, table grains/keys/owners/relationships, typed field definitions, all source quality checks, document/held counts and reconciled financial totals. Its checkpoint identity hashes UTF-8 `JSON.stringify` of the validated replayable checkpoint. It is not a fingerprint of original storage bytes or a measured business timestamp. Identical validated checkpoints have the same hash; guided/current context labels remain distinct. Revision alone cannot establish source identity.

Filename prefixes contain the source choice and first 12 checkpoint-hash characters. The full hash remains in the manifest. Each CSV has its own full SHA-256, UTF-8 byte length, row count and filename. The manifest and bundle filenames use the same source prefix. File hashes establish content correspondence; they are not digital signatures or proof of business authorization.

## CSV and schema contract

- UTF-8 with an explicit BOM; comma delimiter; CRLF record separators and final CRLF. Every field is double quoted, with embedded double quotes doubled.
- Columns follow the existing table dictionary exactly. All table rows are exported; the screen's 12-row preview and financial-stage display do not filter the files. Empty tables retain their header and zero-row metadata.
- Identifiers remain Text. Amount/count columns are safe integers; monetary values are cents, with reporting USD versus source-document currency retained. Boolean values are `true`/`false`. Nested policy objects and reason arrays are JSON text, not flattened into repeated monetary facts.
- A literal `\N` CSV cell denotes null. Empty text remains empty. A source text value equal to `\N` receives a transport apostrophe so it remains distinguishable. Null-token conversion must precede text unescaping.
- Formula-like or leading-apostrophe text receives one leading transport apostrophe. After null handling, remove exactly one leading apostrophe from text columns. The exporter records one-based data-row/column `nullCells` and `escapedTextCells` coordinates for independent audit. Commas, quotes, newlines and Unicode remain reversible. These are transport rules, not a universal spreadsheet execution-safety guarantee; use typed Text/CSV import rather than assuming direct-open/save/reopen behavior preserves protection. [OWASP describes the interoperability limitations of CSV formula escaping.](https://community.owasp.org/attacks/CSV_Injection)
- Bounds: 10,000 rows per table, 32,768 UTF-16 code units per serialized field, 1 MiB UTF-8 per CSV and 4 MiB for the CSV set. Invalid Unicode, missing projected fields, duplicate/empty keys, unsupported types, unsafe integers and excess bounds reject the export. No partial table or silently truncated replacement is offered.

The optional JSON bundle contains `manifestFilename`, `bundleFilename`, `manifest` and `files`. Each file has its table ID, filename, media type and exact CSV content string. It is a single self-contained JSON artifact, not a ZIP or native workbook. JSON serialization escapes the BOM/newlines within strings; recreating each string as UTF-8 reproduces its declared CSV hash.

## Interpretation and import

The [Microsoft Text/CSV connector](https://learn.microsoft.com/en-us/power-query/connectors/text-csv) provides file-origin, delimiter and type-detection settings. For these exports, choose Get Data → Text/CSV → Transform Data, UTF-8, comma delimiter and no automatic type detection. Apply the declared null/text transformations before explicit field types. Keep IDs as Text and integers as whole numbers. Deliberately expand JSON columns only where needed; that expansion changes grain and must not multiply financial totals.

Use the manifest's parent keys and references. Its relationships describe this snapshot; they do not prove every reference resolved. Unmapped PO references remain explicit source-quality review items. Follow the [Microsoft guidance on avoiding direct fact-to-fact relationships](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-many-to-many). Document headers must not be summed after expansion into multiple allocations. Count distinct documents, compare values within one currency and reconcile posted = unpaid + paid. Received-not-invoiced is already within open commitment; financial stages are not additive separate purchases.

These are full-state snapshots. Do not append them as new transactions, infer invoice aging from audit timestamps, combine different source modes without an explicit model, or treat a held/unposted invoice as cash spent. Empty means no records, not a successful test of nonexistent rows.

Power BI Desktop import/render/refresh, tenant access and publication are not executed by this browser demonstration. No premium connector, installed authoring tool, production permission, scheduled refresh or enterprise certification is assumed. The deliverable is the HTML/CSS/JavaScript simulation and its optional reusable source data. Native Power BI authoring is outside this portfolio scope.

## View lifecycle and verification

Changing or refreshing the source immediately invalidates every handoff action. A generation counter prevents delayed exports from an older source replacing the current selection. Invalid journals keep saved data unchanged and leave no export enabled. An export dependency/hash failure leaves the original inspector and JSON download available while clearly marking the handoff unavailable. Guided examples never replace saved journals.

`node tools/test-bi-table-export.cjs` checks deterministic files and full checkpoint identity, source/financial goldens, null/currency/empty semantics, resource/type rejection and exact reconstruction with Python's independent standard-library CSV decoder. `node tools/test-bi-table-export-browser.mjs` checks actual files/hashes, the complete six-table bundle, all rows beyond the visible preview, source/stage changes, delayed-source races, corrupt-source recovery, read-only storage, empty/dependency cases and responsive/accessibility states. The existing data-model contracts, integrated BI checks, generated-asset drift checks and site validator remain required.
