'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { useApplyFlow, cleanEmailHTML } from '@/hooks/useApplyFlow'
import { useAuth } from '@/lib/auth'
import { StepIndicator, JobDetailsCard, ProcessingState, Header } from '@applymate/ui'
import DOMPurify from 'dompurify'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Link as LinkExtension } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

function TipTapEditor({ value, onChange }: { value: string; onChange: (content: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
  })

  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return <div style={{ height: '300px', background: '#0d1f2b', border: '1px solid #1c2d38', borderRadius: '8px' }} />
  }

  return (
    <div className="tiptap-editor-container">
      <div className="tiptap-toolbar" style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        background: '#1c2d38',
        borderBottom: '1px solid #2a3f4f',
        borderRadius: '8px 8px 0 0',
        flexWrap: 'wrap'
      }}>
        <ToolbarButton 
          editor={editor} 
          action={() => editor.chain().focus().toggleBold().run()} 
          isActive={editor.isActive('bold')}
          label="B"
        />
        <ToolbarButton 
          editor={editor} 
          action={() => editor.chain().focus().toggleItalic().run()} 
          isActive={editor.isActive('italic')}
          label="I"
          style={{ fontStyle: 'italic' }}
        />
        <ToolbarButton 
          editor={editor} 
          action={() => editor.chain().focus().toggleStrike().run()} 
          isActive={editor.isActive('strike')}
          label="S"
          style={{ textDecoration: 'line-through' }}
        />
        <div style={{ width: '1px', background: '#2a3f4f', margin: '0 4px' }} />
        <ToolbarButton 
          editor={editor} 
          action={() => editor.chain().focus().toggleBulletList().run()} 
          isActive={editor.isActive('bulletList')}
          label="• List"
        />
        <ToolbarButton 
          editor={editor} 
          action={() => editor.chain().focus().toggleOrderedList().run()} 
          isActive={editor.isActive('orderedList')}
          label="1. List"
        />
        <div style={{ width: '1px', background: '#2a3f4f', margin: '0 4px' }} />
        <ToolbarButton 
          editor={editor} 
          action={() => {
            const url = window.prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }} 
          isActive={editor.isActive('link')}
          label="Link"
        />
      </div>
      <EditorContent 
        editor={editor} 
        style={{
          height: '260px',
          overflowY: 'auto',
          background: '#0d1f2b',
          border: '1px solid #1c2d38',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '12px'
        }}
      />
    </div>
  )
}

function ToolbarButton({ editor, action, isActive, label, style }: { 
  editor: any; 
  action: () => void; 
  isActive: boolean; 
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={action}
      className={isActive ? 'active' : ''}
      style={{
        padding: '6px 10px',
        background: isActive ? '#00ed64' : 'transparent',
        color: isActive ? '#001e2b' : '#a8b3bc',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 600,
        ...style
      }}
    >
      {label}
    </button>
  )
}

function UrlInputStep({ 
  linkedinUrl, 
  onChange, 
  onSubmit, 
  loading,
  error 
}: { 
  linkedinUrl: string; 
  onChange: (url: string) => void; 
  onSubmit: () => void; 
  loading: boolean;
  error: string;
}) {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Enter LinkedIn Job Post URL</h2>
        <p style={{ color: '#a8b3bc' }}>Paste the LinkedIn job posting URL to start your application</p>
      </div>
      
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '32px'
      }}>
        <input
          type="url"
          value={linkedinUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.linkedin.com/posts/..."
          style={{
            width: '100%',
            padding: '16px 20px',
            background: '#0d1f2b',
            border: '1px solid #1c2d38',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px',
            outline: 'none',
            marginBottom: '24px'
          }}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        />
        
        <button
          onClick={onSubmit}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '16px' }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

