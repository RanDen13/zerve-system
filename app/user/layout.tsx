import Sidebar from "@/app/components/Dashboard/Sidebar";
import GuidedTutorial from "@/app/components/Tutorial/GuidedTutorial";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DeactivatedNotice from "./DeactivatedNotice";
import TermsAndConditionsPrompt from "./TermsAndConditionsPrompt";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const FRESH_ACCOUNT_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { banned: true, createdAt: true },
  });

  if (account?.banned) {
    return (
      <div className="min-h-screen bg-background">
        <DeactivatedNotice />
      </div>
    );
  }

  const userRole = session.user.role?.toUpperCase() as
    | "OFFICER"
    | "APPROVER"
    | "ADMIN"
    | "SUPER_ADMIN"
    | "EQUIPMENT_PROVISIONER";
  const tutorialEligible = ["OFFICER", "APPROVER"].includes(userRole || "");
  const freshAccountForTutorial = Boolean(
    account?.createdAt &&
      Date.now() - new Date(account.createdAt).getTime() <=
        FRESH_ACCOUNT_WINDOW_MS,
  );
  const tutorialProgress =
    tutorialEligible
      ? await prisma.userTutorialProgress.findUnique({
          where: {
            userId_role: {
              userId: session.user.id,
              role: userRole,
            },
          },
          select: { status: true },
        })
      : null;

  return (
    <div className="app-surface flex min-h-screen">
      <Sidebar
        userRole={userRole}
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="min-w-0 flex-1 overflow-y-auto pt-12 lg:pt-0">
        {children}
      </main>
      <TermsAndConditionsPrompt sessionId={session.session.id} />
      <GuidedTutorial
        userRole={userRole}
        initialStatus={tutorialProgress?.status ?? null}
        sessionId={session.session.id}
        isFreshAccount={freshAccountForTutorial}
      />
    </div>
  );
};

export default layout;
