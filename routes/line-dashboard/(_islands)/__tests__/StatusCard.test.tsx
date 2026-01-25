import { type Signal, signal } from "@preact/signals"
import { assert, assertFalse } from "@std/assert"
import { render } from "@testing-library/preact"

import { componentTesting } from "@/tests/utils.ts"

import { createMachineData, type MachineData } from "../MachineDataLink.tsx"
import { CycleTimeStatus } from "../Metrics.tsx"
import { StatusCard } from "../StatusCard.tsx"

function Wrapper(props: { machineData: MachineData; cycleTimeStatus: Signal<CycleTimeStatus> }) {
  return (
    <StatusCard
      statuses={{
        runAtCadence: "RUNNING AT CADENCE STATUS",
        runUnderCadence: "RUNNING UNDER CADENCE STATUS",
        campaignChange: "CAMPAIGN CHANGE STATUS",
        stopped: "STOPPED STATUS",
      }}
      machineData={props.machineData}
      cycleTimeStatus={props.cycleTimeStatus}
    />
  )
}

Deno.test("shows running at cadence", async () => {
  await using _ctHandle = componentTesting()

  const machineData = createMachineData()

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

  const machineData = createMachineData()

  machineData.val.campChange.value = true

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const statusTextEl = await findByText("CAMPAIGN CHANGE STATUS")
  assert(statusTextEl.classList.contains("text-info"))
  assertFalse(statusTextEl.classList.contains("is-status-stopped"))
})

Deno.test("shows stopped when cycle time is over", async () => {
  await using _ctHandle = componentTesting()

  const machineData = createMachineData()

  machineData.val.cycle.value = true
  machineData.val.cycleTimeOver.value = true

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const statusTextEl = await findByText("STOPPED STATUS")
  assert(statusTextEl.classList.contains("text-error"))
  assert(statusTextEl.classList.contains("is-status-stopped"))
})

Deno.test("shows stopped when not in cycle and not in campaign change", async () => {
  await using _ctHandle = componentTesting()

  const machineData = createMachineData()

  const { findByText } = render(
    <Wrapper
      machineData={machineData}
      cycleTimeStatus={signal(CycleTimeStatus.Good)}
    />,
  )

  const statusTextEl = await findByText("STOPPED STATUS")
  assert(statusTextEl.classList.contains("text-error"))
  assert(statusTextEl.classList.contains("is-status-stopped"))
})
