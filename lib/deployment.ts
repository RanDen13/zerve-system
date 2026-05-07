function envUrl(value?: string | null) {
  if (!value) return undefined;
  return value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;
}

export function getAppUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_URL ||
    envUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    envUrl(process.env.VERCEL_URL) ||
    "http://localhost:3000"
  );
}
