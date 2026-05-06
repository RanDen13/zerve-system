"use client";

import ErrorPopup from "@/app/components/Popup/ErrorPopup";

export default function DeactivatedNotice() {
  return (
    <ErrorPopup
      message="Your account is deactivated. Please contact an administrator."
      redirectTo="/signout"
      closeText="Sign out"
      notTransparent
      buttonVariant="destructive"
    />
  );
}
