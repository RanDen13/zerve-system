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
`docx2pdf-converter`. If you run the app on Linux outside Vercel, install
`unoconv` and LibreOffice Writer for the conversion path.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This project now generates Prisma client code during the build so Vercel can
compile cleanly from a fresh checkout.

Important production notes:

- This project is configured for PostgreSQL in production.
- For Prisma, set `DATABASE_URL` to the pooled runtime connection string.
- Set `DIRECT_URL` to the non-pooled Postgres connection string for Prisma
  migrations and other CLI work.
- SAPF DOCX downloads work on Vercel because they are generated in-process.
- SAPF PDF routes fall back to an in-process renderer on Vercel when native
  DOCX-to-PDF tools are not available. Set `CONVERTAPI_TOKEN` if you want remote
  DOCX-to-PDF conversion before the fallback.

Recommended Vercel environment variables:

- `DATABASE_URL`: pooled Postgres runtime URL
- `DIRECT_URL`: direct Postgres URL for Prisma CLI/migrations
- `BETTER_AUTH_URL`: your primary production URL
- `NEXT_PUBLIC_URL`: same public URL used by the browser client
- `BETTER_AUTH_SECRET`: strong random secret
- `SMTP_*`, `SENDER_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` as needed
- `CONVERTAPI_TOKEN` if remote DOCX-to-PDF conversion is enabled

Run database migrations separately with `pnpm db:deploy` before promoting a
deployment that depends on new schema changes.
