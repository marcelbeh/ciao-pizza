// Optional developer check; Playwright is a separate tooling dependency, not an app package.
const {chromium}=require('playwright');const fs=require('fs');const assert=require('node:assert/strict');
const path=require('node:path');const output=process.env.FORNO_VISUAL_OUTPUT||path.join(__dirname,'../docs/visual');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.FORNO_BROWSER_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const report={browser:browser.version(),capturedAt:new Date().toISOString(),checks:[],metrics:[]};
 const base=process.env.FORNO_PREVIEW_URL||'http://127.0.0.1:4175/ciao-pizza/';
 for(const [width,height] of [[320,700],[390,664],[390,780],[430,932],[1280,900]]) for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<800,hasTouch:width<800,colorScheme:theme});
  await context.addInitScript(t=>localStorage.setItem('forno:theme:v1',t),theme);
  const page=await context.newPage();await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Aktuelle Teigplanung'}).waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Home overflow ${width} ${theme}`);
  assert(await page.locator('.app-header a, .app-header button, .floating-dock a, .calculator-cta, .edit-link').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44})),`Touch target ${width} ${theme}`);
  const metrics=await page.evaluate(()=>Object.fromEntries(['.app-header','.welcome','.plan-summary','.time-scene','.quick-section','.floating-dock'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{y:r.y,height:r.height,bottom:r.bottom}]})));
  report.metrics.push({width,height,theme,metrics});
  if(width===390&&[664,780].includes(height)){
   assert(metrics['.quick-section'].bottom<=metrics['.floating-dock'].y,`Quick access hidden ${height} ${theme}`);
   await page.screenshot({path:`${output}/after-${theme}-${width}x${height}.png`});
  }
  if(width===1280)await page.screenshot({path:`${output}/after-${theme}-desktop.png`});
  assert(await page.locator('.feature-photo').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
  assert(await page.locator(`.brand-${theme}`).evaluate(i=>i.complete&&i.naturalWidth===942));
  assert(await page.locator(`.brand-${theme}`).isVisible());
  assert(await page.locator('.app-shell').evaluate(el=>getComputedStyle(el,'::before').pointerEvents==='none'));
  assert((await page.locator('.app-shell').evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).includes('/ciao-pizza/food/header-pizza.webp'));

  if(width===390&&height===780){
   for(const route of ['teig','zeitplan','pizzaabend','rezepte','einstellungen','reife-monitor','journal']){
    await page.goto(`${base}#/${route}`,{waitUntil:'networkidle'});await page.locator('main h1').waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} overflow ${theme}`);
   }
   await page.goto(`${base}#/teig`,{waitUntil:'networkidle'});await page.locator('#count').fill('');
   await page.getByRole('button',{name:theme==='light'?'Dunkel':'Hell',exact:true}).click();assert.equal(await page.locator('#count').inputValue(),'');
   await page.goto(`${base}#/zeitplan`,{waitUntil:'networkidle'});await page.locator('#schedule-bulkHours').fill('3,5');
   await page.getByRole('button',{name:theme==='light'?'Hell':'Dunkel',exact:true}).click();assert.equal(await page.locator('#schedule-bulkHours').inputValue(),'3,5');
   const plan={version:1,bakeAt:new Date(Date.now()+48*3600000).toISOString(),method:'cold',bulkHours:2,coldHours:24,ballHours:4,mixMinutes:20,preheatMinutes:30,roomC:22,fridgeC:4};
   await page.evaluate(p=>new Promise((resolve,reject)=>{const request=indexedDB.open('ciao-pizza',1);request.onsuccess=()=>{const db=request.result;const tx=db.transaction('key-value','readwrite');tx.objectStore('key-value').put(p,'forno:schedule:v1');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}}),plan);
   await page.goto(base,{waitUntil:'networkidle'});await page.locator('.has-time-plan .feature-status').waitFor();
   assert(await page.locator('.has-time-plan p').isVisible());
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   report.checks.push(`${theme}: all routes without horizontal overflow, calculator/schedule drafts survive theme switch, saved next step remains visible`);
  }
  await context.close();
 }
 const offline=await browser.newContext({viewport:{width:390,height:780}});
 const offlinePage=await offline.newPage();await offlinePage.goto(base,{waitUntil:'networkidle'});
 await offlinePage.evaluate(()=>navigator.serviceWorker.ready);
 await offlinePage.reload({waitUntil:'networkidle'});
 await offline.setOffline(true);await offlinePage.reload({waitUntil:'networkidle'});
 await offlinePage.getByRole('heading',{name:'Aktuelle Teigplanung'}).waitFor();
 assert(await offlinePage.locator('.brand-light').evaluate(i=>i.complete&&i.naturalWidth>0));
 assert(await offlinePage.locator('.feature-photo').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
 // Fetch inside the controlled page confirms the local decorative asset is cached offline.
 assert(await offlinePage.evaluate(async()=> (await fetch(new URL('food/header-pizza.webp',location.href))).ok));
 await offline.close();report.checks.push('Offline reload retains dashboard, new logo, food photos and header decoration');
 const comparable=report.metrics.filter(x=>x.width===390&&x.height===780);
 assert.deepEqual(comparable[0].metrics,comparable[1].metrics);
 report.checks.push('Light/Dark dimensions identical; main cards and quick access visible above dock at 390x664 and 390x780');
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({checks:report.checks,metrics:report.metrics.filter(x=>x.width===390)},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
