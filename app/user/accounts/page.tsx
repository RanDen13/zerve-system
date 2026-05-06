import SapfAccountsPage from "@/app/components/pages/SAPF/SapfAccountsPage";
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

  if (session.user.role?.toUpperCase() !== "SUPER_ADMIN") {
    redirect("/user/dashboard");
  }

  return <SapfAccountsPage />;
};

export default page;
