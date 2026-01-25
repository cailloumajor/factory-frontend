import { Timeline } from "@cailloumajor/frontend-utils-wasm"
import { assert, assertEquals, assertFalse } from "@std/assert"
import { FakeTime } from "@std/testing/time"
import { render, waitFor } from "@testing-library/preact"
import * as sinon from "sinon"

import { componentTesting } from "@/tests/utils.ts"

import { moduleUtils, TimelineDisplay } from "../Timeline.tsx"

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
  sinon.stub(globalThis, "fetch").rejects("fetch error for tests")
  const fakeTimeline = sinon.createStubInstance(Timeline)
  const fakeTimelineCtor = sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { getByLabelText } = render(<Wrapper />)

  const canvas = getByLabelText("status timeline") as HTMLCanvasElement

  await waitFor(() => {
    sinon.assert.calledOnceWithExactly(fakeTimelineCtor, canvas, {
      fontFamily: '"some font for testing"',
      palette: ["blue", "red"],
      opacity: 0.7,
      xIntervalMinutes: 61,
      xOffsetMinutes: 45,
      emphasisLabels: ["firstLabel", "secondLabel"],
    })
  })
})

Deno.test("shows fetch error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").rejects("fetch error for tests")
  const fakeTimeline = sinon.createStubInstance(Timeline)
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

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
  sinon.stub(globalThis, "fetch").resolves(new Response(null, { status: 500 }))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

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
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  fakeTimeline.setData.throws("setData error for tests")
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { getByLabelText, getByTestId, getByText } = render(<Wrapper />)

  await waitFor(() => {
    getByText(/setData error for tests/)
  })
  assert(getByLabelText("status timeline").classList.contains("invisible"))
  assert(getByTestId("timeline-legend").classList.contains("invisible"))
  // Check that draw method is not called if we have a setData error.
  sinon.assert.notCalled(fakeTimeline.draw)
})

Deno.test("shows draw error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  fakeTimeline.draw.throws("draw error for tests")
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

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
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response(body)))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  render(<Wrapper />)

  fakeTime.tick(10001)
  await waitFor(() => {
    sinon.assert.calledOnce(fakeTimeline.setData)
  })
  fakeTime.tick(10001)
  await waitFor(() => {
    sinon.assert.calledTwice(fakeTimeline.setData)
  })
  fakeTime.tick(10001)
  await waitFor(() => {
    sinon.assert.calledThrice(fakeTimeline.setData)
    sinon.assert.alwaysCalledWithExactly(fakeTimeline.setData, body)
  })
})

Deno.test("clears error upon successful draw", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  fakeTimeline.draw.onFirstCall().throws("an error")
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

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

Deno.test("resizes canvas and redraws when window resizes", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)
  const fakeResizeObserver = sinon.createStubInstance(ResizeObserver)
  const fakeResizeObserverCtor = sinon.stub(globalThis, "ResizeObserver").returns(
    fakeResizeObserver,
  )

  const { getByLabelText } = render(<Wrapper />)

  const canvas = getByLabelText("status timeline") as HTMLCanvasElement

  const entries: ResizeObserverEntry[] = [
    {
      borderBoxSize: [],
      contentBoxSize: [{ blockSize: 0, inlineSize: 480 }],
      contentRect: new DOMRectReadOnly(),
      devicePixelContentBoxSize: [],
      target: canvas.parentElement!,
    },
  ]

  await waitFor(() => {
    sinon.assert.calledOnce(fakeTimeline.draw)
  })

  fakeResizeObserverCtor.callArgWith(0, entries)

  fakeTime.tick(501)

  await waitFor(() => {
    // Default height is 768 with `happy-dom`.
    assertEquals(canvas.height, 192)
    assertEquals(canvas.width, 480)
    sinon.assert.calledTwice(fakeTimeline.draw)
  })
})

Deno.test("displays the legend", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { findAllByText, findByRole } = render(<Wrapper />)

  const errorDisplay = await findByRole("alert")
  assert(errorDisplay.classList.contains("hidden"))
  const legendTexts = await findAllByText(/(First|Second) color/)
  assertEquals(legendTexts.length, 2)
  assert(legendTexts[0].previousElementSibling?.classList.contains("firstColor"))
  assert(legendTexts[1].previousElementSibling?.classList.contains("secondColor"))
})

Deno.test("frees the timeline resources when unmounted", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { unmount } = render(<Wrapper />)

  await waitFor(() => {
    sinon.assert.notCalled(fakeTimeline.free)
  })

  unmount()

  await waitFor(() => {
    sinon.assert.calledOnce(fakeTimeline.free)
  })
})
