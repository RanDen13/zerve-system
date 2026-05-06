"use client";

import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { usePopup } from "../../Popup/PopupProvider";
import { setInitialPassword } from "./PasswordActions";

type FirstLoginPasswordProps = {
  name?: string | null;
  email?: string | null;
};

export default function FirstLoginPassword({
  name,
  email,
}: FirstLoginPasswordProps) {
  const router = useRouter();
  const popup = usePopup();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = useMemo(
    () => ({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: password.length > 0 && password === confirmPassword,
    }),
    [confirmPassword, password],
  );

  const canSubmit = Object.values(checks).every(Boolean);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const result = await setInitialPassword(password);
    setLoading(false);

    if (!result.success) {
      popup.showError(result.message || "Failed to set password.");
      return;
    }

    popup.showSuccess("Password created. Welcome to Zerve.");
    router.push("/user/dashboard");
  }

  const requirement = (ok: boolean, label: string) => (
    <div
      className={
        ok
          ? "flex items-center gap-2 text-emerald-600"
          : "flex items-center gap-2 text-muted-foreground"
      }
    >
      <CheckCircle2 className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border border-border/60 bg-card shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-7 w-7" />
          </div>
          <CardTitle className="text-3xl">Create Your Password</CardTitle>
          <CardDescription>
            {name ? `Welcome, ${name}. ` : ""}
            Finish setting up {email || "your Zerve account"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-12 pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
              {requirement(checks.length, "At least 8 characters")}
              {requirement(checks.uppercase, "One uppercase letter")}
              {requirement(checks.number, "One number")}
              {requirement(checks.special, "One special character")}
              {requirement(checks.match, "Passwords match")}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit || loading}
              className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Saving..." : "Save Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
