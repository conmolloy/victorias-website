/*
 * Live previews for the editing screen (/admin): while Victoria types, the
 * right-hand pane shows the page as it will look, with the site's own CSS
 * and the same markup and classes as the real pages (src/pages/*.astro and
 * their components). If a page's markup changes, update its preview here.
 *
 * Runs in the browser as it is (no build step): Sveltia CMS provides the
 * global `html` tag (HTM, bound to its React) and `CMS`.
 *   - photos go through getAsset(), so a new upload shows before it's saved
 *   - every field is marked with data-key-path, so clicking it in the
 *     preview jumps to that field in the editor
 *   - notes that are only in the preview have the class "cms-note"
 */
/* global CMS, html, document, window, console */

// The site's stylesheets (absolute, so they load from the site itself).
// The time stamp stops a 30-day cached copy hiding a CSS change.
const stamp = Date.now();
[
  "/assets/css/fonts.css",
  "/assets/bootstrap/css/bootstrap.min.css",
  "/assets/css/font-outfit.css",
  "/assets/css/font-roboto.css",
  "/assets/fonts/font-awesome.min.css",
  "/assets/css/Projects-Clean.css",
].forEach((href) => CMS.registerPreviewStyle(`${href}?preview=${stamp}`));
CMS.registerPreviewStyle(
  `
  /* preview-only notes: never on the real site */
  .cms-note {
    margin: 0.75rem auto;
    padding: 0.4rem 0.75rem;
    max-width: 40rem;
    border: 1px dashed #888;
    border-radius: 4px;
    color: #bbb;
    font: italic 13px/1.4 Roboto, sans-serif;
    text-align: center;
  }
  .light .cms-note, .cms-note.on-light { color: #555; }
  .cms-missing {
    display: flex; align-items: center; justify-content: center;
    min-height: 8rem; border: 1px dashed #888; color: #bbb;
    font: italic 13px Roboto, sans-serif; text-align: center; padding: 1rem;
  }
  /* the real pages leave room for the fixed navbar; the preview has none */
  .header-container { margin-top: 0 !important; }
  .reviews-page { padding-top: 1rem; }
  /* the CV page's own styles (src/pages/resume.astro) */
  #pdf-container { position: relative; background: #000; color: #fff; padding: 20px; }
  #download-link { position: absolute; top: 10%; right: 5%; }
  #pdf-canvas { width: 100%; height: auto; }
`,
  { raw: true },
);

/* ---------- helpers ---------- */

/** the entry's data as a plain object */
const dataOf = (entry) => {
  const data = entry.get("data");
  return (data && data.toJS ? data.toJS() : data) || {};
};

/**
 * Address of a photo/file from the data (new uploads too), once the editor
 * has loaded it; until then none (the preview re-renders when it's ready).
 * With `publicFallback`, a file that's on the site itself (public/, e.g.
 * audio) uses its site address meanwhile.
 */
const src = (getAsset, path, publicFallback = false) => {
  if (!path) return undefined;
  const asset = getAsset(path);
  const url = asset && (asset.url || String(asset));
  if (url && /^(blob:|data:|https?:)/.test(url)) return url;
  if (!publicFallback) return undefined;
  return path.startsWith("/") ? path : `/${path}`;
};

/** split a list into rows of `size` */
const rows = (items = [], size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

/** about text: paragraphs (blank line) of lines (single line break) */
const paragraphs = (text = "") =>
  String(text)
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p) => p.split("\n").map((line) => line.trim()));

const Missing = ({ what }) => html`<div className="cms-missing">${what}</div>`;

/** a gallery photo, as GalleryPhoto.astro */
const Photo = ({ photo = {}, kind, keyPath, getAsset }) =>
  photo.file
    ? html`<img
        className=${[kind, "img-fluid"].filter(Boolean).join(" ")}
        src=${src(getAsset, photo.file)}
        alt=${photo.alt || ""}
        data-key-path=${keyPath}
      />`
    : html`<${Missing} what="(no photo yet)" />`;

/* ---------- home page (src/pages/index.astro + Contact.astro) ---------- */

