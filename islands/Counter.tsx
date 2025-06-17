import type { Signal } from "@preact/signals"
import { Button } from "../components/Button.tsx"

interface CounterProps {
  count: Signal<number>
}

export default function Counter(props: CounterProps) {
  return (
    <div class="is-flex is-gap-3 py-6">
      <Button onClick={() => props.count.value -= 1}>-1</Button>
      <p class="is-size-3">{props.count}</p>
      <Button onClick={() => props.count.value += 1}>+1</Button>
    </div>
  )
}
