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
    <ModalBase
      notTransparent={notTransparent}
      bgColor={bgColor}
      onClose={onClose}
      ariaLabel="Error message"
    >
      <Card className="w-[min(92vw,28rem)] border border-destructive/30 bg-card shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-normal text-destructive">
                Something went wrong
              </p>
              <p className="max-w-xs break-words text-sm leading-6 text-muted-foreground">
                {message}
              </p>
            </div>
            <div
              className={`mt-2 flex w-full flex-col gap-2 sm:flex-row ${
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
                <Button
                  asChild
                  variant={buttonVariant}
                  onClick={onClose}
                  className="flex-1"
                >
                  <Link href={redirectTo}>
                    {closeText}
                  </Link>
                </Button>
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
