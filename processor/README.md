# BigSignal Tools media processor

This folder contains the self-hosted Cobalt processor configuration used by BigSignal Tools for supported public media sources.

## Before deployment

1. Copy `keys.example.json` to `keys.json` and replace the placeholder with a cryptographically random UUID v4. Never commit `keys.json`.
2. Copy `.env.example` to `.env` and set `API_URL` to the public HTTPS URL of the processor. `WEB_ORIGIN` should remain the production BigSignal Tools origin.
3. Run `docker compose up -d` on a Docker-capable host.
4. Put the processor behind HTTPS/reverse proxy if the host does not provide HTTPS automatically.
5. In the BigSignal Tools Vercel project, set:
   - `MEDIA_PROCESSOR_URL` = the public processor endpoint
   - `MEDIA_PROCESSOR_API_KEY` = the UUID key from `keys.json`
6. Redeploy the Vercel project and test only with media you own or are authorized to save.

## Notes

- The frontend never receives the processor API key. Requests go through `/api/resolve-media` on the Vercel app.
- `API_AUTH_REQUIRED=1` prevents unauthenticated use of the processor.
- CORS is restricted to `WEB_ORIGIN`.
- Rate limiting is enabled at 30 requests per 60 seconds on the processor, in addition to the app-side limiter.
- Do not use public Cobalt infrastructure for this integration unless the instance owner explicitly permits it.
- Review and comply with Cobalt's license obligations before commercial deployment or distributing modifications.
