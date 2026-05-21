"use client";

import AppLogo from "@/app/components/AppLogo";
import { ModeToggle } from "@/app/components/mode-toggle";
import { Button } from "@/app/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  MapPin,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const fadeInUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const flowSteps = [
  "Choose venue",
  "Submit SAPF",
  "Track status",
  "Show QR proof",
];

const featureChips = [
  { label: "Calendar", icon: CalendarDays },
  { label: "SAPF", icon: FileText },
  { label: "Status", icon: CheckCircle2 },
  { label: "QR Proof", icon: QrCode },
];

export default function Home() {
  const session = useSession();
  const isLoggedIn = Boolean(session.data?.user);
  const accountHref = isLoggedIn ? "/user/dashboard" : "/login";
  const requestHref = isLoggedIn ? "/user/bookings/create" : "/login";

  return (
    <main className="min-h-screen bg-sky-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative min-h-[720px] overflow-hidden px-4 py-5 sm:px-6 lg:min-h-[820px] lg:px-12">
        <Image
          src="/lcupBg.png"
          alt="La Consolacion University Philippines"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-sky-50/38 dark:bg-slate-950/45" />
        <div className="absolute inset-0 bg-linear-to-r from-sky-50/95 via-sky-50/72 to-sky-50/18 dark:from-slate-950/90 dark:via-slate-950/62 dark:to-slate-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-sky-50 to-transparent dark:from-slate-950" />

        <div className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-950/10 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-800 shadow-sm backdrop-blur dark:border-white/20 dark:bg-white/10 dark:text-emerald-100"
          >
            <AppLogo className="h-5 w-5 shrink-0" variant="adaptive" priority />
            <span>Unispace</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden text-slate-800 hover:bg-white/60 hover:text-slate-950 sm:inline-flex dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Link href="/calendar">Calendar</Link>
            </Button>
            <div className="rounded-full border border-slate-950/10 bg-white/70 text-foreground shadow-sm backdrop-blur dark:border-white/15 dark:bg-white/10">
              <ModeToggle />
            </div>
          </div>
        </div>

        <motion.div
          className="relative z-10 mx-auto grid max-w-7xl gap-10 pb-16 pt-24 md:pt-28 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pb-20 lg:pt-28"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div className="max-w-4xl" variants={fadeInUp}>
            <p className="mb-4 inline-flex rounded-full border border-emerald-700/20 bg-emerald-600/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-400/10 dark:text-emerald-100">
              Campus reservation system
            </p>
            <h1 className="max-w-4xl text-6xl font-black leading-[0.92] tracking-normal sm:text-7xl lg:text-8xl">
              Reserve campus spaces.
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-slate-700 dark:font-medium dark:text-white/78">
              Calendar, SAPF, approval status, and QR proof in one clean
              workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={requestHref}>
                  <FileText className="mr-2 h-5 w-5" />
                  Start Request
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-950/20 bg-white/70 px-8 text-slate-950 hover:bg-white hover:text-slate-950 dark:border-white/35 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:text-white"
              >
                <Link href="/calendar">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Calendar
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="rounded-lg border border-slate-950/10 bg-white/72 p-5 text-slate-950 shadow-2xl backdrop-blur-md dark:border-white/20 dark:bg-white/10 dark:text-white"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-950/10 pb-4 dark:border-white/15">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-500">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">Request Flow</p>
                  <p className="text-sm text-slate-600 dark:text-white/60">Short and trackable</p>
                </div>
              </div>
              <MapPin className="h-6 w-6 text-slate-500 dark:text-white/55" />
            </div>

            <div className="mt-5 grid gap-3">
              {flowSteps.map((step, index) => (
                <motion.div
                  key={step}
                  variants={fadeInUp}
                  className="flex items-center gap-3 rounded-md border border-slate-950/10 bg-slate-950/[0.04] p-3 dark:border-white/10 dark:bg-white/10"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                    {index + 1}
                  </div>
                  <p className="text-lg font-semibold">{step}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="bg-sky-50 px-4 py-16 sm:px-6 lg:px-12 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-stretch">
          <motion.div
            className="flex flex-col justify-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-200">
              What it does
            </p>
            <h2 className="text-5xl font-black leading-none tracking-normal sm:text-6xl">
              Plan. Request. Verify.
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {featureChips.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-md border border-slate-950/10 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none"
                  >
                    <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                    <span className="font-semibold">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            className="relative min-h-[460px] overflow-hidden rounded-lg border border-slate-950/10 shadow-2xl dark:border-white/15 lg:min-h-[620px]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src="/lcup-auditorium-bg.jpg"
              alt="LCUP Kalinangan Auditorium"
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-950/8 to-transparent dark:from-slate-950/72" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <div className="max-w-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Venue-ready
                </p>
                <p className="mt-2 text-4xl font-black leading-none sm:text-5xl">
                  See the space before the request.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-sky-50 px-4 pb-20 sm:px-6 lg:px-12 dark:bg-slate-950">
        <motion.div
          className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-slate-950/10 bg-white px-6 py-12 text-center text-slate-950 shadow-2xl dark:border-white/10 dark:bg-white dark:text-slate-950 sm:px-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-700" />
          <h2 className="mt-4 text-4xl font-black sm:text-5xl">
            Ready to reserve?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">
            Start with the calendar, finish with verified QR proof.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={requestHref}>Start request</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/calendar">View calendar</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-slate-950/10 bg-white py-8 dark:border-white/10 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-slate-500 dark:text-white/55 sm:px-6 lg:px-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link className="transition hover:text-slate-950 dark:hover:text-white" href="/calendar">
              Public Calendar
            </Link>
            <Link className="transition hover:text-slate-950 dark:hover:text-white" href={accountHref}>
              {isLoggedIn ? "Dashboard" : "Login"}
            </Link>
            <Link className="transition hover:text-slate-950 dark:hover:text-white" href={requestHref}>
              Request
            </Link>
          </div>
          <p>Copyright 2026 La Consolacion University Philippines. Unispace.</p>
        </div>
      </footer>
    </main>
  );
}
