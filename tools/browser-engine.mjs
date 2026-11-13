// Shared selection for engine-independent QA; no visitor runtime dependency.
export function selectBrowser(playwright) {
  const name=process.env.BROWSER_ENGINE||'chromium';
  if(!['chromium','firefox','webkit'].includes(name))throw Error('BROWSER_ENGINE must be chromium, firefox, or webkit');
  return {name,type:playwright[name],options:{headless:true,...(name==='chromium'&&process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})}};
}
