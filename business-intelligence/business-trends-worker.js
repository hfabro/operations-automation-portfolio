/* Read-only calculations stay off the UI thread. No storage or external services. */
'use strict';
importScripts('coding-rules.js', 'erp-rules.js', 'invoice-rules.js', 'document-rules.js',
  'journey-rules.js', 'report-model.js', 'machine-samples.js', 'machine-rules.js',
  'work-samples.js', 'work-rules.js', 'business-time-rules.js', 'business-time-data.js');
const cache = new Map();
function model(query) {
  const key = JSON.stringify(query);
  if (!cache.has(key)) {
    if (cache.size >= 20) cache.delete(cache.keys().next().value);
    cache.set(key, BusinessTime.compile(BusinessTimeFixture, query));
  }
  return cache.get(key);
}
self.onmessage = ({data}) => {
  const {id, query} = data;
  try {
    const current = model(query), trends = [];
    let from = current.period.from;
    while (from <= current.period.asOf) {
      const year = Number(from.slice(0, 4)), month = Number(from.slice(5, 7));
      const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      const asOf = monthEnd < current.period.asOf ? monthEnd : current.period.asOf;
      const period = model({from, asOf});
      trends.push({from, asOf, flows: period.financial.flows,
        unpaidRollforward: period.financial.unpaidRollforward});
      from = BusinessTime.addDays(asOf, 1);
    }
    const sourceEvents = BusinessTimeFixture.events.filter(event => event.businessDate <= current.period.asOf);
    self.postMessage({id, model: current, trends, sourceEvents});
  } catch (error) {
    self.postMessage({id, error: error.message});
  }
};
