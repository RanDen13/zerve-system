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
                <div className="w-16 h-16 bg-gradient-to-br from-destructive to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <LogOut className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <div>
                <p className="text-xs font-semibold tracking-[0.25em] uppercase text-primary mb-2">
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
