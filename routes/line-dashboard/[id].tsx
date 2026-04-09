import { signal } from "@preact/signals"
import * as posix from "@std/path/posix"
import type { RouteConfig } from "fresh"

import { define } from "@/utils/state.ts"

import { Alert } from "@/islands/Alert.tsx"

import { ConfigSync, createDashboardConfig } from "./(_islands)/ConfigSync.tsx"
import { Metrics } from "./(_islands)/Metrics.tsx"
import { createMachineData, MachineDataLink } from "./(_islands)/MachineDataLink.tsx"
import { TimelineDisplay } from "./(_islands)/Timeline.tsx"
import { LineDashboardTitle } from "./(_islands)/Title.tsx"

export const config: RouteConfig = {
  skipInheritedLayouts: true,
}

export default define.page(({ params, state }) => {
  const configApiUrl = posix.join(state.appConfig.dashboardConfig.baseApiPath, params.id)
  const timelineApiUrl = posix.join(state.appConfig.timeline.baseApiPath, params.id)
  const performanceApiUrl = posix.join(state.appConfig.performance.baseApiPath, params.id)

  const dashboardConfig = createDashboardConfig()
  const dashboardConfigError = signal("")

  const machineData = createMachineData()
  const machineDataLinkError = signal("")

  const performanceError = signal("")

  return (
    // https://stackoverflow.com/questions/59812003/tailwindcss-fixed-sticky-footer-on-the-bottom#comment139529618_59865099
    <div class="flex flex-col min-h-screen line-dashboard-root">
      <header class="navbar bg-base-300 min-h-0 shadow-md text-center text-lg">
        <h1 class="mx-auto">
          <LineDashboardTitle name={dashboardConfig.title} campaign={machineData.val.partRef} />
        </h1>
      </header>

      <main class="grow relative px-[0.5vw] pt-[1vh] has-[.is-status-stopped]:stopped-background">
        <Metrics
          titles={{
            goodParts: state.t(($) => $.metrics.goodParts),
            averageCycleTime: state.t(($) => $.metrics.averageCycleTime),
            targetCycleTime: state.t(($) => $.metrics.targetCycleTime),
            scrapParts: state.t(($) => $.metrics.scrapParts),
            performance: state.t(($) => $.metrics.performance),
          }}
          statusTexts={{
            runAtCadence: state.t(($) => $.statuses.runAtCadence),
            runUnderCadence: state.t(($) => $.statuses.runUnderCadence),
            campaignChange: state.t(($) => $.statuses.campaignChange),
            stopped: state.t(($) => $.statuses.stopped),
            since: state.t(($) => $.statuses.since),
          }}
          config={dashboardConfig}
          configError={dashboardConfigError}
          machineData={machineData}
          performanceApiUrl={performanceApiUrl}
          performanceRefreshMillis={state.appConfig.performance.refreshMillis}
          performanceError={performanceError}
        />

        <TimelineDisplay
          apiUrl={timelineApiUrl}
          refreshMillis={state.appConfig.timeline.refreshMillis}
          legendItems={[
            { colorClass: "bg-success", text: state.t(($) => $.statuses.runAtCadence) },
            { colorClass: "bg-warning", text: state.t(($) => $.statuses.runUnderCadence) },
            { colorClass: "bg-info", text: state.t(($) => $.statuses.campaignChange) },
            { colorClass: "bg-error", text: state.t(($) => $.statuses.stopped) },
          ]}
          xIntervalMinutes={state.appConfig.timeline.intervalMinutes}
          xOffsetMinutes={state.appConfig.timeline.offsetMinutes}
          emphasisLabels={state.appConfig.shiftStartTimes}
        />

        <ConfigSync
          apiUrl={configApiUrl}
          refreshMillis={state.appConfig.dashboardConfig.refreshMillis}
          config={dashboardConfig}
          errorText={dashboardConfigError}
        />

        <div class="toast bottom-10">
          <Alert context="Dashboard config" errorText={dashboardConfigError} />
          <Alert context="Machine data" errorText={machineDataLinkError} />
          <Alert context="Performance" errorText={performanceError} />
        </div>
      </main>

      <footer class="footer footer-horizontal bg-base-300 shadow-md items-center p-1">
        <MachineDataLink
          class="justify-self-end"
          centrifugoBasePath={state.appConfig.centrifugoBasePath}
          centrifugoNamespace={state.appConfig.machineData.centrifugoNamespace}
          partnerId={params.id}
          machineData={machineData}
          plcTimeoutMillis={state.appConfig.machineData.plcTimeoutMillis}
          debug={import.meta.env.DEV}
          errorText={machineDataLinkError}
        />
      </footer>
    </div>
  )
})
