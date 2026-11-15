import OpenGraphImage, { alt as ogAlt } from "./opengraph-image";

// Segment config must be statically analysable, so it is repeated here rather
// than re-exported.
export const alt = ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpenGraphImage;
