# Deployment

This app can deploy as one Node service. The production server in
`server/index.mjs` serves the built Vite frontend from `dist/` and handles
`/api/agent`.

## Fly.io

The repo includes:

- `Dockerfile`
- `fly.toml`
- `.dockerignore`

Before first deploy, choose a unique Fly app name. Either edit `app` in
`fly.toml`, or pass an app name with `-a`.

```bash
fly launch --no-deploy
fly secrets set OPENAI_API_KEY=<your key>
fly deploy
```

For an existing app:

```bash
fly deploy -a <your-fly-app-name>
```

The container listens on `PORT=8080` and `HOST=0.0.0.0`, matching
`fly.toml`'s `http_service.internal_port`.

Fly health checks call `GET /healthz` and expect a 2xx response.

## Render

The existing `render.yaml` remains supported.

```bash
Build Command: npm ci && npm run build
Start Command: npm run start
```

Set runtime environment variables in the provider dashboard, not in `.env`.

Required:

```bash
OPENAI_API_KEY=<your key>
HOST=0.0.0.0
NODE_ENV=production
```

Optional:

```bash
OPENAI_MODEL=gpt-5-mini
OPENAI_REASONING_EFFORT=minimal
```
