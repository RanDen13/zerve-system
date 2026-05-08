import EquipmentDashboard from "@/app/components/pages/SAPF/EquipmentDashboard";
import SapfDashboard from "@/app/components/pages/SAPF/SapfDashboard";
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

  if (session.user.role?.toUpperCase() === "EQUIPMENT_PROVISIONER") {
    return <EquipmentDashboard />;
  }

  return <SapfDashboard />;
};

export default page;
