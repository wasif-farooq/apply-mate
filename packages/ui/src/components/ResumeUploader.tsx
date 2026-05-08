import { useState, useRef } from 'react'
import { colors, spacing, borderRadius, fontSize } from '../styles/tokens'
import { LoadingSpinner } from './LoadingSpinner'

interface ResumeUploaderProps {
  onFileSelect: (file: File) => void
  onSkip?: () => void
  loading?: boolean
}

export function ResumeUploader({ onFileSelect, onSkip, loading = false }: ResumeUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = e.dataTransfer.files
    if (files && files[0] && files[0].type === 'application/pdf') {
      const file = files[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const containerStyle: React.CSSProperties = {
    border: `2px dashed ${dragActive ? colors.accent.primary : colors.border}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    textAlign: 'center',
    cursor: 'pointer',
    background: dragActive ? 'rgba(0,237,100,0.05)' : 'transparent',
    transition: 'all 0.2s',
    marginBottom: spacing.lg,
  }

  const iconStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: spacing.md,
  }

  const textStyle: React.CSSProperties = {
    margin: 0,
    fontSize: fontSize.md,
    color: colors.text.primary,
  }

  const hintStyle: React.CSSProperties = {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  }

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: spacing.md,
  }

  const buttonBaseStyle: React.CSSProperties = {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    fontSize: fontSize.md,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  }

  return (
    <div>
      <div
        style={containerStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {loading ? (
          <div>
            <LoadingSpinner size="lg" />
            <p style={{ ...textStyle, marginTop: spacing.md }}>Uploading...</p>
          </div>
        ) : selectedFile ? (
          <div>
            <div style={iconStyle}>📄</div>
            <p style={textStyle}>{selectedFile.name}</p>
            <p style={hintStyle}>Click or drag to change</p>
          </div>
        ) : (
          <div>
            <div style={iconStyle}>📁</div>
            <p style={textStyle}>Drop PDF here or click to upload</p>
            <p style={hintStyle}>PDF files only</p>
          </div>
        )}
      </div>

      <div style={buttonRowStyle}>
        {onSkip && (
          <button
            style={{ ...buttonBaseStyle, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.text.secondary }}
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
          >
            Skip
          </button>
        )}
        <button
          style={{
            ...buttonBaseStyle,
            background: selectedFile ? colors.accent.primary : colors.background.tertiary,
            color: selectedFile ? colors.background.primary : colors.text.secondary,
            opacity: selectedFile ? 1 : 0.5,
          }}
          disabled={!selectedFile || loading}
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? 'Uploading...' : 'Generate Email'}
        </button>
      </div>
    </div>
  )
}