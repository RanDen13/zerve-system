"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { MotionPage, MotionSection } from "@/app/components/ui/motion";
import { startTutorialProgress } from "@/app/components/Tutorial/TutorialActions";
import { authClient } from "@/lib/auth-client";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Map,
  RotateCcw,
  X,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import {
  updateSystemSettings,
  updateUserNotificationPreferences,
} from "./SystemSettingsActions";

type SystemSettingsData = {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  senderName: string;
};

type AppRole = "OFFICER" | "APPROVER" | "ADMIN" | "SUPER_ADMIN" | string;

export default function SystemSettingsPage({
  initialSettings,
  initialNotificationPreferences,
  userRole,
}: {
  initialSettings: SystemSettingsData | null;
  initialNotificationPreferences: {
    emailNotificationsEnabled: boolean;
  };
  userRole: AppRole;
}) {
  const popup = usePopup();
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [startingTutorial, setStartingTutorial] = useState(false);
  const canRestartTutorial = ["OFFICER", "APPROVER", "ADMIN"].includes(
    userRole,
  );

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    const result = await updateSystemSettings(formData);
    setSaving(false);

    if (!result.success) {
      popup.showError(result.message);
      return;
    }

    popup.showSuccess(result.message || "Settings updated.");
  };

  const handleNotificationSubmit = async (formData: FormData) => {
    setSavingNotifications(true);
    const result = await updateUserNotificationPreferences(formData);
    setSavingNotifications(false);

    if (!result.success) {
      popup.showError(result.message);
      return;
    }

    popup.showSuccess(result.message || "Notification preferences updated.");
  };

  const handleTutorialRestart = async () => {
    setStartingTutorial(true);
    const result = await startTutorialProgress();
    setStartingTutorial(false);

    if (!result.success) {
      popup.showError(result.message);
      return;
    }

    window.dispatchEvent(new Event("zerve:start-tutorial"));
  };

  return (
    <MotionPage className="space-y-6 p-4 lg:p-8">
      <MotionSection>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage account security and system configuration.
        </p>
      </MotionSection>

      <MotionSection>
      <Card data-tour="settings-password">
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Update your account password and optionally sign out other active
            sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LockKeyhole className="h-5 w-5 text-foreground" />
            <span>Use your current password to confirm this change.</span>
          </div>
          <Button onClick={() => setPasswordOpen(true)}>Change Password</Button>
        </CardContent>
      </Card>
      </MotionSection>

      <MotionSection>
        <Card data-tour="settings-notifications">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Control whether workflow updates are sent to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={handleNotificationSubmit}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id="emailNotificationsEnabled"
                  name="emailNotificationsEnabled"
                  defaultChecked={
                    initialNotificationPreferences.emailNotificationsEnabled
                  }
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="emailNotificationsEnabled"
                    className="cursor-pointer font-medium"
                  >
                    Receive email workflow notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    In-app notifications will still appear even when email is
                    disabled.
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={savingNotifications}>
                {savingNotifications ? "Saving..." : "Save preference"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </MotionSection>

      {canRestartTutorial && (
        <MotionSection>
          <Card data-tour="settings-tutorial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Tutorial
              </CardTitle>
              <CardDescription>
                Restart the guided walkthrough for this account role.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                The result is saved when you finish or cancel it.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleTutorialRestart}
                disabled={startingTutorial}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {startingTutorial ? "Starting..." : "Restart Tutorial"}
              </Button>
            </CardContent>
          </Card>
        </MotionSection>
      )}

      {initialSettings && (
        <MotionSection>
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>
              Defaults to Google SMTP. Sender details control the From line.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground md:col-span-2">
                  SMTP User/Password authenticate with your mail provider.
                  Sender Email/Name show to recipients in the From field.
                </div>
                <div>
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    name="smtpHost"
                    placeholder="smtp.gmail.com"
                    defaultValue={initialSettings.smtpHost}
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    name="smtpPort"
                    type="number"
                    min={1}
                    max={65535}
                    defaultValue={initialSettings.smtpPort}
                  />
                </div>
                <div>
                  <Label htmlFor="smtpUser">SMTP User (full email)</Label>
                  <Input
                    id="smtpUser"
                    name="smtpUser"
                    placeholder="name@lcu.edu.ph"
                    autoComplete="username"
                    defaultValue={initialSettings.smtpUser}
                  />
                  <p className="text-xs text-muted-foreground">
                    The login account for SMTP authentication.
                  </p>
                </div>
                <div>
                  <Label htmlFor="smtpPass">SMTP Password (app password)</Label>
                  <Input
                    id="smtpPass"
                    name="smtpPass"
                    type="password"
                    autoComplete="current-password"
                    defaultValue={initialSettings.smtpPass}
                  />
                </div>
                <div>
                  <Label htmlFor="senderEmail">
                    Sender Email (From address)
                  </Label>
                  <Input
                    id="senderEmail"
                    name="senderEmail"
                    type="email"
                    placeholder="name@lcu.edu.ph"
                    autoComplete="email"
                    defaultValue={initialSettings.senderEmail}
                  />
                  <p className="text-xs text-muted-foreground">
                    The From address shown to recipients. Often the same as SMTP
                    user.
                  </p>
                </div>
                <div>
                  <Label htmlFor="senderName">Sender Name (From name)</Label>
                  <Input
                    id="senderName"
                    name="senderName"
                    placeholder="Zerve"
                    autoComplete="name"
                    defaultValue={initialSettings.senderName}
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name shown to recipients.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save settings"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </MotionSection>
      )}

      {passwordOpen && (
        <ChangePasswordModal onClose={() => setPasswordOpen(false)} />
      )}
    </MotionPage>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const popup = usePopup();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checks = useMemo(
    () => ({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
      match: newPassword.length > 0 && newPassword === confirmPassword,
      changed: currentPassword.length > 0 && newPassword !== currentPassword,
    }),
    [confirmPassword, currentPassword, newPassword],
  );

  const canSubmit =
    currentPassword.length > 0 && Object.values(checks).every(Boolean);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    });
    setSubmitting(false);

    if (error) {
      popup.showError(error.message || "Failed to change password.");
      return;
    }

    popup.showSuccess("Password updated.");
    onClose();
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
    autoComplete: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-11 pr-10"
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <ModalBase onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex max-h-[90vh] w-[min(92vw,32rem)] flex-col overflow-hidden rounded-lg bg-card text-card-foreground shadow-2xl">
          <div className="flex items-center justify-between border-b p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Change Password</h2>
                <p className="text-sm text-muted-foreground">
                  Confirm your current password first.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close change password dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-6">
            {passwordInput(
              "currentPassword",
              "Current Password",
              currentPassword,
              setCurrentPassword,
              showCurrentPassword,
              setShowCurrentPassword,
              "current-password",
            )}
            {passwordInput(
              "newPassword",
              "New Password",
              newPassword,
              setNewPassword,
              showNewPassword,
              setShowNewPassword,
              "new-password",
            )}
            {passwordInput(
              "confirmPassword",
              "Confirm Password",
              confirmPassword,
              setConfirmPassword,
              showConfirmPassword,
              setShowConfirmPassword,
              "new-password",
            )}

            <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
              {requirement(checks.length, "At least 8 characters")}
              {requirement(checks.uppercase, "One uppercase letter")}
              {requirement(checks.number, "One number")}
              {requirement(checks.special, "One special character")}
              {requirement(checks.match, "Passwords match")}
              {requirement(checks.changed, "Different from current password")}
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <Checkbox
                id="revokeOtherSessions"
                checked={revokeOtherSessions}
                onCheckedChange={(checked) =>
                  setRevokeOtherSessions(checked === true)
                }
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="revokeOtherSessions"
                  className="cursor-pointer font-medium"
                >
                  Revoke other active sessions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Keep this checked to sign out other browsers and devices.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t bg-muted/40 p-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </div>
      </form>
    </ModalBase>
  );
}
