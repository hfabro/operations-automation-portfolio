/* Reusable, source-bound table handoff; existing journal/model/financial logic stays authoritative. */
(function(root, factory) {
 const api = typeof module === 'object' && module.exports ? factory(require('./data-methods-model.js')) : factory(root.DataMethods);
 if (typeof module === 'object' && module.exports) module.exports = api; else root.DataMethodsExport = api;
})(typeof window !== 'undefined' ? window : globalThis, function(D) {
 'use strict';
 const clone = value => JSON.parse(JSON.stringify(value)), encoder = new TextEncoder();
 const kinds = {poLines: {policy:'json'}, costRows: Object.fromEntries(['ordered','openCommitment','receivedUninvoiced','invoiced','unpaid','paid'].map(key => [key,'integer'])),
  documents: {version:'integer',headerNetCents:'integer',lineCount:'integer',reasons:'json'},
  invoiceAllocations: {netCents:'integer',poBasisCents:'integer',posted:'boolean',active:'boolean'}, exceptions: {reasons:'json'}, exceptionHistory: {revision:'integer',reasons:'json'}};
 function fail(message) {throw Error('BI table handoff: ' + message);}
 function tableCSV(tableId, rows) {
  const contract = D.contracts.find(row => row.id === tableId);
  if (!contract || !Array.isArray(rows) || rows.length > 10000) fail('Use a declared table with at most 10,000 rows.');
  const fields = Object.keys(contract.fields), nullCells = [], escapedTextCells = [], keys = new Set();
  const quote = value => '"' + value.replaceAll('"', '""') + '"';
  const csvRows = [fields.map(quote).join(',')];
  for (const [index, row] of rows.entries()) {
   if (!row || typeof row !== 'object' || fields.some(field => !Object.hasOwn(row,field))) fail('Every projected field must be present.');
   if (typeof row[contract.key] !== 'string' || !row[contract.key] || keys.has(row[contract.key])) fail('Table keys must be nonempty unique strings.');
   keys.add(row[contract.key]);
   const cells = fields.map(column => {
    const value = row[column], type = kinds[tableId][column] || 'text'; let text;
    if (value === null) {nullCells.push({row:index+1,column}); return quote('\\N');}
    if (type === 'integer') {if (!Number.isSafeInteger(value)) fail(column + ' must be exact integer cents/counts.'); text = String(value);}
    else if (type === 'boolean') {if (typeof value !== 'boolean') fail(column + ' must be a boolean.'); text = String(value);}
    else if (type === 'json') {
     if (!value || typeof value !== 'object') fail(column + ' must be structured JSON.');
     text = JSON.stringify(value);
    } else {
     if (typeof value !== 'string') fail(column + ' must be text.'); text = value;
     // Reversible transport escaping, not a universal spreadsheet execution-safety guarantee.
     if (text === '\\N' || /^[\s\uFEFF]*[=+\-@'＝＋－＠]/u.test(text) || /^[\t\r\n]/.test(text)) {text = "'" + text; escapedTextCells.push({row:index+1,column});}
    }
    if (typeof text !== 'string' || text.length > 32768 || new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(encoder.encode(text)) !== text) fail('A field exceeds the UTF-8 text limits.');
    return quote(text);
   });
   csvRows.push(cells.join(','));
  }
  const content = '\uFEFF' + csvRows.join('\r\n') + '\r\n';
  if (encoder.encode(content).length > 1048576) fail('One CSV exceeds 1 MiB; no rows were truncated.');
  return {content, nullCells, escapedTextCells, columns: fields.map(name => ({name,type:kinds[tableId][name] || 'text',nullable:name!==contract.key,description:contract.fields[name]}))};
 }
 async function hash(text) {
  if (!globalThis.crypto?.subtle) fail('SHA-256 requires a secure context. Model inspection remains available.');
  return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',encoder.encode(text)))].map(value => value.toString(16).padStart(2,'0')).join('');
 }
 async function prepare(state, choice) {
  if (!['held','corrected','settled','current'].includes(choice)) fail('Choose a declared source context.');
  const inspected = D.inspect(state), checkpoint = clone(inspected.model.sourceCheckpoint), checkpointSha256 = await hash(JSON.stringify(checkpoint));
  const prefix = 'simulated-bi-' + choice + '-' + checkpointSha256.slice(0,12), tables = [], files = []; let totalBytes = 0;
  for (const contract of inspected.contracts) {
   const rows = inspected.tables[contract.id], encoded = tableCSV(contract.id,rows), filename = prefix + '-' + contract.id + '.csv';
   const byteLength = encoder.encode(encoded.content).length; totalBytes += byteLength;
   if (totalBytes > 4194304) fail('The table set exceeds 4 MiB; no files were partially substituted.');
   tables.push({...clone(contract), fields:undefined, columns:encoded.columns, rowCount:rows.length, filename, byteLength, sha256:await hash(encoded.content), nullCells:encoded.nullCells, escapedTextCells:encoded.escapedTextCells});
   files.push({tableId:contract.id,filename,mediaType:'text/csv;charset=utf-8',content:encoded.content});
  }
  const manifest = {format:'SIMULATED-BI-TABLE-HANDOFF',version:1,fictional:true,
   source:{choice,kind:choice==='current'?'Validated saved or empty purchasing journal':'Explicit guided example',checkpointSha256,journalRevision:inspected.model.meta.journalRevision,policyVersion:inspected.model.meta.policyVersion,
    simulatedAsOf:inspected.model.meta.simulatedAsOf,asOfMeaning:'Constructed audit/replay timestamp; not measured operating history or invoice aging.',identityBasis:'SHA-256 of UTF-8 JSON.stringify of the validated replayable checkpoint; not original browser-storage bytes.'},
   encoding:{charset:'UTF-8',bom:true,delimiter:',',recordSeparator:'CRLF',quotedFields:'All fields; embedded double quotes doubled.',nullToken:'\\N',nulls:'Map literal \\N to null before unescaping text. Empty CSV text stays an empty string. nullCells records one-based data-row/column coordinates for audit.',
    textEscaping:'After null-token handling, remove exactly one leading apostrophe from text-typed cells. Formula-like, leading-apostrophe and literal \\N text receive this prefix; escapedTextCells records the coordinates. Use typed Text/CSV import; CSV has no universal spreadsheet execution-safety guarantee.',json:'JSON-encoded nested arrays/objects; retain as text or deliberately expand, not extra financial rows.'},
   tables,checks:clone(inspected.checks),totals:clone(inspected.totals),documentCount:inspected.documentCount,heldDocumentCount:inspected.heldDocumentCount,measures:clone(inspected.measures),sourceCheckpoint:checkpoint,
   limitations:['One current checkpoint snapshot, not an incremental change feed. Do not append full-state snapshots as transactions.','Relationships are declared references; unresolved references remain review conditions. Do not join financial facts directly or multiply document header values.','Financial stages are net USD integer cents; source invoice allocations retain their own currency. Posted = unpaid + paid; do not add stages together.','No native Power BI report, tested Desktop import, scheduled refresh, production integration or live ERP connection is claimed.']};
  return {manifestFilename:prefix+'-manifest.json',bundleFilename:prefix+'-tables.json',manifest:JSON.parse(JSON.stringify(manifest)),files};
 }
 return {prepare,tableCSV};
});
