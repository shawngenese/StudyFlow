const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ children, size = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }} {...base} {...rest}>
      {children}
    </svg>
  )
}

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </Svg>
)

export const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
)

export const IconInbox = (p) => (
  <Svg {...p}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </Svg>
)

export const IconFolder = (p) => (
  <Svg {...p}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </Svg>
)

export const IconLayers = (p) => (
  <Svg {...p}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </Svg>
)

export const IconSunHigh = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Svg>
)

export const IconTelescope = (p) => (
  <Svg {...p}>
    <path d="M13 7L9 3 5 9l6 2z" />
    <path d="M14 12l-4-1.5" />
    <path d="M10 10.5L6 21" />
    <path d="M15 3l6 9" />
  </Svg>
)

export const IconFlame = (p) => (
  <Svg {...p}>
    <path d="M12 22c4.4 0 7-2.8 7-6.5 0-3-1.8-4.9-3.2-6.6C14.6 7.4 14 5.5 14 3c-3 2-4.2 4.6-4 7-1-.6-1.8-1.7-2-3-1.4 1.6-3 3.9-3 6.5C5 18.2 7.6 22 12 22z" />
  </Svg>
)

export const IconBolt = (p) => (
  <Svg {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Svg>
)

export const IconList = (p) => (
  <Svg {...p}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </Svg>
)

export const IconBoard = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="18" rx="1" />
    <rect x="14" y="3" width="7" height="12" rx="1" />
  </Svg>
)

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
)

export const IconBookmark = (p) => (
  <Svg {...p}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Svg>
)

export const IconWarning = (p) => (
  <Svg {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
)

export const IconCheckSquare = (p) => (
  <Svg {...p}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </Svg>
)

export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" />
    <path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z" />
  </Svg>
)

export const IconParty = (p) => (
  <Svg {...p}>
    <path d="M5.8 11.3L2 22l10.7-3.79" />
    <path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01" />
    <path d="M22 2L12.5 13.5" />
    <path d="M9 7h.01M9.7 4.3h.01M14.7 6.7h.01" />
  </Svg>
)

export const IconCloudSun = (p) => (
  <Svg {...p}>
    <path d="M12 2v2M6.3 6.3l1.4 1.4M17.7 6.3l-1.4 1.4" />
    <path d="M12 6a4 4 0 0 1 4 4" />
    <path d="M17 18a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.7 1.6A3.5 3.5 0 0 0 7 18z" />
  </Svg>
)

export const IconFlag = ({ size = 12, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" stroke="none" aria-hidden="true" style={{ flexShrink: 0 }} {...rest}>
    <path d="M5 3a1 1 0 0 1 1 1v1.1c2.6-1.3 5.4-1.3 8 0 2.3 1.15 4.7 1.2 7 .05V14c-2.3 1.15-4.7 1.1-7-.05-2.6-1.3-5.4-1.3-8 0V21a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1z" />
  </svg>
)

export const IconGrip = (p) => (
  <Svg {...p} strokeWidth={2.5}>
    <circle cx="9" cy="6" r="0.5" />
    <circle cx="15" cy="6" r="0.5" />
    <circle cx="9" cy="12" r="0.5" />
    <circle cx="15" cy="12" r="0.5" />
    <circle cx="9" cy="18" r="0.5" />
    <circle cx="15" cy="18" r="0.5" />
  </Svg>
)

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </Svg>
)
