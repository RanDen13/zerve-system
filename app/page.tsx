"use client";

import AppLogo from "@/app/components/AppLogo";
import { ModeToggle } from "@/app/components/mode-toggle";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  FileText,
  LayoutDashboard,
  LogIn,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 36 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.09,
    },
  },
};

const workflowSteps = [
  "Officer submits reservation",
  "Approvers review in sequence",
  "SDS clears requirements",
  "Final PDF is verified",
];

const features = [
  {
    title: "Venue Availability",
    description:
      "Check public venue schedules, blocks, and pending reservations before planning an activity.",
    icon: CalendarDays,
    color: "text-blue-700 dark:text-blue-200",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
  },
  {
    title: "Reservation Workflow",
    description:
      "Submit activity details, support requests, approvals, and SDS clearance in one tracked flow.",
    icon: FileText,
    color: "text-emerald-700 dark:text-emerald-200",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
  },
  {
    title: "Approval Progress",
    description:
      "Follow every required reviewer from adviser through university president with clear status markers.",
    icon: CheckCircle,
    color: "text-indigo-700 dark:text-indigo-200",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
  },
  {
    title: "Private Concerns",
    description:
      "Reviewers and officers can resolve request-specific concerns without exposing private discussions.",
    icon: Users,
    color: "text-orange-700 dark:text-orange-200",
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
  },
  {
    title: "Secure Access",
    description:
      "Accounts and approver roles are managed by administrators for an officer-only reservation process.",
    icon: ShieldCheck,
    color: "text-red-700 dark:text-red-200",
    bg: "bg-red-500/10 dark:bg-red-500/20",
  },
  {
    title: "Verified Output",
    description:
      "Approved reservation documents can include verification details for dependable final records.",
    icon: Clock,
    color: "text-cyan-700 dark:text-cyan-200",
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
  },
];

export default function Home() {
  const session = useSession();
  const isLoggedIn = Boolean(session.data?.user);
  const accountHref = isLoggedIn ? "/user/dashboard" : "/login";
  const AccountIcon = isLoggedIn ? LayoutDashboard : LogIn;
  const accountLabel = isLoggedIn ? "Go to dashboard" : "Login";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative flex min-h-[92vh] items-center overflow-hidden px-4 py-20 sm:px-6 lg:px-20">
        <Image
          src="/lcupBg.png"
          alt="La Consolacion University Philippines"
          fill
          className="object-cover"
          priority
          quality={100}
        />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />

        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur">
          Theme
          <div className="text-foreground">
            <ModeToggle />
          </div>
        </div>

        <motion.div
          className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div
            className="max-w-3xl text-center text-white lg:text-left"
            variants={fadeInUp}
          >
            <motion.p
              variants={fadeInUp}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 backdrop-blur"
            >
              <AppLogo className="h-4 w-4 shrink-0" variant="light" />
              <span>Zerve</span>
            </motion.p>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-7xl"
            >
              Reserve venues and track approvals with confidence.
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80 lg:mx-0"
            >
              View campus venue availability, submit officer-only Zerve
              requests, and follow every approval step from adviser to
              completion.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <Button asChild size="lg">
                <Link href={accountHref}>
                  <AccountIcon className="mr-2 h-5 w-5" />
                  {accountLabel}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/35 bg-white/10 px-8 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/calendar">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Public Calendar
                </Link>
              </Button>
            </motion.div>
            <motion.p
              variants={fadeInUp}
              className="mt-5 text-sm text-white/60"
            >
              Accounts are created by the super admin. Public self-registration
              is disabled.
            </motion.p>
          </motion.div>

          <motion.div
            className="rounded-lg border border-white/20 bg-white/10 p-5 text-white shadow-2xl backdrop-blur-md"
            variants={fadeInUp}
          >
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Reservation Request Flow</p>
                  <p className="text-sm text-white/60">
                    Live approval tracking
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                Active
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/10 p-3"
                  variants={fadeInUp}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium">{step}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:px-6">
        <motion.div
          className="grid rounded-lg border bg-card p-5 shadow-xl sm:grid-cols-3"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex items-center gap-4 p-4">
            <MapPin className="h-9 w-9 text-blue-700 dark:text-blue-200" />
            <div>
              <p className="text-2xl font-bold">Venue</p>
              <p className="text-sm text-muted-foreground">
                Availability visibility
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t p-4 sm:border-l sm:border-t-0">
            <FileText className="h-9 w-9 text-emerald-700 dark:text-emerald-200" />
            <div>
              <p className="text-2xl font-bold">Reservation</p>
              <p className="text-sm text-muted-foreground">
                Structured submissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t p-4 sm:border-l sm:border-t-0">
            <CheckCircle className="h-9 w-9 text-indigo-700 dark:text-indigo-200" />
            <div>
              <p className="text-2xl font-bold">Approval</p>
              <p className="text-sm text-muted-foreground">
                End-to-end progress
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 max-w-3xl"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built around the Zerve approval workflow.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            The system supports practical reservation work: venue scheduling,
            reviewer routing, SDS clearance, document generation, and progress
            visibility.
          </p>
        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${feature.bg}`}
                    >
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="overflow-hidden rounded-lg bg-slate-950 px-6 py-12 text-center text-white dark:bg-slate-900 sm:px-10"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to manage your venue reservation?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/70">
            Sign in with your Zerve account or check the public calendar before
            planning your activity.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={accountHref}>
                {isLoggedIn ? "Go to dashboard" : "Sign in"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/45 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/calendar">View calendar</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t bg-background py-8 text-center text-sm text-muted-foreground">
        Copyright 2026 La Consolacion University Philippines. Zerve.
      </footer>
    </div>
  );
}
