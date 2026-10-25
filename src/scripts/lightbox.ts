/**
 * The photo viewer in components/Lightbox.astro (see there for what it
 * does). Runs on the gallery and headshots pages only.
 */

const OPEN_MS = 350;
const NAV_MS = 250;
const EASE_OUT = "cubic-bezier(0.2, 0, 0, 1)";
/** a swipe: at least this far sideways, and more sideways than up/down */
const SWIPE_PX = 50;

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const ms = (duration: number) => (reducedMotion.matches ? 0 : duration);

export function initLightbox(): void {
  const dialog = document.querySelector<HTMLDialogElement>("dialog.lightbox");
  if (!dialog) return;
  const figure = dialog.querySelector<HTMLElement>(".lightbox-figure")!;
  const image = dialog.querySelector<HTMLImageElement>(".lightbox-img")!;
  const caption = dialog.querySelector<HTMLElement>(".lightbox-caption")!;
  const title = dialog.querySelector<HTMLElement>(".lightbox-title")!;
  const alt = dialog.querySelector<HTMLElement>(".lightbox-alt")!;
  const count = dialog.querySelector<HTMLElement>(".lightbox-count")!;
  const buttons = [...dialog.querySelectorAll<HTMLElement>(".lightbox-btn")];
  const [closeButton, prevButton, nextButton] = buttons as [
    HTMLElement,
    HTMLElement,
    HTMLElement,
  ];

  let links: HTMLAnchorElement[] = [];
  let index = 0;
  let closing = false;

  const thumbOf = (link: HTMLAnchorElement) => link.querySelector("img")!;

  /** fit the photo in the space left by the caption, keeping its shape */
  function fit() {
    const thumb = thumbOf(links[index]!);
    const ratio = thumb.width / thumb.height;
    const style = getComputedStyle(figure);
    const gap = parseFloat(style.rowGap) || 0;
    const width =
      figure.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const height =
      figure.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) -
      caption.offsetHeight -
      gap;
    const w = Math.min(width, height * ratio);
    image.style.width = `${Math.round(w)}px`;
    image.style.height = `${Math.round(w / ratio)}px`;
  }

  /** show photo number `i`: thumbnail first, then the full-size file */
  function show(i: number) {
    index = (i + links.length) % links.length;
    const link = links[index]!;
    const thumb = thumbOf(link);
    title.textContent = link.dataset.caption ?? "";
    title.hidden = !link.dataset.caption;
    alt.textContent = thumb.alt;
    image.alt = thumb.alt;
    count.textContent =
      links.length > 1 ? `${index + 1} / ${links.length}` : "";
    prevButton.hidden = nextButton.hidden = links.length < 2;
    image.src = thumb.currentSrc || link.href;
    fit();
    if (image.src !== link.href) {
      const full = new Image();
      full.src = link.href;
      full
        .decode()
        .then(() => {
          if (links[index] === link) image.src = link.href;
        })
        .catch(() => {}); // keep the thumbnail
    }
  }

  /** transform that puts the lightbox photo exactly over `rect` */
  function over(rect: DOMRect) {
    const to = image.getBoundingClientRect();
    return `translate(${rect.left - to.left}px, ${rect.top - to.top}px) scale(${rect.width / to.width}, ${rect.height / to.height})`;
  }

  const visible = (rect: DOMRect) =>
    rect.bottom > 0 && rect.top < innerHeight && rect.width > 0;

  function fade(direction: "in" | "out", duration: number) {
    const opacity = direction === "in" ? [0, 1] : [1, 0];
    const options = { duration, easing: "ease-out", fill: "forwards" } as const;
    return [
      dialog!.animate({ opacity }, { ...options, pseudoElement: "::backdrop" }),
      ...[caption, ...buttons].map((el) => el.animate({ opacity }, options)),
    ];
  }

  /** the photo grows out of / shrinks into its thumbnail as one element
   * (a view transition), where the browser can; otherwise the animation below */
  const canMorph = () =>
    "startViewTransition" in document && !reducedMotion.matches;
  const MORPH = "lightbox-photo";
  /** run a morph; meanwhile the navbar fades with the page (html.lightbox-morph) */
  function morph(update: () => void, done: () => void) {
    const root = document.documentElement;
    root.classList.add("lightbox-morph");
    const transition = document.startViewTransition(update);
    transition.finished.finally(() => {
      root.classList.remove("lightbox-morph");
      done();
    });
  }

  /** a link on the page for `link`: itself, or its card's cover if hidden */
  const onPage = (link: HTMLAnchorElement) =>
    link.hidden ? (links.find((l) => !l.hidden) ?? link) : link;

  function openDialog(link: HTMLAnchorElement) {
    // the page keeps its width when its scrollbar is hidden
    document.documentElement.style.setProperty(
      "--scrollbar-width",
      `${innerWidth - document.documentElement.clientWidth}px`,
    );
    document.documentElement.classList.add("lightbox-open");
    dialog!.showModal();
    show(links.indexOf(link));
    closeButton.focus();
  }

  function open(link: HTMLAnchorElement) {
    // the photos browsed together: the card's (data-group), or else every
    // photo on the page that isn't in a card
    const group = link.dataset.group;
    links = [
      ...document.querySelectorAll<HTMLAnchorElement>("a.lightbox-link"),
    ].filter((l) => l.dataset.group === group);
    closing = false;

    const thumb = thumbOf(link);
    if (canMorph() && visible(thumb.getBoundingClientRect())) {
      thumb.style.viewTransitionName = MORPH;
      morph(
        () => {
          thumb.style.viewTransitionName = "";
          openDialog(link);
          image.style.viewTransitionName = MORPH;
        },
        () => (image.style.viewTransitionName = ""),
      );
      return;
    }
    openDialog(link);
    const from = thumb.getBoundingClientRect();
    const duration = ms(OPEN_MS);
    if (visible(from))
      image.animate([{ transform: over(from) }, { transform: "none" }], {
        duration,
        easing: EASE_OUT,
      });
    fade("in", duration);
  }

  /** shrink back into the thumbnail, then close */
  function close() {
    if (closing || !dialog!.open) return;
    closing = true;
    const thumb = thumbOf(onPage(links[index]!));
    // browsed to another photo: bring it into view behind the lightbox first
    if (!visible(thumb.getBoundingClientRect())) {
      thumb.closest(".reveal")?.classList.add("revealed");
      thumb.scrollIntoView({ block: "center", behavior: "instant" });
    }
    const to = thumb.getBoundingClientRect();
    if (canMorph() && visible(to)) {
      image.style.viewTransitionName = MORPH;
      morph(
        () => {
          image.style.viewTransitionName = "";
          dialog!.close();
          thumb.style.viewTransitionName = MORPH;
        },
        () => (thumb.style.viewTransitionName = ""),
      );
      return;
    }
    const duration = ms(OPEN_MS);
    const animations = fade("out", duration);
    animations.push(
      visible(to)
        ? image.animate([{ transform: "none" }, { transform: over(to) }], {
            duration,
            easing: EASE_OUT,
            fill: "forwards",
          })
        : image.animate({ opacity: [1, 0] }, { duration, fill: "forwards" }),
    );
    Promise.all(animations.map((a) => a.finished))
      .catch(() => {})
      .then(() => dialog!.close());
  }

  /** previous (-1) / next (+1) photo, sliding in from that side */
  function step(by: -1 | 1) {
    if (links.length < 2 || closing) return;
    show(index + by);
    image.animate(
      [{ opacity: 0, transform: `translateX(${by * 40}px)` }, { opacity: 1 }],
      { duration: ms(NAV_MS), easing: EASE_OUT },
    );
  }

  // open: a click (or Enter) on a photo; Ctrl/⌘/middle-click still opens
  // the file in a new tab
  document.addEventListener("click", (event) => {
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a.lightbox-link")
        : null;
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    open(link);
  });

  closeButton.addEventListener("click", close);
  prevButton.addEventListener("click", () => step(-1));
  nextButton.addEventListener("click", () => step(1));
  // a click beside the photo (on the dark background) closes
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target === figure) close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
    else if (event.key === "Tab") {
      // Tab goes round the buttons (the browser would move on to its own
      // address bar after the last one)
      const shown = buttons.filter((b) => !b.hidden);
      const first = shown[0]!;
      const last = shown.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  // Esc: close with the animation (the browser may also close it at once)
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("lightbox-open");
    // (also the backdrop's)
    for (const a of dialog.getAnimations({ subtree: true })) a.cancel();
    image.removeAttribute("src");
    // back to the photo that was showing (also for keyboard/screen readers;
    // a card's hidden photo: its cover)
    if (links[index]) onPage(links[index]).focus({ preventScroll: true });
  });

  // swipe left/right for next/previous
  let start: { x: number; y: number } | null = null;
  dialog.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0]!;
      start =
        event.touches.length === 1
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    },
    { passive: true },
  );
  dialog.addEventListener("touchend", (event) => {
    if (!start) return;
    const touch = event.changedTouches[0]!;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    start = null;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5)
      step(dx < 0 ? 1 : -1);
  });

  addEventListener("resize", () => {
    if (dialog.open) fit();
  });
}
