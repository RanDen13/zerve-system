import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { AlertTriangle, HelpCircle } from "lucide-react";
import ModalBase from "./ModalBase";

const YesNoPopup = ({
  message,
  onYes,
  onNo,
  warning = false,
}: {
  message?: string;
  onYes?: () => void;
  onNo?: () => void;
  warning?: boolean;
}) => {
  return (
    <ModalBase onClose={onNo} ariaLabel="Confirm action">
      <Card className="w-[min(92vw,28rem)] border border-border bg-card shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                warning
                  ? "border-amber-200/60 bg-amber-500/10"
                  : "border-primary/30 bg-primary/10"
              }`}
            >
              {warning ? (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              ) : (
                <HelpCircle className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-normal text-foreground">
                Confirm action
              </p>
              <p className="max-w-xs break-words text-sm leading-6 text-muted-foreground">
                {message || "Are you sure?"}
              </p>
            </div>
            <div className="mt-2 flex w-full flex-col items-center justify-stretch gap-2 sm:flex-row">
              <Button
                variant={warning ? "destructive" : "default"}
                className="w-full sm:flex-1"
                onClick={onYes}
              >
                Continue
              </Button>
              <Button
                variant="outline"
                className="w-full sm:flex-1"
                onClick={onNo}
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default YesNoPopup;
