import EquipmentProvisioningPage from "@/app/components/pages/SAPF/EquipmentProvisioningPage";
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

  const role = session.user.role?.toUpperCase();
  if (!["EQUIPMENT_PROVISIONER", "ADMIN", "SUPER_ADMIN"].includes(role || "")) {
    redirect("/user/dashboard");
  }

  return <EquipmentProvisioningPage />;
};

export default page;
