# Deployment Notes

This project is a plain Node.js HTTP server that serves static files from `public/`
and backend APIs from `server.js`.

## Required environment variables

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

Optional:

- `PORT`
- `HOST`
- `PUBLIC_BASE_URL`

## Recommended hosting

Because the app depends on OpenRouter, prefer deploying to an overseas region
that can reach `https://openrouter.ai`, such as Singapore, Tokyo, or a similar
non-mainland region.

## Render

1. Push this repo to GitHub.
2. In Render, create a new Web Service from the repo.
3. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables:
   - `OPENROUTER_API_KEY=...`
   - `OPENROUTER_MODEL=openrouter/auto`
   - `PUBLIC_BASE_URL=https://your-service-domain`
5. Deploy.

## Railway

1. Push this repo to GitHub.
2. In Railway, create a new project from the repo.
3. Add environment variables:
   - `OPENROUTER_API_KEY=...`
   - `OPENROUTER_MODEL=openrouter/auto`
   - `PUBLIC_BASE_URL=https://your-service-domain`
4. Deploy. Railway will inject `PORT` automatically.

## Local verification

After deployment, check:

- `/api/health`
- `/`
- `/compare.html`

