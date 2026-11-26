import { useSignal } from "@preact/signals"
import { useEffect } from "preact/hooks"

export interface ScanState {
  /** Hex digits accumulated so far. */
  readonly buf: string
  /** Timestamp of the last considered keystroke. */
  readonly last: number
}

export interface Step {
  readonly state: ScanState
  /** Whether the keystroke belongs to a scan and must not reach the page. */
  readonly prevent: boolean
  /** Set when the keystroke completes a valid scan. */
  readonly uid: string | null
}

export const initialScanState: ScanState = { buf: "", last: 0 }

// Physical key codes → hex digit
const codeToHex: Record<string, string> = {
  "Digit0": "0",
  "Digit1": "1",
  "Digit2": "2",
  "Digit3": "3",
  "Digit4": "4",
  "Digit5": "5",
  "Digit6": "6",
  "Digit7": "7",
  "Digit8": "8",
  "Digit9": "9",
  "KeyA": "A",
  "KeyB": "B",
  "KeyC": "C",
  "KeyD": "D",
  "KeyE": "E",
  "KeyF": "F",
}

// Beyond this time, we have human keystrokes.
const maxGapMillis = 80

// Check whether the UID has a valid length.
const isValidLength = (l: number) => l === 4 || l === 7 || l === 10

/** Advances the scan state machine by one keystroke. */
export function step(state: ScanState, key: Pick<KeyboardEvent, "code" | "timeStamp">): Step {
  const buf = key.timeStamp - state.last > maxGapMillis ? "" : state.buf
  const next = (buf: string): ScanState => ({ buf, last: key.timeStamp })

  const hex = codeToHex[key.code]
  if (hex) {
    return { state: next(buf + hex), prevent: buf !== "", uid: null }
  }
  if (key.code === "Space" && buf) {
    return { state: next(buf), prevent: true, uid: null }
  }
  if ((key.code === "Enter" || key.code === "NumpadEnter") && buf) {
    const valid = buf.length % 2 === 0 && isValidLength(buf.length / 2)
    return { state: next(""), prevent: true, uid: valid ? buf : null }
  }
  return { state: next(""), prevent: false, uid: null }
}

function isEditable(el: EventTarget | null): boolean {
  const e = el as HTMLElement | null
  return !!e &&
    (e.isContentEditable ||
      e.tagName === "INPUT" ||
      e.tagName === "TEXTAREA" ||
      e.tagName === "SELECT")
}

export function BadgeListener() {
  const uid = useSignal<string | null>(null)

  useEffect(() => {
    let state = initialScanState

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.ctrlKey || e.altKey || e.metaKey) {
        return
      }

      const result = step(state, e)
      state = result.state

      if (result.prevent) {
        e.preventDefault()
      }
      if (result.uid) {
        uid.value = result.uid
      }
    }

    addEventListener("keydown", onKeyDown, { capture: true })

    return () => {
      removeEventListener("keydown", onKeyDown, { capture: true })
    }
  }, [])

  return <p>🐞 UID: {uid.value ?? "waiting for badge"}</p>
}
