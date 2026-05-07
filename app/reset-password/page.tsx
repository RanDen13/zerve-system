import ResetPasswordForm from "@/app/components/pages/Credential/ResetPasswordForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token || ""} />;
}
