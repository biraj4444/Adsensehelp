#!/usr/bin/env python3
"""Static site builder (Python standard library only).

    python dev/build.py                              # build into the project root
    python dev/build.py --site https://example.com   # also writes canonical URLs + sitemap for your domain

Pages live in dev/pages/*.html. Shared header/footer live here, so one edit updates every page.
You do NOT need this to host the site: the generated .html files are plain static files.
"""
import argparse
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "dev", "pages")
VERIFIED = "30 Sep 2026"
SITE_NAME = "AdSense Helper"

PAGES = [  # file, nav label, accent, title, description
    ("index", "Home", "blue", "AdSense Helper: set up Google AdSense step by step",
     "The clearest independent guide to setting up Google AdSense: readiness checks, step-by-step setup, copy-ready code for every framework and a troubleshooting lab."),
    ("learn", "Learn", "green", "Learn AdSense and prepare your website",
     "What AdSense is, what it requires, the policy basics and an interactive readiness checklist before you add any code."),
    ("setup", "Setup", "orange", "AdSense setup guide: account, site connection, code and verification",
     "A numbered walkthrough from creating your AdSense account to verifying your code, publishing ads.txt and going live on free static hosting."),
    ("code", "Code Lab", "purple", "AdSense Code Lab: copy-ready code for HTML, React, Next.js, Flask, Django, PHP and WordPress",
     "Enter your publisher ID once and every AdSense code example updates. Exact file names, placement and verification for 10+ frameworks."),
    ("tools", "Tools", "teal", "AdSense tools: HTML checker, ads.txt builder, robots.txt checker",
     "Free in-browser tools. Paste your HTML, ads.txt or robots.txt and get plain-language results. Nothing leaves your device."),
    ("fix", "Fix it", "red", "AdSense troubleshooting: ads not showing, wrong ID, ads.txt and cache problems",
     "A symptom-based diagnosis wizard and searchable fixes for code, publisher ID, ads.txt, verification, frameworks, deployment, DNS and caching."),
    ("about", "About", "pink", "About AdSense Helper: our aim, what this site is and who builds it",
     "Why AdSense Helper exists, what it is and is not, how it stays trustworthy, and a word from its builder, Kaustav Khanikar."),
    ("contact", "Contact", "indigo", "Contact AdSense Helper: questions, corrections and feedback",
     "Send Kaustav a question, correction or suggestion about AdSense Helper. Write your message here and open it in your own email app."),
]
GUIDE_PAGES = 6  # the first six pages are the learning path; the rest are project pages
CONTACT_EMAIL = "example@gmail.com"  # replace with your real address, then run dev/build.py

CSP = ("default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; "
       "frame-src https://www.youtube-nocookie.com https://player.vimeo.com; script-src 'self'; style-src 'self'; "
       "connect-src 'self'; base-uri 'self'; form-action 'none'; object-src 'none'")

LANG_LABEL = {"html": "HTML", "javascript": "JavaScript", "jsx": "JSX", "python": "Python", "php": "PHP", "bash": "Shell",
              "css": "CSS", "json": "JSON", "env": ".env", "ejs": "EJS", "text": "Text"}


def esc(s):
    return html.escape(s, quote=True)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


# ------------------------------------------------------------------ macros
def render_code(m, counter):
    head, body = m.group(1).strip(), m.group(2)
    parts = head.split()
    lang = parts[0]
    fname = parts[1] if len(parts) > 1 and "=" not in parts[1] else ""
    opts = dict(p.split("=", 1) for p in parts if "=" in p)
    text = body.strip("\n")
    lines = text.count("\n") + 1
    numbers = lines > 1 and opts.get("numbers") != "off"
    gutter = ('<pre class="gutter" aria-hidden="true">%s</pre>' % "\n".join(str(i) for i in range(1, lines + 1))) if numbers else ""
    hl = opts.get("hl", "")
    counter[0] += 1
    box_id = opts.get("id", "")
    return ('<div%s class="codebox%s" data-lang="%s"%s><div class="codebox-head"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>'
            '<span class="codebox-file" title="%s">%s</span><span class="lang-badge lang-%s"><b aria-hidden="true"></b>%s</span>'
            '<button type="button" class="copy-btn" aria-label="Copy code to clipboard"><span class="copy-icon" aria-hidden="true">&#10697;</span>'
            '<span class="copy-label">Copy code</span></button></div><div class="codebody">%s<pre class="codepre" tabindex="0"><code class="language-%s">%s</code></pre></div>'
            '<span class="sr-only copy-status" role="status" aria-live="polite"></span></div>'
            % ((' id="%s"' % esc(box_id)) if box_id else "", "" if numbers else " no-numbers", lang, (' data-hl="%s"' % esc(hl)) if hl else "", esc(fname), esc(fname or LANG_LABEL.get(lang, lang)),
               lang, esc(LANG_LABEL.get(lang, lang)), gutter, lang, esc(text)))


