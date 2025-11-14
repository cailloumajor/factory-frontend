import { assert, assertFalse } from "@std/assert"
import { resolvesNext, stub } from "@std/testing/mock"
import { FakeTime } from "@std/testing/time"
import { fireEvent, render, waitFor, within } from "@testing-library/preact"

import { componentTesting } from "../tests/utils.ts"

import { createDashboardConfig, LineDashboardConfig } from "./LineDashboardConfig.tsx"

function Wrapper() {
  const dashboardConfig = createDashboardConfig()

  function resetTitle() {
    dashboardConfig.title.value = "initial title"
  }

  return (
    <div>
      <button type="button" data-testid="reset-title-btn" onClick={resetTitle}></button>
      <div>{dashboardConfig.title}</div>
      <LineDashboardConfig apiUrl="/fake-api-url" refreshMillis={10000} config={dashboardConfig} />
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

  const { getByRole } = render(<Wrapper />)

  await waitFor(() => {
    const alert = getByRole("alert")
    assertFalse(alert.classList.contains("hidden"))
    within(alert).getByText("Dashboard config: fetch error for tests")
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

  const { getByRole } = render(<Wrapper />)

  await waitFor(() => {
    const alert = getByRole("alert")
    assertFalse(alert.classList.contains("hidden"))
    within(alert).getByText("Dashboard config: HTTP error, status: 464 dummy status")
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

  const { getByRole } = render(<Wrapper />)

  await waitFor(() => {
    const alert = getByRole("alert")
    assertFalse(alert.classList.contains("hidden"))
    within(alert).getByText("Dashboard config: Configuration format error (see console)")
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

  const { getByRole } = render(<Wrapper />)

  const alert = getByRole("alert")
  await waitFor(() => {
    assertFalse(alert.classList.contains("hidden"))
  })

  fakeTime.tick(10001)

  await waitFor(() => {
    assert(alert.classList.contains("hidden"))
  })
})
