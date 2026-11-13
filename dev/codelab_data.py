"""Code Lab seed: frameworks and examples. Placeholder IDs only."""

FRAMEWORKS = [
    dict(name="HTML", slug="html", language="html",
         summary="Plain HTML sites: the snippet goes in the head, ad units go where ads should appear.",
         version_notes="Works the same for every HTML version. Keep the snippet in `<head>` on every page you want ads on."),
    dict(name="JavaScript", slug="javascript", language="javascript",
         summary="Pushing ad units from JavaScript on pages that build their content dynamically.",
         version_notes="Modern browsers only need the code below. Do not call `push` more times than there are unfilled `ins.adsbygoogle` elements."),
    dict(name="React", slug="react", language="jsx",
         summary="Vite and Create React App: load the script once, render ad units as components.",
         version_notes="React has no official AdSense component. The pattern below uses the standard AdSense script and works with React 17, 18 and 19.\n\nReact 18+ `StrictMode` runs effects twice in development, which is why the component guards its `push` call."),
    dict(name="Next.js", slug="nextjs", language="jsx",
         summary="App Router (13.4+) and Pages Router differences, plus a client-side ad component.",
         version_notes="The **App Router** (`app/` directory) and the **Pages Router** (`pages/` directory) use different files for the page head. Use the example that matches your project. `NEXT_PUBLIC_` variables are inlined at build time, so rebuild after changing them."),
    dict(name="Node.js", slug="nodejs", language="javascript",
         summary="A plain Node.js HTTP server that renders the snippet and serves ads.txt.",
         version_notes="Tested pattern for Node 18 and newer. Use a framework or template engine for real projects."),
    dict(name="Express", slug="express", language="javascript",
         summary="Express with EJS: partial for the head snippet and static hosting for ads.txt.",
         version_notes="Works with Express 4 and 5. EJS escapes `<%= %>` output by default."),
    dict(name="Flask", slug="flask", language="python",
         summary="Jinja base template, a context processor for the publisher ID and an ads.txt route.",
         version_notes="Works with Flask 2.x and 3.x."),
    dict(name="Django", slug="django", language="python",
         summary="Context processor, base template and an ads.txt URL.",
         version_notes="Works with Django 3.2 and newer. `TemplateView` accepts `content_type` in all supported versions."),
    dict(name="PHP", slug="php", language="php",
         summary="A shared header include that reads the publisher ID from the environment.",
         version_notes="Works with PHP 7.4 and 8.x. The short echo tag `<?=` is always enabled since PHP 5.4."),
    dict(name="WordPress", slug="wordpress", language="php",
         summary="Child theme hook or the official Site Kit plugin, plus ads.txt notes.",
         version_notes="Block (full-site-editing) themes and classic themes both fire `wp_head`. Always use a child theme or a small plugin so theme updates do not remove your code."),
]

SNIP = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX'

