import { colors, spacing, fontSize } from '../styles/tokens'

interface HeaderProps {
  _title?: string
  logo?: string
  rightElement?: React.ReactNode
}

export function Header({ logo = 'ApplyMate', rightElement }: HeaderProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.background.primary,
    borderBottom: `1px solid ${colors.border}`,
  }

  const logoStyle: React.CSSProperties = {
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
      <span style={logoStyle}>{logo}</span>
      {rightElement && <div style={rightStyle}>{rightElement}</div>}
    </header>
  )
}