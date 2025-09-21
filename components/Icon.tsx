import type { HTMLAttributes } from "preact"

interface IconProps extends HTMLAttributes<SVGElement> {
  /** The SVG contents of the icon (e.g. from `@mdi/js`). */
  iconSvg: string
}

export function Icon(props: IconProps) {
  return (
    <svg class={props.class} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={props.iconSvg} />
    </svg>
  )
}
