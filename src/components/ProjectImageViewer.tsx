"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type GestureNativeEvent = Event & { scale: number; clientX: number; clientY: number };
type SwipeState = {
  pointerId: number;
  startPoint: Point;
  lastPoint: Point;
  pointerType: string;
};

type GestureState =
  | {
      type: "pan";
      pointerId: number;
      startPointer: Point;
      startOffset: Point;
    }
  | {
      type: "pinch";
      pointerIds: [number, number];
      startDistance: number;
      startScale: number;
      contentPoint: Point;
    };

interface ProjectImageViewerProps {
  projectTitle: string;
  images: string[];
  open: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const BUTTON_ZOOM_STEP = 0.35;
const WHEEL_ZOOM_SENSITIVITY = 0.0014;
const FALLBACK_IMAGE_SIZE: Size = { width: 16, height: 10 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundZoom(value: number) {
  const rounded = Number(value.toFixed(3));
  return Math.abs(rounded - MIN_ZOOM) < 0.025 ? MIN_ZOOM : rounded;
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getContainedSize(image: Size, viewport: Size): Size {
  if (!viewport.width || !viewport.height) {
    return { width: 0, height: 0 };
  }

  if (!image.width || !image.height) {
    return {
      width: viewport.width,
      height: viewport.height,
    };
  }

  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);

  return {
    width: image.width * ratio,
    height: image.height * ratio,
  };
}

function clampOffsetToBounds(offset: Point, scale: number, content: Size, viewport: Size): Point {
  if (scale <= MIN_ZOOM || !content.width || !content.height || !viewport.width || !viewport.height) {
    return { x: 0, y: 0 };
  }

  const maxX = Math.max(0, (content.width * scale - viewport.width) / 2);
  const maxY = Math.max(0, (content.height * scale - viewport.height) / 2);

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

export default function ProjectImageViewer({
  projectTitle,
  images,
  open,
  currentIndex,
  onIndexChange,
  onOpenChange,
}: ProjectImageViewerProps) {
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<GestureState | null>(null);
  const swipeRef = useRef<SwipeState | null>(null);
  const isViewportHoveredRef = useRef(false);
  const isTrackpadGestureActiveRef = useRef(false);
  const lastAnchorClientRef = useRef<Point | null>(null);
  const prefetchedImagesRef = useRef(new Set<string>());
  const scaleRef = useRef(MIN_ZOOM);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const viewportSizeRef = useRef<Size>({ width: 0, height: 0 });
  const baseSizeRef = useRef<Size>({ width: 0, height: 0 });
  const gestureStartScaleRef = useRef(MIN_ZOOM);
  const [scale, setScale] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState<Size>({ width: 0, height: 0 });
  const [showThumbnailRail, setShowThumbnailRail] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageSizes, setImageSizes] = useState<Record<string, Size>>({});

  const activeIndex = clamp(currentIndex, 0, Math.max(images.length - 1, 0));
  const activeImage = images[activeIndex] ?? images[0] ?? "";
  const activeImageSize = imageSizes[activeImage] ?? FALLBACK_IMAGE_SIZE;
  const baseSize = useMemo(
    () => getContainedSize(activeImageSize, viewportSize),
    [activeImageSize, viewportSize],
  );

  const resetView = useCallback(() => {
    activePointersRef.current.clear();
    gestureRef.current = null;
    swipeRef.current = null;
    setIsDragging(false);
    setScale(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useLayoutEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useLayoutEffect(() => {
    viewportSizeRef.current = viewportSize;
  }, [viewportSize]);

  useLayoutEffect(() => {
    baseSizeRef.current = baseSize;
  }, [baseSize]);

  useLayoutEffect(() => {
    if (!open) return;

    const updateViewportSize = () => {
      const node = viewportRef.current;
      const rect = node?.getBoundingClientRect();
      if (!node || !rect) return;

      const styles = window.getComputedStyle(node);
      const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);

      setViewportSize({
        width: Math.max(rect.width - horizontalPadding, 0),
        height: Math.max(rect.height - verticalPadding, 0),
      });
    };

    updateViewportSize();
    const frame = window.requestAnimationFrame(updateViewportSize);
    const timer = window.setTimeout(updateViewportSize, 240);

    const observer = new ResizeObserver(updateViewportSize);
    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }

    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      previousActiveElementRef.current?.focus({ preventScroll: true });
      previousActiveElementRef.current = null;
    };
  }, [open]);

  const getViewportAnchor = useCallback((clientX: number, clientY: number): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }, []);

  const isPointInsideViewport = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!rect) return false;

    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  const isViewportInteraction = useCallback(
    (target: EventTarget | null, clientX?: number, clientY?: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return false;

      if (target instanceof Node && viewport.contains(target)) {
        return true;
      }

      if (typeof clientX === "number" && typeof clientY === "number") {
        return isPointInsideViewport(clientX, clientY);
      }

      return false;
    },
    [isPointInsideViewport],
  );

