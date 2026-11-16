/* Independent, explicitly fictional post-work verification window. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WorkSamples=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function snapshot(){const start='2026-11-15T10:00:00.000Z',end='2026-11-15T10:30:00.000Z',rows=[];
  for(const asset of ['PUMP-04','AHU-02'])for(let minute=0;minute<30;minute++)for(const [tag,value,unit]of [['state','RUN','enum'],['vibration',2.1,'mm/s RMS'],['temperature',asset==='PUMP-04'?51:36,'degC']])rows.push({id:`SYN-VERIFY-${asset}-${tag}-${String(minute).padStart(2,'0')}`,asset,tag,timestamp:new Date(Date.parse(start)+minute*60000).toISOString(),sequence:minute+1,value,unit,quality:'Good'});
  return {id:'SYN-WORK-OBSERVATIONS-1',fictional:true,start,end,rows};
 }
 return {snapshot};
});
