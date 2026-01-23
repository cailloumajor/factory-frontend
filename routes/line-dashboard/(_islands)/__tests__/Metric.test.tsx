import { useSignal } from "@preact/signals"
import { assert, assertEquals, assertFalse } from "@std/assert"
import { render } from "@testing-library/preact"

import { componentTesting } from "@/tests/utils.ts"

import { Metric } from "../Metric.tsx"

function assertSkeleton(el: HTMLElement, expected: boolean) {
  const msg = `${expected ? "Missing" : "Unexpected"} skeleton classes.`
  const expectedClasses = [
    "inline-block",
    "min-w-1/3",
    "skeleton",
    "text-transparent",
    "select-none",
  ]
  const gotClasses = expectedClasses
    .filter((cl) => el.classList.contains(cl)).length
  assert(expected ? gotClasses === expectedClasses.length : gotClasses === 0, msg)
}

Deno.test("renders number value", async () => {
  await using _ctHandle = componentTesting()

  function Wrapper() {
    const value = useSignal(42.5)
    const colorClass = useSignal("colorclass")
    const loading = useSignal(false)

    return (
      <Metric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={value}
        colorClass={colorClass}
        loading={loading}
      />
    )
  }

  const { getByTestId } = render(<Wrapper />)

  const metricValueEl = getByTestId("metric-value")

  assertEquals(metricValueEl.innerText, "42.5")
  assert(metricValueEl.classList.contains("colorclass"))
  assertSkeleton(metricValueEl, false)
  assertFalse(metricValueEl.classList.contains("invisible"))
})

Deno.test("renders text value", async () => {
  await using _ctHandle = componentTesting()

  function Wrapper() {
    const value = useSignal("37")
    const colorClass = useSignal("colorclass")
    const loading = useSignal(false)

    return (
      <Metric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={value}
        colorClass={colorClass}
        loading={loading}
      />
    )
  }

  const { getByTestId } = render(<Wrapper />)

  const metricValueEl = getByTestId("metric-value")

  assertEquals(metricValueEl.innerText, "37")
  assert(metricValueEl.classList.contains("colorclass"))
  assertSkeleton(metricValueEl, false)
  assertFalse(metricValueEl.classList.contains("invisible"))
})

Deno.test("shows a skeleton if in loading state", async () => {
  await using _ctHandle = componentTesting()

  function Wrapper() {
    const value = useSignal(42.5)
    const colorClass = useSignal("colorclass")
    const loading = useSignal(true)

    return (
      <Metric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={value}
        colorClass={colorClass}
        loading={loading}
      />
    )
  }

  const { getByTestId } = render(<Wrapper />)

  const metricValueEl = getByTestId("metric-value")

  assertSkeleton(metricValueEl, true)
  assertFalse(metricValueEl.classList.contains("invisible"))
})

Deno.test("displays NaN value accordingly", async () => {
  await using _ctHandle = componentTesting()

  function Wrapper() {
    const value = useSignal(NaN)
    const colorClass = useSignal("colorclass")
    const loading = useSignal(false)

    return (
      <Metric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={value}
        colorClass={colorClass}
        loading={loading}
      />
    )
  }

  const { getByTestId } = render(<Wrapper />)

  const metricValueEl = getByTestId("metric-value")

  assertSkeleton(metricValueEl, false)
  assert(metricValueEl.classList.contains("invisible"))
})