  const hasViewportAnchor = useCallback(() => {
    const anchor = lastAnchorClientRef.current;

    return anchor ? isPointInsideViewport(anchor.x, anchor.y) : false;
  }, [isPointInsideViewport]);

  const shouldHandleTrackpadGesture = useCallback(
    (target: EventTarget | null, clientX?: number, clientY?: number) => {
      return isViewportInteraction(target, clientX, clientY) || isViewportHoveredRef.current || hasViewportAnchor();
    },
    [hasViewportAnchor, isViewportInteraction],
  );

  const getAnchorFromClientPoint = useCallback(
    (clientX?: number, clientY?: number) => {
      if (typeof clientX === "number" && typeof clientY === "number") {
        lastAnchorClientRef.current = { x: clientX, y: clientY };
        return getViewportAnchor(clientX, clientY);
      }

      if (lastAnchorClientRef.current) {
        return getViewportAnchor(lastAnchorClientRef.current.x, lastAnchorClientRef.current.y);
      }

      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }

      return getViewportAnchor(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [getViewportAnchor],
  );

  const prefetchImage = useCallback((src?: string) => {
    if (!src || prefetchedImagesRef.current.has(src) || typeof window === "undefined") {
      return;
    }

    prefetchedImagesRef.current.add(src);

    const image = new window.Image();
    image.decoding = "async";
    image.src = src;
  }, []);

  const zoomAt = useCallback((requestedScale: number, anchor: Point = { x: 0, y: 0 }) => {
    const currentScale = scaleRef.current;
    const nextScale = roundZoom(clamp(requestedScale, MIN_ZOOM, MAX_ZOOM));

    if (nextScale === currentScale) return;

    if (nextScale === MIN_ZOOM) {
      setScale(MIN_ZOOM);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const factor = nextScale / currentScale;
    const currentOffset = offsetRef.current;
    const nextOffset = clampOffsetToBounds(
      {
        x: anchor.x - (anchor.x - currentOffset.x) * factor,
        y: anchor.y - (anchor.y - currentOffset.y) * factor,
      },
      nextScale,
      baseSizeRef.current,
      viewportSizeRef.current,
    );

    setScale(nextScale);
    setOffset(nextOffset);
  }, []);

  const startPanGesture = useCallback((pointerId: number, pointer: Point) => {
    if (scaleRef.current <= MIN_ZOOM) {
      gestureRef.current = null;
      setIsDragging(false);
      return;
    }

    gestureRef.current = {
      type: "pan",
      pointerId,
      startPointer: pointer,
      startOffset: offsetRef.current,
    };
    setIsDragging(true);
  }, []);

  const startPinchGesture = useCallback(() => {
    const pointerEntries = Array.from(activePointersRef.current.entries());

    if (pointerEntries.length < 2) return;

    const [[firstId, firstPoint], [secondId, secondPoint]] = pointerEntries;
    const midpointClient = getMidpoint(firstPoint, secondPoint);
    const midpoint = getViewportAnchor(midpointClient.x, midpointClient.y);
    const startScale = scaleRef.current;

    gestureRef.current = {
      type: "pinch",
      pointerIds: [firstId, secondId],
      startDistance: Math.max(getDistance(firstPoint, secondPoint), 1),
      startScale,
      contentPoint: {
        x: (midpoint.x - offsetRef.current.x) / startScale,
        y: (midpoint.y - offsetRef.current.y) / startScale,
      },
    };
    setIsDragging(false);
  }, [getViewportAnchor]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetView();
      }

      onOpenChange(nextOpen);
    },
    [onOpenChange, resetView],
  );

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const clampedIndex = clamp(nextIndex, 0, images.length - 1);

