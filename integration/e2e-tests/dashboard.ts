import { assertEquals } from "@std/assert"

import { startBrowser, stopBrowser, withBrowser } from "@/integration/test_utils.ts"
import type { MachineDataValues } from "@/routes/line-dashboard/(_islands)/MachineDataLink.tsx"

interface PubData {
  val?: Partial<MachineDataValues>
  ts?: { [K in keyof MachineDataValues]?: string }
}

const targetURL = (port?: number) => `http://127.0.0.1:${port ?? 8080}/line-dashboard/e2e-tests`

async function centrifugoPublish(data: PubData) {
  const payload = {
    channel: "integration:e2e-tests",
    data,
  }

  await fetch("http://127.0.0.1:8080/centrifugo/api/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "dc1e276a-9eb5-4950-a8bc-c13fe848154a",
    },
    body: JSON.stringify(payload),
  })
}

Deno.test.beforeAll(startBrowser)

Deno.test.afterAll(stopBrowser)

Deno.test("has a dynamic header title", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL())

    await page.locator("footer > span > b.text-success ::-p-text(\\(WS\\))").wait()

    await centrifugoPublish({
      val: {
        partRef: "E2E-CAMPAIGN",
      },
    })

    const titleText = await page
      .locator("header > h1")
      // Prevent test flakiness (locator found before config API values applied).
      .filter((el) => el.textContent.startsWith("e2e-tests"))
      .map((el) => el.innerText)
      .wait()
    assertEquals(titleText, "e2e-tests—E2E-CAMPAIGN")
  })
})

Deno.test("shows skeletons if PLC link is not established", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL())

    await page.locator("footer > span > b.text-success ::-p-text(\\(WS\\))").wait()

    await page.waitForFunction(
      () => {
        const skeletons = document.querySelectorAll(".skeleton")
        return skeletons.length === 4
      },
      // { polling: "mutation" },
    )
  })
})

Deno.test("shows skeleton and alert if performance fetching fails", async (t) => {
  await withBrowser(t, async (page) => {
    await page.setRequestInterception(true)
    page.on("request", (interceptedRequest) => {
      if (interceptedRequest.isInterceptResolutionHandled()) {
        return
      }

      if (interceptedRequest.url().endsWith("/performance/e2e-tests")) {
        interceptedRequest.respond({ status: 500 })
      } else {
        interceptedRequest.continue()
      }
    })

    await page.goto(targetURL())

    await page.locator("footer > span > b.text-success ::-p-text(\\(WS\\))").wait()

    await centrifugoPublish({
      val: {
        cycle: false,
      },
    })

    await page.waitForFunction(
      () => {
        const skeletons = document.querySelectorAll(".skeleton")
        const alert = document.querySelector<HTMLElement>(".alert.alert-error:not(.hidden)")

        return skeletons.length === 1 &&
          alert?.innerText ===
            "Performance\nError: HTTP error, status: 500 Internal Server Error"
      },
      { polling: "mutation" },
    )
  })
})

Deno.test("shows skeleton and alert if configuration fetching fails", async (t) => {
  await withBrowser(t, async (page) => {
    await page.setRequestInterception(true)
    page.on("request", (interceptedRequest) => {
      if (interceptedRequest.isInterceptResolutionHandled()) {
        return
      }

      if (interceptedRequest.url().endsWith("/dashboard-config/e2e-tests")) {
        interceptedRequest.respond({ status: 500 })
      } else {
        interceptedRequest.continue()
      }
    })

    await page.goto(targetURL())

    await page.locator("footer > span > b.text-success ::-p-text(\\(WS\\))").wait()

    await centrifugoPublish({
      val: {
        cycle: false,
      },
    })

    await page.waitForFunction(
      () => {
        const skeletons = document.querySelectorAll(".skeleton")
        const alert = document.querySelector<HTMLElement>(".alert.alert-error:not(.hidden)")

        return skeletons.length === 1 &&
          alert?.innerText ===
            "Dashboard config\nHTTP error, status: 500 Internal Server Error"
      },
      { polling: "mutation" },
    )
  })
})

