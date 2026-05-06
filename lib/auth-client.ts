import {
  inferAdditionalFields,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "next-runtime-env";
import type { auth } from "./auth";

const authClient = createAuthClient({
  baseURL: env("NEXT_PUBLIC_URL") || "http://localhost:3000",
  plugins: [inferAdditionalFields<typeof auth>(), magicLinkClient()],
});

export const { signIn, useSession, signOut } = authClient;
export { authClient };
