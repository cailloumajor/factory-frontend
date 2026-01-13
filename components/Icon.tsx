import type { HTMLAttributes } from "preact"

interface IconProps extends HTMLAttributes<SVGSVGElement> {
  /** The SVG contents of the icon (e.g. from `@mdi/js`). */
  iconSvg: string
}

export function Icon({ iconSvg, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <path d={iconSvg} />
    </svg>
  )
}
