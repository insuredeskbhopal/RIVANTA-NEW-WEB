// Only injected by the local comparison server. Never included in the export.
// Stable randomness, video time and CSS clocks make independent captures comparable.
Math.random=()=>0.42;
HTMLMediaElement.prototype.play=function(){this.pause();return Promise.resolve();};
const freezeVideo=video=>{
  if(video.dataset.visualFrozen) return;
  video.dataset.visualFrozen='1';video.autoplay=false;video.removeAttribute('autoplay');video.pause();
  const reset=()=>{video.pause();try{video.currentTime=0;}catch{}};
  video.addEventListener('loadeddata',reset,{once:true});
  if(video.readyState>=2) reset();
};
const observer=new MutationObserver(()=>document.querySelectorAll('video').forEach(freezeVideo));
observer.observe(document.documentElement,{subtree:true,childList:true});
addEventListener('DOMContentLoaded',()=>{
  const style=document.createElement('style');
  style.textContent='*,*::before,*::after{animation-play-state:paused !important;transition:none !important;}';
  document.head.append(style);
  document.querySelectorAll('video').forEach(freezeVideo);
  // Settle the original carousel's image-dependent arrow geometry on both
  // versions using the same final viewport, after fonts and visible media load.
  setTimeout(()=>dispatchEvent(new Event('resize')),1800);
});
