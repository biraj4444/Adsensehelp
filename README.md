# AdSense Helper (static site)

An independent, colourful, six-page guide to setting up Google AdSense, with copy-ready code, in-browser tools, a reading mode and example image/video boxes. **No backend, no database, no build step needed to host it.** It is not affiliated with Google.

Pages: `index.html` (Home), `learn.html`, `setup.html`, `code.html` (Code Lab), `tools.html`, `fix.html`, `about.html`, `contact.html`, plus `404.html`.

## Run it in Termux (or anywhere)

```bash
pkg install python
cd adsense-helper-site
python -m http.server 8080      # open http://localhost:8080
```

Opening the files directly (`file://`) works for reading, but site search, offline mode and the service worker need a server.

## Host it for free

Upload the folder as-is (no build command, publish directory = the project root):

- **Cloudflare Pages**: connect the GitHub repo, framework preset *None*, build command empty, output directory `/`.
- **GitHub Pages / Netlify**: publish the repository root.

Then run `python dev/build.py --site https://your-domain.com` once to write canonical links, Open Graph URLs and a correct `sitemap.xml` / `robots.txt`, and commit the result.

`404.html` uses `<base href="/">`. If you host under a sub-path (for example `user.github.io/repo/`), change that line in `dev/build.py` and rebuild.

## Add your example images and videos

Every page has a standard 16:9 box (top-right of the page header, and beside each setup step). Boxes with no URL are **hidden from visitors**.

1. Open the site and click **Owner mode** in the footer (or add `?owner=1` to any URL).
2. Press the pencil on a box, paste an `https://` image, YouTube, Vimeo or `.mp4`/`.webm` link, add a description, Save.
3. Press **Copy config** in the dark owner bar and paste it over `assets/js/media-config.js`. Commit. Done: everyone sees it.

YouTube boxes show a thumbnail and only load the video player (youtube-nocookie) when pressed, which keeps pages fast. Files chosen from your device are previews for your browser only; host them (for example on Cloudinary) and paste the URL. Box ids are shown in owner mode and listed in `media-config.js`.

## About and Contact pages

- **Your email:** set `CONTACT_EMAIL` near the top of `dev/build.py` (it is `example@gmail.com` for now), then run `python dev/build.py`. It updates the About page, the Contact page, the footer and the message form.
- **Profile photo (end of the About page):** put a square photo in `assets/img/` and set `photo` in `assets/js/profile-config.js`, either to a path such as `assets/img/profile.jpg` or to a full `https://` image URL. Until then a "KK" initials badge is shown. The photo is shown as a softly rounded square.
- **Contact form:** the site has no server, so the form builds a `mailto:` message that opens in the visitor's own email app (or can be copied). Nothing is stored or sent by the website.
- Edit the wording in `dev/pages/about.html` and `dev/pages/contact.html`, then rebuild.

## Editing content

Page text lives in `dev/pages/*.html`. Shared header/footer live in `dev/layout.html`, and the Code Lab examples live in `dev/codelab_data.py`. After editing run:

```bash
python dev/build.py
```

Special tags inside pages: `[[code html index.html hl=3-5]] ... [[/code]]` (code box with highlighted lines), `[[official]]`, `[[tip]]`, `[[warn]]`, `[[note]]` (labelled callouts), `[[media my-id | Title | hint]]` (media box). Checklist items use `<input type="checkbox" data-task="unique-id">`; the progress ring counts them automatically.

## Features

- Personalise once: enter your publisher ID (and slot) in the Code Lab and every code box on every page fills in. Copy copies exactly the finished code (never line numbers).
- Dark editor-style code boxes with colourful syntax for HTML, CSS, JS, JSX, Python, PHP, JSON, Shell, .env and EJS.
- Code Lab with framework tabs, file tabs, a "where to put this" card with a project tree, and a six-step learning flow.
- Tools (all in your browser): HTML checker, ads.txt builder/validator, ad unit builder, robots.txt checker, live-page inspector snippet.
- Troubleshooting: diagnosis wizard, search, category filters, 12 problems with causes, fix and verification.
- Reading mode: light/sepia/dark, sans/serif/mono, text size, line spacing, line length, focus mode, "Listen", table of contents, read-progress bar.
- Progress tracker saved on the device, site search (`/` or Ctrl+K), offline reading via a service worker, print styles.

## Logo

`assets/img/logo.svg` is an original mark made for this project. Google's own AdSense logo is a trademark, so it is not copied here and the site states that it is independent. If you have the right to use another logo, replace `assets/img/logo.svg` (and `favicon.svg`) with your file.

## Official sources

Facts labelled "Official Google information" come from these pages (checked 30 Sep 2026): [Eligibility](https://support.google.com/adsense/answer/9724), [HTML access](https://support.google.com/adsense/answer/91205), [Program policies](https://support.google.com/adsense/answer/48182), [Ads.txt guide](https://support.google.com/adsense/answer/12171612), [Ads.txt troubleshooter](https://support.google.com/adsense/troubleshooter/9556696). Google can change them, so re-check periodically.

## Showing AdSense on this site

The site ships a strict Content-Security-Policy (a `<meta>` tag in `dev/layout.html`) so it makes no third-party requests except optional media. If you add AdSense to *this* site, extend that policy as Google's documentation describes, put your ID in `ads.txt`, and add the head snippet to `dev/layout.html`.

## Tests

```bash
python -m http.server 8099 &          # in the project folder
python tests/static_check.py          # tag balance, ids, links, alt text, CSP-friendly markup
python tests/browser_test.py          # needs: pip install playwright && playwright install chromium
```

The browser suite checks every page at 360, 768 and 1280 px (no overflow, no console errors), exact copy output, personalisation, all tools, reading mode, search, progress, media boxes, the wizard and offline mode.
