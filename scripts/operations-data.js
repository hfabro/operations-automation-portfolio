/* Entirely invented fixture data. No site, person, identifier, or series is copied from an operating plant. */
(function(){'use strict';
 const intervals=[];
 for(let day=1;day<=28;day++)for(let slot=0;slot<48;slot++){
  const date=`2026-09-${String(day).padStart(2,'0')}`,dow=new Date(date+'T12:00:00Z').getUTCDay();
  const temperature=56+(day*7%29),working=dow!==0&&dow!==6&&slot>=12&&slot<36;
  const kw=Math.round(150+(working?240:35)+(day*13+slot*17)%62+Math.max(0,temperature-68)*3);
  intervals.push({date,dow,slot,temperature,kw,kwh:kw/2,working,weekend:dow===0||dow===6});
 }
 const trucks=Array.from({length:5},(_,i)=>({id:`TRK-0${i+1}`,battery:`BAT-DEMO-${i+1}`,soc:[82,64,91,48,73][i],state:['Working','Idle','Working','Charging','Idle'][i],age:[3,4,2,6,28][i],errors:[0,0,0,1,0][i],use:[34,27,42,19,31][i]}));
 window.OPS_DATA=Object.freeze({intervals,trucks,disclosure:'This demonstration recreates the workflow structure, screen hierarchy, controls, and operating logic of an implemented Microsoft 365 solution. Employer branding, records, URLs, identifiers, drawings, and production data have been replaced with synthetic equivalents.'});
})();
