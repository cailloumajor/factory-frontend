import { Timeline, type TimelineConfig } from "@cailloumajor/frontend-utils-wasm"
import { type Signal, useSignal } from "@preact/signals"
import { debounce } from "@std/async"
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
  /** The error text to be displayed, if any */
  errorText: Signal<string>
}

export function TimelineDisplay(props: TimelineProps) {
  const canvasSize = useSignal({ height: 150, width: 300 })

  const setDataSuccess = useSignal(false)

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

    const abort = new AbortController()
    let timeoutHandle: number

    function fetchTimelineData() {
      fetch(props.apiUrl, { signal: abort.signal })
        .then((resp) => {
          if (!resp.ok) {
            throw new Error(`HTTP error, status: ${resp.status} ${resp.statusText}`)
          }
          return resp.arrayBuffer()
        })
        .then((buf) => {
          timeline.setData(new Uint8Array(buf))
          setDataSuccess.value = true
          drawTimeline()
        })
        .catch((err) => {
          setDataSuccess.value = false
          props.errorText.value = String(err)
        })
        .finally(() => {
          timeoutHandle = +setTimeout(fetchTimelineData, props.refreshMillis)
        })
    }

    fetchTimelineData()

    function drawTimeline() {
      if (!setDataSuccess.value) {
        return
      }

      try {
        timeline.draw()
        props.errorText.value = ""
      } catch (err) {
        props.errorText.value = String(err)
      }
    }

    const onResize = debounce(
      (width: number) => {
        if (width === 0 || canvasSize.value.width === width) {
          return
        }
        canvasSize.value = {
          height: globalThis.innerHeight / 4,
          width,
        }
        setTimeout(drawTimeline, 200)
      },
      300,
      { signal: abort.signal },
    )

    const resizeObserver = new ResizeObserver((entries) => {
      for (const { contentBoxSize } of entries) {
        if (contentBoxSize.length) {
          onResize(contentBoxSize[0].inlineSize)
        }
      }
    })

    if (canvasRef.current.parentElement == null) {
      throw new Error("Unexpected null canvas parent element")
    }
    resizeObserver.observe(canvasRef.current.parentElement)

    return () => {
      resizeObserver.disconnect()
      onResize.clear()
      clearTimeout(timeoutHandle)
      abort.abort()
      timeline.free()
    }
  }, [])

  return (
    <div class="card bg-base-200">
      <div class="card-body p-2">
        <canvas
          {...canvasSize.value}
          class={clsx(props.errorText.value && "skeleton")}
          aria-label="status timeline"
          ref={canvasRef}
        >
          <code>canvas</code> element is not supported.
        </canvas>
        <div
          class="flex justify-around"
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
      </div>
    </div>
  )
}
