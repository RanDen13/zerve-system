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
import { signIn } from "@/lib/auth-client";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { env } from "next-runtime-env";
import { useEffect, useMemo, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { usePopup } from "../../Popup/PopupProvider";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const magicCodeLength = 10;
const magicCodeGroupSize = 5;
const recaptchaSiteKey = env("NEXT_PUBLIC_RECAPTCHA_SITE_KEY")?.trim();

declare global {
  interface Window {
    grecaptcha?: {
      ready(callback: () => void): void;
      render(
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          theme?: "light" | "dark";
          size?: "compact" | "normal";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ): number;
      getResponse(widgetId?: number): string;
      reset(widgetId?: number): void;
    };
  }
}

function normalizeMagicCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, magicCodeLength);
}

function formatMagicCode(value: string) {
  return (
    normalizeMagicCode(value)
      .match(new RegExp(`.{1,${magicCodeGroupSize}}`, "g"))
      ?.join("-") ?? ""
  );
}

function signInErrorMessage(errorCode: string) {
  switch (errorCode) {
    case "INVALID_TOKEN":
      return "That magic code was not recognized. Check the code and try again.";
    case "EXPIRED_TOKEN":
      return "That magic code has expired. Request a new code and try again.";
    case "signup_disabled":
    case "new_user_signup_disabled":
      return "This account must be created by the super admin first.";
    case "OAUTH_LINK_ERROR":
      return "Google sign-in could not be linked to this account.";
    case "PROVIDER_NOT_FOUND":
      return "Google sign-in is not configured yet.";
    default:
      return "Sign-in could not be completed. Please try again.";
  }
}

