"""Dependency-free, streaming XES ingestion. Raw evidence stays outside public output."""
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
import csv, json, hashlib, math

ROOT=Path(__file__).resolve().parents[1]
MISSING={'','NONE','UNKNOWN','None'}
def attrs(element):
    return {c.get('key'):c.get('value') for c in element if c.tag!='event' and c.get('key')}
def timestamp(value):
    try:
        result=datetime.fromisoformat(value.replace('Z','+00:00'))
        return result.astimezone(timezone.utc) if result.tzinfo else None
    except (ValueError,AttributeError): return None
def analyze_events(events):
    times=[timestamp(e.get('time:timestamp')) for e in events]
    valid=[t for t in times if t is not None]
    ordered=sorted(((t,i,e) for i,(t,e) in enumerate(zip(times,events)) if t is not None),key=lambda x:(x[0],x[1]))
    starts=[t for t,_,e in ordered if e.get('concept:name')=='Create Purchase Order Item']
    clears=[t for t,_,e in ordered if e.get('concept:name')=='Clear Invoice']
    # This is an observed-event span, never asserted full P2P completion time.
    eligible=bool(starts and clears and max(clears)>=min(starts) and len(valid)==len(events))
    in_window=bool(valid) and all(datetime(2018,1,1,tzinfo=timezone.utc)<=t<datetime(2020,1,1,tzinfo=timezone.utc) for t in valid)
    span=(max(clears)-min(starts)).total_seconds()/86400 if eligible else None
    signatures=[tuple(sorted(e.items())) for e in events]
    return {'first':min(valid).isoformat() if valid else '', 'last':max(valid).isoformat() if valid else '',
            'hasCreate':bool(starts),'hasClear':bool(clears),'eligibleSpan':eligible,'withinAnalysisWindow':in_window,'observedSpanDays':span,
            'invalidTimestamps':len(events)-len(valid),'outOfOrder':any(a>b for a,b in zip(valid,valid[1:])),
            'equalTimestampEvents':len(valid)-len(set(valid)), 'repeatedSignatures':len(signatures)-len(set(signatures)),
            'ordered':ordered}
def percentile(values,p):
    if not values:return None
    position=(len(values)-1)*p;low=math.floor(position);high=math.ceil(position)
    return values[low]+(values[high]-values[low])*(position-low)
