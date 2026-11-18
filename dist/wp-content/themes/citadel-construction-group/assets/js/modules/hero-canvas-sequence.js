export function initHeroCanvasSequence() {
  // Module entrypoint. This controller coordinates three systems in lockstep:
  // 1) pinned scroll progress (0..1), 2) canvas takeover rendering, 3) video/metrics handoff.
  // If any required root node is missing, bail fast to keep page resilient.
  const hero = document.querySelector('[data-module="hero-canvas-sequence"]');
  if (!hero) {
    return;
  }

  const visual = hero.querySelector('.citadel-hero-visual');
  const video = hero.querySelector('.citadel-hero-video');
  const secondaryVideo = hero.querySelector('.citadel-hero-video-secondary');
  const canvas = hero.querySelector('.citadel-hero-canvas');
  const finalLayer = hero.querySelector('.citadel-hero-final');
  const finalText = hero.querySelector('.citadel-hero-final-text');
  const metricProjects = hero.querySelector('[data-metric="projects"]');
  const metricProjectValue = hero.querySelector('[data-metric="project-value"]');
  const metricEmployeesK = hero.querySelector('[data-metric="employees-k"]');
  if (!visual || !canvas) {
    return;
  }

  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  const getLayoutViewportHeight = () => Math.max(1, Math.round(window.innerHeight || 1));

  const getLayoutViewportWidth = () => Math.max(1, Math.round(window.innerWidth || 1));

  const getRawVisualViewportHeight = () => Math.max(
    1,
    Math.round(window.visualViewport?.height || getLayoutViewportHeight())
  );

  const getRawVisualViewportOffsetTop = () => Math.max(
    0,
    Math.round(window.visualViewport?.offsetTop || 0)
  );

  const getRawVisualViewportWidth = () => Math.max(
    1,
    Math.round(window.visualViewport?.width || getLayoutViewportWidth())
  );

  const getRawVisualViewportOffsetLeft = () => Math.max(
    0,
    Math.round(window.visualViewport?.offsetLeft || 0)
  );

  const readRawViewportMetrics = () => ({
    height: getRawVisualViewportHeight(),
    offsetTop: getRawVisualViewportOffsetTop(),
    width: getRawVisualViewportWidth(),
    offsetLeft: getRawVisualViewportOffsetLeft(),
  });

  const readLockedViewportMetrics = () => ({
    height: getLayoutViewportHeight(),
    offsetTop: 0,
    width: getLayoutViewportWidth(),
    offsetLeft: 0,
  });

  let viewportLockActive = false;
  let lockedViewportMetrics = readRawViewportMetrics();

  const getVisualViewportHeight = () => Math.max(
    1,
    viewportLockActive ? lockedViewportMetrics.height : getRawVisualViewportHeight()
  );

  const getVisualViewportOffsetTop = () => Math.max(
    0,
    viewportLockActive ? lockedViewportMetrics.offsetTop : getRawVisualViewportOffsetTop()
  );

  const getVisualViewportWidth = () => Math.max(
    1,
    viewportLockActive ? lockedViewportMetrics.width : getRawVisualViewportWidth()
  );

  const getVisualViewportOffsetLeft = () => Math.max(
    0,
    viewportLockActive ? lockedViewportMetrics.offsetLeft : getRawVisualViewportOffsetLeft()
  );

  const getViewportHeight = () => getVisualViewportHeight();

  const getViewportBottom = () => getVisualViewportOffsetTop() + getVisualViewportHeight();

  // Mobile browser chrome can mutate the visual viewport while the hero is pinned.
  // When locked, the sequence uses stable layout-viewport dimensions so the stage
  // keeps covering the screen instead of jumping with address-bar transitions.
  const syncViewportLockState = (rawMetrics = readRawViewportMetrics()) => {
    if ((!isTouchLikeEnvironment && !isMobileHeroViewport()) || hero.dataset.motion === 'reduced') {
      viewportLockActive = false;
      return rawMetrics;
    }

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const heroTop = hero.offsetTop;
    const pinBottom = heroTop + Math.max(0, hero.offsetHeight - rawMetrics.height);
    const isWithinPinnedRange = scrollY >= heroTop && scrollY <= pinBottom;

    if (!isWithinPinnedRange) {
      viewportLockActive = false;
      return rawMetrics;
    }

    if (!viewportLockActive) {
      lockedViewportMetrics = readLockedViewportMetrics();
      viewportLockActive = true;
      return rawMetrics;
    }

    const widthDelta = Math.abs(rawMetrics.width - lockedViewportMetrics.width);
    const heightDelta = Math.abs(rawMetrics.height - lockedViewportMetrics.height);
    // Re-capture only for major viewport shape shifts (for example orientation change),
    // while ignoring frequent mobile browser UI show/hide jitter.
    if (widthDelta >= 120 || heightDelta >= 120) {
      lockedViewportMetrics = readLockedViewportMetrics();
    }

    return rawMetrics;
  };

  const syncLiveViewportHeightVar = () => {
    const rawViewportMetrics = readRawViewportMetrics();
    syncViewportLockState(rawViewportMetrics);
    const viewportHeight = getViewportHeight();
    const viewportOffsetTop = getVisualViewportOffsetTop();
    const viewportWidth = getVisualViewportWidth();
    const viewportOffsetLeft = getVisualViewportOffsetLeft();
    hero.style.setProperty('--hero-live-vh', `${viewportHeight}px`);
    hero.style.setProperty('--hero-vv-offset-top', `${viewportOffsetTop}px`);
    document.documentElement.style.setProperty('--citadel-vv-offset-top', `${viewportOffsetTop}px`);
    document.documentElement.style.setProperty('--citadel-vv-width', `${viewportWidth}px`);
    document.documentElement.style.setProperty('--citadel-vv-offset-left', `${viewportOffsetLeft}px`);
  };

  // Runtime tuning knobs (mostly data-driven from Twig/ACF):
  // - scrollDistance: baseline pin length before timeline stretch.
  // - timelineStretch: extends total storytelling runway without requiring larger CMS numbers.
  // - overlayStart: when takeover phase starts relative to overall progress.
  // - textAnimationSpeed: expands or contracts reveal window for final heading text.
  // - maskEasePower: shapes how fast the overlay mask accelerates through takeover.
  // Notes for tuning:
  // - Lower scrollDistance = faster whole hero.
  // - Higher overlayStart = later/faster-feeling mask takeover.
  // - Lower textAnimationSpeed = faster final text reveal.
  // - Lower maskEasePower = faster earlier takeover, higher = slower early / faster late.
  const parsedDistance = Number.parseInt(hero.dataset.heroScrollDistance || '', 10);
  const defaultDistance = Math.round(getViewportHeight() * 2.0);
  const scrollDistance = Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : defaultDistance;
  const timelineStretch = 2.45;
  // Keep this small: it is dead scroll between sequence completion and hero
  // release. Shrinking it also stretches sequenceScrollRange, giving the
  // mask zoom more scroll runway per unit of progress.
  const postSequenceHoldPx = Math.round(getViewportHeight() * 0.2);
  const orangeVideoHoldPx = Math.round(getViewportHeight() * 2.0);
  const orangeVideoTriggerTextProgress = 0.9;
  const requestedMaskEasePower = Number.parseFloat(hero.dataset.heroMaskEasePower || '1.28');
  const mapOverlayEaseInPower = Number.isFinite(requestedMaskEasePower)
    ? Math.max(0.5, Math.min(2.5, requestedMaskEasePower))
    : 1.28;
  const metricsStaggerMs = 340;
  const metricsTickDurationMs = 1280;
  const metricsUnpinDelayMs = 0;
  const effectiveScrollDistance = Math.round(scrollDistance * timelineStretch);
  const sequenceScrollRange = Math.max(1, effectiveScrollDistance - getViewportHeight() - postSequenceHoldPx);
  const requestedOverlayStart = Number.parseFloat(hero.dataset.heroOverlayTiming || '0.52');
  const overlayStart = clamp01(Number.isFinite(requestedOverlayStart) ? requestedOverlayStart : 0.52);
  const requestedTextAnimationSpeed = Number.parseFloat(hero.dataset.heroTextAnimationSpeed || '1.5');
  const textAnimationSpeed = Number.isFinite(requestedTextAnimationSpeed)
    ? Math.max(0.5, Math.min(3, requestedTextAnimationSpeed))
    : 1.5;
  const videoStrategy = hero.dataset.heroVideoStrategy || 'hold_final';
  const pushBypassSensitivity = hero.dataset.heroPushBypassSensitivity || 'strong';
  const debugMode = hero.dataset.heroDebugMode === '1';
  const maskSvgUrl = hero.dataset.heroMaskSvg || '';
  const metricsTargetProjects = Math.max(0, Number.parseInt(hero.dataset.heroMetricTotalProjects || '98', 10) || 98);
  const metricsTargetProjectValue = Math.max(0, Number.parseFloat(hero.dataset.heroMetricTotalProjectValueBn || '10') || 10);
  const metricsTargetEmployeesK = Math.max(0, Number.parseFloat(hero.dataset.heroMetricCombinedEmployeesK || '2.4') || 2.4);

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    return;
  }

  const HERO_SCROLL_POSITION_KEY = 'citadel-hero-scroll-position';
  const debugLog = (...args) => {
    if (debugMode) {
      console.log('[hero-debug]', ...args);
    }
  };

  const isPlainReload = () => {
    if (window.location.hash) {
      return false;
    }

    try {
      const navEntry = (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function')
        ? performance.getEntriesByType('navigation')[0]
        : null;
      const isReloadByType = Boolean(navEntry && navEntry.type === 'reload');
      const isReloadByNavigation = Boolean(
        typeof performance !== 'undefined' &&
        performance.navigation &&
        performance.navigation.type === performance.navigation.TYPE_RELOAD
      );
      return isReloadByType || isReloadByNavigation;
    } catch {
      // Ignore browser API mismatch; the reload check is best-effort.
    }
    return false;
  };

  const getHeroScrollRunwayLimit = () => {
    const heroTop = hero.offsetTop;
    const viewportHeight = getViewportHeight();
    const basePinRange = Math.max(0, effectiveScrollDistance - viewportHeight);
    return Math.round(heroTop + basePinRange);
  };

  const persistHeroScrollPosition = () => {
    if (!hero || window.location.hash || isPlainReload()) {
      debugLog('persistHeroScrollPosition skipped', {
        hasHero: Boolean(hero),
        hash: window.location.hash,
        plainReload: isPlainReload(),
        scrollY: window.scrollY,
      });
      return;
    }

    try {
      const scrollY = Math.round(window.scrollY || window.pageYOffset || 0);
      const runwayLimit = getHeroScrollRunwayLimit();

      if (scrollY > runwayLimit) {
        debugLog('persistHeroScrollPosition clearing outside runway', {
          scrollY,
          runwayLimit,
        });
        sessionStorage.removeItem(HERO_SCROLL_POSITION_KEY);
        return;
      }

      sessionStorage.setItem(HERO_SCROLL_POSITION_KEY, String(scrollY));
      debugLog('persistHeroScrollPosition saved', {
        scrollY,
        runwayLimit,
        savedValue: sessionStorage.getItem(HERO_SCROLL_POSITION_KEY),
      });
    } catch (error) {
      debugLog('persistHeroScrollPosition error', error);
      // Ignore storage failures; the page should continue without the restore hint.
    }
  };

  const restoreHeroScrollPosition = () => {
    const plainReload = isPlainReload();
    if (!hero || window.location.hash || plainReload) {
      sessionStorage.removeItem(HERO_SCROLL_POSITION_KEY);
      return;
    }

    try {
      const lastSavedY = Number.parseInt(sessionStorage.getItem(HERO_SCROLL_POSITION_KEY) || '', 10);
      if (!Number.isFinite(lastSavedY) || lastSavedY <= 0) {
        return;
      }

      const runwayLimit = getHeroScrollRunwayLimit();
      if (lastSavedY > runwayLimit) {
        sessionStorage.removeItem(HERO_SCROLL_POSITION_KEY);
        return;
      }

      debugLog('restoreHeroScrollPosition applying restore', {
        lastSavedY,
        runwayLimit,
      });
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: lastSavedY, behavior: 'auto' });
      });
    } catch {
      // Ignore storage failures; restore is optional and should not block page boot.
    }
  };

  let progress = 0;
  let hasHydratedProgress = false;
  let rafPending = false;
  let orangeVideoStarted = false;
  let orangeVideoCompleted = false;
  let metricsSequenceStarted = false;
  let metricsSequenceCompleted = false;
  let metricsSequenceStartMs = 0;
  let metricsReleaseAtMs = 0;
  let releaseLockUntil = 0;
  let releaseLockY = 0;
  let queuedAnchorScrollTop = null;
  let queuedAnchorHash = '';
  let queuedAnchorAutoStarted = false;
  let lastInputImpulse = 0;
  let lastInputAtMs = 0;
  let maxRecentInputImpulse = 0;
  let lastInputDirection = 0;
  let touchIntentY = 0;
  let mapMaskPath = null;
  let mapMaskViewBoxWidth = 1;
  let mapMaskViewBoxHeight = 1;
  let mapMaskReady = false;
  let letterNodes = [];
  let lineRanges = [];
  let debugSampleTimer = null;
  const debugSamples = [];
  const maxDebugSamples = 240;
  const intFormatter = new Intl.NumberFormat('en-US');
  const pushThresholdBySensitivity = {
    medium: 420,
    strong: 700,
    very_strong: 1100,
  };
  const hardPushDeltaThreshold = pushThresholdBySensitivity[pushBypassSensitivity] || pushThresholdBySensitivity.strong;
  const hardPushWindowMs = 320;
  const isTouchLikeEnvironment =
    window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints || 0) > 0;
  const isMobileHeroViewport = () => window.matchMedia('(max-width: 767px)').matches;

  // Stateful flags intentionally use explicit booleans instead of a single enum so
  // transitions can be reasoned about independently (video state vs metrics state).
  // If refactoring, keep behavior parity for:
  // - reverse scrolling,
  // - reduced motion,
  // - hard-push bypass.

  const formatCompactOneDecimal = (value) => {
    const rounded = Math.round(value * 10) / 10;
    const asText = rounded.toFixed(1);
    return asText.endsWith('.0') ? asText.slice(0, -2) : asText;
  };

  const renderMetrics = (projects, projectValue, employeesK) => {
    if (metricProjects) {
      metricProjects.textContent = intFormatter.format(Math.max(0, Math.round(projects)));
    }
    if (metricProjectValue) {
      metricProjectValue.textContent = formatCompactOneDecimal(projectValue);
    }
    if (metricEmployeesK) {
      metricEmployeesK.textContent = formatCompactOneDecimal(employeesK);
    }
  };

  const noteInputImpulse = (delta, nowMs) => {
    lastInputImpulse = Math.abs(delta);
    maxRecentInputImpulse = Math.max(maxRecentInputImpulse, lastInputImpulse);
    lastInputDirection = delta > 0 ? 1 : (delta < 0 ? -1 : 0);
    lastInputAtMs = nowMs;
  };

  const clearInputImpulse = () => {
    lastInputImpulse = 0;
    lastInputAtMs = 0;
    maxRecentInputImpulse = 0;
    lastInputDirection = 0;
  };

  const hasHardPushIntent = (nowMs) => {
    if (lastInputImpulse <= 0 || lastInputAtMs <= 0) {
      return false;
    }
    return (nowMs - lastInputAtMs) <= hardPushWindowMs && maxRecentInputImpulse >= hardPushDeltaThreshold;
  };

  const bypassPinOnHardPush = (nowMs) => {
    // Mobile/touch paths should not bypass the sequence because it can skip
    // the final text + metrics reveal and release pinning too early.
    if (isTouchLikeEnvironment) {
      return false;
    }

    // Guard against accidental bypass on emulated/mobile wheel bursts.
    // Only allow bypass when the sequence is already near completion.
    if (progress < 0.95) {
      return false;
    }

    if (!hasHardPushIntent(nowMs)) {
      return false;
    }

    const carryDirection = lastInputDirection;
    const carryImpulse = maxRecentInputImpulse;

    releaseLockUntil = 0;
    releaseLockY = 0;
    orangeVideoStarted = false;
    orangeVideoCompleted = true;
    metricsReleaseAtMs = 0;
    metricsSequenceCompleted = true;
    updateHeroScrollDistance();
    clearInputImpulse();

    if (carryDirection > 0) {
      const passThroughPx = Math.min(1400, Math.max(260, Math.round(carryImpulse * 0.75)));
      window.scrollBy(0, passThroughPx);
    }

    requestUpdate();
    return true;
  };

  const splitFinalHeadingLines = (text) => {
    const normalized = (text || '').trim();
    if (!normalized) {
      return [];
    }

    if (/\n/.test(normalized)) {
      return normalized
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    }

    if (/^a shared vision for construction across the u\.s\.$/i.test(normalized)) {
      return ['A shared vision', 'for construction', 'across the U.S.'];
    }

    const words = normalized.split(/\s+/);
    if (words.length >= 6) {
      const firstBreak = Math.ceil(words.length / 3);
      const secondBreak = Math.ceil((words.length * 2) / 3);
      return [
        words.slice(0, firstBreak).join(' '),
        words.slice(firstBreak, secondBreak).join(' '),
        words.slice(secondBreak).join(' '),
      ].filter(Boolean);
    }

    return [normalized];
  };

  const initFinalTextAnimation = () => {
    if (!finalText || !finalLayer) {
      return;
    }

    // Final heading is split into per-letter spans so scroll progress can control
    // reveal deterministically. This keeps animation stable even with copy edits.
    const lines = splitFinalHeadingLines(finalText.textContent || '');
    if (lines.length === 0) {
      return;
    }

    finalText.textContent = '';
    letterNodes = [];
    lineRanges = [];
    let runningLetterIndex = 0;

    lines.forEach((lineText, lineIndex) => {
      const line = document.createElement('span');
      line.className = 'citadel-hero-final-line';
      line.setAttribute('data-line-index', String(lineIndex));

      Array.from(lineText).forEach((character) => {
        const letter = document.createElement('span');
        letter.className = 'citadel-hero-final-letter';
        letter.textContent = character === ' ' ? '\u00a0' : character;
        line.appendChild(letter);
        letterNodes.push(letter);
      });

      const lineLetterCount = lineText.length;
      lineRanges.push({
        start: runningLetterIndex,
        count: lineLetterCount,
      });
      runningLetterIndex += lineLetterCount;

      finalText.appendChild(line);
    });
  };

  const applyFinalTextProgress = (textProgress) => {
    if (!finalLayer || letterNodes.length === 0 || lineRanges.length === 0) {
      return;
    }

    const clamped = clamp01(textProgress);

    finalLayer.style.opacity = clamped > 0 ? '1' : '0';

    // Reveal is line-aware: each line gets its own local 0..1 progress window.
    // This avoids visual jumps when heading length or manual line breaks change.
    const lineStage = clamped * lineRanges.length;
    lineRanges.forEach((range, lineIndex) => {
      const localProgress = clamp01(lineStage - lineIndex);
      const revealInLine = localProgress >= 0.995
        ? range.count
        : Math.floor(localProgress * range.count);

      for (let offset = 0; offset < range.count; offset += 1) {
        const letter = letterNodes[range.start + offset];
        if (!letter) {
          continue;
        }

        if (offset < revealInLine) {
          letter.style.opacity = '1';
          letter.style.transform = 'translateY(0)';
        } else {
          letter.style.opacity = '0';
          letter.style.transform = 'translateY(0.22em)';
        }
      }
    });
  };

  const resetSecondaryVideo = () => {
    if (!secondaryVideo) {
      return;
    }

    if (!secondaryVideo.paused) {
      secondaryVideo.pause();
    }

    orangeVideoStarted = false;
    orangeVideoCompleted = false;
    secondaryVideo.loop = false;

    if (secondaryVideo.currentTime !== 0) {
      secondaryVideo.currentTime = 0;
    }
  };

  const resetMetricsSequence = () => {
    metricsSequenceStarted = false;
    metricsSequenceCompleted = false;
    metricsSequenceStartMs = 0;
    metricsReleaseAtMs = 0;
    hero.style.setProperty('--hero-final-shift-progress', '0');
    hero.style.setProperty('--hero-metrics-visibility', '0');
    renderMetrics(0, 0, 0);
  };

  const startMetricsSequence = (startMs) => {
    if (metricsSequenceStarted || metricsSequenceCompleted) {
      return;
    }

    metricsSequenceStarted = true;
    metricsSequenceStartMs = startMs;
    hero.style.setProperty('--hero-final-shift-progress', '0');
    hero.style.setProperty('--hero-metrics-visibility', '0');
  };

  const completeMetricsSequence = (nowMs) => {
    metricsSequenceCompleted = true;
    metricsReleaseAtMs = nowMs + metricsUnpinDelayMs;
    renderMetrics(metricsTargetProjects, metricsTargetProjectValue, metricsTargetEmployeesK);
    hero.style.setProperty('--hero-final-shift-progress', '1');
    hero.style.setProperty('--hero-metrics-visibility', '1');
  };

  const updateMetricsSequence = (nowMs) => {
    if (!metricsSequenceStarted || metricsSequenceCompleted) {
      return;
    }

    const elapsed = Math.max(0, nowMs - metricsSequenceStartMs);
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
    const metricProgress = (index) => clamp01((elapsed - (index * metricsStaggerMs)) / metricsTickDurationMs);

    const projectsProgress = easeOutCubic(metricProgress(0));
    const projectValueProgress = easeOutCubic(metricProgress(1));
    const employeesProgress = easeOutCubic(metricProgress(2));

    renderMetrics(
      metricsTargetProjects * projectsProgress,
      metricsTargetProjectValue * projectValueProgress,
      metricsTargetEmployeesK * employeesProgress
    );

    const revealProgress = clamp01(elapsed / 820);
    hero.style.setProperty('--hero-final-shift-progress', revealProgress.toFixed(3));
    hero.style.setProperty('--hero-metrics-visibility', revealProgress.toFixed(3));

    if (metricProgress(2) >= 1) {
      completeMetricsSequence(nowMs);
    }
  };

  const updateHeroScrollDistance = () => {
    // The visible stage stays viewport-sized; runway spacer consumes the extra
    // scroll distance via --hero-scroll-distance-px in CSS.
    const holdDistance = orangeVideoStarted && !orangeVideoCompleted ? orangeVideoHoldPx : 0;
    hero.style.setProperty('--hero-scroll-distance-px', `${effectiveScrollDistance + holdDistance + postSequenceHoldPx}px`);
  };

  const updateSequenceNavigationState = () => {
    // Scrollspy consumes this state to decide whether anchor navigation should
    // queue behind the hero sequence instead of fighting the pin lock.
    const alreadyEscaped = isHeroAlreadyEscaped();
    const isSequenceLocked = !alreadyEscaped && orangeVideoStarted && !orangeVideoCompleted;
    const isSequenceComplete = alreadyEscaped || orangeVideoCompleted;
    const isSequenceActive = !alreadyEscaped && hero.dataset.motion === 'standard' && !isSequenceComplete;
    hero.dataset.sequenceLock = isSequenceLocked ? '1' : '0';
    hero.dataset.sequenceComplete = isSequenceComplete ? '1' : '0';
    hero.dataset.sequenceActive = isSequenceActive ? '1' : '0';
    hero.dataset.sequenceReleaseBoundaryY = String(getReleaseBoundaryY());
  };

  const clearQueuedAnchorNavigation = () => {
    queuedAnchorScrollTop = null;
    queuedAnchorHash = '';
    queuedAnchorAutoStarted = false;
  };

  const queueAnchorNavigation = (targetScrollTop, hash = '') => {
    if (!Number.isFinite(targetScrollTop)) {
      return false;
    }
    queuedAnchorScrollTop = Math.max(0, Math.round(targetScrollTop));
    queuedAnchorHash = typeof hash === 'string' ? hash : '';
    queuedAnchorAutoStarted = false;
    return true;
  };

  const isHeroAlreadyEscaped = () => {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    return scrollY >= getReleaseBoundaryY();
  };

  const flushQueuedAnchorNavigation = () => {
    if (queuedAnchorScrollTop === null) {
      return false;
    }

    const target = queuedAnchorScrollTop;
    clearQueuedAnchorNavigation();
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: target, behavior: 'smooth' });
    });
    return true;
  };

  const maybeAutoDriveQueuedNavigation = () => {
    if (queuedAnchorScrollTop === null || queuedAnchorAutoStarted || hero.dataset.motion !== 'standard') {
      return;
    }

    if (orangeVideoCompleted) {
      return;
    }

    const releaseBoundaryY = getReleaseBoundaryY();
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const driveTargetY = Math.max(scrollY, releaseBoundaryY + 24);
    queuedAnchorAutoStarted = true;
    window.scrollTo({ top: driveTargetY, behavior: 'smooth' });
  };

  const getReleaseBoundaryY = () => {
    const viewportHeight = getViewportHeight();
    const basePinRange = Math.max(0, effectiveScrollDistance - viewportHeight);
    return Math.round(hero.offsetTop + basePinRange);
  };

  const startSecondaryVideoOnce = () => {
    if (!secondaryVideo || orangeVideoStarted) {
      return;
    }

    orangeVideoStarted = true;
    orangeVideoCompleted = false;
    secondaryVideo.loop = false;

    updateHeroScrollDistance();

    if (secondaryVideo.currentTime !== 0) {
      secondaryVideo.currentTime = 0;
    }

    const playPromise = secondaryVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        orangeVideoStarted = false;
        orangeVideoCompleted = false;
        updateHeroScrollDistance();
      });
    }
  };

  const MASK_LOAD_MAX_ATTEMPTS = 5;
  let maskLoadAttempts = 0;
  let maskLoadInFlight = false;

  const loadMaskPath = async () => {
    // Map mask is externalized as SVG path so design can update silhouette without
    // rewriting draw math. The fetch can lose a load-time race against the hero
    // videos, so failures retry with backoff — without the mask the takeover
    // renders as a plain orange fill with no map window.
    if (!maskSvgUrl || mapMaskReady || maskLoadInFlight || maskLoadAttempts >= MASK_LOAD_MAX_ATTEMPTS) {
      return;
    }

    maskLoadInFlight = true;
    maskLoadAttempts += 1;

    try {
      const response = await fetch(maskSvgUrl, { credentials: 'same-origin' });
      if (!response.ok) {
        throw new Error('Mask SVG request failed');
      }

      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDocument = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDocument.querySelector('svg');
      const pathElement = svgDocument.querySelector('path');
      const pathData = pathElement?.getAttribute('d') || '';
      const viewBoxValue = svgElement?.getAttribute('viewBox') || '';
      const viewBoxParts = viewBoxValue.split(/\s+/).map((item) => Number.parseFloat(item));

      if (!pathData) {
        throw new Error('Mask SVG path missing');
      }

      if (viewBoxParts.length === 4 && Number.isFinite(viewBoxParts[2]) && Number.isFinite(viewBoxParts[3])) {
        mapMaskViewBoxWidth = Math.max(1, viewBoxParts[2]);
        mapMaskViewBoxHeight = Math.max(1, viewBoxParts[3]);
      }

      mapMaskPath = new Path2D(pathData);
      mapMaskReady = true;
      queueDraw();
    } catch (error) {
      mapMaskPath = null;
      mapMaskReady = false;

      if (maskLoadAttempts < MASK_LOAD_MAX_ATTEMPTS) {
        window.setTimeout(() => {
          loadMaskPath();
        }, 400 * maskLoadAttempts);
      } else {
        // eslint-disable-next-line no-console
        console.warn('Citadel hero: map mask SVG failed to load after retries; takeover will render without the map window.', error);
      }
    } finally {
      maskLoadInFlight = false;
    }
  };

  // If the takeover starts while the mask is still missing (all init-time
  // retries lost to load contention), allow one extra retry round on demand.
  let maskLazyRetryUsed = false;
  const maybeRetryMaskLoad = () => {
    if (mapMaskReady || maskLoadInFlight) {
      return;
    }

    if (maskLoadAttempts >= MASK_LOAD_MAX_ATTEMPTS) {
      if (maskLazyRetryUsed) {
        return;
      }

      maskLazyRetryUsed = true;
      maskLoadAttempts = 0;
    }

    loadMaskPath();
  };

  const syncCanvasSize = () => {
    const rect = visual.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    // Cap DPR to keep canvas cost bounded on very dense displays.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  };

  const drawOverlay = () => {
    rafPending = false;
    const { width, height } = syncCanvasSize();
    context.clearRect(0, 0, width, height);

    // Timeline model:
    // - progress (0..1) maps to overall pinned scroll journey.
    // - phase starts only after overlayStart so opening state stays calm/legible.
    // - takeoverPhase then drives orange fill + shrinking U.S. mask.
    // This ordering is frame-tuned to mockup cadence and should be changed carefully.
    const phase = clamp01((progress - overlayStart) / Math.max(0.001, 1 - overlayStart));
    if (phase > 0 && !mapMaskReady) {
      maybeRetryMaskLoad();
    }
    if (phase <= 0) {
      hero.style.setProperty('--hero-secondary-visibility', '0');
      hero.style.setProperty('--hero-final-progress', '0');
      hero.style.setProperty('--hero-overlay-visibility', '1');
      hero.style.setProperty('--hero-opening-visibility', '1');
      applyFinalTextProgress(0);
      resetSecondaryVideo();
      resetMetricsSequence();
      updateSequenceNavigationState();
      return;
    }

    const takeoverStart = 0;
    const takeoverPhase = clamp01((phase - takeoverStart) / Math.max(0.001, 1 - takeoverStart));
    const easedTakeoverPhase = Math.pow(takeoverPhase, mapOverlayEaseInPower);

    // Frame-matched timing from 5s-11s extraction:
    // text starts at frame 97, text ends at frame 128, video scrub ends at frame 162.
    const targetTextStartProgress = 0.8;
    const targetTextEndProgress = 0.95;
    const textStart = clamp01((targetTextStartProgress - overlayStart) / Math.max(0.001, 1 - overlayStart));
    const baseTextEnd = clamp01((targetTextEndProgress - overlayStart) / Math.max(0.001, 1 - overlayStart));
    const baseTextWindow = Math.max(0.001, baseTextEnd - textStart);
    const adjustedTextWindow = baseTextWindow * textAnimationSpeed;
    const textEnd = clamp01(Math.min(0.999, textStart + adjustedTextWindow));
    // Orange takeover layer is drawn first, then punched via destination-out mask.
    // This makes the silhouette behavior explicit and easy to debug.
    context.fillStyle = '#ed730c';
    context.fillRect(0, 0, width, height);

    // U.S. mask starts oversized (larger than viewport) and shrinks to nothing.
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const baseScale = Math.min(width / mapMaskViewBoxWidth, height / mapMaskViewBoxHeight);
    const startScale = baseScale * 1.45;
    const maskScale = Math.max(0.00001, startScale * (1 - easedTakeoverPhase));

    if (mapMaskReady && mapMaskPath && maskScale > 0.0001) {
      context.save();
      context.globalCompositeOperation = 'destination-out';
      context.translate(centerX, centerY);
      context.scale(maskScale, maskScale);
      context.translate(-mapMaskViewBoxWidth / 2, -mapMaskViewBoxHeight / 2);
      context.fill(mapMaskPath);
      context.restore();

      context.save();
      context.globalAlpha = clamp01(0.28 - easedTakeoverPhase * 0.22);
      context.strokeStyle = 'rgba(255, 220, 180, 1)';
      context.lineWidth = Math.max(2, width * 0.003) / maskScale;
      context.translate(centerX, centerY);
      context.scale(maskScale, maskScale);
      context.translate(-mapMaskViewBoxWidth / 2, -mapMaskViewBoxHeight / 2);
      context.stroke(mapMaskPath);
      context.restore();
    }

    const textProgressLinear = clamp01((takeoverPhase - textStart) / Math.max(0.001, textEnd - textStart));
    const textProgress = Math.pow(textProgressLinear, 1.25);
    const shouldTriggerOrangeVideo = textProgress >= orangeVideoTriggerTextProgress;
    const textComplete = textProgress >= 0.999;
    if (shouldTriggerOrangeVideo && !orangeVideoStarted && !orangeVideoCompleted && !isHeroAlreadyEscaped()) {
      startSecondaryVideoOnce();
    } else if (!shouldTriggerOrangeVideo) {
      resetSecondaryVideo();
      resetMetricsSequence();
    }

    const nowMs = performance.now();
    if (textComplete && orangeVideoStarted) {
      startMetricsSequence(nowMs);
    }
    updateMetricsSequence(nowMs);

    if (metricsSequenceCompleted && metricsReleaseAtMs > 0 && nowMs >= metricsReleaseAtMs) {
      orangeVideoStarted = false;
      orangeVideoCompleted = true;
      metricsReleaseAtMs = 0;
      releaseLockUntil = 0;
      releaseLockY = 0;
      updateHeroScrollDistance();
      updateSequenceNavigationState();
      flushQueuedAnchorNavigation();
      requestUpdate();
    }

    const secondaryVisibility = (orangeVideoStarted || orangeVideoCompleted) ? 1 : 0;
    const finalProgress = textProgress;
    const overlayVisibility = (orangeVideoStarted || orangeVideoCompleted) ? 0 : 1;
    const openingVisibility = (orangeVideoStarted || orangeVideoCompleted)
      ? 0
      : 1 - clamp01((takeoverPhase - 0.66) / 0.18);

    applyFinalTextProgress(textProgress);
    hero.style.setProperty('--hero-secondary-visibility', secondaryVisibility.toFixed(3));
    hero.style.setProperty('--hero-final-progress', finalProgress.toFixed(3));
    hero.style.setProperty('--hero-overlay-visibility', overlayVisibility.toFixed(3));
    hero.style.setProperty('--hero-opening-visibility', openingVisibility.toFixed(3));

    if (metricsSequenceStarted && (!metricsSequenceCompleted || metricsReleaseAtMs > 0)) {
      queueDraw();
    }
  };

  const queueDraw = () => {
    if (rafPending) {
      return;
    }
    rafPending = true;
    window.requestAnimationFrame(drawOverlay);
  };

  const updateVideoState = () => {
    if (!video) {
      return;
    }

    // Primary video is only for opening/early sequence. Once orange sequence starts,
    // primary video is frozen and secondary video owns final transition.
    if (orangeVideoStarted || orangeVideoCompleted) {
      video.loop = false;
      if (!video.paused) {
        video.pause();
      }

      if (secondaryVideo && orangeVideoStarted && secondaryVideo.paused && !secondaryVideo.ended) {
        const playPromise = secondaryVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Playback will retry on the next scroll/update frame.
          });
        }
      }
      return;
    }

    const shouldHoldFinal = videoStrategy === 'hold_final' && progress >= 0.96;
    if (shouldHoldFinal) {
      video.loop = false;
      if (!video.paused) {
        video.pause();
      }
      return;
    }

    video.loop = true;
    if (video.paused) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Browser autoplay policy may block replay; semantic content remains visible.
        });
      }
    }

    if (secondaryVideo && !orangeVideoStarted && !secondaryVideo.paused) {
      secondaryVideo.pause();
    }
  };

  const updateProgress = () => {
    syncViewportLockState();
    maybeAutoDriveQueuedNavigation();
    if (isHeroAlreadyEscaped()) {
      // Past the release boundary with no orange video in flight, the
      // sequence is done: finalize so a stale queued draw can never start the
      // orange video and temporarily inflate the runway (which shifts every
      // section below). An actively running orange video (the natural hold
      // clamps scroll exactly at the boundary) is left untouched.
      if (!orangeVideoStarted && !orangeVideoCompleted) {
        orangeVideoCompleted = true;
        updateHeroScrollDistance();
      }

      progress = 1;
      hero.dataset.progress = '1.000';
      hero.style.setProperty('--hero-progress', '1.000');
      updateSequenceNavigationState();
      return;
    }

    const now = performance.now();
    let scrollY = window.scrollY || window.pageYOffset || 0;

    if (orangeVideoStarted && !orangeVideoCompleted) {
      if (!bypassPinOnHardPush(now)) {
        const releaseY = getReleaseBoundaryY();
        if (scrollY > releaseY + 1) {
          window.scrollTo(0, releaseY);
          scrollY = releaseY;
        }
      }
    }

    if (releaseLockUntil > now) {
      if (!bypassPinOnHardPush(now)) {
        if (Math.abs(scrollY - releaseLockY) > 1) {
          window.scrollTo(0, releaseLockY);
        }
        scrollY = releaseLockY;
        window.requestAnimationFrame(updateProgress);
      }
    }

    const heroTop = hero.offsetTop;
    const viewportHeight = getViewportHeight();
    // Core progress mapping used by both visual rendering and CSS state variables.
    const next = clamp01((scrollY - heroTop) / Math.max(1, sequenceScrollRange));
    if (hasHydratedProgress && Math.abs(next - progress) < 0.001) {
      updateSequenceNavigationState();
      return;
    }

    progress = next;
    hasHydratedProgress = true;
    hero.dataset.progress = progress.toFixed(3);
    hero.style.setProperty('--hero-progress', progress.toFixed(3));
    hero.style.setProperty('--hero-overlay-start', overlayStart.toFixed(3));
    updateSequenceNavigationState();

    updateVideoState();
    queueDraw();
  };

  const requestUpdate = () => {
    window.requestAnimationFrame(updateProgress);
  };

  const buildDebugSnapshot = (label = 'manual') => {
    const visualRect = visual.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const visualStyle = window.getComputedStyle(visual);
    const heroStyle = window.getComputedStyle(hero);
    const scrollY = window.scrollY || window.pageYOffset || 0;

    return {
      label,
      at: new Date().toISOString(),
      scrollY: Math.round(scrollY),
      viewport: {
        width: window.innerWidth,
        height: getViewportHeight(),
        layoutHeight: getLayoutViewportHeight(),
        visualWidth: getVisualViewportWidth(),
        visualHeight: getVisualViewportHeight(),
        visualOffsetLeft: getVisualViewportOffsetLeft(),
        visualOffsetTop: getVisualViewportOffsetTop(),
        dpr: window.devicePixelRatio || 1,
      },
      flags: {
        debugMode,
        viewportLockActive,
        orangeVideoStarted,
        orangeVideoCompleted,
        metricsSequenceStarted,
        metricsSequenceCompleted,
      },
      progress: {
        raw: Number(progress.toFixed(4)),
        dataProgress: Number.parseFloat(hero.dataset.progress || '0'),
        overlayStart,
      },
      heroRect: {
        top: Math.round(heroRect.top),
        bottom: Math.round(heroRect.bottom),
        height: Math.round(heroRect.height),
        offsetTop: hero.offsetTop,
        offsetHeight: hero.offsetHeight,
      },
      visualRect: {
        top: Math.round(visualRect.top),
        bottom: Math.round(visualRect.bottom),
        height: Math.round(visualRect.height),
        underfillPx: Math.max(0, Math.round(getViewportBottom() - visualRect.bottom)),
      },
      css: {
        visualPosition: visualStyle.position,
        visualTop: visualStyle.top,
        visualHeight: visualStyle.height,
        heroHeight: heroStyle.height,
        heroScrollDistance: heroStyle.getPropertyValue('--hero-scroll-distance-px').trim(),
      },
    };
  };

  const pushDebugSample = (label = 'sample') => {
    const sample = buildDebugSnapshot(label);
    debugSamples.push(sample);
    if (debugSamples.length > maxDebugSamples) {
      debugSamples.shift();
    }
    return sample;
  };

  window.__citadelHeroDebug = {
    enabled: debugMode,
    snapshot(label = 'manual') {
      return buildDebugSnapshot(label);
    },
    sample(label = 'manual') {
      return pushDebugSample(label);
    },
    start(intervalMs = 200) {
      if (!debugMode) {
        return { running: false, enabled: false, count: debugSamples.length };
      }
      const nextInterval = Math.max(50, Math.round(intervalMs));
      if (debugSampleTimer) {
        window.clearInterval(debugSampleTimer);
      }
      debugSampleTimer = window.setInterval(() => {
        pushDebugSample('interval');
      }, nextInterval);
      return { running: true, intervalMs: nextInterval, count: debugSamples.length };
    },
    stop() {
      if (debugSampleTimer) {
        window.clearInterval(debugSampleTimer);
        debugSampleTimer = null;
      }
      return { running: false, count: debugSamples.length };
    },
    clear() {
      debugSamples.length = 0;
      return { count: 0 };
    },
    dump(lastN = 25) {
      const n = Math.max(1, Math.round(lastN));
      return debugSamples.slice(-n);
    },
    state() {
      return {
        enabled: debugMode,
        running: Boolean(debugSampleTimer),
        count: debugSamples.length,
        max: maxDebugSamples,
      };
    },
  };

  const initializeHeroSequence = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hero.dataset.motion = 'reduced';
      hero.dataset.sequenceLock = '0';
      hero.dataset.sequenceComplete = '1';
      hero.dataset.sequenceActive = '0';
      hero.dataset.sequenceReleaseBoundaryY = '0';
      hero.style.setProperty('--hero-overlay-start', overlayStart.toFixed(3));
      hero.style.setProperty('--hero-progress', '0');
      hero.style.setProperty('--hero-scroll-distance-px', '0px');
      hero.style.setProperty('--hero-overlay-visibility', '0');
      hero.style.setProperty('--hero-opening-visibility', '1');
      hero.style.setProperty('--hero-final-shift-progress', '1');
      hero.style.setProperty('--hero-metrics-visibility', '1');
      applyFinalTextProgress(1);
      renderMetrics(metricsTargetProjects, metricsTargetProjectValue, metricsTargetEmployeesK);
      return;
    }

    hero.dataset.motion = 'standard';
    updateHeroScrollDistance();
    hero.style.setProperty('--hero-overlay-start', overlayStart.toFixed(3));
    hero.style.setProperty('--hero-final-progress', '0');
    hero.style.setProperty('--hero-overlay-visibility', '1');
    hero.style.setProperty('--hero-opening-visibility', '1');
    hero.style.setProperty('--hero-final-shift-progress', '0');
    hero.style.setProperty('--hero-metrics-visibility', '0');
    hero.dataset.sequenceLock = '0';
    hero.dataset.sequenceComplete = '0';
    hero.dataset.sequenceActive = '1';
    hero.dataset.sequenceReleaseBoundaryY = '0';

    hero.getSequenceNavigationState = () => ({
      motion: hero.dataset.motion || 'unknown',
      active: hero.dataset.sequenceActive === '1',
      locked: hero.dataset.sequenceLock === '1',
      complete: hero.dataset.sequenceComplete === '1',
      releaseBoundaryY: Number.parseInt(hero.dataset.sequenceReleaseBoundaryY || '0', 10) || 0,
    });

    hero.queueAnchorNavigation = (targetScrollTop, hash = '') => {
      const queued = queueAnchorNavigation(targetScrollTop, hash);
      if (queued) {
        maybeAutoDriveQueuedNavigation();
        requestUpdate();
      }
      return queued;
    };

    hero.clearQueuedAnchorNavigation = () => {
      clearQueuedAnchorNavigation();
      return true;
    };

    initFinalTextAnimation();
    renderMetrics(0, 0, 0);
    updateSequenceNavigationState();

    const handleWheelIntent = (event) => {
      noteInputImpulse(event.deltaY || 0, performance.now());
    };

    const handleTouchStartIntent = (event) => {
      if (event.touches.length === 0) {
        return;
      }
      touchIntentY = event.touches[0].clientY;
    };

    const handleTouchMoveIntent = (event) => {
      if (event.touches.length === 0) {
        return;
      }
      const currentY = event.touches[0].clientY;
      if (touchIntentY !== 0) {
        noteInputImpulse(touchIntentY - currentY, performance.now());
      }
      touchIntentY = currentY;
    };

    const handleTouchEndIntent = () => {
      touchIntentY = 0;
    };

    if (secondaryVideo) {
      secondaryVideo.addEventListener('ended', () => {
        orangeVideoCompleted = true;
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      syncLiveViewportHeightVar();
      queueDraw();
      requestUpdate();
    });
    resizeObserver.observe(visual);

    window.addEventListener('wheel', handleWheelIntent, { passive: true });
    window.addEventListener('touchstart', handleTouchStartIntent, { passive: true });
    window.addEventListener('touchmove', handleTouchMoveIntent, { passive: true });
    window.addEventListener('touchend', handleTouchEndIntent, { passive: true });
    window.addEventListener('scroll', () => {
      persistHeroScrollPosition();
      requestUpdate();
    }, { passive: true });
    window.addEventListener('resize', () => {
      syncLiveViewportHeightVar();
      requestUpdate();
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        syncLiveViewportHeightVar();
        requestUpdate();
      }, { passive: true });
      window.visualViewport.addEventListener('scroll', () => {
        syncLiveViewportHeightVar();
        requestUpdate();
      }, { passive: true });
    }

    const bootstrapHeroAfterRestore = () => {
      const plainReload = isPlainReload();
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      const releaseBoundaryY = getReleaseBoundaryY();
      const alreadyEscapedHero = currentScrollY >= releaseBoundaryY;

      if (plainReload) {
        debugLog('bootstrapHeroAfterRestore plain reload; clearing saved hero scroll', {
          scrollY: currentScrollY,
          releaseBoundaryY,
          alreadyEscapedHero,
        });
        sessionStorage.removeItem(HERO_SCROLL_POSITION_KEY);

        // Only force-complete when the restored position is genuinely past
        // the release boundary. Reload scroll restoration (scroll-restoration.js)
        // can land the user mid-hero, where progress must derive from the
        // live scroll position instead.
        if (alreadyEscapedHero) {
          hero.dataset.sequenceComplete = '1';
          hero.dataset.sequenceActive = '0';
          hero.dataset.sequenceLock = '0';
          progress = 1;
          hero.dataset.progress = '1.000';
          hero.style.setProperty('--hero-progress', '1.000');
          loadMaskPath();
          return;
        }

        syncLiveViewportHeightVar();
        loadMaskPath();
        requestUpdate();
        queueDraw();
        return;
      }

      if (window.location.hash) {
        const hasHashAnchor = window.location.hash && window.location.hash !== '#hero';
        if (hasHashAnchor && alreadyEscapedHero) {
          debugLog('bootstrapHeroAfterRestore hash after hero escape; marking hero complete', {
            hash: window.location.hash,
            scrollY: currentScrollY,
            releaseBoundaryY,
          });
          hero.dataset.sequenceComplete = '1';
          hero.dataset.sequenceActive = '0';
          hero.dataset.sequenceLock = '0';
          progress = 1;
          hero.dataset.progress = '1.000';
          hero.style.setProperty('--hero-progress', '1.000');
          sessionStorage.removeItem(HERO_SCROLL_POSITION_KEY);
          return;
        }

        debugLog('bootstrapHeroAfterRestore hash present; skipping hero restore', {
          hash: window.location.hash,
          scrollY: currentScrollY,
          releaseBoundaryY,
          alreadyEscapedHero,
        });
        sessionStorage.removeItem(HERO_SCROLL_POSITION_KEY);
        return;
      }

      restoreHeroScrollPosition();
      syncLiveViewportHeightVar();
      loadMaskPath();
      requestUpdate();
      queueDraw();
    };

    const bootstrapHero = () => {
      window.requestAnimationFrame(() => {
        bootstrapHeroAfterRestore();
      });
    };

    const navEntry = (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function')
      ? performance.getEntriesByType('navigation')[0]
      : null;
    const shouldDelay = Boolean(navEntry && navEntry.type === 'reload') || Boolean(window.location.hash);

    if (shouldDelay) {
      debugLog('initializeAfterPageRestore delaying hero bootstrap', {
        navType: navEntry ? navEntry.type : null,
        hash: window.location.hash,
      });
      window.addEventListener('pageshow', bootstrapHero, { once: true });
      window.requestAnimationFrame(() => {
        if (document.visibilityState === 'visible') {
          bootstrapHero();
        }
      });
      return;
    }

    bootstrapHero();
  };

  initializeHeroSequence();
}