EXAMPLES = {
"html": [
 dict(title="Add the AdSense code to every page", filename="index.html", language="html",
      placement="Inside <head>, before </head>",
      where_goes="Open every page template (or your shared layout) and paste the snippet **inside the head element**, not in the body. One copy per page is enough.",
      explanation="This loads Google's `adsbygoogle.js` library and tells it which account (publisher) the ads belong to. AdSense uses the same code to find your site during connection and to run Auto ads if you enable them.\n\nReplace `ca-pub-XXXXXXXXXXXXXXXX` with the ID from your own AdSense account, or paste the exact snippet AdSense shows you.",
      code='''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My website</title>

  <!-- Google AdSense: paste the exact snippet from your account -->
  <script async
          src="%s"
          crossorigin="anonymous"></script>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>''' % SNIP,
      version_note=""),
 dict(title="Place a responsive display ad unit", filename="article.html", language="html",
      placement="Inside <body>, exactly where the ad should appear",
      where_goes="Paste it in the page body at the spot where you want the ad, for example between two paragraphs. The head snippet from the previous example must also be on the page.",
      explanation="`data-ad-slot` is the ID of the ad unit you create in AdSense (Ads > By ad unit). `data-ad-format=\"auto\"` with `data-full-width-responsive=\"true\"` lets the unit resize on phones. The inline `push` call asks the library to fill this one unit.\n\nUse the code AdSense generates for your own unit; the values below are placeholders.",
      code='''<article>
  <p>First paragraph of your content...</p>

  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
       data-ad-slot="1234567890"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
    (adsbygoogle = window.adsbygoogle || []).push({});
  </script>

  <p>Second paragraph of your content...</p>
</article>''', version_note=""),
 dict(title="Publish ads.txt", filename="ads.txt", language="text",
      placement="Root folder of your domain, served at /ads.txt",
      where_goes="Create a plain text file named exactly `ads.txt` in the **root** of your site, so it opens at `https://yourdomain.com/ads.txt`. For static hosts this is usually the same folder as `index.html`.",
      explanation="ads.txt lists the companies allowed to sell ads on your site. The line below authorises Google AdSense for your publisher ID. Copy the exact line from your AdSense account; the ID after `pub-` is yours.",
      code="google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0",
      version_note=""),
],
"javascript": [
 dict(title="Fill every unfilled ad unit on the page", filename="js/ads.js", language="javascript",
      placement="Loaded with <script src> at the end of <body>, after the ad units exist",
      where_goes="Save as `js/ads.js` and include it just before `</body>`: `<script src=\"/js/ads.js\"></script>`. The AdSense library script must already be in `<head>`.",
      explanation="Each `push({})` fills one unfilled `ins.adsbygoogle` element. The selector skips units that already have a status attribute, which prevents the error about elements already having ads. The try/catch stops one failure from breaking your other scripts.",
      code='''document.addEventListener("DOMContentLoaded", function () {
  var units = document.querySelectorAll("ins.adsbygoogle:not([data-adsbygoogle-status])");
  units.forEach(function () {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense push failed:", err);
    }
  });
});''', version_note=""),
],
"react": [
 dict(title="Load the AdSense script once (Vite or Create React App)", filename="index.html", language="html",
      placement="Inside <head> of the root index.html",
      where_goes="Vite: `index.html` in the project root. Create React App: `public/index.html`. Add the script inside `<head>`.",
      explanation="Single-page apps serve one HTML file, so the library script belongs in that file once. Putting it in the static HTML also lets AdSense find the code during site connection, which does not run your JavaScript.",
      code='''<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My React app</title>
    <script async
            src="%s"
            crossorigin="anonymous"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>''' % SNIP, version_note=""),
 dict(title="AdUnit component", filename="src/components/AdUnit.jsx", language="jsx",
      placement="New component file; render <AdUnit /> where the ad should appear",
      where_goes="Create `src/components/AdUnit.jsx`, import it in a page component and render `<AdUnit slot=\"1234567890\" />` where you want the ad.",
      explanation="`useEffect` runs after the `<ins>` element is in the DOM, then asks AdSense to fill it. The `useRef` guard stops React 18+ StrictMode (development only) from calling `push` twice, which would log: \"All ins elements ... already have ads in them\".",
      code='''import { useEffect, useRef } from "react";

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT; // ca-pub-XXXXXXXXXXXXXXXX

export default function AdUnit({ slot, format = "auto" }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (err) {
      console.error("AdSense push failed:", err);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}''', version_note="Create React App uses `process.env.REACT_APP_ADSENSE_CLIENT` instead of `import.meta.env.VITE_ADSENSE_CLIENT`."),
],
"nextjs": [
 dict(title="App Router: root layout", filename="app/layout.js", language="jsx",
      placement="Inside <head> of the root layout",
      where_goes="Open `app/layout.js` (or `layout.tsx`) and add the script inside `<head>` of the root layout. Set `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX` in `.env.local` and in your host's environment settings.",
      explanation="A plain `<script async>` in the root layout is rendered into the server HTML, so Google can see it when it checks your site. A script injected only after hydration may not be visible to that check, which is why this example avoids a client-only loading strategy.",
      code='''export const metadata = { title: "My Next.js site" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}''', version_note="Requires Next.js 13.4 or newer with the App Router. Rebuild after changing `NEXT_PUBLIC_` variables."),
 dict(title="Pages Router: custom document", filename="pages/_document.js", language="jsx",
      placement="Inside <Head> of pages/_document.js",
      where_goes="Create or edit `pages/_document.js` and put the script inside the `Head` component imported from `next/document`.",
      explanation="`_document.js` renders on the server and wraps every page, so the script appears once in the initial HTML of all pages.",
      code='''import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}''', version_note="Use this only if your project has a `pages/` directory without the App Router."),
 dict(title="Client component for an ad unit", filename="components/AdUnit.jsx", language="jsx",
      placement="New client component; render it where the ad should appear",
      where_goes="Create `components/AdUnit.jsx` and import it from any page or layout. In the App Router the `\"use client\"` line at the top is required because the component uses hooks.",
      explanation="Next.js navigates between pages without a full reload, so each new `<ins>` must be filled with its own `push` call. The component does that when it mounts and guards against the development double-effect.",
      code='''"use client";
import { useEffect, useRef } from "react";

export default function AdUnit({ slot }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (err) {
      console.error("AdSense push failed:", err);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}''', version_note="In the Pages Router the `\"use client\"` line is harmless and can be removed."),
],
"nodejs": [
 dict(title="Plain Node.js server with the snippet and ads.txt", filename="server.js", language="javascript",
      placement="Head markup returned by your server; ads.txt route at /ads.txt",
      where_goes="Save as `server.js`, put your publisher ID in the `ADSENSE_CLIENT` environment variable and put your ads.txt line in `ads.txt` next to the file. Run `node server.js`.",
      explanation="The server validates the publisher ID format before putting it into HTML, so a typo or malicious value in the environment cannot break the page. `/ads.txt` is served as plain text from the root.",
      code='''const http = require("http");
const fs = require("fs");
const path = require("path");

const CLIENT = process.env.ADSENSE_CLIENT || "";
const VALID = /^ca-pub-\\d{16}$/.test(CLIENT);

const adsenseTag = VALID
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}" crossorigin="anonymous"></script>`
  : "";

http.createServer((req, res) => {
  if (req.url === "/ads.txt") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end(fs.readFileSync(path.join(__dirname, "ads.txt")));
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Node site</title>
  ${adsenseTag}
</head>
<body><h1>Hello</h1></body>
</html>`);
}).listen(process.env.PORT || 3000);''', version_note=""),
],
"express": [
 dict(title="Express app with static ads.txt", filename="app.js", language="javascript",
      placement="Server entry file; static middleware serves public/ads.txt at /ads.txt",
      where_goes="In your Express entry file add `express.static` pointing at a `public` folder, then save your ads.txt line as `public/ads.txt`. Pass the publisher ID to your views.",
      explanation="Express serves everything in `public/` from the site root, so `public/ads.txt` becomes `/ads.txt` with no extra route. The publisher ID comes from the environment instead of being hard-coded.",
      code='''const express = require("express");
const path = require("path");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// public/ads.txt is served at /ads.txt
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { adsenseClient: process.env.ADSENSE_CLIENT || "" });
});

app.listen(process.env.PORT || 3000);''', version_note=""),
 dict(title="EJS head partial", filename="views/partials/head.ejs", language="ejs",
      placement="Included inside <head> of every layout",
      where_goes="Create `views/partials/head.ejs` and include it in your layout with `<%- include('partials/head', { adsenseClient }) %>` inside `<head>`.",
      explanation="`<%= %>` escapes the value, which protects the page if the environment value is wrong. The `if` skips the script when no ID is configured, so local development shows no ad code.",
      code='''<% if (adsenseClient) { %>
<script async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<%= adsenseClient %>"
        crossorigin="anonymous"></script>
<% } %>''', version_note=""),
],
"flask": [
 dict(title="Context processor and ads.txt route", filename="app.py", language="python",
      placement="Application module, after creating the Flask app",
      where_goes="Add the context processor and the route to your Flask app file (or app factory). Put your ads.txt line in `static/ads.txt`.",
      explanation="The context processor makes `adsense_client` available in every template. The `/ads.txt` route serves the file from the site root with a plain text content type, because Flask's static folder is served under `/static/` by default.",
      code='''import os
from flask import Flask, send_from_directory

app = Flask(__name__)


@app.context_processor
def inject_adsense():
    return {"adsense_client": os.environ.get("ADSENSE_CLIENT", "")}


@app.route("/ads.txt")
def ads_txt():
    return send_from_directory(app.static_folder, "ads.txt", mimetype="text/plain")''', version_note=""),
 dict(title="Base template", filename="templates/base.html", language="html",
      placement="Inside <head> of the base template that every page extends",
      where_goes="Edit `templates/base.html`. Because all other templates extend it, the snippet appears on every page automatically.",
      explanation="Jinja escapes `{{ adsense_client }}` automatically. The `if` keeps development pages clean when the variable is not set.",
      code='''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{% block title %}My Flask site{% endblock %}</title>
  {% if adsense_client %}
  <script async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ adsense_client }}"
          crossorigin="anonymous"></script>
  {% endif %}
</head>
<body>
  {% block content %}{% endblock %}
</body>
</html>''', version_note=""),
],
"django": [
 dict(title="Context processor", filename="myapp/context_processors.py", language="python",
      placement="New file inside one of your installed apps",
      where_goes="Create `context_processors.py` in an app (replace `myapp` with your app's name). Then register it in `settings.py` under `TEMPLATES > OPTIONS > context_processors` as `\"myapp.context_processors.adsense\"`.",
      explanation="This exposes `ADSENSE_CLIENT` to all templates rendered with a `RequestContext`, which includes the shortcuts `render()` and class-based views.",
      code='''import os


def adsense(request):
    return {"ADSENSE_CLIENT": os.environ.get("ADSENSE_CLIENT", "")}''', version_note=""),
 dict(title="Base template and ads.txt URL", filename="templates/base.html", language="html",
      placement="Inside <head> of your base template",
      where_goes="Edit `templates/base.html` for the snippet. For ads.txt, create `templates/ads.txt` containing your line, then add the URL pattern shown in the explanation to your project `urls.py`.",
      explanation="Add this to `urls.py`:\n\n```python:urls.py\nfrom django.urls import path\nfrom django.views.generic import TemplateView\n\nurlpatterns = [\n    path(\"ads.txt\", TemplateView.as_view(template_name=\"ads.txt\", content_type=\"text/plain\")),\n]\n```\nDjango auto-escapes `{{ ADSENSE_CLIENT }}`.",
      code='''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{% block title %}My Django site{% endblock %}</title>
  {% if ADSENSE_CLIENT %}
  <script async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ ADSENSE_CLIENT }}"
          crossorigin="anonymous"></script>
  {% endif %}
</head>
<body>{% block content %}{% endblock %}</body>
</html>''', version_note=""),
],
"php": [
 dict(title="Shared head include", filename="includes/head.php", language="php",
      placement="Included at the top of every page, inside <head>",
      where_goes="Create `includes/head.php` and include it from every page with `<?php include __DIR__ . '/includes/head.php'; ?>`. Put your ads.txt line in a file named `ads.txt` in the web root (`public_html` or `htdocs`).",
      explanation="The publisher ID is read from the environment (set it in your host's panel or in the server config). `htmlspecialchars` makes the output safe, and the check skips the script if no ID is set.",
      code='''<?php $adsenseClient = getenv('ADSENSE_CLIENT') ?: ''; ?>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My PHP site</title>
  <?php if ($adsenseClient !== ''): ?>
  <script async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<?= htmlspecialchars($adsenseClient, ENT_QUOTES, 'UTF-8') ?>"
          crossorigin="anonymous"></script>
  <?php endif; ?>
</head>''', version_note="Shared hosts without environment variable support can define the ID in a config file outside the web root instead."),
],
"wordpress": [
 dict(title="Add the code with a child theme", filename="wp-content/themes/your-child-theme/functions.php", language="php",
      placement="functions.php of a child theme (or a small custom plugin)",
      where_goes="Create a child theme if you do not have one, then add this to its `functions.php`. Replace the placeholder with your publisher ID. Do not edit the parent theme: updates would remove your change.",
      explanation="`wp_head` is the WordPress hook that prints markup inside `<head>` on every page. Priority `1` places the script early. `esc_attr` escapes the value for safe output.",
      code='''<?php
add_action('wp_head', function () {
    $client = 'ca-pub-XXXXXXXXXXXXXXXX';
    echo '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='
        . esc_attr($client)
        . '" crossorigin="anonymous"></script>' . "\\n";
}, 1);''', version_note="Alternative: the **Site Kit by Google** plugin can connect AdSense without editing theme files. Check the plugin's own documentation for current steps."),
],
}


