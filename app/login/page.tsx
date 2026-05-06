import Login from "@/app/components/pages/Credential/Login";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/user/dashboard");
  }

  return <Login />;
};

export default page;
