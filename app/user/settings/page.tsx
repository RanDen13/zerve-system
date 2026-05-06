import {
  getSystemSettings,
  getUserNotificationPreferences,
} from "@/app/components/pages/Settings/SystemSettingsActions";
import SystemSettingsPage from "@/app/components/pages/Settings/SystemSettingsPage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  let settings = null;
  let notificationPreferences = {
    emailNotificationsEnabled: true,
  };

  const notificationResult = await getUserNotificationPreferences();
  if (notificationResult.success && notificationResult.data) {
    notificationPreferences = notificationResult.data;
  }

  if (session.user.role?.toUpperCase() === "SUPER_ADMIN") {
    const result = await getSystemSettings();
    if (!result.success || !result.data) {
      redirect("/user/dashboard");
    }
    settings = result.data;
  }

  return (
    <SystemSettingsPage
      initialSettings={settings}
      initialNotificationPreferences={notificationPreferences}
      userRole={session.user.role?.toUpperCase() || ""}
    />
  );
}
