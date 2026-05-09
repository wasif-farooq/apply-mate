import React from 'react'

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

export const LogoIcon: React.FC<LogoIconProps> = ({ size = 32, style, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    width={size}
    height={size}
    style={style}
    fill="none"
    {...props}
  >
    <defs>
      <linearGradient id="applybuddy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00ed64" />
        <stop offset="100%" stopColor="#00b84d" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="28" height="28" rx="6" fill="#001e2b" />
    <path
      d="M8 12L16 8L24 12V20L16 24L8 20V12Z"
      stroke="url(#applybuddy-grad)"
      strokeWidth="2.5"
      fill="none"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="15" r="3" fill="url(#applybuddy-grad)" />
    <circle cx="11" cy="14" r="1.5" fill="#00ed64" opacity={0.6} />
    <circle cx="21" cy="14" r="1.5" fill="#00ed64" opacity={0.6} />
  </svg>
)

export default LogoIcon