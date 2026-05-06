"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModalBase from "./ModalBase";

type ErrorScreenProps = {
  message?: string;
  onClose?: () => void;
  redirectTo?: string;
  retry?: boolean;
  notTransparent?: boolean;
  bgColor?: string;
  closeText?: string;
  buttonVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
};

const ErrorPopup = ({
  message = "Unknown Error",
  onClose,
  redirectTo,
  retry = false,
  notTransparent,
  bgColor,
  closeText = "Close",
  buttonVariant = "destructive",
}: ErrorScreenProps) => {
  const router = useRouter();

  return (
    <ModalBase notTransparent={notTransparent} bgColor={bgColor}>
      <Card className="max-w-md w-full shadow-lg border border-destructive/30 bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-destructive uppercase tracking-wider">
                Something went wrong
              </p>
              <p className="text-sm text-muted-foreground wrap-break-words max-w-xs">
                {message}
              </p>
            </div>
            <div
              className={`flex flex-col sm:flex-row gap-2 w-full mt-2 ${
                retry ? "justify-between" : "justify-center"
              }`}
            >
              {retry && (
                <Button
                  variant="outline"
                  onClick={() => router.refresh()}
                  className="flex-1"
                >
                  Retry
                </Button>
              )}
              {redirectTo ? (
                <Link href={redirectTo} className="flex-1">
                  <Button
                    variant={buttonVariant}
                    onClick={onClose}
                    className="w-full"
                  >
                    {closeText}
                  </Button>
                </Link>
              ) : onClose ? (
                <Button
                  variant={buttonVariant}
                  onClick={onClose}
                  className="flex-1"
                >
                  {closeText}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default ErrorPopup;
