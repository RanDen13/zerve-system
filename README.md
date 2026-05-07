This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## SAPF PDF Generation

SAPF PDFs are generated from the filled DOCX template, then converted with
`docx2pdf-converter`. In Docker, the provided `Dockerfile` installs `unoconv`
and LibreOffice Writer for the package's Linux conversion path. If you run the
app outside Docker on Linux, install `unoconv` and LibreOffice Writer too.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Docker Deployment

### Building the Docker Image

The provided `Dockerfile` uses a multi-stage build to optimize image size:

```bash
docker build -t zerve:latest .
```

### Running with Docker Compose (Recommended)

Use the provided `docker-compose.yml` to run the app with environment variables properly configured:

```bash
# Edit docker-compose.yml to set your environment variables
docker-compose up -d
```

**Important: Environment Variables**

The app requires the following environment variables for proper operation:

- `BETTER_AUTH_URL`: The public URL of your app (e.g., `https://yourdomain.com`)
- `NEXT_PUBLIC_URL`: Alternative fallback URL
- `BETTER_AUTH_SECRET`: Secret key for authentication (generate a random string)
- `DATABASE_URL`: Path to SQLite database (e.g., `file:./data/dev.db`)
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: Public Google reCAPTCHA site key for email/password login
- `RECAPTCHA_SECRET_KEY`: Secret Google reCAPTCHA key used by the auth server
- `SMTP_*`: Email configuration variables

### Running with Docker CLI

If using Docker directly without Compose:

```bash
docker run -d \
  -p 3000:3000 \
  -e BETTER_AUTH_URL=https://yourdomain.com \
  -e NEXT_PUBLIC_URL=https://yourdomain.com \
  -e BETTER_AUTH_SECRET=your-secret-key \
  -e DATABASE_URL=file:./data/dev.db \
  -e NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key \
  -e RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key \
  -v $(pwd)/data:/app/data \
  zerve:latest
```

### Native Bindings

The Dockerfile includes build tools (`python3`, `make`, `g++`) in the runtime stage to properly compile the `better-sqlite3` native binding. This ensures compatibility with the Node.js runtime environment.

## Deploy on Vercel

This project now generates Prisma client code during the build so Vercel can
compile cleanly from a fresh checkout.

Important production notes:

- This project is configured for PostgreSQL in production.
- For Prisma, set `DATABASE_URL` to the pooled runtime connection string.
- Set `DIRECT_URL` to the non-pooled Postgres connection string for Prisma
  migrations and other CLI work.
- SAPF DOCX downloads work on Vercel because they are generated in-process.
- SAPF PDF routes are resilient, but full DOCX-to-PDF conversion still depends
  on system tools such as LibreOffice or Microsoft Word automation, which are
  not normally available in Vercel functions.

Recommended Vercel environment variables:

- `DATABASE_URL`: pooled Postgres runtime URL
- `DIRECT_URL`: direct Postgres URL for Prisma CLI/migrations
- `BETTER_AUTH_URL`: your primary production URL
- `NEXT_PUBLIC_URL`: same public URL used by the browser client
- `BETTER_AUTH_SECRET`: strong random secret
- `SMTP_*`, `SENDER_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` as needed

If you want persistent SQLite instead, prefer the included Docker deployment
instead of Vercel.
