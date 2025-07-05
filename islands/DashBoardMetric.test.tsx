import { signal, useSignal } from "@preact/signals"
import { assert, assertEquals } from "@std/assert"
import { describe, it } from "@std/testing/bdd"
import { fireEvent, render } from "@testing-library/preact"

import { setupComponentTesting } from "../test-utils/utils.ts"

import { DashboardMetric } from "./DashboardMetric.tsx"

function assertSkeleton(el: HTMLElement, expected: boolean) {
  const msg = `${expected ? "Missing" : "Unexpected"} skeleton classes.`
  const gotClasses = ["skeleton", "text-transparent", "select-none"]
    .filter((cl) => el.classList.contains(cl)).length
  assert(expected ? gotClasses === 3 : gotClasses === 0, msg)
}

setupComponentTesting()

describe("DashboardMetric", () => {
  it("renders invalid value", () => {
    const { getByTestId } = render(
      <DashboardMetric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={signal(NaN)}
        disabled={signal(false)}
      />,
    )

    const metricValueElement = getByTestId("metric-value")
    assertEquals(metricValueElement.innerText, "000")
    assertSkeleton(metricValueElement, false)
  })

  it("shows a skeleton if disabled", () => {
    const { getByTestId } = render(
      <DashboardMetric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={signal(0)}
        disabled={signal(true)}
      />,
    )

    const metricValueElement = getByTestId("metric-value")
    assertSkeleton(metricValueElement, true)
  })

  it("applies color class on valid value", () => {
    function WrappedComponent() {
      const colorClass = useSignal("text-success")

      return (
        <>
          <input
            type="text"
            data-testid="color-change"
            onInput={(evt) => {
              colorClass.value = evt.currentTarget.value
            }}
          />
          <DashboardMetric
            icon="M3,3V21H21V3"
            title="Test Metric"
            value={signal(10)}
            colorClass={colorClass}
            disabled={signal(false)}
          />
        </>
      )
    }

    const { getByTestId } = render(<WrappedComponent />)

    const metricValueElement = getByTestId("metric-value")
    assertEquals(metricValueElement.innerText, "10")
    assert(metricValueElement.classList.contains("text-success"))
    assertSkeleton(metricValueElement, false)

    fireEvent.input(getByTestId("color-change"), { target: { value: "text-warning" } })
    assert(metricValueElement.classList.contains("text-warning"))
  })
})