def render_media(m):
    mid = m.group(1).strip()
    title = (m.group(2) or "Example").strip()
    hint = (m.group(3) or "Add a screenshot or video URL").strip()
    return ('<figure class="media-slot" data-media="%s" data-title="%s" data-hint="%s">'
            '<div class="media-frame"><div class="media-empty"><span class="media-icon" aria-hidden="true">&#127916;</span>'
            '<span class="media-empty-title">%s</span><span class="media-empty-hint">%s</span></div></div>'
            '<figcaption>%s</figcaption></figure>' % (esc(mid), esc(title), esc(hint), esc(title), esc(hint), esc(title)))


CALLOUTS = {"official": "Official Google information", "tip": "Our recommendation", "warn": "Watch out", "note": "Note"}


def render_callout(m):
    kind, inner = m.group(1), m.group(2).strip()
    return ('<aside class="callout %s"><p class="callout-label"><span class="callout-dot" aria-hidden="true"></span>%s</p>%s</aside>'
            % (kind, CALLOUTS[kind], inner))


def expand(text, counter):
    text = text.replace("{{EMAIL}}", CONTACT_EMAIL)
    if "[[codelab]]" in text:
        text = text.replace("[[codelab]]", render_codelab(counter))
    text = re.sub(r"\[\[code ([^\]]+)\]\]\n(.*?)\n?\[\[/code\]\]", lambda m: render_code(m, counter), text, flags=re.S)
    text = re.sub(r"\[\[media ([\w-]+)(?: \| ([^|\]]*))?(?: \| ([^\]]*))?\]\]", render_media, text)
    text = re.sub(r"\[\[(official|tip|warn|note)\]\](.*?)\[\[/\1\]\]", render_callout, text, flags=re.S)
    return text


# ------------------------------------------------------------------ code lab
GUIDE_LINKS = {"adsense-code-placement": ("Setup: add the code", "setup.html#add-code"), "ads-txt-guide": ("Setup: publish ads.txt", "setup.html#ads-txt"),
               "responsive-ad-units": ("Tools: ad unit builder", "tools.html#tool-unit"), "spa-and-dynamic-pages": ("Fix: framework problems", "fix.html#frameworks")}
FW_ORDER = ["html", "javascript", "react", "nextjs", "nodejs", "express", "flask", "django", "php", "wordpress"]


def tree_html(filename, custom):
    if (custom or "").strip():
        lines = [(l.rstrip(), "ADD CODE HERE" in l) for l in custom.strip("\n").splitlines()]
    else:
        parts = [p for p in (filename or "").split("/") if p]
        lines = [("your-project/", False)]
        for i, part in enumerate(parts):
            last = i == len(parts) - 1
            lines.append(("%s\u2514\u2500\u2500 %s%s" % ("    " * i, part, "" if last else "/") + ("   \u2190 ADD CODE HERE" if last else ""), last))
    return "".join('<span class="tree-line%s">%s</span>' % (" tree-hit" if hit else "", esc(t)) for t, hit in lines)


