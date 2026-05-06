import EventSpacePage from "@/app/components/pages/Spaces/EventSpacePage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <EventSpacePage id={id} userRole={session.user.role?.toUpperCase()} />;
};

export default page;
