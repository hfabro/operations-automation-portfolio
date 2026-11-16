from pathlib import Path
import csv,json
root=Path(__file__).resolve().parents[1]
folder=root/'curated/fictional-erp'
def table(name):
    with (folder/(name+'.csv')).open(encoding='utf-8',newline='') as f:return list(csv.DictReader(f))
lines=table('po_lines');dist=table('cost_distributions');receipts=table('accepted_receipts');invoices=table('invoice_lines');payments=table('payment_allocations');ledger=table('cost_stage_ledger');manifest=json.loads((folder/'manifest.json').read_text())
ids={l['po_line_id'] for l in lines};assert len(ids)==len(lines)==3
assert len({d['distribution_id'] for d in dist})==len(dist)==4
for line in lines:
    allocations=[d for d in dist if d['po_line_id']==line['po_line_id']]
    assert sum(int(d['basis_points']) for d in allocations)==10000
    assert sum(int(r['ordered_cents']) for r in ledger if r['po_line_id']==line['po_line_id'])==int(line['quantity'])*int(line['unit_price_cents'])
for rows in [dist,receipts,invoices,ledger]:assert all(r['po_line_id'] in ids for r in rows)
invoice_ids={i['invoice_line_id'] for i in invoices};assert all(p['invoice_line_id'] in invoice_ids for p in payments)
mapping={'ordered':'ordered_cents','openCommitment':'open_commitment_cents','receivedUninvoiced':'received_uninvoiced_proxy_cents','invoiced':'posted_invoice_cents','unpaid':'unpaid_cents','paid':'paid_cents'}
for key,column in mapping.items():assert sum(int(r[column]) for r in ledger)==manifest['totals'][key]
assert sum(int(i['net_cents']) for i in invoices)==sum(int(r['posted_invoice_cents']) for r in ledger)
assert sum(int(p['paid_cents']) for p in payments)==sum(int(r['paid_cents']) for r in ledger)
assert all(int(r['posted_invoice_cents'])==int(r['paid_cents'])+int(r['unpaid_cents']) for r in ledger)
result={'passed':True,'fictional':True,'tableRowCounts':{'poLines':len(lines),'distributions':len(dist),'receiptSummaries':len(receipts),'invoiceLines':len(invoices),'paymentAllocations':len(payments),'costLedgerRows':len(ledger)},'totalsCents':manifest['totals'],'referentialAndFinancialReconciliation':True}
(root/'evidence/erp-export-validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))
