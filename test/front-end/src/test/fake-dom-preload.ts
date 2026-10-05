/**
 * bun test preload entry (see `front-end/bunfig.toml`).
 *
 * Installs the fake DOM before any test file's static imports evaluate so
 * Radix primitives capture a DOM-aware `globalThis?.document`.
 */
import { installPermanentFakeDom } from "./fake-dom";

installPermanentFakeDom();