def build():
    source=ROOT/'source/BPI_Challenge_2019.xes'
    manifest=json.loads((ROOT/'source/manifest.json').read_text(encoding='utf-8'))
    assert manifest['checksumVerified'] and source.stat().st_size==manifest['bytes']
    out=ROOT/'curated';out.mkdir(exist_ok=True)
    preview=ROOT/'preview';preview.mkdir(exist_ok=True)
    activity=Counter();policies=Counter();actor=Counter();monthly=Counter();schema={'trace':Counter(),'event':Counter()}
    quality=Counter();orders=set();cases=set();companies=set();vendors=set();samples={};spans=[];all_spans=[];policy_spans={};minimum=None;maximum=None
    fields=['caseId','company','source','purchaseOrder','item','vendor','policy','eventCount','firstObserved','lastObserved','hasCreate','hasClear','eligibleSpan','observedSpanDays','missingActorEvents','repeatSignatures','withinAnalysisWindow']
    it=ET.iterparse(source,events=('start','end'));_,root=next(it)
    with (out/'cases.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader()
        for action,trace in it:
            if action!='end' or trace.tag!='trace':continue
            a=attrs(trace);events=[attrs(e) for e in trace.findall('event')];schema['trace'].update(a.keys())
            # Source namespace is part of the case key; keep published ID separately.
            key=(a.get('Source',''),a.get('Company',''),a.get('concept:name',''))
            if key in cases:raise ValueError('Duplicate namespaced case key: '+str(key))
            cases.add(key);orders.add((key[0],key[1],a.get('Purchasing Document','')));companies.add(a.get('Company'));vendors.add(a.get('Vendor'))
            policy=a.get('Item Category','Unknown');policies[policy]+=1
            analysis=analyze_events(events)
            quality['invalidTimestampEvents']+=analysis['invalidTimestamps'];quality['casesOutOfSourceTimeOrder']+=analysis['outOfOrder']
            quality['equalTimestampEvents']+=analysis['equalTimestampEvents'];quality['repeatedSignaturesRetained']+=analysis['repeatedSignatures']
            quality['casesWithCreate']+=analysis['hasCreate'];quality['casesWithClear']+=analysis['hasClear'];quality['eligibleSpanCases']+=analysis['eligibleSpan']
            quality['casesOutsideAnalysisWindow']+=not analysis['withinAnalysisWindow']
            if analysis['eligibleSpan']:
                all_spans.append(analysis['observedSpanDays'])
                if analysis['withinAnalysisWindow']:
                    spans.append(analysis['observedSpanDays']);policy_spans.setdefault(policy,[]).append(analysis['observedSpanDays'])
            missing=0
            for e in events:
                schema['event'].update(e.keys());name=e.get('concept:name','Unknown');activity[name]+=1
                user=e.get('org:resource','');category='missing' if user in MISSING else 'batch' if user.startswith('batch_') else 'human' if user.startswith('user_') else 'other'
                actor[category]+=1;missing+=category=='missing'
                t=timestamp(e.get('time:timestamp'))
                if t:
                    monthly[t.strftime('%Y-%m')]+=1;minimum=t if minimum is None else min(minimum,t);maximum=t if maximum is None else max(maximum,t)
            writer.writerow(dict(zip(fields,[a.get('concept:name'),a.get('Company'),a.get('Source'),a.get('Purchasing Document'),a.get('Item'),a.get('Vendor'),policy,len(events),analysis['first'],analysis['last'],int(analysis['hasCreate']),int(analysis['hasClear']),int(analysis['eligibleSpan']),analysis['observedSpanDays'] if analysis['eligibleSpan'] else '',missing,analysis['repeatedSignatures'],int(analysis['withinAnalysisWindow'])])))
            # One short, deterministic example for each matching policy and observed-clear status.
            bucket=policy+'|'+str(analysis['hasClear']);score=hashlib.sha256('|'.join(key).encode()).hexdigest()
            if analysis['withinAnalysisWindow'] and 3<=len(events)<=45 and (bucket not in samples or score<samples[bucket]['selectionHash']):
                samples[bucket]={'selectionHash':score,'caseId':a.get('concept:name'),'company':a.get('Company'),'vendor':a.get('Vendor'),'policy':policy,'hasClear':analysis['hasClear'],'spanDays':analysis['observedSpanDays'],'events':[{'sequence':i+1,'activity':e.get('concept:name'),'timestamp':t.isoformat(),'actor':e.get('org:resource','')} for t,i,e in analysis['ordered']]}
            trace.clear();root.clear()
            if len(cases)%50000==0:print('Profiled',len(cases),'cases',flush=True)
    spans.sort()
    summary={'dataset':'BPI Challenge 2019','doi':manifest['doi'],'license':manifest['license'],'creator':manifest['creator'],'sourceSha256':manifest['sha256'],
        'counts':{'cases':len(cases),'orders':len(orders),'events':sum(activity.values()),'companies':len(companies),'vendors':len(vendors)},
        'period':{'first':minimum.isoformat(),'last':maximum.isoformat()},'activities':dict(activity.most_common()),'policies':dict(policies.most_common()),'actors':dict(actor),
        'monthlyEvents':dict(sorted(monthly.items())),'quality':dict(quality),
        'analysisWindow':{'start':'2018-01-01T00:00:00Z','endExclusive':'2020-01-01T00:00:00Z','rule':'Duration cohort and short examples require every observed case timestamp within 2018–2019 UTC. Source case counts retain all records; out-of-window does not by itself prove an error.'},
        'observedSpan':{'definition':'First Create Purchase Order Item to last observed Clear Invoice; both activities and valid timestamps required, with every case event inside the stated analysis window. Not proof of final payment or complete P2P lifecycle.',
                        'eligibleCases':len(spans),'medianDays':percentile(spans,.5),'p90Days':percentile(spans,.9),'method':'Linear interpolation at (n-1)*p; UTC elapsed calendar days.',
                        'byPolicy':{p:{'eligibleCases':len(v),'medianDays':percentile(sorted(v),.5),'p90Days':percentile(sorted(v),.9)} for p,v in policy_spans.items()},
                        'allDatesSensitivity':{'eligibleCases':len(all_spans),'medianDays':percentile(sorted(all_spans),.5),'p90Days':percentile(sorted(all_spans),.9)}},
        'examples':sorted(samples.values(),key=lambda s:(s['policy'],s['hasClear'])),
        'limitations':['Historical anonymized event data; not employer records or live ERP access.','Amounts were transformed by the source publisher; monetary totals are deliberately omitted.','No-clear-observed does not establish an outstanding invoice or current backlog.','Repeated event signatures are flagged and retained; identical attributes do not prove a duplicate transaction.','Source sequence is retained for equal timestamps; tied events do not establish causal order.','Example timelines are deterministic, capped-length illustrations, not a representative statistical sample.']}
    (out/'profile.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    (out/'schema.json').write_text(json.dumps(schema,indent=2)+'\n',encoding='utf-8')
    (preview/'p2p-data.js').write_text('window.P2P_DATA = '+json.dumps(summary,ensure_ascii=True)+';\n',encoding='utf-8')
    print(json.dumps({'counts':summary['counts'],'period':summary['period'],'actors':summary['actors'],'quality':summary['quality'],'span':summary['observedSpan']}),flush=True)
if __name__=='__main__':build()
