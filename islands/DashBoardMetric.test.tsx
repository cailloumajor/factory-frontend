import { signal } from "@preact/signals"
import { assert, assertEquals } from "@std/assert"
import { describe, it } from "@std/testing/bdd"
import { render } from "@testing-library/preact"

import { setupComponentTesting } from "../test-utils/utils.ts"

import { DashboardMetric, metricColors } from "./DashboardMetric.tsx"

function assertSkeleton(el: HTMLElement, expected: boolean) {
  const msg = `${expected ? "Missing" : "Unexpected"} skeleton class.`
  assert(expected === el.classList.contains("skeleton-block"), msg)
}

function assertColor(el: HTMLElement, expected: string | null) {
  if (expected == null) {
    const msg = "Unexpected color class."
    for (const color of metricColors) {
      assert(!el.classList.contains(`has-text-${color}`), msg)
    }
  } else {
    const msg = "Missing color class."
    assert(el.classList.contains(`has-text-${expected}`), msg)
  }
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
    assertEquals(metricValueElement.innerText, "---")
    assertColor(metricValueElement, null)
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
    assertEquals(metricValueElement.innerText, "---")
    assertColor(metricValueElement, null)
    assertSkeleton(metricValueElement, true)
  })

  it("applies color class on valid value", () => {
    const { getByTestId } = render(
      <DashboardMetric
        icon="M3,3V21H21V3"
        title="Test Metric"
        value={signal(10)}
        color={signal("warning")}
        disabled={signal(false)}
      />,
    )

    const metricValueElement = getByTestId("metric-value")
    assertEquals(metricValueElement.innerText, "10")
    assertColor(metricValueElement, "warning")
    assertSkeleton(metricValueElement, false)
  })
})
