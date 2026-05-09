import { colors, spacing, fontSize } from '../styles/tokens'
import { LogoIcon } from './LogoIcon'

interface HeaderProps {
  _title?: string
  logo?: string
  showLogoIcon?: boolean
  rightElement?: React.ReactNode
}

export function Header({ logo = 'ApplyBuddy', showLogoIcon = false, rightElement }: HeaderProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.background.primary,
    borderBottom: `1px solid ${colors.border}`,
  }

  const logoContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  }

  const logoIconStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
  }

  const logoTextStyle: React.CSSProperties = {
    fontSize: fontSize.lg,
    fontWeight: 600,
    color: colors.accent.primary,
    textDecoration: 'none',
  }

  const rightStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  }

  return (
    <header style={containerStyle}>
      <div style={logoContainerStyle}>
        {showLogoIcon && <LogoIcon style={logoIconStyle} />}
        <span style={logoTextStyle}>{logo}</span>
      </div>
      {rightElement && <div style={rightStyle}>{rightElement}</div>}
    </header>
  )
}