# Tono — marketing site

Static promo site for **Tono Translate** (tonotranslate.com), served via GitHub Pages.

- `index.html` — landing page
- `privacy.html` — privacy policy (App Store Connect privacy URL: https://tonotranslate.com/privacy.html)
- `app.html` — **tonotranslate.com/app**, the short link to share: it opens Tono Translate's App Store listing. Anything after `?` goes along (`/app?pt=…&ct=tiktok-bio&mt=8`), so App Store Connect campaign links keep counting. Not in the sitemap (noindex).
- `CNAME` — custom domain

Plain HTML/CSS/JS, no build step. Edit and push to deploy.
