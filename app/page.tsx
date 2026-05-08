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
  ChevronLeft,
  ChevronRight,
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
import { useRef } from "react";

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
  "Open and create request",
  "Fill up the information",
  "Submit your request for approval",
  "Wait for approval",
  "SDS clears requirements",
];

const features = [
  {
    title: "Venue Availability",
    description:
      "Check public venue schedules, blocks, and pending reservations before planning an activity.",
    icon: CalendarDays,
    color: "text-blue-100",
    bg: "bg-blue-500/25",
  },
  {
    title: "Reservation Workflow",
    description:
      "Submit activity details, support requests, approvals, and SDS clearance in one tracked flow.",
    icon: FileText,
    color: "text-emerald-100",
    bg: "bg-emerald-500/25",
  },
  {
    title: "Approval Progress",
    description:
      "Follow every required reviewer from adviser through university president with clear status markers.",
    icon: CheckCircle,
    color: "text-indigo-100",
    bg: "bg-indigo-500/25",
  },
  {
    title: "Private Concerns",
    description:
      "Reviewers and officers can resolve request-specific concerns without exposing private discussions.",
    icon: Users,
    color: "text-orange-100",
    bg: "bg-orange-500/25",
  },
  {
    title: "Secure Access",
    description:
      "Accounts and approver roles are managed by administrators for an officer-only reservation process.",
    icon: ShieldCheck,
    color: "text-red-100",
    bg: "bg-red-500/25",
  },
  {
    title: "Request History",
    description:
      "Track request updates, approvals, returns, and completion history in one visible record.",
    icon: Clock,
    color: "text-cyan-100",
    bg: "bg-cyan-500/25",
  },
];

const approvalChain = [
  {
    title: "Officer",
    detail: "Creates request, fills details, submits for review.",
    tag: "Required",
  },
  {
    title: "Adviser",
    detail: "First approver check before routing forward.",
    tag: "Required",
  },
  {
    title: "Dean",
    detail: "Selected during flow when dean approval is required.",
    tag: "Conditional",
  },
  {
    title: "SDS / Admin",
    detail: "Core clearance gate and SDS-controlled decisions.",
    tag: "Required",
  },
  {
    title: "SAS",
    detail: "Student affairs validation in approval sequence.",
    tag: "Required",
  },
  {
    title: "Additional Signatories",
    detail: "Extra approvers inserted based on request needs.",
    tag: "Optional",
  },
  {
    title: "VP Finance",
    detail: "Shown only when budget support is requested.",
    tag: "Optional with budget",
  },
  {
    title: "Completed Request",
    detail: "Cleared request with full activity and decision history.",
    tag: "Outcome",
  },
];

export default function Home() {
  const session = useSession();
  const isLoggedIn = Boolean(session.data?.user);
  const accountHref = isLoggedIn ? "/user/dashboard" : "/login";
  const AccountIcon = isLoggedIn ? LayoutDashboard : LogIn;
  const accountLabel = isLoggedIn ? "Go to dashboard" : "Login";
  const approvalScrollerRef = useRef<HTMLDivElement | null>(null);
  const rolePaths = [
    {
      role: "Officer",
      description: "Create and submit requests",
      href: isLoggedIn ? "/user/bookings/create" : "/login",
    },
    {
      role: "Approver",
      description: "Review assigned requests",
      href: isLoggedIn ? "/user/approvals" : "/login",
    },
    {
      role: "Admin",
      description: "Manage system workspace",
      href: isLoggedIn ? "/user/dashboard" : "/login",
    },
  ];
  const scrollApprovalChain = (direction: "left" | "right") => {
    const scroller = approvalScrollerRef.current;
    if (!scroller) return;
    const delta = direction === "left" ? -320 : 320;
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative flex min-h-[92vh] items-center overflow-hidden px-4 py-20 sm:px-6 lg:px-20">
        <Image
          src="/lcupBg.png"
          alt="La Consolacion University Philippines"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />

        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-normal text-white/70 backdrop-blur">
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
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-emerald-200 backdrop-blur"
            >
              <AppLogo className="h-4 w-4 shrink-0" variant="light" />
              <span>Zerve</span>
            </motion.p>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-7xl"
            >
              Reserve campus venues. Track approvals end-to-end.
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80 lg:mx-0"
            >
              Check venue availability, submit requests, and follow every
              approver step until SDS clearance.
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
            <motion.div variants={fadeInUp} className="mt-4">
              <Link
                href="#approval-chain"
                className="inline-flex items-center gap-2 text-sm font-medium text-white/85 underline-offset-4 transition hover:text-white hover:underline"
              >
                View full approval chain
              </Link>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="mt-5 grid gap-2 sm:grid-cols-3"
            >
              {rolePaths.map((path) => (
                <Link
                  key={path.role}
                  href={path.href}
                  className="rounded-md border border-white/20 bg-white/10 p-3 text-left backdrop-blur-sm transition hover:bg-white/20"
                >
                  <p className="text-sm font-semibold text-white">{path.role}</p>
                  <p className="mt-1 text-xs text-white/70">{path.description}</p>
                </Link>
              ))}
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
                    Guided request and approval steps
                  </p>
                </div>
              </div>
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

      <section id="approval-chain" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold sm:text-3xl">
                Full approval chain
              </h3>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                Swipe on touch devices or use arrows to view full sequence:
                officer, adviser, dean, SDS, SAS, and optional signatories.
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => scrollApprovalChain("left")}
                aria-label="Scroll approval chain left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => scrollApprovalChain("right")}
                aria-label="Scroll approval chain right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div
            ref={approvalScrollerRef}
            className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]"
          >
            {approvalChain.map((item, index) => (
              <div
                key={item.title}
                className="min-w-[260px] snap-start rounded-md border bg-card p-4 shadow-sm md:min-w-[280px]"
              >
                <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Stage {index + 1}
                </p>
                <p className="mt-2 text-lg font-semibold">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.detail}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            If any approver returns request, officer revises then resubmits to continue chain.
          </p>
        </motion.div>
      </section>

      <section className="relative overflow-hidden py-20">
        <Image
          src="/lcup-auditorium-bg.jpg"
          alt="LCUP Kalinangan Auditorium"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/80" />
        <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-background to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mb-12 max-w-3xl"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-normal text-white sm:text-4xl">
              Built around the Zerve approval workflow.
            </h2>
            <p className="mt-3 text-lg text-white/75">
              The system supports practical reservation work: venue scheduling,
              reviewer routing, SDS clearance, document generation, and
              progress visibility.
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
                  <Card className="h-full border-white/15 bg-white/5 text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:shadow-2xl">
                    <CardHeader>
                      <div
                        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${feature.bg}`}
                      >
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription className="text-base text-white/70">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
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

      <footer className="border-t bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
            <Link className="transition hover:text-foreground" href="/calendar">
              Public Calendar
            </Link>
            <Link className="transition hover:text-foreground" href={accountHref}>
              {isLoggedIn ? "Dashboard" : "Login"}
            </Link>
            <Link className="transition hover:text-foreground" href="#approval-chain">
              Approval chain
            </Link>
            <Link className="transition hover:text-foreground" href="/login">
              Help and support
            </Link>
          </div>
          <p className="text-muted-foreground">
            Copyright 2026 La Consolacion University Philippines. Zerve.
          </p>
        </div>
      </footer>
    </div>
  );
}