      if (clampedIndex === activeIndex) return;

      resetView();
      onIndexChange(clampedIndex);
    },
    [activeIndex, images.length, onIndexChange, resetView],
  );

  const goToPrevious = useCallback(() => {
    goToIndex(activeIndex - 1);
  }, [activeIndex, goToIndex]);

  const goToNext = useCallback(() => {
    goToIndex(activeIndex + 1);
  }, [activeIndex, goToIndex]);

  const handleKeyControls = useCallback(
    (event: { key: string; defaultPrevented: boolean; preventDefault: () => void }) => {
      if (event.defaultPrevented) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomAt(scaleRef.current + BUTTON_ZOOM_STEP);
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        zoomAt(scaleRef.current - BUTTON_ZOOM_STEP);
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    },
    [goToNext, goToPrevious, resetView, zoomAt],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      isViewportHoveredRef.current = true;
      lastAnchorClientRef.current = { x: event.clientX, y: event.clientY };

      if (scaleRef.current <= MIN_ZOOM && activePointersRef.current.size === 0 && event.pointerType !== "mouse") {
        swipeRef.current = {
          pointerId: event.pointerId,
          startPoint: { x: event.clientX, y: event.clientY },
          lastPoint: { x: event.clientX, y: event.clientY },
          pointerType: event.pointerType,
        };
      } else {
        swipeRef.current = null;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (activePointersRef.current.size >= 2) {
        swipeRef.current = null;
        startPinchGesture();
        return;
      }

      startPanGesture(event.pointerId, { x: event.clientX, y: event.clientY });
    },
    [startPanGesture, startPinchGesture],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      isViewportHoveredRef.current = true;
      lastAnchorClientRef.current = { x: event.clientX, y: event.clientY };

      if (swipeRef.current?.pointerId === event.pointerId) {
        swipeRef.current = {
          ...swipeRef.current,
          lastPoint: { x: event.clientX, y: event.clientY },
        };
      }

      if (!activePointersRef.current.has(event.pointerId)) return;

      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const gesture = gestureRef.current;
      if (!gesture) return;

      if (gesture.type === "pinch") {
        const firstPoint = activePointersRef.current.get(gesture.pointerIds[0]);
        const secondPoint = activePointersRef.current.get(gesture.pointerIds[1]);

        if (!firstPoint || !secondPoint) return;

        const midpointClient = getMidpoint(firstPoint, secondPoint);
        const midpoint = getViewportAnchor(midpointClient.x, midpointClient.y);
        const nextScale = roundZoom(
          clamp(
            gesture.startScale * (getDistance(firstPoint, secondPoint) / gesture.startDistance),
            MIN_ZOOM,
            MAX_ZOOM,
          ),
        );

        const nextOffset =
          nextScale === MIN_ZOOM
            ? { x: 0, y: 0 }
            : clampOffsetToBounds(
                {
                  x: midpoint.x - gesture.contentPoint.x * nextScale,
                  y: midpoint.y - gesture.contentPoint.y * nextScale,
                },
                nextScale,
                baseSizeRef.current,
                viewportSizeRef.current,
              );

        setScale(nextScale);
        setOffset(nextOffset);
        return;
      }

      if (gesture.pointerId !== event.pointerId) return;

      const nextOffset = clampOffsetToBounds(
        {
          x: gesture.startOffset.x + (event.clientX - gesture.startPointer.x),
          y: gesture.startOffset.y + (event.clientY - gesture.startPointer.y),
        },
        scaleRef.current,
        baseSizeRef.current,
        viewportSizeRef.current,
      );

      setOffset(nextOffset);
    },
    [getViewportAnchor],
  );

  const handlePointerRelease = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      swipeRef.current = null;
      activePointersRef.current.delete(event.pointerId);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (swipe?.pointerId === event.pointerId && scaleRef.current <= MIN_ZOOM) {
        const deltaX = event.clientX - swipe.startPoint.x;
        const deltaY = event.clientY - swipe.startPoint.y;

        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
          if (deltaX < 0) {
            goToNext();
          } else {
            goToPrevious();
          }

          gestureRef.current = null;
          setIsDragging(false);
          return;
        }
      }

      const remainingPointers = Array.from(activePointersRef.current.entries());

      if (remainingPointers.length >= 2) {
        startPinchGesture();
        return;
      }

      if (remainingPointers.length === 1) {
        const [pointerId, point] = remainingPointers[0];
        startPanGesture(pointerId, point);
        return;
      }

      gestureRef.current = null;
      setIsDragging(false);
    },
    [goToNext, goToPrevious, startPanGesture, startPinchGesture],
  );

  const handleWheel = useCallback(
    (clientX: number, clientY: number, deltaY: number, isTrackpadPinch = false) => {
      const sensitivity = isTrackpadPinch ? 0.008 : WHEEL_ZOOM_SENSITIVITY;
      const delta = -deltaY * sensitivity;
      if (!delta) return;

      const nextScale = scaleRef.current * Math.exp(delta);
      zoomAt(nextScale, getAnchorFromClientPoint(clientX, clientY));
    },
    [getAnchorFromClientPoint, zoomAt],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const nextScale = scaleRef.current > 1.8 ? MIN_ZOOM : 2.2;
      zoomAt(nextScale, getViewportAnchor(event.clientX, event.clientY));
    },
    [getViewportAnchor, zoomAt],
  );

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => handleKeyControls(event);

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyControls, open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      contentRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    prefetchImage(activeImage);
    prefetchImage(images[activeIndex - 1]);
    prefetchImage(images[activeIndex + 1]);
  }, [activeImage, activeIndex, images, open, prefetchImage]);

  useEffect(() => {
    if (!open || showThumbnailRail) return;

    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        setShowThumbnailRail(true);
      }, 170);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open, showThumbnailRail]);

  useEffect(() => {
    if (!open) return;

    const handleNativeWheel = (event: WheelEvent) => {
      const isPinchLike = event.ctrlKey || isTrackpadGestureActiveRef.current;

      if (isPinchLike) {
        if (!shouldHandleTrackpadGesture(event.target, event.clientX, event.clientY)) return;
      } else if (!isViewportInteraction(event.target, event.clientX, event.clientY)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      handleWheel(event.clientX, event.clientY, event.deltaY, event.ctrlKey);
    };

    const handleGestureStart = (event: Event) => {
      const gestureEvent = event as GestureNativeEvent;
      if (!shouldHandleTrackpadGesture(gestureEvent.target, gestureEvent.clientX, gestureEvent.clientY)) return;

      isTrackpadGestureActiveRef.current = true;
      gestureStartScaleRef.current = scaleRef.current;
      getAnchorFromClientPoint(gestureEvent.clientX, gestureEvent.clientY);
      gestureEvent.preventDefault();
      gestureEvent.stopPropagation();
      gestureEvent.stopImmediatePropagation?.();
    };

    const handleGestureChange = (event: Event) => {
      const gestureEvent = event as GestureNativeEvent;
      if (!isTrackpadGestureActiveRef.current) return;

      gestureEvent.preventDefault();
      gestureEvent.stopPropagation();
      gestureEvent.stopImmediatePropagation?.();
      zoomAt(gestureStartScaleRef.current * gestureEvent.scale, getAnchorFromClientPoint(gestureEvent.clientX, gestureEvent.clientY));
    };

    const handleGestureEnd = (event: Event) => {
      if (!isTrackpadGestureActiveRef.current) return;

      isTrackpadGestureActiveRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    window.addEventListener("wheel", handleNativeWheel, { passive: false, capture: true });
    window.addEventListener("gesturestart", handleGestureStart, { passive: false, capture: true });
    window.addEventListener("gesturechange", handleGestureChange, { passive: false, capture: true });
    window.addEventListener("gestureend", handleGestureEnd, { passive: false, capture: true });

    return () => {
      isTrackpadGestureActiveRef.current = false;
      window.removeEventListener("wheel", handleNativeWheel, true);
      window.removeEventListener("gesturestart", handleGestureStart, true);
      window.removeEventListener("gesturechange", handleGestureChange, true);
      window.removeEventListener("gestureend", handleGestureEnd, true);
    };
  }, [getAnchorFromClientPoint, handleWheel, isViewportInteraction, open, shouldHandleTrackpadGesture, zoomAt]);

  const interactionHint = isMobile
    ? "Pinch to zoom, swipe to change images, drag when zoomed, and pull the top handle down to close."
    : "Use the wheel or trackpad pinch to zoom, drag to pan, and pull the top handle down to close.";
  const zoomPercentage = Math.round(scale * 100);
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < images.length - 1;

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      direction="bottom"
      handleOnly
      closeThreshold={0.2}
      modal
      shouldScaleBackground={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-[radial-gradient(circle_at_top,rgba(41,214,185,0.12),transparent_36%),linear-gradient(180deg,rgba(3,7,18,0.84),rgba(3,7,18,0.96))] backdrop-blur-0 sm:backdrop-blur-sm [will-change:opacity] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DrawerPrimitive.Content
          ref={contentRef}
          tabIndex={-1}
          onKeyDown={(event) => handleKeyControls(event)}
          style={{ top: "max(env(safe-area-inset-top), 0.75rem)" }}
          className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-[min(calc(100vw-0.75rem),96rem)] transform-gpu flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.97),rgba(12,18,32,0.98))] shadow-[0_-18px_48px_rgba(0,0,0,0.32)] outline-none [will-change:transform] backdrop-blur-0 sm:bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] sm:shadow-[0_-24px_80px_rgba(0,0,0,0.45)] sm:backdrop-blur-lg sm:backdrop-saturate-150 sm:w-[min(calc(100vw-1.5rem),96rem)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/10 to-transparent" />

          <div className="flex justify-center px-4 pb-1 pt-3 sm:px-6">
            <DrawerPrimitive.Handle className="flex h-7 w-28 items-center justify-center rounded-full bg-transparent before:hidden after:hidden">
              <span className="h-1.5 w-full rounded-full bg-white/15 transition-colors duration-200 hover:bg-white/25" />
            </DrawerPrimitive.Handle>
          </div>

          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 pb-4 pt-2 sm:px-6">
            <div className="min-w-0">
              <DrawerPrimitive.Title className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {projectTitle}
              </DrawerPrimitive.Title>
              <DrawerPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                Image {activeIndex + 1} of {images.length} - {interactionHint}
              </DrawerPrimitive.Description>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1 sm:flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => zoomAt(scale - BUTTON_ZOOM_STEP)}
                  disabled={scale <= MIN_ZOOM}
                  className="h-9 w-9 rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="min-w-14 text-center text-xs font-mono text-foreground/80">{zoomPercentage}%</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => zoomAt(scale + BUTTON_ZOOM_STEP)}
                  disabled={scale >= MAX_ZOOM}
                  className="h-9 w-9 rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetView}
                  disabled={scale === MIN_ZOOM}
                  className="h-9 w-9 rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <DrawerPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-white/10 bg-black/25 text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  aria-label="Close image viewer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerPrimitive.Close>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,29,0.88),rgba(4,7,18,0.96))] shadow-inner shadow-black/40">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(41,214,185,0.12),transparent_36%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.05),transparent_28%)]" />

              <div
                ref={viewportRef}
                onPointerEnter={(event) => {
                  isViewportHoveredRef.current = true;
                  lastAnchorClientRef.current = { x: event.clientX, y: event.clientY };
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerRelease}
                onPointerCancel={handlePointerRelease}
                onPointerLeave={(event) => {
                  isViewportHoveredRef.current = false;
                  if (event.pointerType === "mouse" && scaleRef.current <= MIN_ZOOM) {
                    setIsDragging(false);
                  }
                }}
                onDoubleClick={handleDoubleClick}
                className="relative grid h-full w-full touch-none place-items-center overflow-hidden px-3 py-3 sm:px-6 sm:py-6"
                style={{
                  cursor: scale > MIN_ZOOM ? (isDragging ? "grabbing" : "grab") : isMobile ? "default" : "zoom-in",
                }}
              >
                {activeImage && baseSize.width > 0 && baseSize.height > 0 ? (
                  <div
                    className="relative shrink-0 select-none"
                    style={{
                      width: `${baseSize.width}px`,
                      height: `${baseSize.height}px`,
                      transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                      willChange: "transform",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeImage}
                      alt={`${projectTitle} screenshot ${activeIndex + 1}`}
                      draggable={false}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      className="pointer-events-none block h-full w-full select-none rounded-[1.2rem] object-contain shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
                      onLoad={(event) => {
                        const { naturalWidth, naturalHeight } = event.currentTarget;

                        if (!naturalWidth || !naturalHeight) return;

                        setImageSizes((currentSizes) => {
                          const current = currentSizes[activeImage];
                          if (current?.width === naturalWidth && current?.height === naturalHeight) {
                            return currentSizes;
                          }

                          return {
                            ...currentSizes,
                            [activeImage]: {
                              width: naturalWidth,
                              height: naturalHeight,
                            },
                          };
                        });
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full w-full animate-pulse rounded-[1.5rem] bg-white/5" />
                )}

                <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-mono text-foreground/80 backdrop-blur">
                  {zoomPercentage}% zoom
                </div>
              </div>

              {images.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    disabled={!canGoPrevious}
                    className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/35 text-foreground/80 shadow-xl backdrop-blur hover:bg-white/10 hover:text-foreground disabled:opacity-35 sm:left-5"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    disabled={!canGoNext}
                    className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/35 text-foreground/80 shadow-xl backdrop-blur hover:bg-white/10 hover:text-foreground disabled:opacity-35 sm:right-5"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 sm:hidden">
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => zoomAt(scale - BUTTON_ZOOM_STEP)}
                  disabled={scale <= MIN_ZOOM}
                  className="h-10 w-10 rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <div className="min-w-14 text-center text-xs font-mono text-foreground/80">{zoomPercentage}%</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => zoomAt(scale + BUTTON_ZOOM_STEP)}
                  disabled={scale >= MAX_ZOOM}
                  className="h-10 w-10 rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={resetView}
                  disabled={scale === MIN_ZOOM}
                  className="h-10 w-10 rounded-full text-foreground/80 hover:bg-white/10 hover:text-foreground"
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {images.length > 1 && (
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-mono text-muted-foreground">
                  {activeIndex + 1}/{images.length}
                </div>
              )}
            </div>

            {images.length > 1 && showThumbnailRail && (
              <div className="z-10 flex gap-3 overflow-x-auto overscroll-x-contain pb-1 touch-pan-x">
                {images.map((image, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={`${projectTitle}-${image}`}
                      type="button"
                      onClick={() => goToIndex(index)}
                      onTouchEnd={(event) => {
                        event.preventDefault();
                        goToIndex(index);
                      }}
                      className={cn(
                        "group relative h-16 w-24 shrink-0 touch-manipulation overflow-hidden rounded-2xl border bg-black/35 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-20 sm:w-32",
                        isActive
                          ? "border-primary/70 shadow-[0_0_0_1px_rgba(41,214,185,0.45),0_14px_32px_rgba(0,0,0,0.35)]"
                          : "border-white/10 hover:border-white/20 hover:bg-white/5",
                      )}
                      aria-label={`Open screenshot ${index + 1}`}
                      aria-pressed={isActive}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={`${projectTitle} thumbnail ${index + 1}`}
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                        className={cn(
                          "h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]",
                          isActive ? "opacity-100" : "opacity-75 group-hover:opacity-95",
                        )}
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent px-2 py-1 text-left text-[10px] font-mono text-white/90 sm:text-[11px]">
                        {index + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
