import { Timeline, type TimelineConfig } from "@cailloumajor/frontend-utils-wasm"
import { useComputed, useSignal } from "@preact/signals"
import { clsx } from "clsx"
import { useEffect, useRef } from "preact/hooks"

/** Utilities used by this module, exported to allow mocking for tests. */
export const moduleUtils = {
  newTimeline(...args: ConstructorParameters<typeof Timeline>) {
    return new Timeline(...args)
  },
}

interface LegendItem {
  /** The class used to apply a background color. */
  colorClass: string
  /** The text for this item. */
  text: string
}

type OmittedOptions = "palette" | "fontFamily" | "opacity"

interface TimelineProps extends Omit<TimelineConfig, OmittedOptions> {
  /** The URL of the API to fetch for data. */
  apiUrl: string
  /** The interval in milliseconds at which the timeline should be refreshed. */
  refreshMillis: number
  /** The items composing the legend */
  legendItems: LegendItem[]
}

export function TimelineDisplay(props: TimelineProps) {
  const canvasSize = useSignal({ height: 150, width: 300 })
  const error = useSignal<string | null>(null)

  const hasError = useComputed(() => error.value != null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const legendRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (canvasRef.current == null) {
      throw new Error("Unexpected null canvas element ref")
    }
    const fontFamily = getComputedStyle(canvasRef.current).fontFamily
    const palette = legendRefs.current.map((el) => {
      if (el == null) {
        throw new Error("Unexpected null legend element ref")
      }
      return getComputedStyle(el).backgroundColor
    })
    const { xIntervalMinutes, xOffsetMinutes, emphasisLabels } = props
    const timeline = moduleUtils.newTimeline(
      canvasRef.current,
      {
        fontFamily,
        palette,
        opacity: 0.7,
        xIntervalMinutes,
        xOffsetMinutes,
        emphasisLabels,
      },
    )

    canvasRef.current.addEventListener("drawed", () => {
      error.value = null
    })

    function drawTimeline() {
      fetch(props.apiUrl)
        .then((resp) => {
          if (!resp.ok) {
            throw new Error(`HTTP error, status: ${resp.status} ${resp.statusText}`)
          }
          return resp.arrayBuffer()
        })
        .then((buf) => timeline.draw(new Uint8Array(buf)))
        .catch((err) => {
          error.value = String(err)
        })
    }

    function onResize(fn: (entries: ResizeObserverEntry[]) => void): ResizeObserverCallback {
      let timer: number

      return function (entries: ResizeObserverEntry[]) {
        clearTimeout(timer)
        timer = setTimeout(() => {
          fn(entries)
        }, 200)
      }
    }

    const resizeObserver = new ResizeObserver(onResize((entries) => {
      for (const { contentBoxSize } of entries) {
        if (contentBoxSize.length) {
          const width = contentBoxSize[0].inlineSize
          if (width === 0 || canvasSize.value.width === width) {
            return
          }
          canvasSize.value = {
            height: Math.floor(width / 12),
            width,
          }
          drawTimeline()
        }
      }
    }))

    if (canvasRef.current.parentElement == null) {
      throw new Error("Unexpected null canvas parent element")
    }
    resizeObserver.observe(canvasRef.current.parentElement)

    const intervalHandle = setInterval(drawTimeline, props.refreshMillis)

    return () => {
      resizeObserver.disconnect()
      clearInterval(intervalHandle)
      timeline.free()
    }
  }, [])

  return (
    <div
      class="card card-border shadow-md shadow-base-content/10"
      style={{ "--card-p": "0.5rem", "--card-fs": "1rem" }}
    >
      <div class="card-body">
        <canvas
          {...canvasSize.value}
          class={hasError.value ? "invisible" : undefined}
          aria-label="status timeline"
          ref={canvasRef}
        >
          <code>canvas</code> element is not supported.
        </canvas>
        <div
          class={clsx("flex", "justify-around", hasError.value && "invisible")}
          data-testid="timeline-legend"
        >
          {props.legendItems.map(({ colorClass, text }, idx) => (
            <div class="flex items-center justify-center m-1" key={colorClass}>
              <div
                class={`${colorClass} h-4 w-8 opacity-70`}
                ref={(el) => {
                  legendRefs.current[idx] = el
                }}
              >
              </div>
              <div class="ml-1">{text}</div>
            </div>
          ))}
        </div>
        <div
          class={clsx(
            "absolute",
            "top-1/2",
            "left-1/2",
            "-translate-1/2",
            "text-xl",
            "text-error",
            !hasError.value && "hidden",
          )}
          role="alert"
          data-testid="timeline-error"
        >
          {error.value}
        </div>
      </div>
    </div>
  )
}
