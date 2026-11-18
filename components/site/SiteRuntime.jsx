'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

function createScrollRuntime() {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const notify = () => window.dispatchEvent(new Event('citadel:scroll'));
  const ownedTriggers = new Set();
  let pendingAnchor = null;
  let anchorFrame = 0;
  let destroyed = false;
  const cancelAnchor = () => {
    pendingAnchor = null;
    cancelAnimationFrame(anchorFrame);
    anchorFrame = 0;
  };
  document.documentElement.dataset.scrollEngine = 'gsap';
  const smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper',
    content: '#smooth-content',
    smooth: motion.matches ? 0 : 0.8,
    smoothTouch: motion.matches ? false : 0.12,
    effects: false,
    normalizeScroll: false,
    onUpdate: notify,
    onStop: () => {
      // Late fonts and carousel measurements can move a destination while the
      // page eases toward it. Settle against its final position once, unless
      // the user has taken over with fresh input.
      if (pendingAnchor) {
        const destination = pendingAnchor;
        pendingAnchor = null;
        const top = destination();
        if (Math.abs(top - smoother.scrollTop()) > 1) {
          anchorFrame = requestAnimationFrame(() => {
            anchorFrame = 0;
            smoother.scrollTo(top, true);
          });
        }
      }
    },
  });
  const bridge = {
    users: 0,
    disposeTimer: null,
    smoother,
    getY: () => smoother.scrollTop(),
    getTop: (element) => smoother.offset(element, 'top top'),
    to: (top, smooth = true) => {
      cancelAnchor();
      smoother.scrollTo(top, smooth && !motion.matches);
    },
    toSection: (element, offset, smooth = true) => {
      cancelAnchor();
      const destination = () => Math.max(0, smoother.offset(element, 'top top') - offset());
      pendingAnchor = smooth && !motion.matches ? destination : null;
      smoother.scrollTo(destination(), smooth && !motion.matches);
    },
    pinHero: (hero, pin, getRange) => {
      const trigger = ScrollTrigger.create({
        id: 'citadel-hero', trigger: hero, start: 'top top',
        end: () => `+=${getRange()}`, pin, pinType: 'transform',
        pinSpacing: false, invalidateOnRefresh: true,
      });
      ownedTriggers.add(trigger);
      return trigger;
    },
  };
  window.citadelScroll = bridge;
  const updateMotion = () => {
    smoother.smooth(motion.matches ? 0 : ScrollTrigger.isTouch === 1 ? 0.12 : 0.8);
    requestRefresh();
  };
  let refreshFrame = 0;
  const requestRefresh = () => {
    if (destroyed) return;
    if (!refreshFrame) refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      ScrollTrigger.refresh();
      notify();
    });
  };
  motion.addEventListener('change', updateMotion);
  window.addEventListener('citadel:layout', requestRefresh);
  window.addEventListener('load', requestRefresh);
  const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  inputEvents.forEach((type) => window.addEventListener(type, cancelAnchor, { passive: true }));
  document.fonts.ready.then(requestRefresh);
  const observer = new ResizeObserver(requestRefresh);
  observer.observe(document.getElementById('smooth-content'));
  bridge.destroy = () => {
    destroyed = true;
    cancelAnchor();
    observer.disconnect();
    cancelAnimationFrame(refreshFrame);
    motion.removeEventListener('change', updateMotion);
    window.removeEventListener('citadel:layout', requestRefresh);
    window.removeEventListener('load', requestRefresh);
    inputEvents.forEach((type) => window.removeEventListener(type, cancelAnchor));
    ownedTriggers.forEach((trigger) => trigger.kill());
    smoother.kill();
    delete window.citadelScroll;
    delete document.documentElement.dataset.scrollEngine;
  };
  requestRefresh();
  return bridge;
}

export default function SiteRuntime() {
  useEffect(() => {
    const runtime = window.citadelScroll || createScrollRuntime();
    clearTimeout(runtime.disposeTimer);
    runtime.users += 1;
    if (!document.querySelector('script[data-citadel-runtime]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/wp-content/themes/citadel-construction-group/assets/js/main.js?ver=rivanta-hawk-20261118';
      script.dataset.citadelRuntime = 'true';
      document.body.appendChild(script);
    }
    // React Strict Mode replays effects. Keep one controller across that replay,
    // and release its observers and GSAP instances when the root actually leaves.
    return () => {
      runtime.users -= 1;
      runtime.disposeTimer = setTimeout(() => {
        if (runtime.users === 0) runtime.destroy();
      }, 0);
    };
  }, []);
  return null;
}