const HomePreview = ({ entry, getAsset }) => {
  const d = dataOf(entry);
  const photo = d.photo || {};
  const contact = d.contact || {};
  return html`
    <section className="text-center content-section" id="about">
      <h1><b>Victoria Adler</b></h1>
      <h3 className="tagline" data-key-path="tagline">${d.tagline}</h3>
      <p className="cms-note">
        The header video and the reviews (Reviews → “Also show on the home
        page”) appear here on the real page.
      </p>
      <div className="row">
        <div className="col-sm">
          ${
            photo.file
              ? html`<img
                  className="headshot"
                  src=${src(getAsset, photo.file, true)}
                  alt=${photo.alt || ""}
                  data-key-path="photo"
                />`
              : html`<${Missing} what="(no photo yet)" />`
          }
          <br /><br />
        </div>
        <div className="col-sm text-main order-sm-first">
          <p data-key-path="bio">
            <br />
            ${paragraphs(d.bio).map(
              (lines, i) => html`
                ${i > 0 ? html`<br /><br />` : ""}
                ${lines.map(
                  (line, j) => html`${j > 0 ? html`<br />` : ""}${line}`,
                )}
              `,
            )}
          </p>
        </div>
      </div>
    </section>
    <section
      className="text-center content-section contact-me"
      id="contact"
      data-key-path="contact"
    >
      <div className="section">
        <div className="row contact-section">
          <div className="col">
            <br /><br /><br /><br /><br /><br />
            <h2 className="contact-me-text">Contact Me</h2>
            <br />
            <ul className="banner-social-icon">
              <li className="list-inline-item" data-key-path="contact.phone">
                <a
                  href=${`tel:${String(contact.phone || "").replace(/ /g, "")}`}
                >
                  <i className="fa fa-phone fa-2x contact-icon"></i>
                </a>
              </li>
              <li className="list-inline-item" data-key-path="contact.email">
                <a href=${`mailto:${contact.email || ""}`}>
                  <i className="fa fa-envelope fa-2x contact-icon"></i>
                </a>
              </li>
            </ul>
            <p className="cms-note">
              Phone: ${contact.phone} · Email: ${contact.email}
            </p>
            <br /><br /><br /><br /><br /><br />
          </div>
        </div>
      </div>
    </section>
  `;
};

/* ---------- gallery (src/pages/gallery.astro + components/gallery) ---------- */

const videoThumb = (url = "") => {
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  const youtube = url.match(/(?:[?&]v=|youtu\.be\/)([\w-]+)/);
  if (vimeo) return `/assets/img/video-thumbs/vimeo-${vimeo[1]}.webp`;
  if (youtube) return `/assets/img/video-thumbs/youtube-${youtube[1]}.webp`;
  return "";
};

const Video = ({ video = {}, keyPath }) => {
  const thumb = videoThumb(video.url);
  return html`
    <div className="col video-containers" data-key-path=${keyPath}>
      <div className="video-facade">
        ${
          thumb
            ? html`<img
                src=${thumb}
                alt=${video.title || ""}
                onError=${(e) => {
                  e.currentTarget.replaceWith(
                    Object.assign(
                      e.currentTarget.ownerDocument.createElement("div"),
                      {
                        className: "cms-missing",
                        textContent: `“${video.title}” – the preview image is made when the site is built`,
                      },
                    ),
                  );
                }}
              />`
            : html`<${Missing} what="(Vimeo or YouTube address needed)" />`
        }
        <span className="video-facade-play" aria-hidden="true"></span>
      </div>
    </div>
  `;
};

const Audio = ({ clip = {}, keyPath, getAsset }) => html`
  <div className="col" data-key-path=${keyPath}>
    <audio controls>
      ${(clip.files || []).map(
        (file) =>
          html`<source
            key=${file}
            src=${src(getAsset, file, true)}
            type=${String(file).endsWith(".ogg") ? "audio/ogg" : "audio/mpeg"}
          />`,
      )}
    </audio>
    <p className="description">${clip.title}</p>
  </div>
`;

const SectionTitle = ({ id, children }) => html`
  <div className="row header-new">
    <div className="intro">
      <h1 id=${id} className="text-center">${children}</h1>
    </div>
  </div>
`;

