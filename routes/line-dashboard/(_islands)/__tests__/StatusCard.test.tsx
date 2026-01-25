import { type Signal, signal } from "@preact/signals"
import { assert, assertFalse } from "@std/assert"
import { render } from "@testing-library/preact"

import { componentTesting } from "@/tests/utils.ts"

import { createMachineData, type MachineData } from "../MachineDataLink.tsx"
import { CycleTimeStatus } from "../Metrics.tsx"
import { StatusCard } from "../StatusCard.tsx"
import { FakeTime } from "@std/testing/time"

function Wrapper(props: { machineData: MachineData; cycleTimeStatus: Signal<CycleTimeStatus> }) {
  return (
    <StatusCard
      statuses={{
        runAtCadence: "RUNNING AT CADENCE STATUS",
        runUnderCadence: "RUNNING UNDER CADENCE STATUS",
        campaignChange: "CAMPAIGN CHANGE STATUS",
        stopped: "STOPPED STATUS",
        since: "since text",
      }}
      machineData={props.machineData}
      cycleTimeStatus={props.cycleTimeStatus}
    />
  )
}

Deno.test("shows a skeleton if data is not available", async () => {
  await using _ctHandle = componentTesting()

  const machineData = createMachineData()

  const { findByTestId } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const skeletonEl = await findByTestId("status-skeleton")
  assert(skeletonEl.classList.contains("skeleton"))
})

Deno.test("shows running at cadence", async () => {
  await using _ctHandle = componentTesting()

  const machineData = createMachineData()

  machineData.invalid.value = false
  machineData.val.cycle.value = true

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const statusTextEl = await findByText("RUNNING AT CADENCE STATUS")
  assert(statusTextEl.classList.contains("text-success"))
  assertFalse(statusTextEl.classList.contains("is-status-stopped"))
})

Deno.test("shows running under cadence when cycle time is in warning state", async () => {
  await using _ctHandle = componentTesting()

  const machineData = createMachineData()

  machineData.invalid.value = false
  machineData.val.cycle.value = true

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Warn)}
    />,
  )

  const statusTextEl = await findByText("RUNNING UNDER CADENCE STATUS")
  assert(statusTextEl.classList.contains("text-warning"))
  assertFalse(statusTextEl.classList.contains("is-status-stopped"))
})

Deno.test("shows running under cadence when cycle time is in bad state", async () => {
  await using _ctHandle = componentTesting()

  const machineData = createMachineData()

  machineData.invalid.value = false
  machineData.val.cycle.value = true

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Bad)}
    />,
  )

  const statusTextEl = await findByText("RUNNING UNDER CADENCE STATUS")
  assert(statusTextEl.classList.contains("text-warning"))
  assertFalse(statusTextEl.classList.contains("is-status-stopped"))
})

Deno.test("shows campaign change", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime("1984-12-09T00:00:00Z")

  const machineData = createMachineData()

  machineData.invalid.value = false
  machineData.val.campChange.value = true
  machineData.ts.campChange.value = "1984-12-07T23:43:22Z"

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const statusTextEl = await findByText("CAMPAIGN CHANGE STATUS")
  assert(statusTextEl.classList.contains("text-info"))
  assertFalse(statusTextEl.classList.contains("is-status-stopped"))

  await findByText("since text 24 hours, 16 minutes (12/7/1984, 11:43:22 PM)")

  fakeTime.tick(60_000)

  await findByText("since text 24 hours, 17 minutes (12/7/1984, 11:43:22 PM)")
})

Deno.test("shows stopped when cycle time is over", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime("1984-12-09T00:00:00Z")

  const machineData = createMachineData()

  machineData.invalid.value = false
  machineData.val.cycle.value = true
  machineData.val.cycleTimeOver.value = true
  machineData.ts.goodParts.value = "1984-12-07T23:43:22Z"

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const statusTextEl = await findByText("STOPPED STATUS")
  assert(statusTextEl.classList.contains("text-error"))
  assert(statusTextEl.classList.contains("is-status-stopped"))

  await findByText("since text 24 hours, 16 minutes (12/7/1984, 11:43:22 PM)")
})

Deno.test("shows stopped when not in cycle and not in campaign change", async () => {
  await using _ctHandle = componentTesting()

  using _fakeTime = new FakeTime("1984-12-09T00:00:00Z")

  const machineData = createMachineData()

  machineData.invalid.value = false
  machineData.ts.cycle.value = "1984-12-07T23:43:22Z"

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const statusTextEl = await findByText("STOPPED STATUS")
  assert(statusTextEl.classList.contains("text-error"))
  assert(statusTextEl.classList.contains("is-status-stopped"))

  await findByText("since text 24 hours, 16 minutes (12/7/1984, 11:43:22 PM)")
})