def render_codelab(counter):
    sys.path.insert(0, os.path.join(ROOT, "dev"))
    import codelab_data as D
    import mdlite

    def cb(lang, fname, code):
        m = re.match(r"(.*)", "%s %s" % (lang, fname))
        return render_code(type("M", (), {"group": lambda self, n, a=("%s %s" % (lang, fname)).strip(), b=code: a if n == 1 else b})(), counter)

    md = lambda t: mdlite.render(t, cb)
    fws = {f["slug"]: f for f in D.FRAMEWORKS}
    order = [s for s in FW_ORDER if s in fws]
    tabs = "".join('<a class="tab" role="tab" id="tab-fw-%s" href="#%s" data-slug="%s" aria-controls="fw-%s" aria-selected="%s" tabindex="%d"><i class="dot lang-%s" aria-hidden="true"></i>%s</a>'
                   % (s, s, s, s, "true" if i == 0 else "false", 0 if i == 0 else -1, fws[s]["language"], esc(fws[s]["name"])) for i, s in enumerate(order))
    panels = []
    for slug in order:
        f, exs = fws[slug], D.EXAMPLES.get(slug, [])
        ftabs = "".join('<button class="tab file-tab" type="button" role="tab" id="tab-ex-%s-%d" data-ex="ex-%s-%d" title="%s" aria-controls="ex-%s-%d" aria-selected="%s" tabindex="%d"><i class="dot lang-%s" aria-hidden="true"></i>%s</button>'
                        % (slug, n, slug, n, esc(e["filename"]), slug, n, "true" if n == 1 else "false", 0 if n == 1 else -1, e["language"], esc(e["filename"].split("/")[-1])) for n, e in enumerate(exs, 1))
        blocks = []
        for n, e in enumerate(exs, 1):
            guide = GUIDE_LINKS.get(e.get("guide") or "")
            ver = e.get("verify")
            verify = md(ver) if ver else ("<ol><li>Deploy the change (or reload your local page).</li><li>Open the live page and choose <strong>View Source</strong> (not Inspect). Search for <code>adsbygoogle</code> or the text you added.</li>"
                                          '<li>Paste the source into the <a href="tools.html#tool-html">HTML checker</a>.</li></ol>')
            code_html = render_code(type("M", (), {"group": lambda self, k, a="%s %s%s" % (e["language"], e["filename"], (" hl=" + e["highlight_lines"]) if e.get("highlight_lines") else ""), b=e["code"]: a if k == 1 else b})(), counter)
            blocks.append(
                '<article class="ex-panel" role="tabpanel" id="ex-%s-%d" aria-labelledby="tab-ex-%s-%d">'
                '<header class="ex-head"><h3>%s</h3>%s</header>%s<div class="ex-grid"><div class="ex-code">%s</div>'
                '<aside class="where-card" aria-label="Where to put this code"><h4><span aria-hidden="true">&#128205;</span> Where to put this</h4><dl><dt>File</dt><dd><code>%s</code></dd><dt>Location</dt><dd>%s</dd>'
                '<dt>Why</dt><dd>%s</dd></dl><pre class="tree" role="img" aria-label="Project structure with the file to edit highlighted">%s</pre></aside></div>'
                '<div class="ex-more"><h4>Understand it</h4>%s%s<div class="verify-card"><h4>6 &middot; Verify</h4>%s<label class="check-line"><input type="checkbox" data-verified> I checked it on my live site</label></div>%s</div></article>'
                % (slug, n, slug, n, esc(e["title"]), ('<span class="ver-badge">%s</span>' % esc(e["version"])) if e.get("version") else "",
                   ('<p class="lead-p">%s</p>' % esc(e["description"])) if e.get("description") else "", code_html, esc(e["filename"]), esc(e["placement"]),
                   md(e["where_goes"]), tree_html(e["filename"], e.get("project_tree")), md(e["explanation"]),
                   ('<aside class="callout note"><p class="callout-label"><span class="callout-dot" aria-hidden="true"></span>Version difference</p>%s</aside>' % md(e["version_note"])) if e.get("version_note") else "",
                   verify, ('<p class="tiny">Related: <a href="%s">%s</a></p>' % (guide[1], guide[0])) if guide else ""))
        panels.append('<section class="fw-panel" role="tabpanel" id="fw-%s" aria-labelledby="tab-fw-%s" data-fw-panel="%s"><p class="lead-p">%s</p>%s'
                      '<p class="lab-label" id="files-%s">%s</p><div class="tabs" role="tablist" aria-labelledby="files-%s" data-tabs="file">%s</div>%s</section>'
                      % (slug, slug, slug, esc(f["summary"]), ('<aside class="callout note"><p class="callout-label"><span class="callout-dot" aria-hidden="true"></span>Version notes</p>%s</aside>' % md(f["version_notes"])) if f.get("version_notes") else "",
                         slug, "File" if len(exs) == 1 else "Files", slug, ftabs, "".join(blocks)))
    flow = "".join('<li data-step="%d"><span class="fn">%d</span>%s</li>' % (i, i, t) for i, t in enumerate(["Choose framework", "Choose file", "Understand", "Copy", "Paste into project", "Verify"], 1))
    pz = ('<form class="personalise" id="pz-form" novalidate><h2>Personalise every example</h2><p>Enter your IDs once. Placeholders in all code boxes on this site are replaced, and Copy gives you the finished code.</p>'
          '<div class="pz-row"><div><label for="pz-client">Publisher ID</label><input id="pz-client" type="text" inputmode="text" autocomplete="off" placeholder="ca-pub-1234567890123456" maxlength="40"></div>'
          '<div><label for="pz-slot">Ad slot ID (optional)</label><input id="pz-slot" type="text" inputmode="numeric" autocomplete="off" placeholder="1234567890" maxlength="14"></div>'
          '<button class="btn btn-purple" type="submit">Apply</button><button class="btn btn-ghost btn-purple" type="button" id="pz-clear">Clear</button></div>'
          '<p class="field-msg" id="pz-msg" role="status"></p></form>')
    return ('<div data-lab><ol class="flow" aria-label="How the Code Lab works">%s</ol>%s<p class="lab-label" id="fw-label">Framework</p>'
            '<div class="tabs" role="tablist" aria-labelledby="fw-label" data-tabs="fw">%s</div>%s</div>' % (flow, pz, tabs, "".join(panels)))