const GalleryPreview = ({ entry, getAsset }) => {
  const d = dataOf(entry);
  const productions = d.productions || [];
  const miscRows = rows(d.misc, 3);
  return html`
    <div className="header-container">
      <section>
        <section className="projects-clean dark">
          <div className="container">
            <div className="col">
              <h2 id="acting" className="text-center">Acting</h2>
            </div>
            <div className="container">
              <div className="container">
                ${productions.map(
                  (p, i) => html`
                    <div key=${i} data-key-path=${`productions.${i}`}>
                      <div className="row projects">
                        ${(p.photos || []).map(
                          (photo, j) => html`
                            <div className="col" key=${j}>
                              <${Photo}
                                photo=${photo}
                                getAsset=${getAsset}
                                keyPath=${`productions.${i}.photos.${j}`}
                              />
                            </div>
                          `,
                        )}
                      </div>
                      <div className="row production">
                        <div className="col">
                          <h3
                            className="text-center name"
                            data-key-path=${`productions.${i}.title`}
                          >
                            <strong>${p.title}</strong>
                          </h3>
                          <h6
                            className="text-center name"
                            data-key-path=${`productions.${i}.company`}
                          >
                            <strong>${p.company}</strong>
                          </h6>
                          <p
                            className="descriptiontwo"
                            data-key-path=${`productions.${i}.role`}
                          >
                            ${p.role}
                          </p>
                          ${
                            p.photos_by
                              ? html`<p
                                  className="descriptiontwo"
                                  data-key-path=${`productions.${i}.photos_by`}
                                >
                                  Photos by ${p.photos_by}
                                </p>`
                              : ""
                          }
                        </div>
                      </div>
                      ${i < productions.length - 1 ? html`<hr />` : ""}
                    </div>
                  `,
                )}
                <${SectionTitle} id="acting-misc">MISC<//>
                ${miscRows.map(
                  (row, r) => html`
                    <div
                      key=${r}
                      className=${r === miscRows.length - 1 ? "row projects" : "row"}
                    >
                      ${row.map(
                        (photo, j) => html`
                          <div className="col" key=${j}>
                            <${Photo}
                              photo=${photo}
                              kind="dance"
                              getAsset=${getAsset}
                              keyPath=${`misc.${r * 3 + j}`}
                            />
                          </div>
                        `,
                      )}
                    </div>
                  `,
                )}
              </div>
              <div className="container">
                <${SectionTitle} id="Dance-section">Dance<//>
                ${rows(d.dance, 3).map(
                  (row, r) => html`
                    <div className="row" key=${r}>
                      ${row.map(
                        (photo, j) => html`
                          <div className="col" key=${j}>
                            <${Photo}
                              photo=${photo}
                              kind="dance"
                              getAsset=${getAsset}
                              keyPath=${`dance.${r * 3 + j}`}
                            />
                          </div>
                        `,
                      )}
                    </div>
                  `,
                )}
              </div>
              <br />
              <div className="container">
                <div className="row intro">
                  <h1 id="audio-section" className="text-center">Audio</h1>
                </div>
                ${rows(d.voice_reels, 2).map(
                  (row, r) => html`
                    <div className="row" key=${r}>
                      ${row.map(
                        (clip, j) =>
                          html`<${Audio}
                            key=${j}
                            clip=${clip}
                            getAsset=${getAsset}
                            keyPath=${`voice_reels.${r * 2 + j}`}
                          />`,
                      )}
                    </div>
                  `,
                )}
              </div>
              <div className="container">
                <${SectionTitle} id="singing-section">Singing<//>
                ${rows(d.songs, 2).map(
                  (row, r) => html`
                    <div className="row" key=${r}>
                      ${row.map(
                        (clip, j) =>
                          html`<${Audio}
                            key=${j}
                            clip=${clip}
                            getAsset=${getAsset}
                            keyPath=${`songs.${r * 2 + j}`}
                          />`,
                      )}
                    </div>
                  `,
                )}
                <${SectionTitle} id="video-section">Video<//>
                ${(d.video_rows || []).map(
                  (row, r) => html`
                    <div className="row" key=${r}>
                      ${(row.videos || []).map(
                        (video, j) =>
                          html`<${Video}
                            key=${j}
                            video=${video}
                            keyPath=${`video_rows.${r}.videos.${j}`}
                          />`,
                      )}
                    </div>
                  `,
                )}
              </div>
              <div className="container">
                <div className="row intro">
                  <div className="col">
                    <h1 id="certificate-section" className="text-center">
                      Certificates
                    </h1>
                  </div>
                </div>
                <div className="row">
                  ${(d.certificates || []).map(
                    (column, c) => html`
                      <div className="col" key=${c}>
                        ${(column.photos || []).map(
                          (photo, j) =>
                            html`<${Photo}
                              key=${j}
                              photo=${photo}
                              kind="certificate"
                              getAsset=${getAsset}
                              keyPath=${`certificates.${c}.photos.${j}`}
                            />`,
                        )}
                      </div>
                    `,
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  `;
};

