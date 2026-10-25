/**
 * Feedback mode: Victoria points at anything on the live site and asks for a
 * change, which becomes a GitHub issue (labelled "site-feedback").
 *   - turned on by opening any page with ?feedback (the editing screen links
 *     to it); stays on from page to page (sessionStorage) until Exit
 *   - loaded only then: BaseLayout imports this file on demand, so ordinary
 *     visitors never download it
 *   - hover (or a first tap on a phone) outlines the thing under the pointer;
 *     a click (second tap, or Enter on something focused) picks it and opens
 *     a small form; links, the lightbox and videos don't react meanwhile –
 *     except the navbar, which keeps working to move between pages ("Comment
 *     on the menu" on the bar picks the navbar itself)
 *   - the issue is created with the GitHub sign-in the editing screen keeps
 *     in this browser (Sveltia CMS's "sveltia-cms.user" in localStorage) –
 *     the token is only read here, never shown or logged
 * README "Leaving feedback" explains it for Victoria.
 */
import {
  buildIssue,
  LABEL,
  shorten,
  type PickedElement,
} from "../lib/feedback-issue";

export const FLAG = "site-feedback-mode";
const REPO = "conmolloy/victorias-website";
const API = `https://api.github.com/repos/${REPO}`;
const UI = "data-feedback-ui";

/** the editing screen's GitHub token in this browser, if signed in */
function token(): string | undefined {
  try {
    const user = JSON.parse(localStorage.getItem("sveltia-cms.user") ?? "{}");
    return user?.backendName === "github" && typeof user.token === "string"
      ? user.token
      : undefined;
  } catch {
    return undefined;
  }
}

const CSS = `
[${UI}] { all: initial; box-sizing: border-box; font: 15px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #161616; }
[${UI}] * { box-sizing: border-box; font: inherit; color: inherit; }
[${UI}][hidden], [${UI}] [hidden] { display: none !important; }
.fb-bar { position: fixed; z-index: 2147483000; left: 0; right: 0; bottom: 0; display: flex; flex-wrap: wrap; gap: .5rem 1rem; align-items: center; justify-content: center; padding: .6rem 1rem; background: #161616; color: #fff; box-shadow: 0 -2px 12px rgb(0 0 0 / 30%); }
.fb-bar strong { font-weight: 700; color: #fff; }
.fb-bar span { color: #fff; }
.fb-outline { position: absolute; z-index: 2147482999; pointer-events: none; border: 3px solid #e8590c; border-radius: 3px; background: rgb(232 89 12 / 10%); box-shadow: 0 0 0 2px #fff; }
.fb-panel { position: absolute; z-index: 2147483001; width: min(22rem, calc(100vw - 1rem)); padding: 1rem; background: #fff; border: 2px solid #161616; border-radius: 6px; box-shadow: 0 10px 30px rgb(0 0 0 / 30%); }
.fb-panel label { display: block; font-weight: 700; margin-bottom: .4rem; }
.fb-panel textarea { display: block; width: 100%; min-height: 6rem; padding: .5rem; border: 2px solid #8a857d; border-radius: 4px; background: #fff; resize: vertical; }
.fb-panel textarea:focus { outline: 3px solid #e8590c; outline-offset: 1px; }
.fb-panel p { margin: .5rem 0 0; font-size: 13px; color: #555; }
.fb-panel p.fb-error { color: #b42318; font-size: 14px; }
.fb-panel ol { margin: .4rem 0 0 1.2rem; padding: 0; font-size: 13px; }
.fb-panel a { color: #0b57d0; text-decoration: underline; }
.fb-actions { display: flex; gap: .5rem; justify-content: flex-end; margin-top: .75rem; }
.fb-btn { cursor: pointer; padding: .45rem 1rem; border: 2px solid #161616; border-radius: 4px; background: #fff; color: #161616; }
.fb-btn.fb-primary { background: #161616; color: #fff; }
.fb-bar .fb-btn { border-color: #fff; background: transparent; color: #fff; }
.fb-btn:focus-visible { outline: 3px solid #e8590c; outline-offset: 2px; }
.fb-btn:disabled { opacity: .6; cursor: default; }
`;

/** a short CSS path to `el`, e.g. "div#gallery > div.row > img.dance" */
export function selectorPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body && parts.length < 4) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${part}#${node.id}`);
      break;
    }
    const classes = [...node.classList]
      .filter((c) => !c.startsWith("reveal"))
      .slice(0, 2);
    if (classes.length) part += `.${classes.join(".")}`;
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

