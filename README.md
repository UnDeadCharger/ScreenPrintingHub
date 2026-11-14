# Screen Printing Hub

Internal order-management tool for a screen-printing business. Runs on a private server and is
reached over Tailscale. There is no login: the tailnet is the access control.

```
apps/api         NestJS + Mongoose API (also serves uploaded images, and the web app in production)
apps/web         React + Vite + Tailwind web app
packages/shared  TypeScript types shared by both apps
tools            split_designs.py, which generates the design files
```

## Local setup

Requirements: Node 24, Docker with Compose, and pnpm through Corepack.

```sh
corepack enable
pnpm install
cp .env.example .env
```

## Running in dev

```sh
pnpm dev
```

This starts MongoDB in Docker, the API on port 3000 and the web app on port 5173.

- On this machine: http://localhost:5173
- From a phone on the tailnet: `http://<tailscale-ip>:5173`. To use a MagicDNS name, it must match
  `WEB_ALLOWED_HOSTS` in `.env` (the default `.ts.net` covers full tailnet names).

MongoDB keeps running after you stop `pnpm dev`. Stop it with
`docker compose -f docker-compose.dev.yml stop`.

Other commands: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format`.

## Deploying to Debian

Requirements on the server: git, Docker Engine with the Compose plugin, and Tailscale already running.

```sh
git clone <repo-url> screen-printing-hub && cd screen-printing-hub
cp .env.example .env
# Edit .env: set MONGO_ROOT_PASSWORD. API_PORT is the port the app is published on.
docker compose up -d --build
```

Open `http://<tailscale-ip>:3000` (or the MagicDNS name) on the phone.

- **Update:** `git pull && docker compose up -d --build`
- **Logs:** `docker compose logs -f app`
- **Back up the database:**
  `docker compose exec mongo sh -c 'mongodump --archive -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD"' > backup.archive`
- **Back up images:** they live in the `sph_uploads` Docker volume.
- **Restrict to the tailnet:** Docker publishes ports past `ufw`. To listen only on Tailscale, set
  `HOST=<tailscale-ip>` in the server's `.env`.

## Design library

The designs were cut from two sheet PDFs (`V1_final.pdf`, `V2_-_final.pdf`), which are not kept in
the repo. Each sheet is one flattened scan, so `tools/split_designs.py` finds each design in the
image and cuts it out with white turned transparent. It writes:

- `apps/web/public/designs/<id>.png`: the cut-out as an alpha mask for the web app.
- `apps/web/src/designs.json`: the list the order form shows.

The generated files are committed, so the script is only needed to regenerate them or add a sheet.
To run it, put the sheet PDFs at the repo root (they are git-ignored) and follow the script's header. Text that runs down the sheet is rotated upright.

## API

All routes are under `/api`. Images are served from `/uploads/<filename>`.

| Method | Path                       | Purpose                                              |
| ------ | -------------------------- | ---------------------------------------------------- |
| POST   | `/api/orders`              | Create an order                                      |
| GET    | `/api/orders`              | List orders, newest first                            |
| GET    | `/api/orders/:id`          | Get one order                                        |
| PATCH  | `/api/orders/:id`          | Update recipient, items or status                    |
| PATCH  | `/api/orders/:id/complete` | Mark completed and set `completedAt`                 |
| POST   | `/api/uploads`             | Upload one image (form field `file`), get `{ path }` |

## Decisions worth knowing

- **One `.env` at the repo root** serves the API, Vite and Docker Compose. `.env.example` documents
  every variable.
- **No Turborepo.** `pnpm -r` is enough for three packages.
- **`packages/shared` is a single `index.d.ts`** with types only, so it has no build step. Values the
  API validates against (such as the allowed statuses) are written in the API's DTOs and checked
  against the shared types by the compiler.
- **An item has a front and a back, each optional.** Each side is one photo with any number of
  prints on it. A print is a design from the library, an ink colour (black, white, red or blue) and
  a tap position `{ x, y }`, stored as 0-1 fractions of the photo.
- **One file per design, any colour.** The design PNGs are alpha masks that the browser tints with
  CSS, so there are no per-colour copies.
- **Designs keep their relative sizes in the preview.** Each is drawn at its share of the sheet
  width. Each side's `scale` sets how large the whole sheet looks on that photo; it is a preview
  aid only.
- **Product photos are uploaded separately** through `POST /api/uploads` (jpeg, png or webp, 15 MB max).
  Orders store only the returned filename, never a full URL, so the host can change freely.
- **Production is one app container plus MongoDB.** The API serves the built web app, so everything
  is on one port and same-origin. There is one `Dockerfile` and no nginx.
- **Dev is same-origin too.** Vite proxies `/api` and `/uploads` to the API. `CORS_ORIGINS` is
  therefore empty by default and only needed if the web app is ever hosted separately.
- **The new-order form is phone-first.** Inputs are 16px on phones (so iOS does not zoom on focus)
  and controls are at least 44px tall. Placement is tap-only by design.
- **An in-progress order is kept in `sessionStorage`** so a reload or an evicted tab does not lose
  it. It is cleared after a successful create or with "Discard draft".
- **Auth slot.** `apps/api/src/main.ts` has a comment marking where a global guard goes.
- **`PATCH /api/orders/:id` cannot set `completed`.** Only `/complete` can.
- **MongoDB is pinned to 8.0.** In production it publishes no port. `docker-compose.dev.yml` sets
  `GLIBC_TUNABLES` because MongoDB 8 refuses to start on Linux kernels 6.19.0-7.0.13
  (SERVER-121912), which includes the OrbStack VM kernel. Debian 12 and 13 ship older kernels, so
  the production file does not set it. If the server ever runs an affected kernel, copy that
  setting across.
- **TypeScript is pinned to 6.x** because typescript-eslint does not support 7 yet.
- **No test framework yet.** Add one when there is logic worth testing.

## What is stubbed

- **Order logic** is plain CRUD. `PATCH` replaces `recipient` or `items` wholesale. The web app
  treats a completed order as read-only, but the API will still edit one (including moving it back
  to `pending`).
- **Editing an order** keeps no saved draft; only a new order survives a reload.
- **The order list** has no filtering or sorting.
- **Design ids are not checked against the library** by the API, only their shape.
- **Uploads** are not linked to orders: nothing checks that a filename in an order exists, and
  files are never deleted.

## Next steps

1. Order list: filter by status, and show enough per row to work from.
2. Enforce the completed-order rule in the API, not only in the web app.
3. Clean up orphaned upload files.
