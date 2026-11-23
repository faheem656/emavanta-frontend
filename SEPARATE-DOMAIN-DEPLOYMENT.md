# Separate frontend and backend domains

Frontend and backend are **two independent Node applications**. Extract the respective ZIP and deploy each folder to its own Node.js hosting service. Examples below are placeholders: replace both domains with your own. Use Node.js 22 or newer, HTTPS, and configure DNS/TLS on both hosts. The frontend is a Next.js server, not a static HTML site; a static-only host cannot run it.

## 1. Backend host

Deploy the `backend/` folder as the application root. On your Node host, install with `npm ci` and start with `npm start` or `node server.js`. The actual entry point is `backend/server.js` at the backend root; the old path remains a compatibility shim. The service binds `0.0.0.0` and honors the host `PORT` (unless `API_PORT` overrides it). Configure environment variables **on the backend host only**, keeping credentials private:

```dotenv
NODE_ENV=production
DEMO_MODE=false
APP_URL=https://app.example.com
CORS_ALLOWED_ORIGINS=
MONGODB_URI=<your private Atlas URI>
JWT_SECRET=<strong unique secret>
ENCRYPTION_KEY=<strong private encryption key>
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=<private Redis REST URL>
UPSTASH_REDIS_REST_TOKEN=<private Redis REST token>
```

The included `.env` is a clean template copied from `.env.example` and contains no live credentials. Replace placeholders; do not overwrite a working deployment’s existing `.env` or secrets. Host process variables override `.env.local`, which overrides `.env`. `APP_URL` is required in production. See `backend/.env.example` for SMTP, worker, owner and payment settings. Use the same encryption/JWT secrets and database/Redis configuration on all backend and worker instances; keep existing secrets on upgrades or data/sessions can become unreadable. Production requires a real MongoDB database, not memory storage. Verify `https://api.example.com/api/v1/health` and `/api/v1/ready` after deployment. Configure a controlled proxy/load balancer and TLS; `TRUSTED_PROXY_IPS` must include **only** your controlled upstream proxy IPs/CIDRs, never all clients. Per-IP form limits are local to each process and can see the proxy address unless forwarding is correctly configured; test and add external rate limiting as appropriate.

Normally workers run inside the API. If using a separate worker set `RUN_EMBEDDED_WORKERS=false` on API hosts and run `npm run workers` on a persistent Node worker host with the same backend environment. Do not deploy secrets or `.env` files to the frontend.

## 2. Frontend host

Deploy the `frontend/` folder as the application root on a Node/Next.js host. Edit its included template `.env` (or host environment) and set these values **before building**:

```dotenv
API_ORIGIN=https://api.example.com
NEXT_PUBLIC_SITE_URL=https://app.example.com
```

`API_ORIGIN` is the backend **origin only**, with no `/api/v1`, path, credentials, query or fragment. The Next.js server must be able to reach it. It must not be `localhost` for hosts on separate machines. Run `npm ci`, `npm run build`, then `npm start`; the service honors `PORT`. Next.js compiles the proxy destination at build time: rebuild and redeploy after changing `API_ORIGIN`. Keep the same value during build and runtime because server-rendered hosted forms also use it. `NEXT_PUBLIC_SITE_URL` is the public frontend origin and is also build-time configuration. Both are required for a production build; neither may contain a path, query, credentials or fragment. Rebuild after changing either. Host environment variables and `.env.local` may override `.env`. Example domains are placeholders, not working services.

Browsers talk to `https://app.example.com/api/...`, `/t/...`, and `/u/...`; Next forwards them to the backend. The backend domain can therefore differ entirely from the frontend domain and no browser code needs `localhost`. Account tokens are sent through the proxy. Do not put database passwords, SMTP credentials, Redis tokens or JWT secrets into frontend variables.

## 3. Verify after deployment

1. Confirm backend `/api/v1/health` is reachable and has schema 11; verify `/api/v1/ready` says ready. Confirm `https://app.example.com/api/v1/health` returns the same service through the frontend proxy.
2. Confirm the public site and a hosted `/f/<slug>` form load; submit a test form once and verify the contact appears. Test an embedded form from a separate permitted customer site. Public form endpoints allow cross-origin submissions without cookies; their validation/rate controls still apply.
3. Sign in with a real test account and verify dashboard calls, password recovery emails, mailbox settings and campaign preflight. Test `/t/` and `/u/` links from a test email. Set DNS, HTTPS and SMTP first. Do not use production customers for a first test.
4. CORS is a browser policy, **not** API authentication or a network firewall. Protected endpoints use their normal authorization. `APP_URL` is automatically allowed; optional `CORS_ALLOWED_ORIGINS` accepts exact extra origins, separated by commas. Do not use `*` or a path. Raw public form endpoints are intentionally cross-origin.
5. If changing domains, rebuild the frontend, update backend APP_URL/CORS and any external webhooks or previously generated embeds, and re-test. Existing emailed links do not magically change; keep old links operational where needed.

## Existing feature limitations

See `STUDIO-UPDATE-NOTES.md` and `backend/docs/OPERATIONS-REVIEW.md`: automation sending is not implemented, and scheduled/multi-step campaigns are not available. No SMTP, DNS, third-party payment, production load or real-domain integration is certified by the included local tests. Card/crypto are experimental and disabled by default. Always back up and independently test before production.
