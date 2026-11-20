/* File-owned review; no saved-journal reads or writes. */
(()=>{
 'use strict';const E=window.EvidenceBundleReview,$=id=>document.getElementById(id),panel=$('evidence-review'),input=$('evidence-review-file');let epoch=0;
 const node=(tag,text)=>{const value=document.createElement(tag);value.textContent=text;return value;};
 function reset(message='Choose a current hub evidence bundle to review.'){epoch++;panel.dataset.reviewState='empty';panel.setAttribute('aria-busy','false');$('evidence-review-meta').hidden=true;$('evidence-review-results').hidden=true;$('evidence-review-sources').replaceChildren();$('evidence-review-checks').replaceChildren();$('evidence-review-hash').textContent='Not reviewed';$('evidence-review-status').textContent=message;$('evidence-review-clear').disabled=!input.files.length;}
 if(!E){$('evidence-review-status').textContent='File review unavailable. Reload this page to retry.';return;}
 input.addEventListener('change',async()=>{
  reset();const file=input.files[0];if(!file)return;const ticket=epoch;$('evidence-review-clear').disabled=false;$('evidence-review-meta').hidden=false;$('evidence-review-name').textContent=file.name;$('evidence-review-size').textContent=file.size+' bytes';panel.dataset.reviewState='checking';panel.setAttribute('aria-busy','true');$('evidence-review-status').textContent='Reading, fingerprinting and reconciling this file snapshot...';
  try{
   if(!file.size||file.size>E.maxBytes)throw Error('Choose a non-empty JSON bundle up to 2 MiB.');
   const bytes=await file.arrayBuffer();if(ticket!==epoch)return;if(bytes.byteLength!==file.size||bytes.byteLength>E.maxBytes)throw Error('The file size could not be confirmed.');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');if(ticket!==epoch)return;$('evidence-review-hash').textContent=hash;
   const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),result=E.review(JSON.parse(text));if(ticket!==epoch)return;
   $('evidence-review-sources').replaceChildren(...result.sources.map(source=>{const row=document.createElement('tr');row.append(node('td',source.label),node('td',source.availability==='saved'?'Saved journal':'Unsaved empty default'),node('td',source.savedRevision===null?'Not saved':String(source.savedRevision)));return row;}));
   $('evidence-review-checks').replaceChildren(...result.checks.map(check=>node('li',check)));$('evidence-review-results').hidden=false;panel.dataset.reviewState='matched';$('evidence-review-status').textContent=result.checks.length+' consistency checks passed for this file snapshot. Saved progress is unchanged.';
  }catch(error){if(ticket===epoch){panel.dataset.reviewState='held';$('evidence-review-results').hidden=true;$('evidence-review-status').textContent='Review held: '+String(error.message||error).slice(0,300)+' Saved progress is unchanged.';}}
  finally{if(ticket===epoch)panel.setAttribute('aria-busy','false');}
 });
 $('evidence-review-clear').addEventListener('click',()=>{input.value='';reset();});input.disabled=false;reset();
})();
