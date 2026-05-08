import { colors, spacing, fontSize } from '../styles/tokens'

interface Step {
  key: string
  label: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: string
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep)

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  }

  const stepStyle = (isActive: boolean, isCompleted: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    color: isActive ? colors.accent.primary : isCompleted ? colors.accent.primary : colors.text.secondary,
    transition: 'all 0.2s',
  })

  const circleStyle = (isActive: boolean, isCompleted: boolean): React.CSSProperties => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: isActive || isCompleted ? colors.accent.primary : colors.background.tertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: fontSize.sm,
    fontWeight: 500,
    color: isActive ? colors.background.primary : colors.text.secondary,
    transition: 'all 0.2s',
  })

  const labelStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
    color: isActive ? colors.accent.primary : colors.text.secondary,
  })

  return (
    <div style={containerStyle}>
      {steps.map((step, index) => {
        const isActive = step.key === currentStep
        const isCompleted = index < currentIndex

        return (
          <div key={step.key} style={stepStyle(isActive, isCompleted)}>
            <div style={circleStyle(isActive, isCompleted)}>
              {isCompleted ? '✓' : index + 1}
            </div>
            <span style={labelStyle(isActive)}>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}