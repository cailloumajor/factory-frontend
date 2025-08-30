import { assert, assertEquals, assertFalse, assertStrictEquals } from "@std/assert"
import { assertSpyCallArg, assertSpyCallArgs, assertSpyCalls, spy, stub } from "@std/testing/mock"
import { FakeTime } from "@std/testing/time"
import { fireEvent, render, waitFor } from "@testing-library/preact"

import { componentTesting } from "../utils.ts"

import { moduleUtils, TimelineDisplay } from "../../islands/TimelineDisplay.tsx"

function Wrapper() {
  return (
    <TimelineDisplay
      apiUrl="/fake-api-url"
      refreshMillis={10000}
      legendItems={[
        { colorClass: "firstColor", text: "First color" },
        { colorClass: "secondColor", text: "Second color" },
      ]}
      xIntervalMinutes={61}
      xOffsetMinutes={45}
      emphasisLabels={["firstLabel", "secondLabel"]}
    />
  )
}

Deno.test("instanciates the timeline object", async () => {
  await using _ctHandle = componentTesting()

  globalThis.document.body.style.fontFamily = "some font for testing"
  const legendStyle = globalThis.document.createElement("style")
  legendStyle.innerText += `.firstColor { background-color: blue; }`
  legendStyle.innerText += `.secondColor { background-color: red; }`
  globalThis.document.head.appendChild(legendStyle)

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.reject("fetch error for tests"),
  )
  using fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw() {
        return Promise.resolve()
      },
      free() {},
    }
  })

  const { getByLabelText } = render(<Wrapper />)

  await waitFor(() => {
    assertSpyCalls(fakeTimeline, 1)
  })
  const canvas = getByLabelText("status timeline")
  assertStrictEquals(fakeTimeline.calls[0].args[0], canvas)
  assertSpyCallArg(fakeTimeline, 0, 1, {
    fontFamily: '"some font for testing"',
    palette: ["blue", "red"],
    opacity: 0.7,
    xIntervalMinutes: 61,
    xOffsetMinutes: 45,
    emphasisLabels: ["firstLabel", "secondLabel"],
  })
})

Deno.test("shows fetch error", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.reject("fetch error for tests"),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw() {
        return Promise.resolve()
      },
      free() {},
    }
  })

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

  fakeTime.tick(11000)

  await waitFor(() => {
    getByText(/fetch error for tests/)
  })
  assert(getByLabelText("status timeline").classList.contains("invisible"))
  assert(getByTestId("timeline-legend").classList.contains("invisible"))
})

Deno.test("shows HTTP error", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response(null, { status: 500 })),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw() {
        return Promise.resolve()
      },
      free() {},
    }
  })

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

  fakeTime.tick(11000)

  await waitFor(() => {
    getByText(/HTTP error, status: 500/)
  })
  assert(getByLabelText("status timeline").classList.contains("invisible"))
  assert(getByTestId("timeline-legend").classList.contains("invisible"))
})

Deno.test("shows draw error", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response()),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw() {
        return Promise.reject("draw error for tests")
      },
      free() {},
    }
  })

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

  fakeTime.tick(11000)

  await waitFor(() => {
    getByText(/draw error for tests/)
  })
  assert(getByLabelText("status timeline").classList.contains("invisible"))
  assert(getByTestId("timeline-legend").classList.contains("invisible"))
})

Deno.test("calls draw function periodically", async () => {
  await using _ctHandle = componentTesting()

  const body = new Uint8Array([0xde, 0xad, 0xbe, 0xef])

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response(body)),
  )
  const fakeDraw = spy(() => Promise.resolve())
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw: fakeDraw,
      free() {},
    }
  })

  render(<Wrapper />)

  fakeTime.tick(61000)

  await waitFor(() => {
    assertSpyCalls(fakeDraw, 6)
  })
  assertSpyCallArgs(fakeDraw, 0, [body])
  assertSpyCallArgs(fakeDraw, 1, [body])
  assertSpyCallArgs(fakeDraw, 2, [body])
  assertSpyCallArgs(fakeDraw, 3, [body])
  assertSpyCallArgs(fakeDraw, 4, [body])
  assertSpyCallArgs(fakeDraw, 5, [body])
})

Deno.test("clears error upon successful draw", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response()),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw() {
        return Promise.reject("an error")
      },
      free() {},
    }
  })

  const { findByText, getByLabelText, getByTestId } = render(<Wrapper />)

  fakeTime.tick(11000)

  const errorDisplay = await findByText(/an error/)
  assertFalse(errorDisplay.classList.contains("hidden"))

  fireEvent(getByLabelText("status timeline"), new CustomEvent("drawed"))

  await waitFor(() => {
    assert(errorDisplay.classList.contains("hidden"))
    assertFalse(getByLabelText("status timeline").classList.contains("invisible"))
    assertFalse(getByTestId("timeline-legend").classList.contains("invisible"))
  })
})

Deno.test("resizes canvas when its parent resizes", async () => {
  await using _ctHandle = componentTesting()

  const fakeObserve = spy()
  globalThis.ResizeObserver = class ResizeObserverMock {
    constructor(cb: ResizeObserverCallback) {
      setTimeout(
        () => {
          cb(
            [{
              contentBoxSize: [{ inlineSize: 480, blockSize: 200 }],
              borderBoxSize: [],
              contentRect: new DOMRectReadOnly(),
              devicePixelContentBoxSize: [],
              target: document.body,
            }],
            this,
          )
        },
        500,
      )
    }
    observe = fakeObserve
    unobserve() {}
    disconnect() {}
  }

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response()),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw() {
        return Promise.resolve()
      },
      free() {},
    }
  })

  const { findByLabelText } = render(<Wrapper />)

  const canvas = await findByLabelText("status timeline") as HTMLCanvasElement

  assertEquals(canvas.height, 150)
  assertEquals(canvas.width, 300)
  assertSpyCalls(fakeObserve, 1)
  assertStrictEquals(fakeObserve.calls[0].args[0], canvas.parentElement)

  fakeTime.tick(800)

  await waitFor(() => {
    assertEquals(canvas.height, 40)
    assertEquals(canvas.width, 480)
  })
})

Deno.test("displays the legend", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response()),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      draw() {
        return Promise.resolve()
      },
      free() {},
    }
  })

  const { findAllByText } = render(<Wrapper />)

  const legendTexts = await findAllByText(/(First|Second) color/)
  assertEquals(legendTexts.length, 2)
  assert(legendTexts[0].previousElementSibling?.classList.contains("firstColor"))
  assert(legendTexts[1].previousElementSibling?.classList.contains("secondColor"))
})
