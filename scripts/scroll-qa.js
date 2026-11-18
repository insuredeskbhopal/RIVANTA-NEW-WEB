// Development-only scroll telemetry, injected by the local QA server.
(() => {
  const report = {frames:0,slowFrames:0,maxFrameMs:0,reversedFrames:0,scriptScrollCalls:0,heroHeightChanges:0,layoutShift:0,layoutShifts:[],canvasDraws:{},samples:[]};
  const originalClear=CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect=function(...args) {
    const key=this.canvas.id || this.canvas.className || 'other';
    report.canvasDraws[key]=(report.canvasDraws[key]||0)+1;
    return originalClear.apply(this,args);
  };
  let lastTime=0,lastY=0,lastHeight=0,direction=0,inputAt=0,dirty=false;
  const originalScrollTo=window.scrollTo.bind(window);
  const originalScrollBy=window.scrollBy.bind(window);
  window.scrollTo=(...args)=>{report.scriptScrollCalls++; return originalScrollTo(...args);};
  window.scrollBy=(...args)=>{report.scriptScrollCalls++; return originalScrollBy(...args);};
  addEventListener('keydown',event=>{
    if(event.altKey && event.key.toLowerCase()==='r') {event.preventDefault();location.reload();return;}
    if (['PageDown','ArrowDown','End',' '].includes(event.key)) direction=1;
    else if (['PageUp','ArrowUp','Home'].includes(event.key)) direction=-1;
    else return;
    inputAt=performance.now();
  });
  addEventListener('wheel',event=>{direction=Math.sign(event.deltaY);inputAt=performance.now();},{passive:true});
  addEventListener('scroll',()=>{dirty=true;},{passive:true});
  try {new PerformanceObserver(list=>{for(const entry of list.getEntries()) if(!entry.hadRecentInput) {report.layoutShift+=entry.value;report.layoutShifts.push({value:entry.value,sources:entry.sources.map(s=>({node:s.node?.id||s.node?.className||s.node?.nodeName,from:[s.previousRect.x,s.previousRect.y,s.previousRect.width,s.previousRect.height],to:[s.currentRect.x,s.currentRect.y,s.currentRect.width,s.currentRect.height]}))});}}).observe({type:'layout-shift',buffered:true});} catch {}
  const publish=()=>{
    let node=document.getElementById('scroll-qa-report');
    if (!node) {node=document.createElement('script');node.type='application/json';node.id='scroll-qa-report';document.body.append(node);}
    const hero=document.getElementById('hero');
    const map=document.getElementById('map');
    node.textContent=JSON.stringify({...report,navigation:performance.getEntriesByType('navigation')[0]?.type,y:Math.round(scrollY),maxScroll:document.documentElement.scrollHeight-innerHeight,viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1,hero:hero?{controller:hero.dataset.controller,motion:hero.dataset.motion,progress:hero.dataset.progress,locked:hero.dataset.sequenceLock,height:hero.offsetHeight,canvas:[hero.querySelector('canvas').width,hero.querySelector('canvas').height],stageTop:Math.round(hero.querySelector('.citadel-hero-pin').getBoundingClientRect().top),openingVisible:hero.style.getPropertyValue('--hero-opening-visibility'),metricsVisible:hero.style.getPropertyValue('--hero-metrics-visibility'),videos:[...hero.querySelectorAll('video')].map(v=>({paused:v.paused,ready:v.readyState}))}:null,header:{active:document.querySelector('.citadel-site-nav-link.is-active')?.getAttribute('href'),height:document.querySelector('header')?.offsetHeight,ctaRight:document.querySelector('.citadel-site-header-cta')?.getBoundingClientRect().right},map:map?{status:map.dataset.status,intro:map.dataset.introState,render:map.dataset.renderState,active:[...map.querySelectorAll('[aria-pressed="true"]')].map(b=>b.dataset.partnerKey),top:Math.round(map.getBoundingClientRect().top)}:null,modal:document.querySelector('[data-case-study-modal]')?.hidden});
  };
  const frame=time=>{
    const y=scrollY,hero=document.getElementById('hero');
    if(lastTime && (dirty || Math.abs(y-lastY)>0)) {
      const gap=time-lastTime;report.frames++;report.maxFrameMs=Math.max(report.maxFrameMs,Math.round(gap));if(gap>50)report.slowFrames++;
      if(time-inputAt<900 && direction && Math.abs(y-lastY)>2 && Math.sign(y-lastY)!==direction)report.reversedFrames++;
    }
    if(hero) {const height=hero.offsetHeight;if(lastHeight && height!==lastHeight) report.heroHeightChanges++;lastHeight=height;}
    lastTime=time;lastY=y;dirty=false;requestAnimationFrame(frame);
  };
  addEventListener('DOMContentLoaded',()=>{lastY=scrollY;requestAnimationFrame(frame);setInterval(()=>{report.samples.push({y:Math.round(scrollY),p:document.getElementById('hero')?.dataset.progress,draws:{...report.canvasDraws}});if(report.samples.length>30)report.samples.shift();publish();},200);});
})();
