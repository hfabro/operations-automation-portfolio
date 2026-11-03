# Release and recovery

The public repository contains the reviewed static portfolio. Keep private source records, historical development material, and unapproved data outside the public release. Review claims, downloadable files, metadata, synthetic-data provenance, and the complete proposed diff before publication.

## Release

1. Prepare a scoped change on a branch based on the current public `main`. Review the diff and confirm that all examples remain fictional and clearly identified.
2. Run `node tools/validate-site.mjs`, `node tools/test-system-data.mjs`, and the documented browser, gallery, and accessibility checks. Review their limitations and perform appropriate manual checks.
3. Obtain the required review and confirm passing checks for the exact revision. Publish only after authorization under the repository's effective release controls.
4. Verify the deployed revision, important routes, responsive behavior, and browser errors on GitHub Pages. Retain the prior known-good public revision and release evidence.

## Recovery

For a regression, identify the last verified public revision and prepare a normal revert or a reviewed corrective commit. Run the same checks and use the authorized deployment process; verify the deployed result. The sanitized public root is `1d999b64babcafc7829700098b3d83309a732bfc`; it is a starting point, not a substitute for the last verified release. Do not force-push or publish historical private content to recover the site.

Historical repository and development backups are private recovery resources, not public deployment artifacts. Restore copies in an isolated location and verify objects and references before use. Some ZIP extractors omit empty Git directories; recreate `refs/heads` and `refs/tags` in an extracted bare mirror if needed before running `git fsck --full`. Preserve the original archives.
