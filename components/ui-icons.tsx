import type { SVGProps } from "react";

type UiIconProps = SVGProps<SVGSVGElement>;

function iconDefaults(props: UiIconProps): UiIconProps {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props
  };
}

export function PlusIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MenuIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function PencilSquareIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z" />
    </svg>
  );
}

export function TrashIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function PlayIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path
        d="m8 6.8 9 5.2a.78.78 0 0 1 0 1.36L8 18.6a.78.78 0 0 1-1.17-.68V7.48A.78.78 0 0 1 8 6.8Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function CheckIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function RotateCcwIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M3 4v5h5" />
      <path d="M3.6 9A8.4 8.4 0 1 0 6 4.4" />
    </svg>
  );
}

export function ImportanceHighIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4.6" />
      <circle cx="12" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ImportanceMediumIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

export function ImportanceLowIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronDownIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronUpIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function SparklesIcon(props: UiIconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="m12 3 1.6 3.8L17.5 8l-3 2.1.9 3.9-3.4-2-3.4 2 .9-3.9-3-2.1 3.9-1.2L12 3Z" />
    </svg>
  );
}
