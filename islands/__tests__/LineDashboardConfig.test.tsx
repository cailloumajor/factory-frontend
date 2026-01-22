import { useSignal } from "@preact/signals"
import { assertEquals, assertNotEquals } from "@std/assert"
import { resolvesNext, stub } from "@std/testing/mock"
import { FakeTime } from "@std/testing/time"
import { fireEvent, render, waitFor } from "@testing-library/preact"

import { componentTesting } from "@/tests/utils.ts"

import { createDashboardConfig, LineDashboardConfig } from "../LineDashboardConfig.tsx"

function Wrapper() {
  const dashboardConfig = createDashboardConfig()
  const errorText = useSignal("")

  function resetTitle() {
    dashboardConfig.title.value = "initial title"
  }

  return (
    <div>
      <button type="button" data-testid="reset-title-btn" onClick={resetTitle}></button>
      <div>{dashboardConfig.title}</div>
      <div data-testid="error-text">{errorText}</div>
      <LineDashboardConfig
        apiUrl="/fake-api-url"
        refreshMillis={10000}
        config={dashboardConfig}
        errorText={errorText}
      />
    </div>
  )
}

Deno.test("shows fetch error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.reject(new Error("fetch error for tests")),
  )

  const { getByTestId } = render(<Wrapper />)

  await waitFor(() => {
    assertEquals(getByTestId("error-text").innerText, "fetch error for tests")
  })
})

Deno.test("shows HTTP status error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response(null, { status: 464, statusText: "dummy status" })),
  )

  const { getByTestId } = render(<Wrapper />)

  await waitFor(() => {
    assertEquals(getByTestId("error-text").innerText, "HTTP error, status: 464 dummy status")
  })
})

Deno.test("shows schema error", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(Response.json("invalid")),
  )

  const { getByTestId } = render(<Wrapper />)

  await waitFor(() => {
    assertEquals(getByTestId("error-text").innerText, "Configuration format error (see console)")
  })
})

Deno.test("updates the configuration periodically", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  const fetchResolves = resolvesNext([1, 2, 3, 4].map((i) =>
    Response.json({
      title: `Attempt #${i}`,
      targetCycleTime: 1,
      targetEfficiency: 1,
    })
  ))
  using _fakeFetch = stub(globalThis, "fetch", fetchResolves)

  const { findByText } = render(<Wrapper />)

  await findByText("Attempt #1")
  fakeTime.tick(10001)
  await findByText("Attempt #2")
  fakeTime.tick(10001)
  await findByText("Attempt #3")
})

Deno.test("delays the updates if it takes time", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  let attemptCount = 1
  using _fakeFetch = stub(globalThis, "fetch", () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(Response.json({
          title: `Attempt #${attemptCount++}`,
          targetCycleTime: 1,
          targetEfficiency: 1,
        }))
      }, 5000)
    }))

  const { findByText, getByTestId } = render(<Wrapper />)

  const resetButton = getByTestId("reset-title-btn")

  fakeTime.tick(5001)
  await findByText("Attempt #1")
  fakeTime.tick(10001)
  fireEvent.click(resetButton)
  await findByText("initial title")
  fakeTime.tick(5001)
  await findByText("Attempt #2")
  fakeTime.tick(10001)
  fireEvent.click(resetButton)
  await findByText("initial title")
  fakeTime.tick(5001)
  await findByText("Attempt #3")
})

Deno.test("clears error upon successful config update", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()
  using _fakeFetch = stub(
    globalThis,
    "fetch",
    resolvesNext([
      new Error("fetch error for tests"),
      Response.json({
        title: "Success",
        targetCycleTime: 1,
        targetEfficiency: 1,
      }),
    ]),
  )

  const { getByTestId } = render(<Wrapper />)

  const errorText = getByTestId("error-text")
  await waitFor(() => {
    assertNotEquals(errorText.innerText, "")
  })

  fakeTime.tick(10001)

  await waitFor(() => {
    assertEquals(errorText.innerText, "")
  })
})
