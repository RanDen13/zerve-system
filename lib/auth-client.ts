import {
  inferAdditionalFields,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "next-runtime-env";
import type { auth } from "./auth";

const baseUrl =
  env("NEXT_PUBLIC_URL") ||
  (typeof window !== "undefined" ? window.location.origin : "") ||
  "http://localhost:3000";

const authClient = createAuthClient({
  baseURL: baseUrl,
  plugins: [inferAdditionalFields<typeof auth>(), magicLinkClient()],
});

export const { signIn, useSession, signOut } = authClient;
export { authClient };
