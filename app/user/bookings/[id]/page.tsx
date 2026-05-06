import SapfBookingDetailPage from "@/app/components/pages/SAPF/SapfBookingDetailPage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return <SapfBookingDetailPage requestId={id} />;
};

export default page;
