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
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePopup } from "../../Popup/PopupProvider";
import { requestPasswordResetEmail } from "./PasswordResetActions";

export default function ForgotPasswordForm() {
  const popup = usePopup();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const result = await requestPasswordResetEmail(email);
    setLoading(false);

    if (!result.success) {
      popup.showError(result.message || "Failed to send reset link.");
      return;
    }

    popup.showSuccess(result.message || "Reset link sent.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border border-border/60 shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mail className="h-7 w-7" />
          </div>
          <CardTitle className="text-3xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your account email and we will send a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={loading}
                className="h-12"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="h-12 w-full">
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <Button asChild variant="ghost" className="mt-4 w-full gap-2">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
