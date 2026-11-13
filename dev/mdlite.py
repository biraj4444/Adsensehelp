"""Tiny Markdown subset for the code-lab text: paragraphs, lists, **bold**, `code`, links, fenced code."""
import html
import re

_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^\s)]+|[\w./#-]+)\)")
_BOLD = re.compile(r"\*\*([^*]+)\*\*")


def inline(text):
    out = []
    for part in re.split(r"(`[^`]+`)", text):
        if len(part) > 2 and part[0] == "`" and part[-1] == "`":
            out.append("<code>%s</code>" % html.escape(part[1:-1]))
        else:
            s = html.escape(part, quote=True)
            s = _LINK.sub(lambda m: '<a href="%s"%s>%s</a>' % (m.group(2), ' rel="noopener noreferrer"' if m.group(2).startswith("http") else "", m.group(1)), s)
            out.append(_BOLD.sub(r"<strong>\1</strong>", s))
    return "".join(out)


def render(text, codebox):
    lines = (text or "").replace("\r\n", "\n").split("\n")
    out, para, i = [], [], 0

    def flush():
        if para:
            out.append("<p>%s</p>" % inline(" ".join(para)))
            para.clear()

    while i < len(lines):
        s = lines[i].strip()
        if s.startswith("```"):
            flush()
            lang, _, fname = s[3:].strip().partition(":")
            i += 1
            buf = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            out.append(codebox(lang or "text", fname, "\n".join(buf)))
        elif re.match(r"^[-*]\s+", s):
            flush()
            items = []
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                items.append("<li>%s</li>" % inline(re.sub(r"^[-*]\s+", "", lines[i].strip())))
                i += 1
            out.append("<ul>%s</ul>" % "".join(items))
            continue
        elif re.match(r"^\d+[.)]\s+", s):
            flush()
            items = []
            while i < len(lines) and re.match(r"^\d+[.)]\s+", lines[i].strip()):
                items.append("<li>%s</li>" % inline(re.sub(r"^\d+[.)]\s+", "", lines[i].strip())))
                i += 1
            out.append("<ol>%s</ol>" % "".join(items))
            continue
        elif not s:
            flush()
        else:
            para.append(s)
        i += 1
    flush()
    return "".join(out)
