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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { usePopup } from "../../Popup/PopupProvider";
import { resetPasswordWithToken } from "./PasswordResetActions";

export default function ResetPasswordForm({ token }: { token: string }) {
  const popup = usePopup();
  const router = useRouter();
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
  const canSubmit = Boolean(token) && Object.values(checks).every(Boolean);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const result = await resetPasswordWithToken(token, password);
    setLoading(false);

    if (!result.success) {
      popup.showError(result.message || "Failed to reset password.");
      return;
    }

    popup.showSuccess(result.message || "Password reset.");
    router.push("/login");
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

  const passwordInput = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    show: boolean,
    setShow: (value: boolean) => void,
    autoFocus = false,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-12 pr-10"
          autoComplete="new-password"
          required
          autoFocus={autoFocus}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              Request a new password reset link to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/forgot-password">Request New Link</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border border-border/60 shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-7 w-7" />
          </div>
          <CardTitle className="text-3xl">Create New Password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {passwordInput(
              "new-password",
              "New Password",
              password,
              setPassword,
              showPassword,
              setShowPassword,
              true,
            )}
            {passwordInput(
              "confirm-new-password",
              "Confirm Password",
              confirmPassword,
              setConfirmPassword,
              showConfirmPassword,
              setShowConfirmPassword,
            )}

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
              className="h-12 w-full"
            >
              {loading ? "Saving..." : "Save New Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
