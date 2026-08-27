# Signal Library

A production-minded video sharing app built with Next.js App Router, TypeScript, Tailwind CSS, MongoDB, and Mongoose. Visitors see a responsive public library; an authenticated administrator can publish and delete sanitized YouTube or Vimeo iframe embeds.

## Requirements

- Node.js 20 or newer
- MongoDB 6 or newer, either local or MongoDB Atlas

## Setup

From [`video-sharing-app`](video-sharing-app):

```bash
npm install
copy .env.example .env.local
```

Edit [`.env.local`](video-sharing-app/.env.local) and set:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/video-sharing-app
ADMIN_SECRET=use-a-long-random-secret-at-least-12-characters
```

Keep [`.env.local`](video-sharing-app/.env.local) private. It is ignored by Git.

## Development

```bash
npm run dev
```

Open `http://localhost:3000`. Open `/admin` to sign in and manage videos.

The public `GET /api/videos` endpoint returns newest videos first. `POST /api/videos` and `DELETE /api/videos/:id` require the signed HTTP-only admin session created by `POST /api/admin/login`.

## Embed policy

The admin accepts exactly one complete `<iframe>`. The server sanitizes the stored markup and only permits HTTPS sources from YouTube, YouTube NoCookie, and Vimeo Player. Scripts, event handlers, extra HTML, unsafe protocols, and unapproved hosts are rejected.

## Production

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

For deployment, configure `MONGODB_URI` and a high-entropy `ADMIN_SECRET` in the hosting provider’s environment settings. Use a MongoDB user restricted to the application database and configure Atlas network access for the hosting platform. Production cookies are marked `Secure`, `HttpOnly`, and `SameSite=Strict`.

## Project structure

- [`src/app/page.tsx`](video-sharing-app/src/app/page.tsx) — public video library
- [`src/app/admin/page.tsx`](video-sharing-app/src/app/admin/page.tsx) — login/dashboard route
- [`src/app/api/videos/route.ts`](video-sharing-app/src/app/api/videos/route.ts) — list/create API
- [`src/app/api/videos/[id]/route.ts`](video-sharing-app/src/app/api/videos/[id]/route.ts) — delete API
- [`src/lib/mongoose.ts`](video-sharing-app/src/lib/mongoose.ts) — cached database connection
- [`src/lib/video-embed.ts`](video-sharing-app/src/lib/video-embed.ts) — iframe validation and sanitization
- [`src/lib/admin-auth.ts`](video-sharing-app/src/lib/admin-auth.ts) — signed session cookie helpers
- [`src/models/Video.ts`](video-sharing-app/src/models/Video.ts) — Mongoose model

## Security notes

This application intentionally does not render arbitrary HTML submitted by an administrator. The iframe allowlist is enforced before persistence and the stored sanitized value is rendered on the public page. The admin secret is compared server-side and never exposed to client-side code.
