import { useState } from 'react'
import DOMPurify from 'dompurify'
import { colors, spacing, borderRadius, fontSize } from '../styles/tokens'

interface EmailPreviewProps {
  email: string
  subject: string
  body: string
  onEmailChange?: (email: string) => void
  onSubjectChange?: (subject: string) => void
  onBodyChange?: (body: string) => void
}

export function EmailPreview({
  email,
  subject,
  body,
  onEmailChange,
  onSubjectChange,
  onBodyChange,
}: EmailPreviewProps) {
  const [editMode, setEditMode] = useState(false)

  const cleanBody = DOMPurify.sanitize(body)

  const fieldStyle: React.CSSProperties = {
    marginBottom: spacing.lg,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: spacing.md,
    background: colors.background.secondary,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: fontSize.md,
    boxSizing: 'border-box',
  }

  const toggleRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  }

  const toggleBtnStyle = (isActive: boolean): React.CSSProperties => ({
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: fontSize.sm,
    border: `1px solid ${isActive ? colors.accent.primary : colors.border}`,
    background: isActive ? 'rgba(0,237,100,0.2)' : 'transparent',
    color: isActive ? colors.accent.primary : colors.text.secondary,
    borderRadius: borderRadius.sm,
    cursor: 'pointer',
  })

  const previewStyle: React.CSSProperties = {
    background: colors.background.secondary,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    minHeight: '200px',
    maxHeight: '300px',
    overflowY: 'auto',
    fontSize: fontSize.md,
    lineHeight: 1.6,
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '200px',
    fontFamily: 'inherit',
    resize: 'vertical',
  }

  return (
    <div>
      {onEmailChange && (
        <div style={fieldStyle}>
          <label style={labelStyle}>To</label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {onSubjectChange && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      <div style={fieldStyle}>
        <div style={toggleRowStyle}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Body</label>
          <div style={{ display: 'flex', gap: spacing.xs }}>
            <button
              style={toggleBtnStyle(!editMode)}
              onClick={() => setEditMode(false)}
            >
              Preview
            </button>
            <button
              style={toggleBtnStyle(editMode)}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          </div>
        </div>

        {editMode && onBodyChange ? (
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            style={textareaStyle}
          />
        ) : (
          <div
            style={previewStyle}
            dangerouslySetInnerHTML={{ __html: cleanBody }}
          />
        )}
      </div>
    </div>
  )
}