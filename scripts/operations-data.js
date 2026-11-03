/* Entirely invented fixture data. No site, person, identifier, or series is copied from an operating plant. */
(function(){'use strict';
 const intervals=[];
 for(let day=1;day<=28;day++)for(let slot=0;slot<48;slot++){
  const date=`2026-09-${String(day).padStart(2,'0')}`,dow=new Date(date+'T12:00:00Z').getUTCDay();
  const temperature=56+(day*7%29),working=dow!==0&&dow!==6&&slot>=12&&slot<36;
  const kw=Math.round(150+(working?240:35)+(day*13+slot*17)%62+Math.max(0,temperature-68)*3);
  intervals.push({date,dow,slot,temperature,kw,kwh:kw/2,working,weekend:dow===0||dow===6});
 }
 // An invented campus-wide fleet scenario; these rows are not scaled from company data.
 const fleetRows=[
  [58,'Working',4,0,68],[74,'Idle',3,0,45],[43,'Working',7,0,72],[87,'Charging',5,0,34],
  [62,'Working',6,0,61],[51,'Idle',9,0,48],[76,'Working',2,0,57],[47,'Charging',8,0,32],
  [64,'Working',5,0,66],[39,'Idle',19,0,39],[81,'Working',3,0,59],[55,'Charging',4,1,28],
  [67,'Working',7,0,64],[48,'Working',12,0,70],[71,'Idle',6,0,42],[53,'Charging',5,0,36],
  [92,'Working',4,0,54],[46,'Idle',23,0,37],[59,'Working',3,1,62],[69,'Charging',9,0,41],
  [44,'Working',5,0,73],[78,'Idle',8,0,50],[63,'Working',4,0,60],[52,'Charging',6,0,33]
 ];
 const trucks=fleetRows.map(([soc,state,age,errors,use],i)=>({id:`TRK-${String(i+1).padStart(2,'0')}`,battery:`BAT-DEMO-${String(i+1).padStart(2,'0')}`,soc,state,age,errors,use}));
 window.OPS_DATA=Object.freeze({intervals,trucks,disclosure:'This demonstration recreates the workflow structure, screen hierarchy, controls, and operating logic of an implemented Microsoft 365 solution. Employer branding, records, URLs, identifiers, drawings, and production data have been replaced with synthetic equivalents.'});
})();
