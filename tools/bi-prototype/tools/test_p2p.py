from pathlib import Path
from collections import Counter
from datetime import datetime
import csv, json, hashlib, statistics, math
from build_p2p import analyze_events
root=Path(__file__).resolve().parents[1]
def event(name,time):return {'concept:name':name,'time:timestamp':time,'org:resource':'user_1'}
create=event('Create Purchase Order Item','2018-01-01T00:00:00Z');clear=event('Clear Invoice','2018-01-03T01:00:00+01:00')
a=analyze_events([clear,create]);assert a['outOfOrder'] and a['observedSpanDays']==2 and a['withinAnalysisWindow']
assert not analyze_events([create])['eligibleSpan']
assert not analyze_events([create,event('Clear Invoice','2017-01-01T00:00:00Z')])['eligibleSpan']
assert not analyze_events([create,clear,event('Other','bad-time')])['eligibleSpan']
assert not analyze_events([create,clear,event('Other','1948-01-01T00:00:00Z')])['withinAnalysisWindow']
a=analyze_events([create,clear,clear]);assert a['repeatedSignatures']==1 and a['equalTimestampEvents']==1 and len(a['ordered'])==3
assert analyze_events([create,event('Clear Invoice','2018-01-01T00:00:00Z')])['observedSpanDays']==0
profile=json.loads((root/'curated/profile.json').read_text(encoding='utf-8'))
counts=Counter();policies=Counter();orders=set();spans=[];all_spans=[]
with (root/'curated/cases.csv').open(encoding='utf-8',newline='') as f:
    for row in csv.DictReader(f):
        counts['cases']+=1;counts['events']+=int(row['eventCount']);counts['missing']+=int(row['missingActorEvents']);counts['repeats']+=int(row['repeatSignatures']);policies[row['policy']]+=1
        orders.add((row['source'],row['company'],row['purchaseOrder']))
        assert row['caseId']==row['purchaseOrder']+'_'+row['item']
        if row['eligibleSpan']=='1':
            value=float(row['observedSpanDays']);assert value>=0;all_spans.append(value)
            if row['withinAnalysisWindow']=='1':spans.append(value)
assert counts['cases']==profile['counts']['cases']==251734
assert counts['events']==profile['counts']['events']==1595923
assert len(orders)==profile['counts']['orders']==76349
assert len(profile['activities'])==42
assert dict(policies)==profile['policies']
assert sum(profile['activities'].values())==sum(profile['actors'].values())==counts['events']
assert counts['missing']==profile['actors']['missing'] and counts['repeats']==profile['quality']['repeatedSignaturesRetained']
assert len(spans)==profile['observedSpan']['eligibleCases']
assert statistics.median(spans)==profile['observedSpan']['medianDays']
assert math.isclose(statistics.quantiles(spans,n=10,method='inclusive')[8],profile['observedSpan']['p90Days'],abs_tol=1e-10)
assert statistics.median(all_spans)==profile['observedSpan']['allDatesSensitivity']['medianDays']
for sample in profile['examples']:
    events=sample['events'];assert 3<=len(events)<=45
    starts=[datetime.fromisoformat(e['timestamp']) for e in events if e['activity']=='Create Purchase Order Item']
    clears=[datetime.fromisoformat(e['timestamp']) for e in events if e['activity']=='Clear Invoice']
    if sample['spanDays'] is not None: assert (max(clears)-min(starts)).total_seconds()/86400==sample['spanDays']
manifest=json.loads((root/'source/manifest.json').read_text())
sha=hashlib.sha256()
with (root/'source/BPI_Challenge_2019.xes').open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):sha.update(chunk)
assert sha.hexdigest()==manifest['sha256']==profile['sourceSha256']
assert (root/'preview/p2p-data.js').stat().st_size<200000
result={'passed':True,'counts':profile['counts'],'eligibleWindowCases':len(spans),'independentMedianDays':statistics.median(spans),'independentP90Days':statistics.quantiles(spans,n=10,method='inclusive')[8],'sourceSha256Verified':True,'sourceDocumentedCountsReconciled':True,'edgeCasesVerified':['timezone normalization','out-of-source-order timestamps','missing clearing','clearing before creation','invalid timestamp','out-of-window record','equal timestamps retained','repeated signatures retained','zero-day span'],'publicPayloadBytes':(root/'preview/p2p-data.js').stat().st_size}
(root/'evidence').mkdir(exist_ok=True)
(root/'evidence/data-validation.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
