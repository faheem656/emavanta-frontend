# Emavanta frontend — Next.js

This folder is a standalone Next.js application with its own dependencies, lockfile and environment. It does not launch the backend or need backend source code. Node.js 22 or later is required.

## Local setup

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`. The backend must be started separately. By default the Next.js **server** proxies `/api`, `/t` and `/u` to `http://127.0.0.1:4000` on the same machine.

## Host frontend and backend separately

Copy `.env.example` to `.env.local` for local configuration or set `API_ORIGIN` as an environment variable in the frontend host. It must be the backend origin reachable **from the Next.js server**, for example:

```dotenv
API_ORIGIN=https://api.example.com
```

Do not include `/api/v1` or credentials in this value. Use HTTPS or secure private networking between hosts. Do not use `localhost` when the backend is on a different host. Browsers always call the frontend's same-origin proxy; they do not connect to the backend's localhost. Set `API_ORIGIN` **before building** because Next.js embeds rewrite destinations at build time; rebuild/redeploy the frontend when it changes.

```powershell
npm ci
npm run build
npm start
```

Next.js defaults to port 3000 and honors the hosting platform's `PORT` variable. Set backend `APP_URL` to the public frontend HTTPS origin. For hosts such as managed Next.js platforms, configure the project root as this folder and configure `API_ORIGIN` in their build environment. Protect the backend with appropriate access controls. Never place backend MongoDB, SMTP, JWT or wallet credentials in the frontend environment.

The browser has local copies of the catalogue and template rendering logic. Maintain them in sync with the backend when editing; payment amounts are determined by the backend, not the browser. Card and crypto remain experimental and disabled by default on the backend until independently reviewed and tested. Card plans are one-time payments, not automatic subscriptions.
