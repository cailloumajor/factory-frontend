import { afterEach, beforeEach } from "@std/testing/bdd"
import { cleanup } from "@testing-library/preact"
import { Window as VirtualDomWindow } from "happy-dom"

export function setupComponentTesting() {
  let win: VirtualDomWindow | null = null

  beforeEach(() => {
    win = new VirtualDomWindow()
    globalThis.document = win.document as unknown as Document
  })

  afterEach(async () => {
    cleanup()
    await win?.happyDOM.abort()
    win?.close()
  })
}
