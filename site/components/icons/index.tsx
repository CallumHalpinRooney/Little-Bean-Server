import type { SVGProps } from "react";

/**
 * Custom icon set. Geometric, 24×24, 1.5px stroke, no fills — drawn for this
 * site rather than pulled from a library, and deliberately abstract (no
 * padlocks, shields or hooded figures).
 *
 * Icons are decorative: they sit alongside a text label and are hidden from
 * assistive technology.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* --- Journey stages ------------------------------------------------------ */

/** Assess — a structured questionnaire grid. */
export const IconAssess = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3" width="17" height="18" rx="2.5" />
    <path d="M7.5 8h5M7.5 12h5M7.5 16h3" />
    <path d="M16 7.6l1.2 1.2 2-2.4" />
  </Svg>
);

/** Report — scored findings. */
export const IconReport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V4.5A1.5 1.5 0 016.5 3h8L20 8.5V21" />
    <path d="M14 3v5.5h6" />
    <path d="M8.5 17.5v-3M12 17.5v-6M15.5 17.5v-4.5" />
  </Svg>
);

/** Remediate — a path through obstacles to a cleared point. */
export const IconRemediate = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 18c3.5 0 4-4.5 7.5-4.5S14.5 9 18 9h3" />
    <circle cx="20.5" cy="9" r="1.6" />
    <path d="M6.5 8.5h4M8.5 6.5v4" />
  </Svg>
);

/** Train — role-based learning paths branching from one source. */
export const IconTrain = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="2.2" />
    <circle cx="18.5" cy="6" r="2" />
    <circle cx="18.5" cy="12" r="2" />
    <circle cx="18.5" cy="18" r="2" />
    <path d="M7.2 12h2.6M9.8 12c3 0 3.4-6 6.7-6M9.8 12h6.7M9.8 12c3 0 3.4 6 6.7 6" />
  </Svg>
);

/** Verify — an attestation mark. */
export const IconVerify = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8l2.6 1.7 3.1-.2.9 3 2.3 2.1-1.4 2.8.4 3.1-2.9 1.1-1.9 2.5-3.1-.5-3.1.5-1.9-2.5-2.9-1.1.4-3.1L3.1 9.4 5.4 7.3l.9-3 3.1.2z" />
    <path d="M9 12.2l2.1 2.1L15.4 10" />
  </Svg>
);

/** Maintain — annual cycle. */
export const IconMaintain = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.5 12a8.5 8.5 0 10-3.1 6.6" />
    <path d="M20.8 18.8V13.6h-5.2" />
    <path d="M12 8v4.4l2.8 1.6" />
  </Svg>
);

/* --- Industries ---------------------------------------------------------- */

export const IconFinance = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 20.5h17M5.5 20.5V10M18.5 20.5V10M9.75 20.5V10M14.25 20.5V10" />
    <path d="M3.5 10L12 4l8.5 6" />
  </Svg>
);

export const IconHealthcare = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12h3.2l1.6-3.4 2.4 7 2.1-5 1.5 3.4h6.2" />
    <path d="M5 6.5h6M8 3.5v6" />
  </Svg>
);

export const IconTechnology = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M10 3.5v3.5M14 3.5v3.5M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5" />
  </Svg>
);

export const IconRetail = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8.5h16l-1.3 11a1.5 1.5 0 01-1.5 1.3H6.8a1.5 1.5 0 01-1.5-1.3z" />
    <path d="M9 8.5V6a3 3 0 016 0v2.5" />
    <path d="M9 12.5h6" />
  </Svg>
);

export const IconPublicSector = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 20.5h18M4.5 20.5V9.5M19.5 20.5V9.5M9 20.5V13h6v7.5" />
    <path d="M3 9.5L12 3.5l9 6" />
  </Svg>
);

export const IconProfessional = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
    <path d="M9 7.5V5.8A1.8 1.8 0 0110.8 4h2.4A1.8 1.8 0 0115 5.8v1.7" />
    <path d="M3 13h18M11 13v2.5h2V13" />
  </Svg>
);

/* --- Utility ------------------------------------------------------------- */

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </Svg>
);

export const IconDash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 12h12" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3.8 7l8.2 6 8.2-6" />
  </Svg>
);

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3.5h3l1.5 4-2 1.5a10 10 0 005.5 5.5l1.5-2 4 1.5v3a2 2 0 01-2.2 2A16.5 16.5 0 015.5 5.7 2 2 0 017 3.5z" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s6.5-6.1 6.5-10.5a6.5 6.5 0 10-13 0C5.5 14.9 12 21 12 21z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </Svg>
);

export const IconLinkedIn = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
    <path d="M8 10.5v6M8 7.6v.1M12 16.5v-3.4a2 2 0 014 0v3.4M12 16.5v-6" />
  </Svg>
);

export const IconDocument = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 21V4.5A1.5 1.5 0 017.5 3h6L19 8.5V21z" />
    <path d="M13 3v5.5h6M9.5 13h7M9.5 17h4.5" />
  </Svg>
);

export const IconDashboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 8.5h18M7 12.5v4M11 11v5.5M15 13.5v3M19 10.5v6" />
  </Svg>
);

export const IconShieldData = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 2.5v6c0 4.2-2.9 7.9-7 9.5-4.1-1.6-7-5.3-7-9.5v-6z" />
    <path d="M8.8 11.5h6.4M8.8 14.5h4" />
  </Svg>
);

export const IconTeam = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0111 0" />
    <path d="M16 6.2a3 3 0 010 5.6M17.5 20a5.5 5.5 0 00-2-4.2" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5S14.2 18.2 12 20.5C9.8 18.2 8.6 15.2 8.6 12S9.8 5.8 12 3.5z" />
  </Svg>
);

export const IconQuote = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 6.5C6.5 8 5 10.5 5 14a3.2 3.2 0 106.2-1.1c-.4-1.4-1.6-2-2.8-1.9 0-1.6.8-2.9 2.3-3.8zM19.5 6.5C16.5 8 15 10.5 15 14a3.2 3.2 0 106.2-1.1c-.4-1.4-1.6-2-2.8-1.9 0-1.6.8-2.9 2.3-3.8z" />
  </Svg>
);
