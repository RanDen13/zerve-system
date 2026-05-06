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
    <ModalBase>
      <Card className="max-w-md w-full shadow-lg border border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${
                warning
                  ? "bg-amber-500/10 border-amber-200/60"
                  : "bg-primary/10 border-primary/30"
              }`}
            >
              {warning ? (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              ) : (
                <HelpCircle className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                Confirm action
              </p>
              <p className="text-sm text-muted-foreground wrap-break-words max-w-xs">
                {message || "Are you sure?"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-stretch gap-2 w-full mt-2">
              <Button
                className="sm:flex-1 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={onYes}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                className="sm:flex-1 w-full"
                onClick={onNo}
              >
                No
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </ModalBase>
  );
};

export default YesNoPopup;
