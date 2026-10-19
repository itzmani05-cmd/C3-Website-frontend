// Clicking a button often swaps the content around it (a new page of results, a list that reloads, a section that
// collapses). When the page gets shorter, the browser clamps the scroll position and the view jumps to the top. This keeps
// the control you clicked where it was on screen, so the page stays put. Add `data-no-anchor` to an area where a click is
// meant to move the view (e.g. the exam, where "Next" should show the next question from its start).

const SETTLE_DELAYS_MS = [0, 60, 150, 300, 500, 800];
const USER_INPUT_EVENTS = ['wheel', 'touchmove', 'keydown'] as const;

/** Scrollable ancestors of `el`, nearest first, ending with the window. */
function scrollers(el: HTMLElement): (HTMLElement | Window)[] {
  const found: (HTMLElement | Window)[] = [];
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) found.push(node);
  }
  found.push(window);
  return found;
}

export function installScrollAnchor(): () => void {
  let stop: (() => void) | null = null;

  const onClick = (event: MouseEvent) => {
    const target = (event.target as Element | null)?.closest<HTMLElement>('button, a[href], [role="button"], summary');
    if (!target || target.closest('[data-no-anchor]')) return;

    stop?.();
    const top = target.getBoundingClientRect().top;

    const apply = () => {
      if (!target.isConnected) return;
      for (const scroller of scrollers(target)) {
        const delta = target.getBoundingClientRect().top - top;
        if (Math.abs(delta) < 1) return;
        if (scroller instanceof Window) window.scrollBy(0, delta);
        else scroller.scrollTop += delta;
      }
    };

    const timers = SETTLE_DELAYS_MS.map((ms) => window.setTimeout(apply, ms));
    const frame = requestAnimationFrame(apply);
    // Once the person scrolls themselves, stop adjusting.
    const cancel = () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      USER_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, cancel));
      if (stop === cancel) stop = null;
    };
    USER_INPUT_EVENTS.forEach((name) => window.addEventListener(name, cancel, { passive: true }));
    stop = cancel;
    timers.push(window.setTimeout(cancel, SETTLE_DELAYS_MS[SETTLE_DELAYS_MS.length - 1] + 50));
  };

  document.addEventListener('click', onClick, true);
  return () => {
    document.removeEventListener('click', onClick, true);
    stop?.();
  };
}