/** headings before `el` in the page: section (h1/h2) and show/shoot (h3) */
export function whereOnPage(el: Element): string[] {
  const page = document.title.split(" – ")[0]!.trim();
  const before = (h: Element) =>
    !!(h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) ||
    h.contains(el);
  const headings = [...document.querySelectorAll("h1, h2, h3")].filter(
    (h) => !h.closest(`[${UI}], #mainNav, dialog`),
  );
  const text = (h: Element | undefined) =>
    h ? shorten(h.textContent ?? "", 60) : "";
  const section = headings
    .filter((h) => h.matches("h1, h2") && before(h))
    .pop();
  // gallery: a show's photos come before its title
  const showRow = el.closest(".row.projects");
  const showTitle = showRow?.nextElementSibling?.matches(".production")
    ? showRow.nextElementSibling.querySelector("h3")
    : headings.filter((h) => h.matches("h3") && before(h)).pop();
  const parts = [page, text(section), text(showTitle ?? undefined)];
  return parts.filter((p, i) => p && parts.indexOf(p) === i);
}

function describe(el: Element): PickedElement {
  const img =
    el instanceof HTMLImageElement
      ? el
      : el.querySelector<HTMLImageElement>(":scope > img");
  // as written (not as the CSS capitalises it)
  const text = el.textContent?.trim();
  return {
    tag: el.tagName.toLowerCase(),
    selector: selectorPath(el),
    text: text ? shorten(text, 200) : undefined,
    image: img
      ? {
          file: decodeURIComponent(
            (img.currentSrc || img.src).split("?")[0]!.split("/").pop() ?? "",
          ),
          alt: img.alt,
        }
      : undefined,
  };
}

