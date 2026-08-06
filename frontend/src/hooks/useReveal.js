/**
 * useReveal — Scroll-triggered animation hook using IntersectionObserver.
 * Attaches a `data-revealed` attribute once the element enters the viewport.
 * CSS classes control the actual animation (see ueeshop.css .reveal-* rules).
 */
import { useEffect, useRef } from 'react';

/**
 * @param {object} [opts]
 * @param {number} [opts.threshold=0.12]
 * @param {string} [opts.rootMargin='0px 0px -40px 0px']
 * @param {boolean} [opts.once=true]  — animate only the first time
 */
export function useReveal(opts = {}) {
  const ref = useRef(null);
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px', once = true } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute('data-revealed', 'true');
          if (once) observer.disconnect();
        } else if (!once) {
          el.removeAttribute('data-revealed');
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}

/**
 * Attach reveal to multiple children of a container.
 * Each direct child gets a staggered delay.
 * @param {object} [opts]
 * @param {number} [opts.stagger=80] — ms between each child
 */
export function useRevealChildren(opts = {}) {
  const ref = useRef(null);
  const { threshold = 0.08, rootMargin = '0px 0px -30px 0px', stagger = 80, once = true } = opts;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const children = Array.from(container.children);
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * stagger}ms`;
      child.classList.add('reveal-child');
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach((child) => child.setAttribute('data-revealed', 'true'));
          if (once) observer.disconnect();
        } else if (!once) {
          children.forEach((child) => child.removeAttribute('data-revealed'));
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [threshold, rootMargin, stagger, once]);

  return ref;
}
