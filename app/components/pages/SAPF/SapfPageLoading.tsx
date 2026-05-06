"use client";

import RouteLoadingSkeleton, {
  type RouteSkeletonVariant,
} from "@/app/components/pages/RouteLoadingSkeleton";

export default function SapfPageLoading({
  variant = "dashboard",
}: {
  variant?: RouteSkeletonVariant;
}) {
  return <RouteLoadingSkeleton variant={variant} />;
}

