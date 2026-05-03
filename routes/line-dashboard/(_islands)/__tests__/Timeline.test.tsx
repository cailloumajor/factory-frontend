import { Timeline } from "@cailloumajor/frontend-utils-wasm"
import { useSignal } from "@preact/signals"
import { assert, assertEquals, assertFalse, assertMatch } from "@std/assert"
import { FakeTime } from "@std/testing/time"
import { render, waitFor } from "@testing-library/preact"
import * as sinon from "sinon"

import { componentTesting } from "@/tests/utils.ts"

import { moduleUtils, TimelineDisplay } from "../Timeline.tsx"

function Wrapper() {
  const errorText = useSignal("")

  return (
    <div>
      <div data-testid="error-text">{errorText}</div>
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
        errorText={errorText}
      />
    </div>
  )
}

Deno.test("instantiates the timeline object", async () => {
  await using _ctHandle = componentTesting()

  globalThis.document.body.style.fontFamily = "some font for testing"
  const legendStyle = globalThis.document.createElement("style")
  legendStyle.innerText += `.firstColor { background-color: blue; }`
  legendStyle.innerText += `.secondColor { background-color: red; }`
  globalThis.document.head.appendChild(legendStyle)

  using _fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  const fakeTimelineCtor = sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { findByLabelText } = render(<Wrapper />)

  const canvas = await findByLabelText("status timeline") as HTMLCanvasElement

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

  const { getByLabelText, getByTestId } = render(<Wrapper />)

  await waitFor(() => {
    assertEquals(getByTestId("error-text").innerText, "fetch error for tests")
    assert(getByLabelText("status timeline").classList.contains("skeleton"))
  })
})

Deno.test("shows HTTP error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() =>
    Promise.resolve(new Response(null, { status: 500 }))
  )
  const fakeTimeline = sinon.createStubInstance(Timeline)
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { findByText, getByLabelText } = render(<Wrapper />)

  await findByText(/HTTP error, status: 500/)

  assert(getByLabelText("status timeline").classList.contains("skeleton"))
})

Deno.test("shows setData error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  fakeTimeline.setData.throws("setData error for tests")
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { findByText, getByLabelText } = render(<Wrapper />)

  await findByText(/setData error for tests/)

  assert(getByLabelText("status timeline").classList.contains("skeleton"))
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

  const { findByText, getByLabelText } = render(<Wrapper />)

  await findByText(/draw error for tests/)

  assert(getByLabelText("status timeline").classList.contains("skeleton"))
})

Deno.test("calls setData function periodically", async () => {
  await using _ctHandle = componentTesting()

  const body = new Uint8Array([0xde, 0xad, 0xbe, 0xef])

  using fakeTime = new FakeTime()
  // Using `callsFake` instead of `resolves` is mandatory here, to get a new `Response` object
  // each time `fetch` is called, and thus prevents reusing of the same `Response` object.
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response(body)))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  fakeTimeline
    .setData
    .onFirstCall()
    .throws("first sentinel")
    .onSecondCall()
    .throws("second sentinel")
    .onThirdCall()
    .throws("third sentinel")
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)

  const { findByText } = render(<Wrapper />)

  const errorDisplay = await findByText(/^first sentinel/)

  fakeTime.tick(10001)
  await waitFor(() => {
    assertMatch(errorDisplay.innerText, /^second sentinel/)
  })
  fakeTime.tick(10001)
  await waitFor(() => {
    assertMatch(errorDisplay.innerText, /^third sentinel/)
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

  const { findByText, getByLabelText } = render(<Wrapper />)

  const errorDisplay = await findByText(/an error/)

  fakeTime.tick(10001)

  await waitFor(() => {
    assertEquals(errorDisplay.innerText, "")
    assertFalse(getByLabelText("status timeline").classList.contains("skeleton"))
  })
})

Deno.test("resizes canvas and redraws when window resizes", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  sinon.stub(globalThis, "fetch").callsFake(() => Promise.resolve(new Response()))
  const fakeTimeline = sinon.createStubInstance(Timeline)
  fakeTimeline.draw.onFirstCall().throws("draw sentinel")
  sinon.stub(moduleUtils, "newTimeline").returns(fakeTimeline)
  const fakeResizeObserver = sinon.createStubInstance(ResizeObserver)
  const fakeResizeObserverCtor = sinon.stub(globalThis, "ResizeObserver").returns(
    fakeResizeObserver,
  )

  const { findByLabelText, findByText } = render(<Wrapper />)

  const canvas = await findByLabelText("status timeline") as HTMLCanvasElement

  const entries: ResizeObserverEntry[] = [
    {
      borderBoxSize: [],
      contentBoxSize: [{ blockSize: 0, inlineSize: 480 }],
      contentRect: new DOMRectReadOnly(),
      devicePixelContentBoxSize: [],
      target: canvas.parentElement!,
    },
  ]

  await findByText(/^draw sentinel/)

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

  const { findAllByText, findByLabelText } = render(<Wrapper />)

  await findByLabelText("status timeline")

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

  const { findByLabelText, unmount } = render(<Wrapper />)

  await findByLabelText("status timeline")

  await waitFor(() => {
    sinon.assert.notCalled(fakeTimeline.free)
  })

  unmount()

  await waitFor(() => {
    sinon.assert.calledOnce(fakeTimeline.free)
  })
})
