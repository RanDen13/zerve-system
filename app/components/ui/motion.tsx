"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps, Variants } from "framer-motion";

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: "easeOut" },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: "easeOut" },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: "easeOut" },
  },
};

export function MotionPage(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
      {...props}
    />
  );
}

export function MotionSection(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sectionVariants}
      {...props}
    />
  );
}

export function MotionList(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={listVariants}
      {...props}
    />
  );
}

export function MotionItem(props: HTMLMotionProps<"div">) {
  return <motion.div variants={itemVariants} {...props} />;
}

