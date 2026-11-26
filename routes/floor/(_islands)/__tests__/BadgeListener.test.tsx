import { assertEquals, assertFalse } from "@std/assert"
import { act, render } from "@testing-library/preact"
import sinon from "sinon"

import { componentTesting } from "@/tests/utils.ts"

import { BadgeListener, initialScanState, type Step, step } from "../BadgeListener.tsx"

const waitingText = "🐞 UID: waiting for badge"

/** Fast enough for the listener to consider keystrokes coming from a badge reader. */
const readerGapMillis = 10

/** Returns the physical key code for an hexadecimal character. */
function codeFor(char: string): string {
  return /\d/.test(char) ? `Digit${char}` : `Key${char.toUpperCase()}`
}

/**
 * Converts a sequence into key codes.
 *
 * Characters other than hexadecimal ones can be passed as key codes inside brackets,
 * e.g. `"12[Space]34"`.
 */
function codesOf(sequence: string): string[] {
  return [...sequence.matchAll(/\[(\w+)\]|([0-9a-fA-F])/g)].map(([, code, char]) =>
    code ?? codeFor(char)
  )
}

interface ScanOptions {
  start?: number
  gap?: number
  enterCode?: string
}

/** Returns the key codes and timestamps of a badge reader typing a sequence, followed by Enter. */
function scanKeys(
  sequence: string,
  { start = 1000, gap = readerGapMillis, enterCode = "Enter" }: ScanOptions = {},
): { code: string; timeStamp: number }[] {
  return [...codesOf(sequence), enterCode].map((code, i) => ({ code, timeStamp: start + i * gap }))
}

// ---------------------------------------------------------------------------
// step(): pure state machine
// ---------------------------------------------------------------------------

/** Feeds keystrokes to `step`, starting from the initial state, and returns every step. */
function feed(keys: { code: string; timeStamp: number }[]): Step[] {
  let state = initialScanState
  return keys.map((key) => {
    const result = step(state, key)
    state = result.state
    return result
  })
}

/** Returns the UIDs emitted while feeding the keystrokes. */
function uidsOf(keys: { code: string; timeStamp: number }[]): string[] {
  return feed(keys).flatMap((s) => s.uid ? [s.uid] : [])
}

for (const [bytes, uid] of [[4, "04A1B2C3"], [7, "04A1B2C3D4E5F6"], [10, "0123456789ABCDEF0123"]]) {
  Deno.test(`step: emits a ${bytes}-byte UID`, () => {
    assertEquals(uidsOf(scanKeys(uid as string)), [uid])
  })
}

for (
  const [reason, uid] of [
    ["odd number of hex digits", "04A1B2C"],
    ["3 bytes", "04A1B2"],
    ["5 bytes", "04A1B2C3D4"],
    ["11 bytes", "0123456789ABCDEF012345"],
  ]
) {
  Deno.test(`step: ignores an invalid UID (${reason})`, () => {
    assertEquals(uidsOf(scanKeys(uid)), [])
  })
}

Deno.test("step: emits nothing until the terminator", () => {
  const steps = feed(scanKeys("04A1B2C3"))
  assertEquals(steps.slice(0, -1).map((s) => s.uid), Array(8).fill(null))
})

Deno.test("step: accepts NumpadEnter as terminator", () => {
  assertEquals(uidsOf(scanKeys("04A1B2C3", { enterCode: "NumpadEnter" })), ["04A1B2C3"])
})

Deno.test("step: ignores human typing speed", () => {
  assertEquals(uidsOf(scanKeys("04A1B2C3", { gap: 81 })), [])
})

Deno.test("step: accepts keystrokes exactly at the maximum gap", () => {
  assertEquals(uidsOf(scanKeys("04A1B2C3", { gap: 80 })), ["04A1B2C3"])
})

Deno.test("step: discards slowly typed characters preceding a scan", () => {
  const keys = [
    { code: "KeyF", timeStamp: 500 },
    { code: "KeyF", timeStamp: 700 },
    ...scanKeys("04A1B2C3", { start: 900 }),
  ]
  assertEquals(uidsOf(keys), ["04A1B2C3"])
})

Deno.test("step: resets the buffer on a non-hexadecimal key", () => {
  assertEquals(uidsOf(scanKeys("FFFF[KeyZ]04A1B2C3")), ["04A1B2C3"])
})

Deno.test("step: tolerates spaces inside a scan", () => {
  assertEquals(uidsOf(scanKeys("04[Space]A1[Space]B2[Space]C3")), ["04A1B2C3"])
})

Deno.test("step: resets the buffer after a terminator", () => {
  const steps = feed(scanKeys("04A1B2C3"))
  assertEquals(steps.at(-1)?.state.buf, "")
})

Deno.test("step: emits successive scans independently", () => {
  const end = 1000 + 8 * readerGapMillis
  const keys = [
    ...scanKeys("04A1B2C3"),
    ...scanKeys("ABC", { start: end + 1000 }),
    ...scanKeys("0123456789ABCD", { start: end + 2000 }),
  ]
  assertEquals(uidsOf(keys), ["04A1B2C3", "0123456789ABCD"])
})

Deno.test("step: prevents default only for keystrokes belonging to a scan", () => {
  const prevented = feed([
    // Isolated keys must keep their default behavior.
    { code: "Enter", timeStamp: 100 },
    { code: "Space", timeStamp: 200 },
    // The first hex digit can't be distinguished from human typing yet.
    { code: "Digit0", timeStamp: 1000 },
    // Following keystrokes are swallowed.
    { code: "Digit4", timeStamp: 1010 },
    { code: "Space", timeStamp: 1020 },
    { code: "KeyA", timeStamp: 1030 },
    { code: "Enter", timeStamp: 1040 },
    // A non-hexadecimal key ends the scan and is left alone.
    { code: "Digit1", timeStamp: 2000 },
    { code: "KeyZ", timeStamp: 2010 },
  ]).map((s) => s.prevent)

  assertEquals(prevented, [false, false, false, true, true, true, true, false, false])
})