/** a GitHub API request: GET without `body`, POST with it */
async function github(path: string, auth: string, body?: unknown) {
  return fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${auth}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** the "site-feedback" label, made in its own colour the first time */
async function ensureLabel(auth: string) {
  const found = await github(`/labels/${LABEL}`, auth);
  if (found.status !== 404) return;
  await github("/labels", auth, {
    name: LABEL,
    color: "e8590c",
    description: "Requested from feedback mode on the site",
  });
}

const SIGN_IN_HELP = `
  <p class="fb-error">Sign in to the editing screen first, in this browser.</p>
  <ol>
    <li>Open <a href="/admin/" target="_blank" rel="noopener">the editing screen</a> and sign in.</li>
    <li>Come back to this tab and press Send again.</li>
  </ol>`;
const PERMISSION_HELP = `
  <p class="fb-error">GitHub said no: the sign-in token can't create issues yet.</p>
  <ol>
    <li>On GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens → your token for this site → Edit.</li>
    <li>Repository permissions → <b>Issues: Read and write</b> (keep Contents: Read and write). Save.</li>
    <li>Press Send again. (A new token? Sign in again at <a href="/admin/" target="_blank" rel="noopener">the editing screen</a>.)</li>
  </ol>`;

export function initFeedback(): void {
  if (document.querySelector(`[${UI}].fb-bar`)) return;
  const style = document.createElement("style");
  style.textContent = CSS;
  style.setAttribute(UI, "");
  document.head.append(style);

  const bar = document.createElement("div");
  bar.className = "fb-bar";
  bar.setAttribute(UI, "");
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Feedback mode");
  bar.innerHTML = `<strong>Feedback mode</strong><span>Click or tap anything you'd like changed – the menu still works, to move between pages.</span><button type="button" class="fb-btn fb-menu">Comment on the menu</button><button type="button" class="fb-btn fb-exit">Exit</button>`;
  const outline = document.createElement("div");
  outline.className = "fb-outline";
  outline.setAttribute(UI, "");
  outline.hidden = true;
  document.body.append(bar, outline);
  // room for the bar at the bottom of the page
  const pad = document.body.style.paddingBottom;
  document.body.style.paddingBottom = `${bar.offsetHeight}px`;

  let highlighted: Element | null = null;
  let panel: HTMLElement | null = null;
  let picked: Element | null = null;

  // the navbar keeps working (to move between pages); "Comment on the
  // menu" on the bar picks it instead
  const inMenu = (t: EventTarget | null) =>
    t instanceof Element && !!t.closest("#mainNav");
  const ours = (t: EventTarget | null) =>
    t instanceof Element && !!t.closest(`[${UI}]`);

  function highlight(el: Element | null) {
    highlighted = el;
    if (!el) {
      outline.hidden = true;
      return;
    }
    const r = el.getBoundingClientRect();
    Object.assign(outline.style, {
      left: `${r.left + scrollX - 3}px`,
      top: `${r.top + scrollY - 3}px`,
      width: `${r.width + 6}px`,
      height: `${r.height + 6}px`,
    });
    outline.hidden = false;
  }

  function closePanel() {
    panel?.remove();
    panel = null;
    (picked as HTMLElement | null)?.focus?.({ preventScroll: true });
    picked = null;
    highlight(null);
  }

  function openPanel(el: Element) {
    closePanel();
    picked = el;
    highlight(el);
    panel = document.createElement("form");
    panel.className = "fb-panel";
    panel.setAttribute(UI, "");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Feedback");
    panel.innerHTML = `
      <label for="fb-comment">What would you like changed?</label>
      <textarea id="fb-comment" required></textarea>
      <p>Goes to GitHub as an issue. You can add a screenshot there afterwards.</p>
      <div class="fb-status" aria-live="polite"></div>
      <div class="fb-actions">
        <button type="button" class="fb-btn fb-cancel">Cancel</button>
        <button type="submit" class="fb-btn fb-primary">Send</button>
      </div>`;
    document.body.append(panel);
    // below the element if there's room, otherwise above; inside the screen
    const r = el.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2 - width / 2),
      document.documentElement.clientWidth - width - 8,
    );
    const below = r.bottom + 10 + height < innerHeight - bar.offsetHeight;
    const top = below
      ? r.bottom + 10
      : Math.max(
          8,
          Math.min(
            r.top - height - 10,
            innerHeight - height - bar.offsetHeight - 8,
          ),
        );
    Object.assign(panel.style, {
      left: `${left + scrollX}px`,
      top: `${top + scrollY}px`,
    });
    const textarea = panel.querySelector("textarea")!;
    const status = panel.querySelector<HTMLElement>(".fb-status")!;
    const send = panel.querySelector<HTMLButtonElement>(".fb-primary")!;
    textarea.focus();
    panel.querySelector(".fb-cancel")!.addEventListener("click", closePanel);
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      }
    });
    panel.addEventListener("submit", async (e) => {
      e.preventDefault();
      const comment = textarea.value.trim();
      if (!comment) return textarea.focus();
      const auth = token();
      if (!auth) {
        status.innerHTML = SIGN_IN_HELP;
        return;
      }
      send.disabled = true;
      status.innerHTML = "<p>Sending…</p>";
      const issue = buildIssue({
        comment,
        page: {
          title: document.title,
          url: location.href.replace(/[?&]feedback\b[^&#]*/, ""),
        },
        where: whereOnPage(el),
        element: describe(el),
        screen: {
          width: innerWidth,
          height: innerHeight,
          phone: matchMedia("(pointer: coarse)").matches || innerWidth < 768,
        },
        date: new Date(),
      });
      try {
        await ensureLabel(auth).catch(() => {});
        const res = await github("/issues", auth, issue);
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          status.innerHTML = PERMISSION_HELP;
          send.disabled = false;
          return;
        }
        if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
        const { number, html_url } = (await res.json()) as {
          number: number;
          html_url: string;
        };
        status.innerHTML = `<p><b>Sent – <a href="${html_url}" target="_blank" rel="noopener">#${number}</a></b>. Thank you!</p>`;
        textarea.disabled = true;
        send.hidden = true;
        panel!.querySelector(".fb-cancel")!.textContent = "Close";
      } catch (error) {
        status.innerHTML = `<p class="fb-error">Couldn't send it (${(error as Error).message}). Check the internet connection and try again.</p>`;
        send.disabled = false;
      }
    });
  }

  // pointer: outline on hover; a click picks (on touch: first tap outlines)
  let pointer = "mouse";
  const onDown = (e: PointerEvent) => {
    pointer = e.pointerType;
  };
  const onOver = (e: PointerEvent) => {
    if (panel || e.pointerType === "touch" || ours(e.target)) return;
    if (inMenu(e.target)) return highlight(null);
    if (e.target instanceof Element) highlight(e.target);
  };
  const onClick = (e: MouseEvent) => {
    if (ours(e.target) || inMenu(e.target)) return;
    // nothing on the page reacts (links, lightbox, videos)
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!(e.target instanceof Element)) return;
    if (panel) return closePanel();
    if (pointer === "touch" && highlighted !== e.target)
      return highlight(e.target);
    openPanel(e.target);
  };
  // keyboard: Enter on something focused picks it
  const onKey = (e: KeyboardEvent) => {
    if (ours(e.target) || inMenu(e.target) || panel) return;
    if (
      e.key === "Enter" &&
      e.target instanceof Element &&
      e.target !== document.body
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(e.target);
    }
  };
  const onScroll = () => highlighted && !panel && highlight(highlighted);
  addEventListener("pointerdown", onDown, true);
  addEventListener("pointerover", onOver, true);
  addEventListener("click", onClick, true);
  addEventListener("keydown", onKey, true);
  addEventListener("scroll", onScroll, { passive: true });

  bar.querySelector(".fb-menu")!.addEventListener("click", () => {
    const menu = document.getElementById("mainNav");
    if (menu) openPanel(menu);
  });
  bar.querySelector(".fb-exit")!.addEventListener("click", () => {
    try {
      sessionStorage.removeItem(FLAG);
    } catch {
      // private browsing: nothing stored
    }
    removeEventListener("pointerdown", onDown, true);
    removeEventListener("pointerover", onOver, true);
    removeEventListener("click", onClick, true);
    removeEventListener("keydown", onKey, true);
    removeEventListener("scroll", onScroll);
    panel?.remove();
    for (const el of document.querySelectorAll(`[${UI}]`)) el.remove();
    document.body.style.paddingBottom = pad;
    const url = new URL(location.href);
    url.searchParams.delete("feedback");
    history.replaceState(history.state, "", url);
  });
}
