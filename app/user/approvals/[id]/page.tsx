import SapfApprovalDetailPage from "@/app/components/pages/SAPF/SapfApprovalDetailPage";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { auth } from "@/lib/auth";
import {
  canBypassSystemMaintenance,
  isSystemMaintenanceActive,
} from "@/lib/system-maintenance";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !canBypassSystemMaintenance(session.user.role) &&
    (await isSystemMaintenanceActive())
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-yellow-500/30 bg-yellow-500/10">
          <CardHeader>
            <CardTitle>Bookings under maintenance</CardTitle>
            <CardDescription>
              System maintenance is active. Bookings are available again after
              maintenance ends.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { id } = await params;

  return <SapfApprovalDetailPage requestId={id} />;
};

export default page;
