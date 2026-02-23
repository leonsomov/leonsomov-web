# leonsomov-web

Landing page for `leonsomov.com`, hosted on GitHub Pages.

## Files

- `index.html`: page structure/content
- `styles.css`: visual design + responsive layout
- `script.js`: small interactions (year + reveal)
- `workspace.html`: song workspace page with share links and comments
- `workspace.css`: workspace page styles
- `workspace.js`: workspace logic (URL state, updates, comments embed)
- `CNAME`: custom domain for GitHub Pages

## Song Workspace Comments

`workspace.html` uses [utterances](https://utteranc.es/) so people with the link can comment on a song workspace.

One-time setup in GitHub:

1. Ensure **Issues** are enabled for `leonsomov-web`.
2. Install the utterances app for the repository: <https://github.com/apps/utterances>
3. (Optional) Keep the `song-workspace` issue label for filtering workspace threads.

## Publish to GitHub

Run inside this directory:

```bash
cd /Users/leonsomov/Documents/GitHub/leonsomov-web
git init
git add .
git commit -m "Initial landing page"
git branch -M main
git remote add origin git@github.com:<your-github-username>/leonsomov-web.git
git push -u origin main
```

Then in GitHub:

1. Open repository settings
2. Go to `Pages`
3. Source: `Deploy from a branch`
4. Branch: `main` and folder `/ (root)`
5. Confirm custom domain is `leonsomov.com` (it should be auto-read from `CNAME`)

## DNS setup (Interneto Vizija / serveriai.lt)

Use the DNS zone where your nameservers are:

- `ns1.serveriai.lt` (`79.98.25.142`)
- `ns2.serveriai.lt` (`79.98.29.142`)
- `ns3.serveriai.lt` (`162.159.24.19`)
- `ns4.serveriai.lt` (`162.159.25.253`)

Create/verify these records for `leonsomov.com`:

1. `A` record: `@` -> `185.199.108.153`
2. `A` record: `@` -> `185.199.109.153`
3. `A` record: `@` -> `185.199.110.153`
4. `A` record: `@` -> `185.199.111.153`
5. `CNAME` record: `www` -> `<your-github-username>.github.io`

For `leonsomov.lt`, choose one:

1. Redirect `leonsomov.lt` -> `https://leonsomov.com` at provider level (recommended)
2. Host `.lt` separately (requires a separate site/domain setup)

Note: a single GitHub Pages site uses one custom apex domain in `CNAME`.

## Content to finalize

Please provide:

1. Your one-line headline (hero section)
2. 3-5 sentence bio
3. 3 featured projects (name, one sentence, link)
4. Contact email
5. Social/profile links (GitHub, Instagram, LinkedIn, etc.)
