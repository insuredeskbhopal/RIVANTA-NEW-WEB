'use client';

import { useEffect } from 'react';

export default function SiteRuntime() {
  useEffect(() => {
    // The original controllers mutate their own canvas/carousel DOM. Start
    // them only after React commits the original server-rendered elements.
    if (document.querySelector('script[data-citadel-runtime]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/wp-content/themes/citadel-construction-group/assets/js/main.js?ver=motion-20261118-v2';
    script.dataset.citadelRuntime = 'true';
    document.body.appendChild(script);
  }, []);
  return null;
}
