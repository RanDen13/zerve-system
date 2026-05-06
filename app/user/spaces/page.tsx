import AdminSpaces from "@/app/components/pages/Spaces/Admin";
import {
  getAllEventSpaces,
  getGlobalVenueBlocks,
} from "@/app/components/pages/Spaces/EventSpaceActions";
import OfficerSpaces from "@/app/components/pages/Spaces/Officer";
import ErrorPopup from "@/app/components/Popup/ErrorPopup";
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

  const [result, blocksResult] = await Promise.all([
    getAllEventSpaces(),
    getGlobalVenueBlocks(),
  ]);
  if (!result.success) {
    return (
      <ErrorPopup message={result.message || "Failed to load event spaces."} />
    );
  }

  const role = session.user.role?.toUpperCase();
  const globalBlocks = blocksResult.success ? blocksResult.data || [] : [];

  if (role === "SUPER_ADMIN") {
    return <AdminSpaces eventSpaces={result.data || []} globalBlocks={globalBlocks} />;
  } else if (["OFFICER", "APPROVER", "ADMIN"].includes(role || "")) {
    return (
      <OfficerSpaces
        eventSpaces={result.data || []}
        globalBlocks={globalBlocks}
        canCreateBooking={role === "OFFICER"}
      />
    );
  }

  return <ErrorPopup message="Unauthorized access." />;
};

export default page;