/* ---------- headshots (src/pages/headshot.astro + components/headshots) ---------- */

const HeadshotsPreview = ({ entry, getAsset }) => {
  const shoots = dataOf(entry).shoots || [];
  return html`
    <div className="header-container">
      <section className="projects-clean light">
        <div className="container">
          <div className="row header-new"><div className="intro"></div></div>
        </div>
      </section>
    </div>
    ${shoots.map((shoot, i) => {
      const columns = shoot.columns === 2 ? 2 : 3;
      const stack = shoot.stack || 1;
      const columnClass =
        columns === 3
          ? "col-lg-4 col-md-12 mb-4 mb-lg-0"
          : "col-lg-6 col-md-12 mb-lg-0";
      // photos fill columns of `stack`, columns fill rows
      const photos = (shoot.photos || []).map((photo, n) => ({ photo, n }));
      const shootRows = rows(rows(photos, stack), columns);
      const last = i === shoots.length - 1;
      return html`
        <div key=${i} data-key-path=${`shoots.${i}`}>
          <div className="container">
            ${
              i === 0 || String(shoot.year) !== String(shoots[i - 1].year)
                ? html`<h1
                    className="text-center"
                    data-key-path=${`shoots.${i}.year`}
                  >
                    ${shoot.year}
                  </h1>`
                : ""
            }
            ${shootRows.map(
              (row, r) => html`
                <div className="row" key=${r}>
                  ${row.map(
                    (column, c) => html`
                      <div className=${columnClass} key=${c}>
                        ${column.map(({ photo, n }) =>
                          photo && photo.file
                            ? html`<img
                                key=${n}
                                className="w-100 rounded mb-4 headshot-photo"
                                src=${src(getAsset, photo.file)}
                                alt=${photo.alt || ""}
                                data-key-path=${`shoots.${i}.photos.${n}`}
                              />`
                            : html`<${Missing}
                                key=${n}
                                what="(no photo yet)"
                              />`,
                        )}
                      </div>
                    `,
                  )}
                </div>
              `,
            )}
          </div>
          <div className="container text-center">
            ${last ? "" : html`<br />`}
            <h6 data-key-path=${`shoots.${i}.photographer`}>
              Photography by ${shoot.photographer}
            </h6>
            ${last ? "" : html`<br /><br />`}
          </div>
        </div>
      `;
    })}
  `;
};

/* ---------- reviews (src/pages/reviews.astro + ReviewCard.astro) ---------- */

/** the quote's paragraphs as HTML (they may contain <b>), with blank lines */
const quoteHtml = (quote = [], blankLines) => {
  const [before, after] = blankLines || [0, 0];
  return quote.map(
    (p, i) =>
      (i === 0 ? "<br>".repeat(before || 0) : "") +
      p +
      (i === quote.length - 1 ? "<br>".repeat(after || 0) : ""),
  );
};

const ReviewCard = ({ review, keyPath, thick }) => html`
  <figure
    className=${thick ? "review-card thick" : "review-card"}
    data-key-path=${keyPath}
  >
    <blockquote className="blockquote" data-key-path=${`${keyPath}.quote`}>
      ${quoteHtml(review.quote, review.blank_lines).map(
        (p, i) => html`<p key=${i} dangerouslySetInnerHTML=${{ __html: p }} />`,
      )}
    </blockquote>
    ${
      review.publication
        ? html`<figcaption className="blockquote-footer mb-0 fst-italic">
            ${" "}${[review.by, review.publication, review.date]
              .filter(Boolean)
              .join(", ")}
          </figcaption>`
        : ""
    }
    ${
      review.link
        ? html`<a href=${review.link} className="btn btn-review spaced">
            Read Review
          </a>`
        : ""
    }
  </figure>
`;

