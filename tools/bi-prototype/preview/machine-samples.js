/* Deterministic fictional observations, not captured machine data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MachineSamples=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function snapshot(){
  const start='2026-11-15T08:00:00.000Z',end='2026-11-15T08:30:00.000Z',rows=[];
  for(const asset of ['PUMP-04','AHU-02'])for(let minute=0;minute<30;minute++){
   const timestamp=new Date(Date.parse(start)+minute*60000).toISOString();
   const add=(tag,value,unit,quality='Good')=>rows.push({id:`SYN-${asset}-${tag}-${String(minute).padStart(2,'0')}`,asset,tag,timestamp,sequence:minute+1,value,unit,quality});
   if(asset!=='PUMP-04'||![18,19,20].includes(minute))add('state',asset==='PUMP-04'&&minute>=10&&minute<15?'STOP':'RUN','enum');
   add('vibration',asset==='PUMP-04'&&((minute>=5&&minute<=9)||(minute>=21&&minute<=23))?6.4:2.1,'mm/s RMS',asset==='PUMP-04'&&minute===6?'Bad':'Good');
   add('temperature',asset==='PUMP-04'?54+minute%3:36+minute%2,'degC',asset==='PUMP-04'&&minute===11?'Uncertain':'Good');
  }
  rows.push({...rows.find(r=>r.id==='SYN-PUMP-04-vibration-07')});
  rows.push({...rows.find(r=>r.id==='SYN-PUMP-04-vibration-24'),value:99});
  rows.push({id:'SYN-UNKNOWN',asset:'UNKNOWN',tag:'state',timestamp:start,sequence:1,value:'RUN',unit:'enum',quality:'Good'});
  rows.push({id:'SYN-BAD-UNIT',asset:'PUMP-04',tag:'temperature',timestamp:start,sequence:1,value:90,unit:'degF',quality:'Good'});
  rows.push({id:'SYN-OUTSIDE',asset:'PUMP-04',tag:'state',timestamp:end,sequence:31,value:'RUN',unit:'enum',quality:'Good'});
  // Arrival order is deliberately different from event time.
  return {id:'SYN-MACHINE-1',fictional:true,start,end,rows:rows.slice(45).concat(rows.slice(0,45))};
 }
 return {snapshot};
});