const Login = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verifyingMagicCode, setVerifyingMagicCode] = useState(false);
  const [magicCode, setMagicCode] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [recaptchaScriptReady, setRecaptchaScriptReady] = useState(
    !recaptchaSiteKey,
  );
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaStatus, setCaptchaStatus] = useState<
    "disabled" | "loading" | "ready" | "error"
  >(recaptchaSiteKey ? "loading" : "disabled");
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);
  const statusPopup = usePopup();
  const normalizedMagicCode = useMemo(
    () => normalizeMagicCode(magicCode),
    [magicCode],
  );
  const busy = loading || googleLoading || verifyingMagicCode;
  const captchaRequired = Boolean(recaptchaSiteKey);
  const isCaptchaComplete = !captchaRequired || Boolean(captchaToken);

  useEffect(() => {
    if (
      !recaptchaSiteKey ||
      !recaptchaScriptReady ||
      !window.grecaptcha ||
      !recaptchaContainerRef.current ||
      recaptchaWidgetIdRef.current !== null
    ) {
      return;
    }

    window.grecaptcha.ready(() => {
      if (!recaptchaContainerRef.current || recaptchaWidgetIdRef.current !== null) {
        return;
      }

      recaptchaWidgetIdRef.current = window.grecaptcha?.render(
        recaptchaContainerRef.current,
        {
          sitekey: recaptchaSiteKey,
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaStatus("ready");
          },
          "expired-callback": () => {
            setCaptchaToken("");
            setCaptchaStatus("ready");
          },
          "error-callback": () => {
            setCaptchaToken("");
            setCaptchaStatus("error");
          },
        },
      ) ?? null;

      setCaptchaStatus("ready");
    });
  }, [recaptchaScriptReady]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (!error) return;

    statusPopup.showError(signInErrorMessage(error));
    window.history.replaceState({}, "", window.location.pathname);
  }, [statusPopup]);

  function resetCaptcha() {
    if (!recaptchaSiteKey) return;

    setCaptchaToken("");

    if (
      recaptchaWidgetIdRef.current !== null &&
      typeof window !== "undefined" &&
      window.grecaptcha
    ) {
      window.grecaptcha.reset(recaptchaWidgetIdRef.current);
    }
  }

  function getCaptchaTokenOrThrow() {
    if (!recaptchaSiteKey) return "";

    const token =
      captchaToken ||
      (recaptchaWidgetIdRef.current !== null && window.grecaptcha
        ? window.grecaptcha.getResponse(recaptchaWidgetIdRef.current)
        : "");

    if (!token) {
      throw new Error("Please complete the 'I'm not a robot' check first.");
    }

    return token;
  }

  async function handleLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const solvedCaptchaToken = getCaptchaTokenOrThrow();

      await signIn.email(
        {
          email: loginEmail,
          password: loginPassword,
          callbackURL: "/user/dashboard",
        },
        {
          headers: solvedCaptchaToken
            ? {
                "x-captcha-response": solvedCaptchaToken,
              }
            : undefined,
          onError: (ctx) => {
            statusPopup.showError(ctx.error.message || "Login failed");
            resetCaptcha();
          },
        },
      );
    } catch (error) {
      statusPopup.showError(
        error instanceof Error ? error.message : "reCAPTCHA failed to run.",
      );
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);

    try {
      const solvedCaptchaToken = getCaptchaTokenOrThrow();

      await signIn.social(
        {
          provider: "google",
          callbackURL: "/user/dashboard",
          errorCallbackURL: "/login",
        },
        {
          headers: {
            "x-captcha-response": solvedCaptchaToken,
          },
          onError: (ctx) => {
            statusPopup.showError(ctx.error.message || "Google sign-in failed");
            resetCaptcha();
            setGoogleLoading(false);
          },
        },
      );
    } catch (error) {
      statusPopup.showError(
        error instanceof Error ? error.message : "Google sign-in failed.",
      );
      resetCaptcha();
      setGoogleLoading(false);
    }
  }

  function handleMagicCodeLogin() {
    if (normalizedMagicCode.length !== magicCodeLength) {
      statusPopup.showError("Enter the full magic code from your email.");
      return;
    }

    try {
      getCaptchaTokenOrThrow();
    } catch (error) {
      statusPopup.showError(
        error instanceof Error ? error.message : "reCAPTCHA failed to run.",
      );
      resetCaptcha();
      return;
    }

    setVerifyingMagicCode(true);
    const verifyUrl = new URL(
      "/api/auth/magic-link/verify",
      window.location.origin,
    );
    verifyUrl.searchParams.set("token", normalizedMagicCode);
    verifyUrl.searchParams.set("callbackURL", "/first-login");
    verifyUrl.searchParams.set("newUserCallbackURL", "/first-login");
    verifyUrl.searchParams.set("errorCallbackURL", "/login");
    window.location.assign(verifyUrl.toString());
  }

  return (
    <>
      {recaptchaSiteKey && (
        <Script
          src="https://www.google.com/recaptcha/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => {
            setRecaptchaScriptReady(true);
            setCaptchaStatus("loading");
          }}
          onError={() => {
            setCaptchaStatus("error");
          }}
        />
      )}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/40 px-4 py-10 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full opacity-30 blur-3xl"
          animate={{
            y: [0, 50, 0],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-96 h-96 bg-secondary/50 rounded-full opacity-30 blur-3xl"
          animate={{
            y: [0, -50, 0],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card className="border border-border/60 shadow-xl backdrop-blur-sm bg-card/90">
            <CardHeader className="text-center space-y-4 pb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-block mx-auto"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-base mt-2 text-muted-foreground">
                  Sign in to access your Zerve account
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="login-email"
                    className="text-sm font-semibold"
                  >
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={busy}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 h-12 text-base"
                      placeholder="admin@lcup.edu.ph"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label
                      htmlFor="login-password"
                      className="text-sm font-semibold"
                    >
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      disabled={busy}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 text-base"
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      disabled={busy}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={busy || !isCaptchaComplete}
                  className="w-full h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg cursor-pointer"
                >
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Lock className="h-5 w-5" />
                      </motion.div>
                      Logging in...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-5 w-5" />
                      Log In
                    </>
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Or Continue With
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={busy || !isCaptchaComplete}
                onClick={handleGoogleSignIn}
                className="h-12 w-full bg-background text-base shadow-sm hover:bg-muted/60"
              >
                {googleLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    <Lock className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <FcGoogle className="mr-2 h-5 w-5" />
                )}
                {googleLoading ? "Opening Google..." : "Sign In With Google"}
              </Button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Magic Code
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-code" className="text-sm font-semibold">
                    Magic Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="magic-code"
                      value={magicCode}
                      onChange={(event) =>
                        setMagicCode(formatMagicCode(event.target.value))
                      }
                      className="h-12 pl-10 text-base uppercase tracking-[0.2em]"
                      placeholder="ABCDE-FGHIJ"
                      disabled={busy}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={busy || !isCaptchaComplete}
                  onClick={handleMagicCodeLogin}
                  className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <KeyRound className="mr-2 h-5 w-5" />
                  {verifyingMagicCode
                    ? "Checking..."
                    : "Sign In With Magic Code"}
                </Button>

                {recaptchaSiteKey && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Human Check
                    </Label>
                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="flex min-h-[86px] items-center justify-center">
                        <div
                          ref={recaptchaContainerRef}
                          className="flex min-h-[78px] items-center justify-center"
                        />
                      </div>
                      {captchaStatus === "loading" && (
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          Loading the human check...
                        </p>
                      )}
                      {captchaStatus === "error" && (
                        <p className="mt-2 text-center text-xs text-destructive">
                          reCAPTCHA could not load. Refresh the page and try
                          again.
                        </p>
                      )}
                      {captchaStatus === "ready" && !captchaToken && (
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          Complete the &quot;I&apos;m not a robot&quot; check
                          before using any sign-in option.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <p className="mt-4 text-xs text-center text-muted-foreground">
                Accounts are created by the super admin. New accounts receive a
                magic code first.
              </p>
            </CardContent>
          </Card>

          {/* Back to Home Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>
      </div>
    </>
  );
};

export default Login;