# ---- Code Lab extras: version badge, description, highlighted lines, project tree, related guide, verify text.
HTML_TREE = "your-project/\n├── index.html   ← ADD CODE HERE\n├── about.html   ← repeat on every page\n├── ads.txt\n└── css/"
EXTRAS = {
 ("html", "Add the AdSense code to every page"): dict(version="Any HTML version", description="Load Google's AdSense library once, in the head of every page.", highlight_lines="8-11", guide="adsense-code-placement", project_tree=HTML_TREE),
 ("html", "Place a responsive display ad unit"): dict(version="Any HTML version", description="Mark the exact spot where an ad may appear in your content.", highlight_lines="4-12", guide="responsive-ad-units"),
 ("html", "Publish ads.txt"): dict(version="Any web server", description="One line that authorises AdSense to sell ads on your domain.", guide="ads-txt-guide",
     project_tree="your-project/\n├── index.html\n├── ads.txt   ← ADD CODE HERE (site root)\n└── css/",
     verify="1. Open `https://yourdomain.com/ads.txt` in a browser. It must show plain text.\n2. Confirm your publisher ID matches your AdSense account.\n3. Run the [ads.txt checker](tools.html#tool-adstxt)."),
 ("javascript", "Fill every unfilled ad unit on the page"): dict(version="Modern browsers (ES5 compatible)", description="Ask AdSense to fill each empty ad unit exactly once.", highlight_lines="2-9", guide="spa-and-dynamic-pages",
     project_tree="your-project/\n├── index.html\n└── js/\n    └── ads.js   ← ADD CODE HERE"),
 ("react", "Load the AdSense script once (Vite or Create React App)"): dict(version="React 17, 18, 19", description="Put the library script in the static HTML head so it exists before React starts.", highlight_lines="7-9", guide="spa-and-dynamic-pages",
     project_tree="your-react-app/\n├── index.html   ← ADD CODE HERE (Vite) or public/index.html (CRA)\n├── package.json\n└── src/\n    └── main.jsx"),
 ("react", "AdUnit component"): dict(version="React 17+ (hooks)", description="A reusable component that fills one ad unit after it appears on screen.", highlight_lines="8-16", guide="spa-and-dynamic-pages",
     project_tree="your-react-app/\n├── index.html\n└── src/\n    ├── components/\n    │   └── AdUnit.jsx   ← ADD CODE HERE\n    └── App.jsx   ← render <AdUnit /> here"),
 ("nextjs", "App Router: root layout"): dict(version="Next.js 13.4+ (App Router)", description="Add the script to the root layout so it is in the server HTML of every page.", highlight_lines="7-11", guide="spa-and-dynamic-pages",
     project_tree="your-next-app/\n├── app/\n│   ├── layout.js   ← ADD CODE HERE\n│   └── page.js\n├── .env.local\n└── package.json"),
 ("nextjs", "Pages Router: custom document"): dict(version="Next.js (Pages Router)", description="Use _document.js to add the script to every page's head.", highlight_lines="7-11", guide="spa-and-dynamic-pages",
     project_tree="your-next-app/\n├── pages/\n│   ├── _document.js   ← ADD CODE HERE\n│   └── index.js\n├── .env.local\n└── package.json"),
 ("nextjs", "Client component for an ad unit"): dict(version="Next.js 13.4+ (client component)", description="Fill one ad unit each time a page renders it.", highlight_lines="7-15", guide="spa-and-dynamic-pages"),
 ("nodejs", "Plain Node.js server with the snippet and ads.txt"): dict(version="Node.js 18+", description="Validate the publisher ID, render the head snippet and serve /ads.txt.", highlight_lines="5-10", guide="adsense-code-placement",
     project_tree="your-project/\n├── server.js   ← ADD CODE HERE\n└── ads.txt"),
 ("express", "Express app with static ads.txt"): dict(version="Express 4 and 5", description="Serve ads.txt from the site root with static middleware.", highlight_lines="8-9", guide="ads-txt-guide",
     project_tree="your-project/\n├── app.js   ← ADD CODE HERE\n├── public/\n│   └── ads.txt\n└── views/\n    ├── index.ejs\n    └── partials/\n        └── head.ejs"),
 ("express", "EJS head partial"): dict(version="EJS 3", description="A head partial that outputs the script only when an ID is configured.", highlight_lines="2-4", guide="adsense-code-placement"),
 ("flask", "Context processor and ads.txt route"): dict(version="Flask 2.x and 3.x", description="Expose the publisher ID to every template and serve ads.txt from the root.", highlight_lines="7-9,12-14", guide="ads-txt-guide",
     project_tree="your-project/\n├── app.py   ← ADD CODE HERE\n├── static/\n│   └── ads.txt\n└── templates/\n    └── base.html"),
 ("flask", "Base template"): dict(version="Jinja2 (Flask 2.x and 3.x)", description="One edit in the shared template adds the script to every page.", highlight_lines="6-10", guide="adsense-code-placement",
     project_tree="your-project/\n├── app.py\n├── static/\n│   └── ads.txt\n└── templates/\n    └── base.html   ← ADD CODE HERE"),
 ("django", "Context processor"): dict(version="Django 3.2+", description="Make the publisher ID available to all templates.", guide="adsense-code-placement",
     project_tree="your-project/\n├── manage.py\n├── myproject/\n│   ├── settings.py   ← register the processor here\n│   └── urls.py\n└── myapp/\n    └── context_processors.py   ← ADD CODE HERE"),
 ("django", "Base template and ads.txt URL"): dict(version="Django 3.2+", description="Add the snippet to the base template and route /ads.txt.", highlight_lines="6-10", guide="ads-txt-guide",
     project_tree="your-project/\n├── manage.py\n├── myproject/\n│   └── urls.py   ← add the ads.txt path\n└── templates/\n    ├── ads.txt\n    └── base.html   ← ADD CODE HERE"),
 ("php", "Shared head include"): dict(version="PHP 7.4 and 8.x", description="One shared include that every page uses for its head.", highlight_lines="6-10", guide="adsense-code-placement",
     project_tree="public_html/\n├── ads.txt\n├── index.php\n└── includes/\n    └── head.php   ← ADD CODE HERE"),
 ("wordpress", "Add the code with a child theme"): dict(version="WordPress 5.x and 6.x", description="Print the script in wp_head from a child theme, so updates never remove it.", highlight_lines="2-7", guide="adsense-code-placement",
     project_tree="wp-content/\n└── themes/\n    ├── your-theme/\n    └── your-child-theme/\n        ├── style.css\n        └── functions.php   ← ADD CODE HERE"),
}
for (_slug, _title), _extra in EXTRAS.items():
    for _ex in EXAMPLES[_slug]:
        if _ex["title"] == _title:
            _ex.update(_extra)


