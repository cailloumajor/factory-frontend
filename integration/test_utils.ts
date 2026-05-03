import * as path from "@std/path"
import puppeteer from "puppeteer"

const size = { width: 1024, height: 768 }

const isInCI = ["CI", "CONTINUOUS_INTEGRATION"].some((key) => Deno.env.has(key))

let browser: puppeteer.Browser

export async function startBrowser() {
  browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: isInCI,
  })
}

export async function stopBrowser() {
  await browser.close()
}

export function testId(t: Deno.TestContext): string {
  const testsFile = path.parse(t.origin)

  return testsFile.name + "_" + t.name.replaceAll(" ", "_")
}

export async function withBrowser(
  t: Deno.TestContext,
  fn: (page: puppeteer.Page) => void | Promise<void>,
): Promise<void> {
  const page = await browser.newPage()

  await page.setViewport(size)

  if (!isInCI) {
    await fn(page)
  } else {
    const videoFile = path.join(import.meta.dirname!, "videos", testId(t))
    const recorder = await page.screencast({
      path: `${videoFile}.webm`,
    })
    await fn(page)
    await recorder.stop()
  }

  await page.close()
}
