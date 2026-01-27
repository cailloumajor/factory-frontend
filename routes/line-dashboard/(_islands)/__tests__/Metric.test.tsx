import { useSignal } from "@preact/signals"
import { assert, assertEquals, assertFalse } from "@std/assert"
import { render } from "@testing-library/preact"

import { componentTesting } from "@/tests/utils.ts"

import { Metric } from "../Metric.tsx"

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
  assertFalse(metricValueEl.classList.contains("skeleton"))
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
  assertFalse(metricValueEl.classList.contains("skeleton"))
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

  assertFalse(metricValueEl.classList.contains("colorclass"))
  assert(metricValueEl.classList.contains("skeleton"))
  assertFalse(metricValueEl.classList.contains("invisible"))
})

Deno.test("displays numeric NaN value accordingly", async () => {
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

  assertEquals(metricValueEl.innerText, "000")
  assertFalse(metricValueEl.classList.contains("skeleton"))
  assert(metricValueEl.classList.contains("invisible"))
})

Deno.test("displays textual NaN value accordingly", async () => {
  await using _ctHandle = componentTesting()

  function Wrapper() {
    const value = useSignal("NaN")
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

  assertEquals(metricValueEl.innerText, "000")
  assertFalse(metricValueEl.classList.contains("skeleton"))
  assert(metricValueEl.classList.contains("invisible"))
})
