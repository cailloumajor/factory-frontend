import { mdiHelp, mdiLinkOff, mdiSwapHorizontal } from "@mdi/js"
import { useComputed, useSignal } from "@preact/signals"
import { assert, assertEquals } from "@std/assert"
import { FakeTime } from "@std/testing/time"
import { render, waitFor } from "@testing-library/preact"
import { Centrifuge, Subscription, type TransportEndpoint } from "centrifuge"
import * as sinon from "sinon"

import { componentTesting } from "@/tests/utils.ts"

import { createMachineData, LinkStatus, MachineDataLink, moduleUtils } from "../MachineDataLink.tsx"

function Wrapper() {
  const machineData = createMachineData()
  const errorText = useSignal("")
  const dataValid = useComputed(() => machineData.invalid.value ? "no" : "yes")

  return (
    <div>
      <div data-testid="data-valid">{dataValid}</div>
      {Object.entries(machineData.val).map(([k, v]) => (
        <span data-testid={"val-" + k} key={k}>{v}</span>
      ))}
      {Object.entries(machineData.ts).map(([k, v]) => (
        <span data-testid={"ts-" + k} key={k}>{v}</span>
      ))}
      <div data-testid="error-text">{errorText}</div>
      <MachineDataLink
        centrifugoBasePath="/fake-path"
        centrifugoNamespace="fake-ns"
        partnerId="fake-partner"
        machineData={machineData}
        plcTimeoutMillis={50000}
        debug
        errorText={errorText}
      />
    </div>
  )
}

/** Assert that the provided icon element represents the provided expected status. */
function assertStatusIcon(icon: HTMLElement, expected: LinkStatus) {
  const expectedPath = {
    [LinkStatus.Unknown]: mdiHelp,
    [LinkStatus.Down]: mdiLinkOff,
    [LinkStatus.Up]: mdiSwapHorizontal,
  }[expected]
  const expectedClass = {
    [LinkStatus.Unknown]: "fill-warning",
    [LinkStatus.Down]: "fill-error",
    [LinkStatus.Up]: "fill-success",
  }[expected]

  assertEquals(icon.querySelector("path")?.getAttribute("d"), expectedPath)
  assert(icon.classList.contains(expectedClass))
}

Deno.test("instanciates Centrifuge", async () => {
  await using _ctHandle = componentTesting()

  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: sinon.createStubInstance(Subscription),
  })
  const fakeCentrifugoCtor = sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  render(<Wrapper />)

  const expectedEndpoints: TransportEndpoint[] = [
    {
      transport: "websocket",
      endpoint: "ws://testing.com/fake-path/connection/websocket",
    },
    {
      transport: "sse",
      endpoint: "http://testing.com/fake-path/connection/sse",
    },
  ]

  await waitFor(() => {
    sinon.assert.calledOnceWithExactly(fakeCentrifugoCtor, expectedEndpoints, {
      name: "Frontend (fake-partner)",
      debug: true,
      emulationEndpoint: "http://testing.com/fake-path/emulation",
      maxReconnectDelay: 5000,
    })
  })
})

Deno.test("connects Centrifuge", async () => {
  await using _ctHandle = componentTesting()

  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: sinon.createStubInstance(Subscription),
  })
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  render(<Wrapper />)

  await waitFor(() => {
    sinon.assert.calledOnce(fakeCentrifugo.connect)
  })
})

Deno.test("disconnects Centrifuge when unmounted", async () => {
  await using _ctHandle = componentTesting()

  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: sinon.createStubInstance(Subscription),
  })
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  const { unmount } = render(<Wrapper />)

  await waitFor(() => {
    sinon.assert.notCalled(fakeCentrifugo.disconnect)
  })

  unmount()

  await waitFor(() => {
    sinon.assert.calledOnce(fakeCentrifugo.disconnect)
  })
})

