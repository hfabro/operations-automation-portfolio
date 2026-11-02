(function () {
  'use strict';
  // Public fixtures, independently authored. No private source records or training content.
  const cells = ['A1','B1','C1','D1','A2','B2','C2','D2','A3','B3','C3'].map(id => {
    const col = 'ABCD'.indexOf(id[0]), row = +id[1] - 1;
    return {id, x:30+col*135, y:30+row*100, width:col===2&&row===2?115:135, height:col===3&&row===1?85:100};
  });
  const question = (en, es, yes, si, no, n, correct=0) => ({en, es, choices:{en:[yes,no],es:[si,n]}, correct});
  const topics = [
    {title:'Powered industrial trucks & pedestrians', titleEs:'Vehículos industriales y peatones',
      material:{en:'Illustrative reading: use the designated pedestrian route. If visibility is blocked, stop and seek guidance. A warning device does not guarantee a clear route. Report a damaged barrier. This quiz never authorizes equipment operation.',es:'Lectura ilustrativa: use la ruta peatonal designada. Si la visibilidad está bloqueada, deténgase y solicite orientación. Una señal de aviso no garantiza una ruta despejada. Reporte una barrera dañada. Este cuestionario nunca autoriza operar equipos.'},
      questions:[
        question('Which route should a pedestrian use?','¿Qué ruta debe usar un peatón?','The designated pedestrian route','La ruta peatonal designada','Any shortcut','Cualquier atajo'),
        question('What if your view is blocked?','¿Qué hacer si la vista está bloqueada?','Proceed without checking','Continuar sin verificar','Stop and seek guidance','Detenerse y solicitar orientación',1),
        question('Does a warning device guarantee a clear route?','¿Una señal de aviso garantiza una ruta despejada?','No','No','Yes','Sí'),
        question('What should happen to a damaged barrier?','¿Qué hacer con una barrera dañada?','Report it through the approved channel','Reportarla por el canal autorizado','Ignore it','Ignorarla'),
        question('Does this quiz authorize truck operation?','¿Este cuestionario autoriza operar vehículos?','Yes','Sí','No; approved training is separate','No; la capacitación autorizada es independiente',1)
      ]},
    {title:'Crane, hoist & sling awareness',titleEs:'Grúas, polipastos y eslingas',
      material:{en:'Illustrative reading: stay outside a designated lifting area. Do not use equipment with visible damage; report it through the approved channel. If instructions are unclear, stop and ask the responsible supervisor. Only authorized personnel perform lifting work. This reading does not establish lifting capacity or replace approved training.',es:'Lectura ilustrativa: permanezca fuera del área de izaje designada. No use equipos con daños visibles; repórtelos por el canal autorizado. Si las instrucciones no están claras, deténgase y consulte al supervisor responsable. Solo personal autorizado realiza izajes. Esta lectura no establece capacidades ni sustituye la capacitación autorizada.'},
      questions:[
        question('Where should an observer remain?','¿Dónde debe permanecer un observador?','Outside the designated lifting area','Fuera del área de izaje designada','Inside the lifting area','Dentro del área de izaje'),
        question('What if visible damage is found?','¿Qué hacer si hay daños visibles?','Use it anyway','Usarlo de todos modos','Do not use it; report the condition','No usarlo; reportar la condición',1),
        question('What if instructions are unclear?','¿Qué hacer si las instrucciones no están claras?','Stop and ask the responsible supervisor','Detenerse y consultar al supervisor responsable','Guess the next step','Adivinar el siguiente paso'),
        question('Who performs lifting work?','¿Quién realiza el trabajo de izaje?','Authorized personnel','Personal autorizado','Anyone who read this excerpt','Cualquier persona que leyó este texto'),
        question('Does this excerpt establish lifting capacity?','¿Este texto establece la capacidad de izaje?','Yes','Sí','No; use approved equipment-specific guidance','No; use las instrucciones autorizadas del equipo',1)
      ]}
  ];
  const score = (topic, answers) => answers.length===5 && answers.every(a=>a===0||a===1) ? topic.questions.reduce((n,q,i)=>n+(q.correct===answers[i]?20:0),0) : null;
  const freshTopic = () => ({language:'en',opened:{en:false,es:false},answers:Array(5).fill(null),ack:false,attempts:0,complete:false,score:null});
  const metrics = rows => {const departments=[...new Set(rows.map(r=>r.department))],done=rows.filter(r=>r.complete);return {
    started:departments.filter(d=>rows.some(r=>r.department===d&&(r.complete||r.attempts>0))).length,
    completed:departments.filter(d=>rows.filter(r=>r.department===d).every(r=>r.complete)).length,
    employees:done.length,average:done.length?done.reduce((n,r)=>n+r.score,0)/done.length:null
  };};
  window.WORKFLOW_CONTRACTS={cells,topics,score,freshTopic,metrics};
})();
