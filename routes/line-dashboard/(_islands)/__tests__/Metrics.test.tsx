import { signal } from "@preact/signals"
import { assertEquals } from "@std/assert"
import { render } from "@testing-library/preact"
import * as sinon from "sinon"

import { componentTesting } from "@/tests/utils.ts"

import { createDashboardConfig, type DashboardConfig } from "../ConfigSync.tsx"
import { createMachineData, type MachineData } from "../MachineDataLink.tsx"
import type { Metric } from "../Metric.tsx"
import { indirectImports, Metrics } from "../Metrics.tsx"

function MetricStub(props: Parameters<typeof Metric>[0]) {
  return (
    <div>
      <div data-testid={`metric-value-${props.title}`}>{props.value}</div>
      <div data-testid={`metric-color-${props.title}`}>{props.colorClass}</div>
      <div data-testid={`metric-loading-${props.title}`}>{props.loading.value ? "yes" : "no"}</div>
    </div>
  )
}

function StatusCardStub() {
  return <div></div>
}

function Wrapper(
  props: { config: DashboardConfig; configError: string; machineData: MachineData },
) {
  return (
    <Metrics
      titles={{
        goodParts: "a",
        averageCycleTime: "b",
        targetCycleTime: "c",
        scrapParts: "d",
        performance: "e",
      }}
      statusTexts={{
        runAtCadence: "",
        runUnderCadence: "",
        campaignChange: "",
        stopped: "",
        since: "",
      }}
      config={props.config}
      configError={signal(props.configError)}
      machineData={props.machineData}
    />
  )
}

Deno.test("applies loading state to machine data metrics", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  const { getByTestId } = render(
    <Wrapper config={config} configError="" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-loading-a").innerText, "yes")
  assertEquals(getByTestId("metric-loading-b").innerText, "yes")
  assertEquals(getByTestId("metric-loading-c").innerText, "no")
  assertEquals(getByTestId("metric-loading-d").innerText, "yes")
  assertEquals(getByTestId("metric-loading-e").innerText, "yes")
})

Deno.test("applies loading state to config API metrics on error", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  machineData.invalid.value = false

  const { getByTestId } = render(
    <Wrapper config={config} configError="some error" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-loading-a").innerText, "no")
  assertEquals(getByTestId("metric-loading-b").innerText, "no")
  assertEquals(getByTestId("metric-loading-c").innerText, "yes")
  assertEquals(getByTestId("metric-loading-d").innerText, "no")
  assertEquals(getByTestId("metric-loading-e").innerText, "no")
})

Deno.test("renders good cycle time", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  config.targetCycleTime.value = 95.5
  machineData.val.averageCycleTime.value = 95.4

  const { getByTestId } = render(
    <Wrapper config={config} configError="" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-value-b").innerText, "95.4")
  assertEquals(getByTestId("metric-color-b").innerText, "text-success")
})

Deno.test("renders warning cycle time", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  config.targetCycleTime.value = 28.7
  machineData.val.averageCycleTime.value = 30.2

  const { getByTestId } = render(
    <Wrapper config={config} configError="" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-value-b").innerText, "30.2")
  assertEquals(getByTestId("metric-color-b").innerText, "text-warning")
})

Deno.test("renders bad cycle time", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  config.targetCycleTime.value = 45.2
  machineData.val.averageCycleTime.value = 49.8

  const { getByTestId } = render(
    <Wrapper config={config} configError="" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-value-b").innerText, "49.8")
  assertEquals(getByTestId("metric-color-b").innerText, "text-error")
})

Deno.test("renders cycle times in localized format", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "usePreferredLanguages").returns(
    signal(["fr", ...navigator.languages]),
  )
  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  config.targetCycleTime.value = 45.2
  machineData.val.averageCycleTime.value = 49.8

  const { getByTestId } = render(
    <Wrapper config={config} configError="" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-value-b").innerText, "49,8")
  assertEquals(getByTestId("metric-value-c").innerText, "45,2")
})

Deno.test("renders zero scrap part", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  const { getByTestId } = render(
    <Wrapper config={config} configError="" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-value-d").innerText, "0")
  assertEquals(getByTestId("metric-color-d").innerText, "text-success")
})

Deno.test("renders at least one scrap parts", async () => {
  await using _ctHandle = componentTesting()

  sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
  sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

  const config = createDashboardConfig()
  const machineData = createMachineData()

  machineData.val.scrapParts.value = 2

  const { getByTestId } = render(
    <Wrapper config={config} configError="" machineData={machineData} />,
  )

  assertEquals(getByTestId("metric-value-d").innerText, "2")
  assertEquals(getByTestId("metric-color-d").innerText, "text-error")
})

// Deno.test("renders and updates the performance metric", async ()=>{
//   await using _ctHandle = componentTesting()

//   sinon.stub(indirectImports, "Metric").callsFake(MetricStub)
//   sinon.stub(indirectImports, "StatusCard").callsFake(StatusCardStub)

//   const config = createDashboardConfig()
//   const machineData = createMachineData()
// })
