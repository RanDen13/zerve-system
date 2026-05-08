"use client";

import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { signOut, useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function SignOutPage() {
  const router = useRouter();
  const session = useSession();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      router.replace("/");
    }
  }, [router, session.data?.user, session.isPending]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace("/");
  };

  if (session.isPending || !session.data?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          transition={{ duration: 0.35 }}
        >
          <Card className="border border-border/60 shadow-xl backdrop-blur-sm bg-card/90">
            <CardHeader className="text-center space-y-4 pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-block mx-auto"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 shadow-sm">
                  <LogOut className="h-8 w-8 text-destructive" />
                </div>
              </motion.div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-primary">
                  Zerve
                </p>
                <CardTitle className="text-2xl sm:text-3xl font-bold">
                  Ready to sign out?
                </CardTitle>
                <CardDescription className="text-sm mt-2 max-w-sm mx-auto text-muted-foreground">
                  You&apos;ll be signed out from your Zerve session. You can always
                  sign back in to continue managing your reservations.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <Button
                type="button"
                onClick={handleSignOut}
                variant="destructive"
                className="w-full h-12 text-base flex items-center justify-center gap-2 cursor-pointer"
                disabled={signingOut}
              >
                <LogOut className="w-5 h-5" />
                <span>{signingOut ? "Signing out..." : "Sign out"}</span>
              </Button>

              <Button
                type="button"
                onClick={() => router.back()}
                variant="outline"
                className="w-full h-12 text-base flex items-center justify-center gap-2 cursor-pointer"
                disabled={signingOut}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Go back</span>
              </Button>

              <p className="mt-4 text-[11px] text-center text-muted-foreground">
                Thank you for using Zerve.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
