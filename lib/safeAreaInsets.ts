/**
 * The four `env(safe-area-inset-*)` values, as numbers.
 *
 * CSS can use these directly; JavaScript cannot — `env()` is only
 * resolvable by the style engine, and there is no API that reports it. The
 * standard way round that is to set them as padding on a throwaway element
 * and read back what the engine computed.
 *
 * The map camera needs them because `map.fitBounds` works in container
 * pixels, and the container runs edge to edge under the notch and the home
 * indicator. Padding measured only from our own panels puts the camera's
 * idea of "centre" in the right place and still lets a pin sit under the
 * hardware — on a landscape iPhone the left inset alone is 44px, which is
 * wider than the 16px gutter the fit was using.
 */
export type SafeAreaInsets = { top: number; right: number; bottom: number; left: number };

const NONE: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Read once and cache: these only change on orientation change or a move
 * between displays, and this touches layout, so it is not something to do
 * inside a camera call that may run on every filter change.
 */
let cached: SafeAreaInsets | null = null;

export function readSafeAreaInsets(): SafeAreaInsets {
  if (cached) return cached;
  if (typeof document === "undefined") return NONE;

  const probe = document.createElement("div");
  // `position: fixed` matters: `env()` resolves against the viewport, and
  // an element in normal flow inside a transformed or clipped ancestor can
  // compute them differently.
  probe.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:0",
    "height:0",
    "visibility:hidden",
    "pointer-events:none",
    "padding-top:env(safe-area-inset-top, 0px)",
    "padding-right:env(safe-area-inset-right, 0px)",
    "padding-bottom:env(safe-area-inset-bottom, 0px)",
    "padding-left:env(safe-area-inset-left, 0px)",
  ].join(";");

  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  const insets: SafeAreaInsets = {
    top: Number.parseFloat(computed.paddingTop) || 0,
    right: Number.parseFloat(computed.paddingRight) || 0,
    bottom: Number.parseFloat(computed.paddingBottom) || 0,
    left: Number.parseFloat(computed.paddingLeft) || 0,
  };
  probe.remove();

  cached = insets;
  return insets;
}

/** Drop the cache so the next read re-measures (orientation change). */
export function invalidateSafeAreaInsets() {
  cached = null;
}
