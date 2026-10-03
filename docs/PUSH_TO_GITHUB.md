# Pushing to GitHub (from your own terminal)

Every commit is made by you, with your own name and email. Nothing in the repo adds a co-author.

```bash
cd ~/Projects/immodash

# one-time: your identity for this repo (skip if set globally)
git config user.name  "Zoeb Ali Khan"
git config user.email "you@example.com"          # the email on your GitHub account

git init -b main
git add .
git status                                       # check: no warehouse/*.duckdb, no _to_delete/, no .env
git commit -m "ImmoDash: German rental market intelligence platform (phases 1-3)"

# create an empty repo named "immodash" on github.com/zoeb7184 first (no README), then:
git remote add origin https://github.com/zoeb7184/immodash.git
git push -u origin main
```

Optional checks before pushing:

```bash
git log -1 --format='%an <%ae>%n%n%B'           # author is you, message has no trailers
du -sh data/raw                                  # ~25 MB of open data, committed so CI builds offline
```

The repo includes `web/public/data/` (about 11 MB), the snapshot the website is built from, so Vercel can
deploy immediately. Later updates come from the weekly `refresh-site` workflow, committed by
`github-actions[bot]`. Those commits are the bot's, not yours, and no one else's.

After the first push, open the **Actions** tab. The `ci` workflow should go green: ruff, dbt on DuckDB and
Postgres, pytest, the verification report (downloadable as an artifact) and the Next.js build.