function ResumeStep({ 
  resumeFile, 
  dragActive, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onFileSelect,
  loading,
  uploading,
  onNext,
  onSkip
}: { 
  resumeFile: File | null; 
  dragActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  uploading: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const dropzoneRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Upload Your Resume</h2>
        <p style={{ color: '#a8b3bc' }}>Optional - Attach your resume to the application</p>
      </div>
      
      <div
        ref={dropzoneRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        style={{
          background: dragActive ? 'rgba(0, 237, 100, 0.1)' : 'rgba(255,255,255,0.05)',
          border: `2px dashed ${dragActive ? '#00ed64' : 'rgba(255,255,255,0.2)'}`,
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'all 0.2s'
        }}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={onFileSelect}
          style={{ display: 'none' }}
        />
        
        {resumeFile ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>{resumeFile.name}</p>
            <p style={{ color: '#00ed64', fontSize: '14px' }}>Click or drag to change</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>Drop PDF here or click to upload</p>
            <p style={{ color: '#a8b3bc', fontSize: '14px' }}>PDF files only</p>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={onSkip}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '16px', fontSize: '16px' }}
        >
          Skip
        </button>
        <button
          onClick={onNext}
          disabled={loading || uploading}
          className="btn btn-primary"
          style={{ flex: 1, padding: '16px', fontSize: '16px' }}
        >
          {uploading ? 'Uploading...' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

function ProcessingStep() {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
      <ProcessingState 
        message="Generating Email..." 
        emoji="🤖"
      />
      <p style={{ textAlign: 'center', color: '#a8b3bc', marginTop: '16px' }}>
        Using AI to craft your personalized application
      </p>
    </div>
  )
}

function PreviewStep({ 
  generatedEmail,
  bodyEditMode,
  onBodyEditModeChange,
  onEmailChange,
  onSend,
  onBack,
  loading
}: { 
  generatedEmail: { email: string; subject: string; body: string; title?: string; company?: string; location?: string } | null;
  bodyEditMode: boolean;
  onBodyEditModeChange: (edit: boolean) => void;
  onEmailChange: (email: any) => void;
  onSend: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '40px 24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px' }}>📧 Email Preview</h2>
      </div>
      
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#a8b3bc', marginBottom: '4px' }}>To</label>
          <input
            type="text"
            value={generatedEmail?.email || ''}
            onChange={(e) => generatedEmail && onEmailChange({ ...generatedEmail, email: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0d1f2b',
              border: '1px solid #1c2d38',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#a8b3bc', marginBottom: '4px' }}>Subject</label>
          <input
            type="text"
            value={generatedEmail?.subject || ''}
            onChange={(e) => generatedEmail && onEmailChange({ ...generatedEmail, subject: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0d1f2b',
              border: '1px solid #1c2d38',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#a8b3bc' }}>Body</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onBodyEditModeChange(false)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: !bodyEditMode ? '#00ed64' : '#1c2d38',
                  background: !bodyEditMode ? 'rgba(0,237,100,0.2)' : 'transparent',
                  color: !bodyEditMode ? '#00ed64' : '#a8b3bc',
                  cursor: 'pointer'
                }}
              >
                Preview
              </button>
              <button
                onClick={() => onBodyEditModeChange(true)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: bodyEditMode ? '#00ed64' : '#1c2d38',
                  background: bodyEditMode ? 'rgba(0,237,100,0.2)' : 'transparent',
                  color: bodyEditMode ? '#00ed64' : '#a8b3bc',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </div>
          </div>
          
          {bodyEditMode ? (
            <div className="tiptap-editor-wrapper">
              <TipTapEditor
                value={generatedEmail?.body || ''}
                onChange={(content: string) => generatedEmail && onEmailChange({ ...generatedEmail, body: content })}
              />
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '300px',
                padding: '12px',
                background: '#0d1f2b',
                border: '1px solid #1c2d38',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                overflowY: 'auto',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: '1.7'
              }}
            >
              <div
                className="email-body"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(cleanEmailHTML(generatedEmail?.body || '')) 
                }}
              />
            </div>
          )}
        </div>
      </div>

      {generatedEmail && (
        <div style={{ marginBottom: '24px' }}>
          <JobDetailsCard 
            title={generatedEmail.title || ''}
            company={generatedEmail.company || ''}
            location={generatedEmail.location || ''}
          />
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={onBack}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '16px', fontSize: '16px' }}
        >
          ← Back
        </button>
        <button
          onClick={onSend}
          disabled={loading}
          className="btn btn-primary"
          style={{ flex: 1, padding: '16px', fontSize: '16px' }}
        >
          {loading ? 'Sending...' : 'Send Application'}
        </button>
      </div>
    </div>
  )
}

function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto 24px',
      background: '#fff8e0',
      color: '#946f3f',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid #e1e5e8'
    }}>
      {error}
    </div>
  ) : null
}

function SuccessMessage({ onReset }: { onReset: () => void }) {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto 24px',
      background: '#e3fcef',
      color: '#00684a',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #00ed64',
      textAlign: 'center'
    }}>
      <h2 style={{ marginBottom: '12px' }}>✓ Email Sent Successfully!</h2>
      <p style={{ color: '#00684a', marginBottom: '16px' }}>Your job application has been sent.</p>
      <button onClick={onReset} className="btn btn-primary">
        Apply to Another Job
      </button>
    </div>
  )
}

export default function ApplyPage() {
  const { user, loading: authLoading } = useAuthGuard()
  const { signOut } = useAuth()
  
  const {
    step,
    steps,
    linkedinUrl,
    resumeFile,
    loading,
    uploading,
    error,
    generatedEmail,
    sent,
    dragActive,
    bodyEditMode,
    setLinkedinUrl,
    setDragActive,
    setBodyEditMode,
    setError,
    setGeneratedEmail,
    setStep,
    handleUrlSubmit,
    handleNext,
    handleSkipResume,
    handleSend,
    handleReset,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  } = useApplyFlow()

  const navItems = [
    { href: '/apply', label: 'Apply', active: true },
    { href: '/history', label: 'History', active: false },
    { href: '/settings', label: 'Settings', active: false },
  ]

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#001e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#001e2b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Please sign in to access this page.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#001e2b', color: '#ffffff' }}>
      <Header 
        logo="ApplyMate"
        rightElement={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {navItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href} 
                style={{ 
                  color: item.active ? '#00ed64' : '#a8b3bc', 
                  textDecoration: 'none', 
                  fontSize: '14px' 
                }}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                border: '1px solid #ff6b6b',
                color: '#ff6b6b',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        }
      />

      <StepIndicator steps={steps} currentStep={step} />

      <ErrorMessage error={error} />
      
      {sent && <SuccessMessage onReset={handleReset} />}

      {step === 'url' && !sent && (
        <UrlInputStep
          linkedinUrl={linkedinUrl}
          onChange={setLinkedinUrl}
          onSubmit={handleUrlSubmit}
          loading={loading}
          error={error}
        />
      )}

      {step === 'resume' && !sent && (
        <ResumeStep
          resumeFile={resumeFile}
          dragActive={dragActive}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          loading={loading}
          uploading={uploading}
          onNext={handleNext}
          onSkip={handleSkipResume}
        />
      )}

      {step === 'processing' && !sent && <ProcessingStep />}

      {step === 'preview' && !sent && (
        <PreviewStep
          generatedEmail={generatedEmail}
          bodyEditMode={bodyEditMode}
          onBodyEditModeChange={setBodyEditMode}
          onEmailChange={setGeneratedEmail}
          onSend={handleSend}
          onBack={() => setStep('url')}
          loading={loading}
        />
      )}
    </div>
  )
}