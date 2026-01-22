import { useSignal } from "@preact/signals"
import { assert, assertEquals, assertFalse } from "@std/assert"
import { fireEvent, render, waitFor } from "@testing-library/preact"
import type { TargetedInputEvent } from "preact"

import { componentTesting } from "@/tests/utils.ts"

import { DashboardMetric } from "../DashboardMetric.tsx"

function Wrapper() {
  const value = useSignal<string | number>(0)
  const colorClass = useSignal("")
  const loading = useSignal(false)

  function changeValueNumeric(evt: TargetedInputEvent<HTMLInputElement>) {
    value.value = evt.currentTarget.valueAsNumber
  }
  function changeValueText(evt: TargetedInputEvent<HTMLInputElement>) {
    value.value = evt.currentTarget.value
  }
  function changeColor(evt: TargetedInputEvent<HTMLInputElement>) {
    colorClass.value = evt.currentTarget.value
  }
  function changeLoading() {
    loading.value = !loading.value
  }

  return (
    <div>
      <input type="number" data-testid="value-input-numeric" onInput={changeValueNumeric}></input>
      <input data-testid="value-input-text" onInput={changeValueText}></input>
      <input data-testid="color-input" onInput={changeColor}></input>
      <input type="checkbox" data-testid="loading-input" onClick={changeLoading}></input>

      <DashboardMetric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={value}
        colorClass={colorClass}
        loading={loading}
      />
    </div>
  )
}

function assertSkeleton(el: HTMLElement, expected: boolean) {
  const msg = `${expected ? "Missing" : "Unexpected"} skeleton classes.`
  const gotClasses = ["skeleton", "text-transparent", "select-none"]
    .filter((cl) => el.classList.contains(cl)).length
  assert(expected ? gotClasses === 3 : gotClasses === 0, msg)
}

Deno.test("renders number and text values", async () => {
  await using _ctHandle = componentTesting()

  const { getByTestId } = render(<Wrapper />)

  const metricValueEl = getByTestId("metric-value")

  fireEvent.input(getByTestId("value-input-numeric"), { target: { valueAsNumber: 42.5 } })

  await waitFor(() => {
    assertEquals(metricValueEl.innerText, "42.5")
    assertFalse(metricValueEl.classList.contains("colorclass"))
    assertSkeleton(metricValueEl, false)
    assertFalse(metricValueEl.classList.contains("opacity-2"))
  })

  fireEvent.input(getByTestId("value-input-text"), { target: { value: "37" } })
  fireEvent.input(getByTestId("color-input"), { target: { value: "colorclass" } })

  await waitFor(() => {
    assertEquals(metricValueEl.innerText, "37")
    assert(metricValueEl.classList.contains("colorclass"))
    assertSkeleton(metricValueEl, false)
    assertFalse(metricValueEl.classList.contains("opacity-2"))
  })
})

Deno.test("shows a skeleton if in loading state", async () => {
  await using _ctHandle = componentTesting()

  const { getByTestId } = render(<Wrapper />)

  const metricValueEl = getByTestId("metric-value")

  fireEvent.input(getByTestId("color-input"), { target: { value: "colorclass" } })
  fireEvent.click(getByTestId("loading-input"))

  await waitFor(() => {
    assertFalse(metricValueEl.classList.contains("colorclass"))
    assertSkeleton(metricValueEl, true)
    assertFalse(metricValueEl.classList.contains("opacity-2"))
  })
})

Deno.test("displays NaN value accordingly", async () => {
  await using _ctHandle = componentTesting()

  const { getByTestId } = render(<Wrapper />)

  const metricValueEl = getByTestId("metric-value")

  fireEvent.input(getByTestId("value-input-numeric"), { target: { valueAsNumber: NaN } })
  fireEvent.input(getByTestId("color-input"), { target: { value: "colorclass" } })

  await waitFor(() => {
    assertEquals(metricValueEl.innerText, "000")
    assertFalse(metricValueEl.classList.contains("colorclass"))
    assertSkeleton(metricValueEl, false)
    assert(metricValueEl.classList.contains("opacity-2"))
  })
})
