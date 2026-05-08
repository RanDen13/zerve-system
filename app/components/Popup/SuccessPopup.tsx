"use client";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import ModalBase from "./ModalBase";

type SuccessScreenProps = {
  message?: string;
  onClose?: () => void;
  redirectTo?: string;
};

const SuccessPopup = ({
  message = "Success",
  onClose,
  redirectTo,
}: SuccessScreenProps) => {
  return (
    <ModalBase onClose={onClose} ariaLabel="Success message">
      <Card className="w-[min(92vw,28rem)] border border-emerald-200/50 bg-card shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-normal text-emerald-500">
                Success
              </p>
              {message && (
                <p className="max-w-xs break-words text-sm leading-6 text-muted-foreground">
                  {message}
                </p>
              )}
            </div>
            <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
              {redirectTo ? (
                <Button
                  asChild
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onClose}
                >
                  <Link href={redirectTo}>
                    Close
                  </Link>
                </Button>
              ) : (
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onClose}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default SuccessPopup;
