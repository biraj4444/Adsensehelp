"""Static checks on the built site: tag balance, duplicate ids, broken links/anchors, alt text, CSP-unfriendly markup."""
import os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOID = {"meta", "link", "br", "img", "input", "hr", "source", "base", "col", "area", "wbr", "path", "circle", "rect"}
PAGES = ["index", "learn", "setup", "code", "tools", "fix", "about", "contact", "404"]


class P(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.ids, self.hrefs, self.errors, self.imgs = [], [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "style" in a:
            self.errors.append("inline style attribute on <%s>" % tag)
        if any(k.startswith("on") and k != "one" for k in a):
            self.errors.append("inline event handler on <%s>" % tag)
        if tag == "script" and not a.get("src") and a.get("type") != "application/ld+json":
            self.errors.append("inline script")
        if a.get("href", "").lower().startswith("javascript:"):
            self.errors.append("javascript: link")
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "a" and "href" in a:
            self.hrefs.append(a["href"])
        if tag == "img":
            self.imgs.append(a)
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "img":
            self.imgs.append(a)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack or self.stack[-1] != tag:
            self.errors.append("unbalanced </%s> (open: %s)" % (tag, self.stack[-3:]))
            if tag in self.stack:
                while self.stack and self.stack.pop() != tag:
                    pass
        else:
            self.stack.pop()


problems, parsed = [], {}
for name in PAGES:
    path = os.path.join(ROOT, name + ".html")
    text = open(path, encoding="utf-8").read()
    for leftover in ("[[", "]]", "%%"):
        if leftover in text:
            problems.append("%s: leftover %r" % (name, leftover))
    p = P()
    p.feed(text)
    if p.stack:
        problems.append("%s: unclosed %s" % (name, p.stack))
    problems += ["%s: %s" % (name, e) for e in p.errors]
    dup = sorted({i for i in p.ids if p.ids.count(i) > 1})
    if dup:
        problems.append("%s: duplicate ids %s" % (name, dup))
    for img in p.imgs:
        if "alt" not in img:
            problems.append("%s: img without alt %s" % (name, img.get("src")))
    parsed[name] = p

for name, p in parsed.items():
    for h in p.hrefs:
        if re.match(r"^(https?:|mailto:|#$)", h):
            continue
        file, _, frag = h.partition("#")
        file = file or name + ".html"
        target = os.path.join(ROOT, file)
        if not os.path.exists(target):
            problems.append("%s: broken link %s" % (name, h))
        elif frag:
            tname = file[:-5] if file.endswith(".html") else file
            if tname in parsed and frag not in parsed[tname].ids:
                # ids created at runtime (toc headings) are not in static html
                if not re.match(r"^(ex-|fw-)", frag) and ("fw-" + frag) not in parsed[tname].ids:
                    problems.append("%s: missing anchor %s" % (name, h))
print("static checks:", "OK" if not problems else "")
for pr in problems:
    print("  PROBLEM", pr)
sys.exit(1 if problems else 0)
