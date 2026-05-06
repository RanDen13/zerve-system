import SapfBookingsPage from "@/app/components/pages/SAPF/SapfBookingsPage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <SapfBookingsPage />;
};

export default page;
