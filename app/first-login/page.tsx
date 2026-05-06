import FirstLoginPassword from "@/app/components/pages/Credential/FirstLoginPassword";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "credential",
      password: {
        not: null,
      },
    },
  });

  if (credentialAccount) {
    redirect("/user/dashboard");
  }

  return <FirstLoginPassword name={session.user.name} email={session.user.email} />;
}
