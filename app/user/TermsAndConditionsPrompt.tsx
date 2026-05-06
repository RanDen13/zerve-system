"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
import { Button } from "@/app/components/ui/button";
import { ScrollText, ShieldCheck } from "lucide-react";
import { useSyncExternalStore } from "react";

const termsVersion = "2026-05";

export default function TermsAndConditionsPrompt({
  sessionId,
}: {
  sessionId: string;
}) {
  const storageKey = `zerve:terms-accepted:${termsVersion}:${sessionId}`;
  const accepted = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("zerve-terms-accepted", onStoreChange);

      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("zerve-terms-accepted", onStoreChange);
      };
    },
    () => localStorage.getItem(storageKey) === "true",
    () => true,
  );

  function acceptTerms() {
    localStorage.setItem(storageKey, "true");
    window.dispatchEvent(new Event("zerve-terms-accepted"));
  }

  if (accepted) return null;

  return (
    <ModalBase>
      <div className="w-[min(92vw,560px)] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-start gap-4 border-b border-border bg-muted/40 px-6 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScrollText className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Terms and Conditions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Please review and accept these terms to continue using Zerve.
            </p>
          </div>
        </div>

        <div className="max-h-[52vh] space-y-4 overflow-y-auto px-6 py-5 text-sm leading-6 text-muted-foreground">
          <p>
            By using Zerve, you agree to provide accurate reservation,
            account, and activity information. Requests, uploaded files,
            approvals, comments, and schedules must be related to legitimate
            university reservation workflows.
          </p>
          <p>
            You are responsible for keeping your account secure and for actions
            made under your session. Do not share your password, magic code, or
            access with another person.
          </p>
          <p>
            Information in the system may be reviewed by authorized personnel
            for reservation processing, approval, compliance, auditing, and
            support purposes. Misuse of the system may result in restricted
            access.
          </p>
          <p>
            Continue only if you understand and agree to follow these terms
            while using the reservation system.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>This prompt appears once per login session.</span>
          </div>
          <Button type="button" onClick={acceptTerms} className="h-10 px-5">
            I Agree
          </Button>
        </div>
      </div>
    </ModalBase>
  );
}
