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
    <ModalBase>
      <Card className="max-w-md w-full shadow-lg border border-emerald-200/50 bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-200/50">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-emerald-500 uppercase tracking-wider">
                Success
              </p>
              {message && (
                <p className="text-sm text-muted-foreground wrap-break-words max-w-xs">
                  {message}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
              {redirectTo ? (
                <Link href={redirectTo} className="w-full">
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                </Link>
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
