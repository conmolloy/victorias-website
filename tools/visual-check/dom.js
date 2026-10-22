// usage: node dom.js <baseUrlA> <baseUrlB>
// Parses each page's HTML the way the browser does (DOMParser, no scripts
// run) on both sites and compares the resulting element trees: tags,
// attributes and visible text. Ignored: comments, whitespace-only text,
// whitespace amounts inside text, and the ?v= hash on CSS/JS links. Prints
// every difference, so it should print nothing but "identical" lines.
const puppeteer = require("puppeteer-core");

const [a, b] = process.argv.slice(2);
const PAGES = ["index", "gallery", "headshot", "resume", "reviews", "showreel"];

async function tree(page, url) {
  const html = await (await fetch(url)).text();
  return page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const lines = [];
    const walk = (node, depth) => {
      for (const n of node.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n.textContent.replace(/\s+/g, " ").trim();
          if (t) lines.push(`${"  ".repeat(depth)}"${t}"`);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          const attrs = [...n.attributes]
            .map(
              (at) =>
                `${at.name}="${at.value.replace(/\?v=[0-9a-f]+$/, "?v=*")}"`,
            )
            .sort()
            .join(" ");
          lines.push(
            `${"  ".repeat(depth)}<${n.localName}${attrs ? " " + attrs : ""}>`,
          );
          walk(n.localName === "template" ? n.content : n, depth + 1);
        }
      }
    };
    lines.push(
      `doctype=${doc.doctype && doc.doctype.name} mode=${doc.compatMode}`,
    );
    walk(doc.documentElement.parentNode, 0);
    return lines;
  }, html);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  let total = 0;
  for (const name of PAGES) {
    const A = await tree(page, `${a}/${name}.html`);
    const B = await tree(page, `${b}/${name}.html`);
    // line diff (LCS) so each insertion/removal shows once
    const n = A.length,
      m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        L[i][j] =
          A[i] === B[j]
            ? L[i + 1][j + 1] + 1
            : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = [];
    let i = 0,
      j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && A[i] === B[j]) {
        i++;
        j++;
      } else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j]))
        out.push(`  + ${B[j++]}`);
      else out.push(`  - ${A[i++]}`);
    }
    total += out.length;
    console.log(
      `${name}: ${A.length} nodes vs ${B.length}, ${out.length ? out.length + " differing lines" : "identical"}`,
    );
    for (const l of out)
      console.log(l.length > 220 ? l.slice(0, 220) + "…" : l);
  }
  await browser.close();
  process.exitCode = total ? 1 : 0;
})();
