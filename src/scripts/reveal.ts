/**
 * Reveal on scroll: shows, photo rows, reviews and sections that start below
 * the first screen fade and rise into place as they're scrolled to (the
 * motion is CSS: .reveal / .revealed in Projects-Clean.css).
 *   - nothing on the first screen is touched, so it appears straight away
 *   - without JavaScript, or with "reduce motion" on, nothing is hidden
 *   - only opacity/transform change: the layout never moves
 * It also starts the home page's name/"actor" entrance when they come into
 * view (#about.in-view in Projects-Clean.css).
 */

/** what fades in, on each page (an element inside another one is skipped) */
const TARGETS = [
  // home and reviews: the about text, rows of reviews, contact details
  ".content-section > .row",
  ".contact-section",
  // gallery: each show's photos and caption, photo rows, section headings
  ".projects-clean .container .container > .row",
  // headshots: year headings, photo rows, credits
  "body > .container > h1",
  "body > .container > .row",
  "body > .container.text-center",
].join(", ");

export function initReveal(): void {
  if (
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !("IntersectionObserver" in window)
  )
    return;

  const all = [...document.querySelectorAll<HTMLElement>(TARGETS)];
  const targets = all.filter(
    (el) => !all.some((other) => other !== el && other.contains(el)),
  );

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    },
    // a little before it's fully on screen
    { rootMargin: "0px 0px -8% 0px" },
  );

  // home: the name and "actor" rise in (CSS) once the name is in view
  const about = document.querySelector<HTMLElement>("#about");
  const name = about?.querySelector("h1");
  if (about && name) {
    if (name.getBoundingClientRect().top < innerHeight)
      about.classList.add("in-view");
    else {
      const entrance = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          about.classList.add("in-view");
          entrance.disconnect();
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      entrance.observe(name);
    }
  }

  for (const el of targets) {
    // on (or above) the first screen: leave it as it is
    if (el.getBoundingClientRect().top < innerHeight) continue;
    el.classList.add("reveal");
    observer.observe(el);
  }
}
