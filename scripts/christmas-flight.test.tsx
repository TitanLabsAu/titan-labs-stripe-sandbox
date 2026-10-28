import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SantaFlight } from "../src/components/christmas/SantaFlight";
import { CHRISTMAS_DEFAULTS } from "../src/lib/christmas";

let dom: JSDOM, root: Root, mount: HTMLElement;
let frames: Map<number, FrameRequestCallback>,
  sequence: number,
  reduced = false;
const originals = new Map<string, PropertyDescriptor | undefined>();
const globals = [
  "window",
  "document",
  "navigator",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "IS_REACT_ACT_ENVIRONMENT",
];
beforeEach(() => {
  for (const key of globals)
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  dom = new JSDOM('<div id="mount"></div>', { url: "http://localhost/" });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: dom.window,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.window.document,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(dom.window.document, "hidden", {
    configurable: true,
    value: false,
  });
  reduced = false;
  frames = new Map();
  sequence = 0;
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (cb: FrameRequestCallback) => {
      frames.set(++sequence, cb);
      return sequence;
    },
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => frames.delete(id),
  });
  dom.window.matchMedia = (() => ({
    get matches() {
      return reduced;
    },
    addEventListener() {},
    removeEventListener() {},
  })) as any;
  dom.window.HTMLCanvasElement.prototype.getContext = (() => ({
    clearRect() {},
    setTransform() {},
    beginPath() {},
    arc() {},
    fill() {},
  })) as any;
  mount = document.getElementById("mount")!;
  root = createRoot(mount);
  vi.useFakeTimers();
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.restoreAllMocks();
  vi.useRealTimers();
  dom.window.close();
  for (const key of globals) {
    const value = originals.get(key);
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});
const on = { ...CHRISTMAS_DEFAULTS, enabled: true };
describe("Santa animation lifecycle", () => {
  test("off starts no timer and mounts no effect", async () => {
    await act(async () =>
      root.render(<SantaFlight settings={{ ...CHRISTMAS_DEFAULTS }} />),
    );
    expect(mount.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(frames.size).toBe(0);
  });
  test("configured first delay starts flight; switching off cancels timer and frames", async () => {
    await act(async () =>
      root.render(
        <SantaFlight
          settings={{ ...on, firstDelayMin: 10, firstDelayMax: 10 }}
        />,
      ),
    );
    expect(vi.getTimerCount()).toBe(1);
    expect(frames.size).toBe(0);
    await act(async () => vi.advanceTimersByTime(9999));
    expect(frames.size).toBe(0);
    await act(async () => vi.advanceTimersByTime(1));
    expect(frames.size).toBe(1);
    expect(
      mount.querySelector(".christmas-flight")?.hasAttribute("hidden"),
    ).toBe(false);
    await act(async () =>
      root.render(<SantaFlight settings={{ ...on, enabled: false }} />),
    );
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(mount.childElementCount).toBe(0);
  });
  test("finished flights wait the configured repeat interval rather than the initial delay", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    await act(async () =>
      root.render(
        <SantaFlight
          settings={{
            ...on,
            firstDelayMin: 10,
            firstDelayMax: 10,
            intervalMin: 70,
            intervalMax: 70,
            snowEnabled: false,
          }}
        />,
      ),
    );
    await act(async () => vi.advanceTimersByTime(10000));
    const scheduled = [...frames.values()];
    frames.clear();
    await act(async () => scheduled.forEach((cb) => cb(8000)));
    expect(
      mount.querySelector(".christmas-flight")?.hasAttribute("hidden"),
    ).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    expect(frames.size).toBe(0);
    await act(async () => vi.advanceTimersByTime(69999));
    expect(frames.size).toBe(0);
    await act(async () => vi.advanceTimersByTime(1));
    expect(frames.size).toBe(1);
  });
  test("reduced motion schedules nothing, including manual previews", async () => {
    reduced = true;
    await act(async () =>
      root.render(<SantaFlight settings={on} preview replay={1} />),
    );
    expect(vi.getTimerCount()).toBe(0);
    expect(frames.size).toBe(0);
  });
  test("hidden tabs cancel flights and reschedule safely when visible", async () => {
    await act(async () => root.render(<SantaFlight settings={on} />));
    expect(vi.getTimerCount()).toBe(1);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    await act(async () =>
      document.dispatchEvent(new dom.window.Event("visibilitychange")),
    );
    expect(vi.getTimerCount()).toBe(0);
    expect(frames.size).toBe(0);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    await act(async () =>
      document.dispatchEvent(new dom.window.Event("visibilitychange")),
    );
    expect(vi.getTimerCount()).toBe(1);
  });
  test("preview starts immediately and replay does not accumulate loops", async () => {
    await act(async () =>
      root.render(<SantaFlight settings={on} preview replay={1} />),
    );
    expect(frames.size).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    await act(async () =>
      root.render(<SantaFlight settings={on} preview replay={2} />),
    );
    expect(frames.size).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(mount.querySelectorAll(".christmas-leg").length).toBe(16);
  });
});
