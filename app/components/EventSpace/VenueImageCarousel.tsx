"use client";

import { cn } from "@/lib/utils";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Image from "next/image";
import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
} from "react";

type VenueImageCarouselProps = {
  images: string[];
  alt: string;
  className?: string;
  showControls?: boolean;
  showDots?: boolean;
};

type TouchPointList = {
  length: number;
  [index: number]: {
    clientX: number;
    clientY: number;
  };
};

const SWIPE_THRESHOLD = 60;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1.3; // Start zoomed in to fit screen

export default function VenueImageCarousel({
  images,
  alt,
  className,
  showControls = true,
  showDots = true,
}: VenueImageCarouselProps) {
  const normalizedImages = useMemo(
    () => images.filter((src) => Boolean(src)),
    [images],
  );
  const total = normalizedImages.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [lastTouchPos, setLastTouchPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = (index: number) => {
    if (total === 0) return;
    const nextIndex = (index + total) % total;
    setActiveIndex(nextIndex);
    resetZoom();
  };

  const resetZoom = () => {
    setZoom(DEFAULT_ZOOM);
    setPanX(0);
    setPanY(0);
  };

  const constrainPanY = (newPanY: number, zoomLevel: number): number => {
    if (!containerRef.current) return newPanY;
    const rect = containerRef.current.getBoundingClientRect();
    // Max pan is based on how much extra space there is at current zoom level
    const maxPanY = ((zoomLevel - 1) * rect.height) / 2;
    return Math.max(-maxPanY, Math.min(maxPanY, newPanY));
  };

  const getTouchDistance = (touches: TouchPointList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: TouchPointList) => {
    let x = 0,
      y = 0;
    for (let i = 0; i < touches.length; i++) {
      x += touches[i].clientX;
      y += touches[i].clientY;
    }
    return { x: x / touches.length, y: y / touches.length };
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    // Don't start drag if clicking on a button or interactive element
    const target = event.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.classList.contains("interactive")
    ) {
      return;
    }

    const now = Date.now();
    const isDoubleTap = now - lastTouchTime < 300 && event.touches.length === 1;
    setLastTouchTime(now);

    if (isDoubleTap && zoom > 1) {
      resetZoom();
      return;
    }

    if (event.touches.length === 2) {
      const distance = getTouchDistance(event.touches);
      if (distance) {
        setInitialDistance(distance);
        setInitialZoom(zoom);
        setLastTouchPos(null);
      }
    } else if (event.touches.length === 1) {
      const touch = event.touches[0];
      setLastTouchPos({ x: touch.clientX, y: touch.clientY });
      setDragStartX(touch.clientX);
      setDragStartY(touch.clientY);
      setDragDelta(0);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && initialDistance !== null) {
      const distance = getTouchDistance(event.touches);
      if (distance) {
        const newZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, (initialZoom * distance) / initialDistance),
        );
        setZoom(newZoom);
        // Constrain pan when zoom changes
        const constrainedPanY = constrainPanY(panY, newZoom);
        setPanY(constrainedPanY);
      }
      setLastTouchPos(null);
    } else if (event.touches.length === 1 && !lastTouchPos) {
      return;
    } else if (event.touches.length === 1) {
      if (!containerRef.current) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - lastTouchPos!.x;
      const deltaY = touch.clientY - lastTouchPos!.y;

      // If vertical movement is greater than horizontal, treat as pan
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        event.preventDefault();
        // Allow vertical panning with constraints
        const newPanY = constrainPanY(panY + deltaY, zoom);
        setPanY(newPanY);
        setLastTouchPos({ x: touch.clientX, y: touch.clientY });
      } else {
        // Horizontal movement for swiping
        if (dragStartX !== null) {
          setDragDelta(touch.clientX - dragStartX);
        }
      }
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      setInitialDistance(null);
    }

    // If no drag started, reset everything
    if (dragStartX === null || total <= 1) {
      setDragStartX(null);
      setDragStartY(null);
      setDragDelta(0);
      setIsDragging(false);
      setLastTouchPos(null);
      return;
    }

    // Only swipe if horizontal movement is significant and vertical is minimal
    if (Math.abs(dragDelta) > SWIPE_THRESHOLD) {
      goTo(dragDelta > 0 ? activeIndex - 1 : activeIndex + 1);
    }

    setDragStartX(null);
    setDragStartY(null);
    setDragDelta(0);
    setIsDragging(false);
    setLastTouchPos(null);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Don't start drag if clicking on a button or interactive element
    const target = event.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button") ||
      target.classList.contains("interactive")
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStartX(event.clientX);
    setDragStartY(event.clientY);
    setDragDelta(0);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX === null || dragStartY === null) return;

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    // If vertical movement is greater than horizontal, treat as pan
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Allow vertical panning with constraints
      const newPanY = constrainPanY(panY + deltaY, zoom);
      setPanY(newPanY);
      setDragStartY(event.clientY); // Update start position for next frame
    } else {
      // Horizontal movement for swiping
      setDragDelta(deltaX);
    }
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragStartX === null || total <= 1) {
      setDragStartX(null);
      setDragStartY(null);
      setDragDelta(0);
      setIsDragging(false);
      return;
    }

    // Only swipe if horizontal movement is significant and vertical is minimal
    if (Math.abs(dragDelta) > SWIPE_THRESHOLD) {
      goTo(dragDelta > 0 ? activeIndex - 1 : activeIndex + 1);
    }

    setDragStartX(null);
    setDragStartY(null);
    setDragDelta(0);
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-lg bg-muted", className)}
    >
      {total > 0 ? (
        <div
          className="relative h-full w-full select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragStart={(e) => e.preventDefault()}
          style={{
            cursor: zoom > 1 ? "grab" : total > 1 ? "grab" : "default",
          }}
        >
          <div
            className={cn(
              "flex h-full w-full",
              isDragging || (initialDistance !== null && zoom > 1)
                ? "transition-none"
                : "transition-transform duration-300",
            )}
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom}) translateX(calc(${-activeIndex * 100}% + ${dragDelta}px))`,
              transformOrigin: "center center",
            }}
          >
            {normalizedImages.map((src, index) => (
              <div
                key={`${src}-${index}`}
                className="relative h-full w-full shrink-0"
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="pointer-events-none object-contain"
                  draggable={false}
                />
              </div>
            ))}
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                const newZoom = Math.min(MAX_ZOOM, zoom + 0.2);
                setZoom(newZoom);
                const constrainedPanY = constrainPanY(panY, newZoom);
                setPanY(constrainedPanY);
              }}
              className="rounded-full bg-background/80 p-2 text-foreground shadow-sm transition hover:bg-background pointer-events-auto cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const newZoom = Math.max(MIN_ZOOM, zoom - 0.2);
                setZoom(newZoom);
                const constrainedPanY = constrainPanY(panY, newZoom);
                setPanY(constrainedPanY);
              }}
              className="rounded-full bg-background/80 p-2 text-foreground shadow-sm transition hover:bg-background pointer-events-auto cursor-pointer"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </div>

          {showControls && total > 1 && zoom <= DEFAULT_ZOOM + 0.1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-sm transition hover:bg-background pointer-events-auto cursor-pointer"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-sm transition hover:bg-background pointer-events-auto cursor-pointer"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {showDots && total > 1 && zoom <= DEFAULT_ZOOM + 0.1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/80 px-3 py-1 shadow-sm pointer-events-auto">
              {normalizedImages.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(
                    "h-2 w-2 rounded-full transition pointer-events-auto cursor-pointer",
                    index === activeIndex
                      ? "bg-foreground"
                      : "bg-muted-foreground/40",
                  )}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <Building2 className="h-20 w-20 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