# ------------------------------------------------------------------ layout
LAYOUT = open(os.path.join(ROOT, "dev", "layout.html"), encoding="utf-8").read() if os.path.exists(os.path.join(ROOT, "dev", "layout.html")) else ""


def layout(page, body, site, tasks_total):
    file, label, accent, title, desc = page
    url = "/" if file == "index" else "/%s.html" % file
    nav = "".join('<a class="nav-link" href="%s.html"%s>%s</a>' % (f, ' aria-current="page"' if f == file else "", esc(l)) for f, l, *_ in PAGES)
    footnav = "".join('<li><a href="%s.html">%s</a></li>' % (f, esc(l)) for f, l, *_ in PAGES[:GUIDE_PAGES])
    projnav = "".join('<li><a href="%s.html">%s</a></li>' % (f, esc(l)) for f, l, *_ in PAGES[GUIDE_PAGES:]) + '<li><a href="mailto:%s">%s</a></li>' % (CONTACT_EMAIL, CONTACT_EMAIL)
    canonical = ('<link rel="canonical" href="%s%s">\n<meta property="og:url" content="%s%s">\n<meta property="og:image" content="%s/assets/img/og.png">\n'
                 '<meta name="twitter:image" content="%s/assets/img/og.png">\n' % (site, url, site, url, site, site)) if site else ""
    ld = {"@context": "https://schema.org", "@type": {"index": "WebSite", "about": "AboutPage", "contact": "ContactPage"}.get(file, "TechArticle"),
          "name": SITE_NAME if file == "index" else title, "description": desc, "inLanguage": "en"}
    if site:
        ld["url"] = site + url
    scripts = {"code": ["code.js"], "tools": ["tools.js"], "fix": ["fix.js"], "about": ["profile-config.js", "profile.js"], "contact": ["contact.js"]}.get(file, [])
    values = {
        "FILE": file, "TITLE": esc(title), "DESC": esc(desc), "CSP": esc(CSP), "SITE_NAME": SITE_NAME, "CANONICAL": canonical,
        "LD": json.dumps(ld).replace("</", "<\\/"), "ACCENT": accent, "NAV": nav, "FOOTNAV": footnav, "VERIFIED": VERIFIED,
        "TASKS_TOTAL": str(tasks_total), "EXTRA": "".join('<script src="assets/js/%s" defer></script>\n' % x for x in scripts), "PROJNAV": projnav, "BODY": body,
    }
    out = LAYOUT
    for k, v in values.items():
        out = out.replace("%%" + k + "%%", v)
    return out


NOT_FOUND = ("404", "Not found", "blue", "Page not found | AdSense Helper", "That page does not exist. Go back to the AdSense Helper guide.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="", help="public site URL, for canonical links and the sitemap")
    args = ap.parse_args()
    site = args.site.rstrip("/")
    if not LAYOUT:
        sys.exit("dev/layout.html is missing")
    counter = [0]
    fragments, tasks = {}, {}
    for page in PAGES:
        frag = expand(read(os.path.join(SRC, page[0] + ".html")), counter)
        fragments[page[0]] = frag
        tasks[page[0]] = re.findall(r'data-task="([\w-]+)"', frag)
    all_tasks = [t for ids in tasks.values() for t in ids]
    dupes = sorted({t for t in all_tasks if all_tasks.count(t) > 1})
    if dupes:
        sys.exit("Duplicate data-task ids: %s" % dupes)
    for page in PAGES:
        with open(os.path.join(ROOT, page[0] + ".html"), "w", encoding="utf-8") as fh:
            fh.write(layout(page, fragments[page[0]], site, len(all_tasks)))
    with open(os.path.join(ROOT, "404.html"), "w", encoding="utf-8") as fh:
        nf = layout(NOT_FOUND, expand(read(os.path.join(SRC, "404.html")), counter), site, len(all_tasks))
        fh.write(nf.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="/">', 1).replace('<meta name="description"', '<meta name="robots" content="noindex"><meta name="description"', 1))
    with open(os.path.join(ROOT, "assets", "js", "tasks.js"), "w") as fh:
        fh.write("/* generated by dev/build.py */\nwindow.ADH_TASKS=%s;\n" % json.dumps(tasks))
    base = site or "https://YOUR-DOMAIN.example"
    urls = "".join("<url><loc>%s%s</loc></url>\n" % (base, "/" if p[0] == "index" else "/%s.html" % p[0]) for p in PAGES)
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as fh:
        fh.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % urls)
    with open(os.path.join(ROOT, "robots.txt"), "w") as fh:
        fh.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % base)
    print("Built %d pages, %d code boxes, %d checklist tasks%s" % (len(PAGES), counter[0], len(all_tasks), "" if site else " (no --site: canonical links omitted)"))


if __name__ == "__main__":
    main()
