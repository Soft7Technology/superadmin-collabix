# Collabix Super Admin

Dedicated administration frontend for platform-level organization management.
It uses the same `api-collabix` service as the customer application; there is
no second backend or database migration owner.

## Local development

1. Start `api-collabix` on port `5000`.
2. Run `npm install`.
3. Run `npm run dev`; this app starts on `http://localhost:8081`.

The development server proxies `/auth` and `/api` to the backend, preserving
the cookie-based session and CSRF model.

## Production

In production, route this app's `/api` and `/auth` paths to `api-collabix`
through the deployment reverse proxy and leave `VITE_API_URL` empty. This
preserves the same-origin readable CSRF cookie while both frontend repositories
still share one backend. Use HTTPS and include the admin origin in
`FRONTEND_URLS`.
