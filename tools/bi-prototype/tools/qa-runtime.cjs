'use strict';
module.exports={
 playwright:()=>require(process.env.PLAYWRIGHT_MODULE||'playwright'),
 axePath:()=>process.env.AXE_CORE_PATH||require.resolve('axe-core/axe.min.js'),
 launchOptions:()=>({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})}),
 python:()=>process.env.PYTHON_COMMAND||'python'
};
