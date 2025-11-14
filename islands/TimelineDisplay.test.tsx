import { assert, assertEquals, assertFalse, assertStrictEquals } from "@std/assert"
import { assertSpyCallArg, assertSpyCallArgs, assertSpyCalls, spy, stub } from "@std/testing/mock"
import { FakeTime } from "@std/testing/time"
import { render, waitFor } from "@testing-library/preact"

import { componentTesting } from "@/tests/utils.ts"

import { moduleUtils, TimelineDisplay } from "./TimelineDisplay.tsx"

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
      setData() {},
      draw() {},
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

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.reject("fetch error for tests"),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      setData() {},
      draw() {},
      free() {},
    }
  })

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

  await waitFor(() => {
    getByText(/fetch error for tests/)
  })
  assert(getByLabelText("status timeline").classList.contains("invisible"))
  assert(getByTestId("timeline-legend").classList.contains("invisible"))
})

Deno.test("shows HTTP error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response(null, { status: 500 })),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      setData() {},
      draw() {},
      free() {},
    }
  })

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

  await waitFor(() => {
    getByText(/HTTP error, status: 500/)
  })
  assert(getByLabelText("status timeline").classList.contains("invisible"))
  assert(getByTestId("timeline-legend").classList.contains("invisible"))
})

Deno.test("shows setData error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response()),
  )
  const fakeDraw = spy()
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      setData() {
        throw new Error("setData error for tests")
      },
      draw: fakeDraw,
      free() {},
    }
  })

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

  await waitFor(() => {
    getByText(/setData error for tests/)
  })
  assert(getByLabelText("status timeline").classList.contains("invisible"))
  assert(getByTestId("timeline-legend").classList.contains("invisible"))
  // Check that draw method is not called if we have a setData error.
  assertSpyCalls(fakeDraw, 0)
})

Deno.test("shows draw error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response()),
  )
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      setData() {},
      draw() {
        throw new Error("draw error for tests")
      },
      free() {},
    }
  })

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

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
  const fakeSetData = spy()
  const fakeDraw = spy()
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      setData: fakeSetData,
      draw: fakeDraw,
      free() {},
    }
  })

  render(<Wrapper />)

  fakeTime.tick(10001)
  await waitFor(() => {
    assertSpyCalls(fakeSetData, 1)
    assertSpyCallArgs(fakeSetData, 0, [body])
    assertSpyCalls(fakeDraw, 1)
  })
  fakeTime.tick(10001)
  await waitFor(() => {
    assertSpyCalls(fakeSetData, 2)
    assertSpyCallArgs(fakeSetData, 1, [body])
    assertSpyCalls(fakeDraw, 2)
  })
  fakeTime.tick(10001)
  await waitFor(() => {
    assertSpyCalls(fakeSetData, 3)
    assertSpyCallArgs(fakeSetData, 2, [body])
    assertSpyCalls(fakeDraw, 3)
  })
  fakeTime.tick(10001)
  await waitFor(() => {
    assertSpyCalls(fakeSetData, 4)
    assertSpyCallArgs(fakeSetData, 3, [body])
    assertSpyCalls(fakeDraw, 4)
  })
})

Deno.test("clears error upon successful draw", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response()),
  )
  let failDraw = true
  using _fakeTimeline = stub(moduleUtils, "newTimeline", () => {
    return {
      setData() {},
      draw() {
        if (failDraw) {
          failDraw = false
          throw new Error("an error")
        }
      },
      free() {},
    }
  })

  const { findByText, getByLabelText, getByTestId } = render(<Wrapper />)

  const errorDisplay = await findByText(/an error/)
  assertFalse(errorDisplay.classList.contains("hidden"))

  fakeTime.tick(10001)

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
      setData() {},
      draw() {},
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
      setData() {},
      draw() {},
      free() {},
    }
  })

  const { findAllByText, findByRole } = render(<Wrapper />)

  const errorDisplay = await findByRole("alert")
  assert(errorDisplay.classList.contains("hidden"))
  const legendTexts = await findAllByText(/(First|Second) color/)
  assertEquals(legendTexts.length, 2)
  assert(legendTexts[0].previousElementSibling?.classList.contains("firstColor"))
  assert(legendTexts[1].previousElementSibling?.classList.contains("secondColor"))
})
