import { colors, spacing, borderRadius, fontSize } from '../styles/tokens'

interface JobDetailsCardProps {
  title: string
  company: string
  location?: string
}

export function JobDetailsCard({ title, company, location }: JobDetailsCardProps) {
  const containerStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: colors.text.secondary,
  }

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  }

  const companyStyle: React.CSSProperties = {
    marginBottom: spacing.xs,
  }

  const locationStyle: React.CSSProperties = {
    fontSize: fontSize.sm,
  }

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{title}</div>
      <div style={companyStyle}>{company}</div>
      {location && <div style={locationStyle}>{location}</div>}
    </div>
  )
}