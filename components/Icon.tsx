type IconSize = "small" | "medium" | "large"

interface IconProps {
  /** The SVG contents of the icon (e.g. from `@mdi/js`). */
  iconSvg: string
  /** The size of the icon container, normal if omitted. */
  size?: IconSize
}

export function Icon(props: IconProps) {
  const containerSizeClass = props.size ? " is-" + props.size : ""
  const iconSize = props.size === "small"
    ? 0.75
    : props.size === "medium"
    ? 1.5
    : props.size === "large"
    ? 2.25
    : 1.125

  return (
    <span class={"icon" + containerSizeClass}>
      <svg
        viewBox="0 0 24 24"
        height={iconSize + "rem"}
        width={iconSize + "rem"}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={props.iconSvg} />
      </svg>
    </span>
  )
}