Deno.test("shows alert if Centrifugo connection fails", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL(8082))

    await page.waitForFunction(
      () => {
        const alert = document.querySelector<HTMLElement>(".alert.alert-error:not(.hidden)")

        return alert?.innerText ===
          "Machine data\nCentrifuge error (connect): connection closed"
      },
      { polling: "mutation" },
    )
  })
})

Deno.test("connects to Centrifugo via SSE if origin is not allowed", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL(8081))

    const wsStatusText = await page
      .locator("footer > span > b.text-warning")
      .map((el) => el.innerText)
      .wait()
    assertEquals(wsStatusText, "(SSE)")
  })
})

Deno.test("shows all green statuses", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL())

    await page.locator("footer > span > b.text-success ::-p-text(\\(WS\\))").wait()

    await centrifugoPublish({
      val: {
        cycle: true,
      },
    })

    await page.waitForFunction(
      () => {
        const indicators = document.querySelectorAll("footer svg.fill-success")
        return indicators.length === 2
      },
      { polling: "mutation" },
    )
  })
})

Deno.test("displays published values", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL())

    await page.locator("footer > span > b.text-success ::-p-text(\\(WS\\))").wait()

    await centrifugoPublish({
      val: {
        goodParts: 5641,
        scrapParts: 849,
        averageCycleTime: 987,
      },
    })

    await page.waitForFunction(
      () => {
        const metrics = document.querySelectorAll<HTMLElement>(".card-body > span")
        const values = Array.from(metrics).map((el) => el.innerText)
        return values[0] === "5641" && values[1] === "98.7s" && values[3] === "849"
      },
      { polling: "mutation" },
    )
  })
})

Deno.test("displays performance ratio", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL())

    const performanceText = await page
      .locator(".card-body > span.text-warning")
      .map((el) => el.innerText)
      .wait()
    assertEquals(performanceText, "84.2%")
  })
})

Deno.test("displays the status", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL())

    await page.locator("footer > span > b.text-success ::-p-text(\\(WS\\))").wait()

    await centrifugoPublish({
      val: {
        cycle: false,
      },
    })

    const statusText = await page
      .locator(".card-body > div.is-status-stopped")
      .map((el) => el.innerText)
      .wait()
    assertEquals(statusText, "STOPPED")
  })
})

Deno.test("displays the timeline", async (t) => {
  await withBrowser(t, async (page) => {
    await page.goto(targetURL())

    await page.waitForFunction(
      () => {
        const timelineCanvas = document.querySelector<HTMLCanvasElement>(
          'canvas[aria-label="status timeline"]',
        )
        const context = timelineCanvas?.getContext("2d")
        const imageData = context?.getImageData(
          0,
          0,
          timelineCanvas?.width ?? 0,
          timelineCanvas?.height ?? 0,
        )
        const pixels = new Uint32Array(imageData?.data.buffer ?? new ArrayBuffer())
        return pixels.some((pixel) => pixel !== 0)
      },
      { polling: "mutation" },
    )
  })
})

Deno.test("shows skeleton and alert if timeline fetching fails", async (t) => {
  await withBrowser(t, async (page) => {
    await page.setRequestInterception(true)
    page.on("request", (interceptedRequest) => {
      if (interceptedRequest.isInterceptResolutionHandled()) {
        return
      }

      if (interceptedRequest.url().endsWith("/timeline/e2e-tests")) {
        interceptedRequest.respond({ status: 500 })
      } else {
        interceptedRequest.continue()
      }
    })

    await page.goto(targetURL())

    await page.waitForFunction(
      () => {
        const skeleton = document.querySelector("canvas.skeleton")
        const alert = document.querySelector<HTMLElement>(".alert.alert-error:not(.hidden)")

        return skeleton &&
          alert?.innerText === "Timeline\nError: HTTP error, status: 500 Internal Server Error"
      },
      { polling: "mutation" },
    )
  })
})
