"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import DefaultLoading from "../DefaultLoading";
import ModalBase from "./ModalBase";

const LoadingPopup = ({ message }: { message?: string }) => {
  return (
    <ModalBase ariaLabel="Loading">
      <Card className="w-[min(92vw,24rem)] border-2 shadow-2xl">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <DefaultLoading size="lg" message={message} />
            {!message && (
              <p className="text-xs text-muted-foreground">Please wait...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default LoadingPopup;
