"use client";

import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";
import Image from "next/image";
import { useRef, type CSSProperties, type PointerEvent } from "react";

type DraggableVenueImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

export default function DraggableVenueImage({
  src,
  alt,
  className,
}: DraggableVenueImageProps) {
  const positionRef = useRef({ x: 50, y: 50 });
  const frameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef({ x: 50, y: 50 });
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
  } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: positionRef.current.x,
      positionY: positionRef.current.y,
      width: bounds.width,
      height: bounds.height,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    const deltaX =
      ((event.clientX - dragStartRef.current.pointerX) /
        dragStartRef.current.width) *
      100;
    const deltaY =
      ((event.clientY - dragStartRef.current.pointerY) /
        dragStartRef.current.height) *
      100;

    pendingPositionRef.current = {
      x: Math.min(100, Math.max(0, dragStartRef.current.positionX - deltaX)),
      y: Math.min(100, Math.max(0, dragStartRef.current.positionY - deltaY)),
    };

    if (frameRef.current !== null) return;
    const target = event.currentTarget;

    frameRef.current = requestAnimationFrame(() => {
      positionRef.current = pendingPositionRef.current;
      target.style.setProperty("--venue-image-x", `${positionRef.current.x}%`);
      target.style.setProperty("--venue-image-y", `${positionRef.current.y}%`);
      frameRef.current = null;
    });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
  };

  return (
    <div
      className={cn(
        "relative h-80 overflow-hidden rounded-lg bg-muted sm:h-96 lg:h-[32rem]",
        className,
      )}
    >
      {src ? (
        <div
          className="relative h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          style={{
            "--venue-image-x": "50%",
            "--venue-image-y": "50%",
          } as CSSProperties}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            style={{
              objectPosition:
                "var(--venue-image-x, 50%) var(--venue-image-y, 50%)",
            }}
            draggable={false}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <Building2 className="h-20 w-20 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