Deno.test("changes Centrifugo link status upon connection and disconnection", async () => {
  await using _ctHandle = componentTesting()

  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: sinon.createStubInstance(Subscription),
  })
  const onConnected = fakeCentrifugo.on.withArgs("connected")
  const onDisconnected = fakeCentrifugo.on.withArgs("disconnected")
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  const { getByTestId } = render(<Wrapper />)

  const centrifugoStatus = getByTestId("centrifugo-status-icon")
  const centrifugoTransport = getByTestId("centrifugo-transport")

  await waitFor(() => {
    assertStatusIcon(centrifugoStatus, LinkStatus.Unknown)

    assertEquals(centrifugoTransport.innerText, "")
  })

  onConnected.callArgWith(1, { transport: "sse" })

  await waitFor(() => {
    assertStatusIcon(centrifugoStatus, LinkStatus.Up)

    assertEquals(centrifugoTransport.innerText, "(SSE)")
    assert(centrifugoTransport.classList.contains("text-warning"))
  })

  onConnected.callArgWith(1, { transport: "websocket" })

  await waitFor(() => {
    assertEquals(centrifugoTransport.innerText, "(WS)")
    assert(centrifugoTransport.classList.contains("text-success"))
  })

  onDisconnected.callArg(1)

  await waitFor(() => {
    assertStatusIcon(centrifugoStatus, LinkStatus.Down)

    assertEquals(centrifugoTransport.innerText, "")
  })
})

Deno.test("sets an error message ans shows disconnected on Centrifuge error", async () => {
  await using _ctHandle = componentTesting()

  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: sinon.createStubInstance(Subscription),
  })
  const onError = fakeCentrifugo.on.withArgs("error")
  const onConnected = fakeCentrifugo.on.withArgs("connected")
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  const { getByTestId } = render(<Wrapper />)

  const centrifugoStatus = getByTestId("centrifugo-status-icon")
  const errorText = getByTestId("error-text")

  onConnected.callArgWith(1, { transport: "" })

  await waitFor(() => {
    assertStatusIcon(centrifugoStatus, LinkStatus.Up)
  })

  onError.callArgWith(1, { type: "error-type", error: new Error("fake-error") })

  await waitFor(() => {
    assertStatusIcon(centrifugoStatus, LinkStatus.Down)
    assertEquals(errorText.innerText, "Centrifuge error (error-type): fake-error")
  })

  onConnected.callArgWith(1, { transport: "" })

  await waitFor(() => {
    assertStatusIcon(centrifugoStatus, LinkStatus.Up)
    assertEquals(errorText.innerText, "")
  })
})

Deno.test("subscribes to Centrifuge data change", async () => {
  await using _ctHandle = componentTesting()

  const fakeSubscription = sinon.createStubInstance(Subscription)
  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: fakeSubscription,
  })
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  render(<Wrapper />)

  await waitFor(() => {
    sinon.assert.calledOnceWithExactly(fakeCentrifugo.newSubscription, "fake-ns:fake-partner")
    sinon.assert.calledOnce(fakeSubscription.subscribe)
  })
})

Deno.test("updates the data upon successfull subscription", async () => {
  await using _ctHandle = componentTesting()

  const fakeSubscription = sinon.createStubInstance(Subscription)
  const onSubscribed = fakeSubscription.on.withArgs("subscribed")
  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: fakeSubscription,
  })
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  const { getByTestId } = render(<Wrapper />)

  const scrapPartsVal = getByTestId("val-scrapParts")
  const avgCycleTimeVal = getByTestId("val-averageCycleTime")
  const partRefVal = getByTestId("val-partRef")
  const scrapPartsTs = getByTestId("ts-scrapParts")
  const partRefTs = getByTestId("ts-partRef")

  await waitFor(() => {
    assertEquals(scrapPartsVal.innerText, "0")
    assertEquals(avgCycleTimeVal.innerText, "0")
    assertEquals(partRefVal.innerText, "?")
    assertEquals(scrapPartsTs.innerText, "")
    assertEquals(partRefTs.innerText, "")
  })

  onSubscribed.callArgWith(1, {
    data: {
      val: {
        scrapParts: 42,
        averageCycleTime: 375,
        partRef: "fake-ref",
      },
      ts: {
        scrapParts: "fake-scrap-ts",
        partRef: "fake-part-ts",
      },
    },
  })

  await waitFor(() => {
    assertEquals(scrapPartsVal.innerText, "42")
    assertEquals(avgCycleTimeVal.innerText, "37.5")
    assertEquals(partRefVal.innerText, "fake-ref")
    assertEquals(scrapPartsTs.innerText, "fake-scrap-ts")
    assertEquals(partRefTs.innerText, "fake-part-ts")
  })
})

