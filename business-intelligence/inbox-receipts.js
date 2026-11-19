/* Durable fingerprint receipts carried by unchanged version-1 import commands. */
(function(root, factory) {
  const api = typeof module === 'object' && module.exports ? factory(require('./journey-rules.js'), require('./inbox-context.js')) : factory(root.Journey, root.InboxContext);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.InboxReceipts = api;
})(typeof window !== 'undefined' ? window : globalThis, function(J, C) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value)), prefix = 'SOURCE-INBOX:';
  const commandId = (contextSha256, sourceSha256) => prefix + contextSha256 + ':' + sourceSha256;
  async function inspect(raw) {
    const state = J.restore(raw), checkpoint = JSON.parse(J.serialize(state)), origins = new Set(), fingerprints = new Set(), receipts = [];
    for (const [index, command] of checkpoint.commands.entries()) {
      if (!command.id.startsWith(prefix)) continue;
      const match = command.id.match(/^SOURCE-INBOX:([a-f0-9]{64}):([a-f0-9]{64})$/);
      if (!match || command.type !== 'importDocument' || command.actor !== J.roles.importDocument) throw Error('Source receipt has an unsupported command identity.');
      const [, contextSha256, sourceSha256] = match;
      if (fingerprints.has(sourceSha256)) throw Error('Source receipt fingerprint is repeated in this purchasing journal.');
      fingerprints.add(sourceSha256);
      if (!origins.has(contextSha256)) {
        const origin = JSON.stringify({...checkpoint, commands: checkpoint.commands.slice(0, index)});
        if (await C.hash(origin) !== contextSha256) throw Error('Source receipt does not match its originating purchasing checkpoint.');
        origins.add(contextSha256);
      }
      const documentId = 'CTXDOC-' + (await C.hash(contextSha256 + ':' + sourceSha256)).toUpperCase();
      if (command.payload.documentId !== documentId || command.payload.sourceLabel !== 'Source SHA256 ' + sourceSha256 || !state.documents.some(row => row.id === documentId)) throw Error('Source receipt differs from its retained document identity.');
      receipts.push({format: 'SIMULATED-INVOICE-FINGERPRINT-RECEIPT', version: 1, fictional: true,
        commandId: command.id, documentId, contextSha256, sourceSha256, importedRevision: index + 1,
        originalImport: clone(command.payload), currentStatus: state.documents.find(row => row.id === documentId).status,
        retention: 'Purchasing retains this fingerprint and normalized original import. Original file bytes, filename and capture date are not stored here. Retain the inbox evidence download; reattach the original file to verify its bytes and extracted fields. This is not production authentication.'});
    }
    return receipts;
  }
  return Object.freeze({commandId, inspect});
});