const ReviewsPreview = ({ entry }) => {
  const d = dataOf(entry);
  const press = d.press || [];
  // the first review has a row to itself, then two per row
  const pressRows = press.length
    ? [
        [{ review: press[0], i: 0 }],
        ...rows(
          press.slice(1).map((review, n) => ({ review, i: n + 1 })),
          2,
        ),
      ]
    : [];
  const coaching = d.coaching || [];
  const half = Math.ceil(coaching.length / 2);
  return html`
    <div className="reviews-page">
      <section className="text-center content-section">
        <h1 className="reviews-title"><b>Reviews</b></h1>
        ${pressRows.map(
          (row, r) => html`
            <div className="row" key=${r}>
              ${row.map(
                ({ review, i }) => html`
                  <div className="col-md review-col" key=${i}>
                    ${
                      review.home
                        ? html`<p className="cms-note">
                            Also on the home page
                          </p>`
                        : ""
                    }
                    <${ReviewCard}
                      review=${review}
                      keyPath=${`press.${i}`}
                      thick
                    />
                  </div>
                `,
              )}
            </div>
          `,
        )}
        <div className="row">
          <div className="col-sm">
            <h3 data-key-path="coaching_heading">${d.coaching_heading}</h3>
          </div>
        </div>
        <div className="row">
          ${[coaching.slice(0, half), coaching.slice(half)].map(
            (column, c) => html`
              <div className="col-md" key=${c}>
                ${column.map(
                  (quote, j) =>
                    html`<${ReviewCard}
                      key=${j}
                      review=${{ quote: [quote] }}
                      keyPath=${`coaching.${c === 0 ? j : half + j}`}
                    />`,
                )}
              </div>
            `,
          )}
        </div>
      </section>
    </div>
  `;
};

/* ---------- CV page (src/pages/resume.astro) ---------- */

// PDF.js, the same version and viewer as the real page, loaded on first use
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/";
let pdfjs;
const loadPdfjs = () =>
  (pdfjs ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PDFJS}pdf.min.js`;
    script.onload = () => {
      const lib = window["pdfjs-dist/build/pdf"];
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = reject;
    document.head.append(script);
  }));

/** draw the PDF's first page on the canvas, as the real page does */
const drawPdf = (canvas, url) => {
  if (!canvas || canvas.dataset.url === url) return;
  canvas.dataset.url = url;
  loadPdfjs()
    // the CV's fonts go into the preview pane's document (an iframe), where
    // the canvas is – not the editor's
    .then(
      (lib) =>
        lib.getDocument({ url, ownerDocument: canvas.ownerDocument }).promise,
    )
    .then((pdf) => pdf.getPage(1))
    .then((page) => {
      if (canvas.dataset.url !== url) return; // a newer file was chosen
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      return page.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;
    })
    .catch((error) => console.warn("CV preview:", error));
};

const CvPreview = ({ entry, getAsset }) => {
  const d = dataOf(entry);
  // a new upload has a blob: address until it's saved; a CV already on the
  // site is shown from there
  const pdf = src(getAsset, d.file, true);
  const file = d.file ? String(d.file) : "";
  const name = file.startsWith("blob:") ? "" : file.split("/").pop();
  return html`
    <div className="header-container">
      <section className="projects-clean dark">
        <div className="container" id="pdf-container">
          <p className="cms-note" data-key-path="file">
            ${
              !file
                ? "No CV chosen yet"
                : name
                  ? `File: ${name}`
                  : "New CV (not saved yet)"
            }${d.updated ? ` · last updated ${d.updated}` : ""}
          </p>
          ${
            pdf
              ? html`
                  <a
                    id="download-link"
                    className="btn btn-dark"
                    href=${pdf}
                    download=${name}
                    data-key-path="file"
                  >
                    Download CV (PDF)
                  </a>
                  <canvas
                    id="pdf-canvas"
                    ref=${(canvas) => drawPdf(canvas, pdf)}
                    data-key-path="file"
                  ></canvas>
                `
              : html`<${Missing} what="(no CV yet)" />`
          }
        </div>
      </section>
    </div>
  `;
};

/* names are the files' `name` in config.yml */
CMS.registerPreviewTemplate("home", HomePreview);
CMS.registerPreviewTemplate("gallery", GalleryPreview);
CMS.registerPreviewTemplate("headshots", HeadshotsPreview);
CMS.registerPreviewTemplate("reviews", ReviewsPreview);
CMS.registerPreviewTemplate("cv", CvPreview);