Deno.test("sets an error message on subscription error", async () => {
  await using _ctHandle = componentTesting()

  const fakeSubscription = sinon.createStubInstance(Subscription)
  const onError = fakeSubscription.on.withArgs("error")
  const onSubscribed = fakeSubscription.on.withArgs("subscribed")
  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: fakeSubscription,
  })
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  const { getByTestId } = render(<Wrapper />)

  const errorText = getByTestId("error-text")

  onError.callArgWith(1, { type: "error-type", error: new Error("fake-error") })

  await waitFor(() => {
    assertEquals(errorText.innerText, "Centrifuge subscription error (error-type): fake-error")
  })

  onSubscribed.callArgWith(1, {})

  await waitFor(() => {
    assertEquals(errorText.innerText, "")
  })
})

Deno.test("changes PLC link status and data link signal according to events", async () => {
  await using _ctHandle = componentTesting()

  using fakeTime = new FakeTime()

  const fakeSubscription = sinon.createStubInstance(Subscription)
  const onPublication = fakeSubscription.on.withArgs("publication")
  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: fakeSubscription,
  })
  const onConnected = fakeCentrifugo.on.withArgs("connected")
  const onDisconnected = fakeCentrifugo.on.withArgs("disconnected")
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  const { getByTestId } = render(<Wrapper />)

  const plcStatus = getByTestId("plc-status-icon")
  const dataValid = getByTestId("data-valid")

  onConnected.callArgWith(1, { transport: "" })

  await waitFor(() => {
    assertStatusIcon(plcStatus, LinkStatus.Down)
    assertEquals(dataValid.innerText, "no")
  })

  onPublication.callArgWith(1, {
    data: {
      val: {
        goodParts: 42,
      },
    },
  })

  await waitFor(() => {
    assertStatusIcon(plcStatus, LinkStatus.Up)
    assertEquals(dataValid.innerText, "yes")
  })

  fakeTime.tick(50001)

  await waitFor(() => {
    assertStatusIcon(plcStatus, LinkStatus.Down)
    assertEquals(dataValid.innerText, "no")
  })

  onDisconnected.callArg(1)

  await waitFor(() => {
    assertStatusIcon(plcStatus, LinkStatus.Unknown)
    assertEquals(dataValid.innerText, "no")
  })
})

Deno.test("updates the data upon Centrifugo publication", async () => {
  await using _ctHandle = componentTesting()

  const fakeSubscription = sinon.createStubInstance(Subscription)
  const onPublication = fakeSubscription.on.withArgs("publication")
  const fakeCentrifugo = sinon.createStubInstance(Centrifuge, {
    newSubscription: fakeSubscription,
  })
  sinon.stub(moduleUtils, "newCentrifuge").returns(fakeCentrifugo)

  const { getByTestId } = render(<Wrapper />)

  const scrapPartsVal = getByTestId("val-scrapParts")
  const partRefVal = getByTestId("val-partRef")
  const scrapPartsTs = getByTestId("ts-scrapParts")
  const partRefTs = getByTestId("ts-partRef")

  await waitFor(() => {
    assertEquals(scrapPartsVal.innerText, "0")
    assertEquals(partRefVal.innerText, "?")
    assertEquals(scrapPartsTs.innerText, "")
    assertEquals(partRefTs.innerText, "")
  })

  onPublication.callArgWith(1, {
    data: {
      val: {
        scrapParts: 651,
        partRef: "somepart",
      },
      ts: {
        scrapParts: "long-ago",
        partRef: "soon",
      },
    },
  })

  await waitFor(() => {
    assertEquals(scrapPartsVal.innerText, "651")
    assertEquals(partRefVal.innerText, "somepart")
    assertEquals(scrapPartsTs.innerText, "long-ago")
    assertEquals(partRefTs.innerText, "soon")
  })
})
