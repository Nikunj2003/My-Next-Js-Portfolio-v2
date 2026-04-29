export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const BUTTON_ZOOM_STEP = 0.35;
export const WHEEL_ZOOM_SENSITIVITY = 0.0014;
export const FALLBACK_IMAGE_SIZE: Size = { width: 16, height: 10 };

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function roundZoom(value: number) {
  const rounded = Number(value.toFixed(3));
  return Math.abs(rounded - MIN_ZOOM) < 0.025 ? MIN_ZOOM : rounded;
}

export function getDistance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function getMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function getContainedSize(image: Size, viewport: Size): Size {
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

export function clampOffsetToBounds(offset: Point, scale: number, content: Size, viewport: Size): Point {
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
