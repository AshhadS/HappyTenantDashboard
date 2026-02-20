# Happy Tenant Dashboard

Nuxt 4 starter configured with PrimeVue 4.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

This repo now includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

1. Push this branch to GitHub.
2. In your repository settings, go to **Pages** and set **Source** to **GitHub Actions**.
3. Merge/push to `main` (or run the workflow manually from Actions).
4. After deploy finishes, your site URL will be:
   - `https://<your-github-username>.github.io/<repo-name>/`

The workflow sets `NUXT_APP_BASE_URL` automatically so Nuxt assets work from a repo subpath.

## PR Previews

This repo also includes `.github/workflows/deploy-preview.yml` for pull request previews.

- On each PR update, it generates the Nuxt site and deploys it under the `gh-pages` branch at:
  - `https://<your-github-username>.github.io/<repo-name>/previews/pr-<pr-number>/`
- The workflow posts the preview URL as a PR comment automatically.