# ---- extra examples for the static site -------------------------------------------------------
EXAMPLES["html"].insert(2, dict(title="In-article ad unit", filename="article.html", language="html", placement="Inside <body>, between paragraphs of an article",
    where_goes="Paste it between two paragraphs of your article body. The head snippet must already be on the page.",
    explanation="The in-article format blends into long text. `data-ad-format=\"fluid\"` and `data-ad-layout=\"in-article\"` tell AdSense to fit the article column. Create an in-article unit in AdSense and use its own slot ID.",
    code='''<article>
  <p>Paragraph one...</p>

  <ins class="adsbygoogle"
       style="display:block; text-align:center;"
       data-ad-layout="in-article"
       data-ad-format="fluid"
       data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
       data-ad-slot="1234567890"></ins>
  <script>
    (adsbygoogle = window.adsbygoogle || []).push({});
  </script>

  <p>Paragraph two...</p>
</article>''', version_note="", version="Any HTML version", description="A fluid ad that sits naturally between paragraphs.", highlight_lines="4-11", guide="responsive-ad-units"))
EXAMPLES["html"].append(dict(title="robots.txt that does not block AdSense", filename="robots.txt", language="text", placement="Root of your site, served at /robots.txt",
    where_goes="Create `robots.txt` in the same folder as `index.html` so it opens at `https://yourdomain.com/robots.txt`.",
    explanation="The AdSense crawler identifies itself as `Mediapartners-Google`. This file explicitly allows it and leaves all other crawlers allowed. Add `Disallow:` lines for private paths if you have any.",
    code='''User-agent: Mediapartners-Google
Disallow:

User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml''', version_note="", version="Any web server", description="Make sure nothing in robots.txt stops the AdSense crawler.", guide="adsense-code-placement"))
EXAMPLES["nextjs"].append(dict(title="Environment variable", filename=".env.local", language="env", placement="Project root next to package.json",
    where_goes="Create `.env.local` in the project root. Add the same name in your host's environment settings, then rebuild.",
    explanation="Variables starting with `NEXT_PUBLIC_` are inlined into the browser bundle at build time, which is what we want for a public publisher ID. Never put secrets in a `NEXT_PUBLIC_` variable.",
    code="NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX", version_note="", version="Next.js 13.4+", description="Keep the publisher ID in one place."))
EXAMPLES["flask"].append(dict(title="Environment file", filename=".env", language="env", placement="Project root; never committed to Git",
    where_goes="Create `.env` in the project root and add it to `.gitignore`. Load it with python-dotenv or set the variable in your host.",
    explanation="`ADSENSE_CLIENT` is read by the context processor. A publisher ID is not secret, but keeping it in the environment lets you use test values in development.",
    code="ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX", version_note="", version="Any Flask version", description="One variable controls every page."))
EXAMPLES["express"].append(dict(title="Environment file", filename=".env", language="env", placement="Project root; never committed to Git",
    where_goes="Create `.env` next to `app.js`, add it to `.gitignore`, and load it with the `dotenv` package or your host's settings.",
    explanation="The app reads `process.env.ADSENSE_CLIENT`. Add `require(\"dotenv\").config();` at the top of `app.js` if you use a `.env` file locally.",
    code="ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX\nPORT=3000", version_note="", version="Node 18+", description="Keep configuration out of source code."))