// ---------------------------------------------------------------------------
// <BadgeListener />: DOM wiring
// ---------------------------------------------------------------------------

interface PressOptions extends KeyboardEventInit {
  target?: EventTarget
}

/** Dispatches a keydown event with a controlled timestamp, returns the dispatched event. */
function press(code: string, timeStamp: number, options: PressOptions = {}): KeyboardEvent {
  const { target = document.body, ...init } = options
  const event = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true, ...init })
  Object.defineProperty(event, "timeStamp", { value: timeStamp })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

/** Simulates a badge reader typing the sequence on the page, returns the last timestamp. */
function scan(sequence: string, options: ScanOptions & PressOptions = {}): number {
  const { start, gap, enterCode, ...pressOptions } = options
  const keys = scanKeys(sequence, { start, gap, enterCode })
  for (const { code, timeStamp } of keys) {
    press(code, timeStamp, pressOptions)
  }
  return keys.at(-1)!.timeStamp
}

function displayedText(container: Element): string | null | undefined {
  return container.querySelector("p")?.textContent
}

Deno.test("shows a waiting message initially", async () => {
  await using _ctHandle = componentTesting()

  const { container } = render(<BadgeListener />)

  assertEquals(displayedText(container), waitingText)
})

Deno.test("displays a scanned UID", async () => {
  await using _ctHandle = componentTesting()

  const { container } = render(<BadgeListener />)

  scan("04A1B2C3")

  assertEquals(displayedText(container), "🐞 UID: 04A1B2C3")
})

Deno.test("relies on physical key codes, regardless of keyboard layout", async () => {
  await using _ctHandle = componentTesting()

  const { container } = render(<BadgeListener />)

  // On an AZERTY layout, Digit keys produce symbols without Shift.
  scan("04A1B2C3", { key: "&" })

  assertEquals(displayedText(container), "🐞 UID: 04A1B2C3")
})

for (const modifier of ["ctrlKey", "altKey", "metaKey"]) {
  Deno.test(`ignores keystrokes with ${modifier} modifier`, async () => {
    await using _ctHandle = componentTesting()

    const { container } = render(<BadgeListener />)

    scan("04A1B2C3", { [modifier]: true })

    assertEquals(displayedText(container), waitingText)
  })
}

Deno.test("ignores a modified keystroke without breaking an ongoing scan", async () => {
  await using _ctHandle = componentTesting()

  const { container } = render(<BadgeListener />)

  press("Digit0", 1000)
  press("Digit4", 1010)
  const modified = press("KeyC", 1020, { ctrlKey: true })
  scan("A1B2C3", { start: 1030 })

  assertFalse(modified.defaultPrevented)
  assertEquals(displayedText(container), "🐞 UID: 04A1B2C3")
})

for (
  const [name, create] of [
    ["an input", () => document.createElement("input")],
    ["a textarea", () => document.createElement("textarea")],
    ["a select", () => document.createElement("select")],
    ["a contenteditable element", () => {
      const div = document.createElement("div")
      div.contentEditable = "true"
      return div
    }],
  ] as const
) {
  Deno.test(`ignores keystrokes targeting ${name}`, async () => {
    await using _ctHandle = componentTesting()

    const { container } = render(<BadgeListener />)
    const target = create()
    document.body.appendChild(target)

    scan("04A1B2C3", { target })

    assertEquals(displayedText(container), waitingText)
  })
}

Deno.test("applies preventDefault as decided by the state machine", async () => {
  await using _ctHandle = componentTesting()

  render(<BadgeListener />)

  assertFalse(press("Digit0", 1000).defaultPrevented)
  assertEquals(press("Digit4", 1010).defaultPrevented, true)
})

Deno.test("replaces the UID on a new valid scan, keeps it on an invalid one", async () => {
  await using _ctHandle = componentTesting()

  const { container } = render(<BadgeListener />)

  const end = scan("04A1B2C3")
  assertEquals(displayedText(container), "🐞 UID: 04A1B2C3")

  const end2 = scan("0123456789ABCD", { start: end + 1000 })
  assertEquals(displayedText(container), "🐞 UID: 0123456789ABCD")

  scan("ABC", { start: end2 + 1000 })
  assertEquals(displayedText(container), "🐞 UID: 0123456789ABCD")
})

Deno.test("receives keystrokes even if propagation is stopped by the page", async () => {
  await using _ctHandle = componentTesting()

  const { container } = render(<BadgeListener />)
  const target = document.createElement("button")
  target.addEventListener("keydown", (e) => e.stopPropagation())
  document.body.appendChild(target)

  scan("04A1B2C3", { target })

  assertEquals(displayedText(container), "🐞 UID: 04A1B2C3")
})

Deno.test("removes its listener when unmounted", async () => {
  await using _ctHandle = componentTesting()

  const addSpy = sinon.spy(globalThis, "addEventListener")
  const removeSpy = sinon.spy(globalThis, "removeEventListener")

  const { unmount } = render(<BadgeListener />)

  const addCall = addSpy.getCalls().find((c) => c.args[0] === "keydown")
  sinon.assert.match(addCall?.args[2], { capture: true })
  sinon.assert.notCalled(removeSpy.withArgs("keydown"))

  unmount()

  sinon.assert.calledOnceWithExactly(
    removeSpy.withArgs("keydown"),
    "keydown",
    addCall!.args[1],
    { capture: true },
  )
})
