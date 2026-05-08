"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export default function NetworkStatus() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[9998] mx-auto flex max-w-lg items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/95 p-4 text-sm text-amber-950 shadow-2xl"
    >
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">You are offline</p>
        <p>
          You can keep reviewing the current screen, but saving, submitting,
          and refreshing may fail until the connection returns.
        </p>
      </div>
    </div>
  );
}
