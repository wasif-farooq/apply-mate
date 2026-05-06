'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { applyToJob, sendEmail, ApplyResponse, uploadResume, getSettings, Settings } from '@/lib/api'
import DOMPurify from 'dompurify'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Link as LinkExtension } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'

type Step = 'url' | 'resume' | 'processing' | 'preview'

function cleanEmailHTML(html: string): string {
  if (!html) return ''
  
  let cleaned = html
  
  // Ensure greeting exists at the start
  const ensureGreeting = (content: string): string => {
    if (!content) return '<p>Dear Hiring Manager,</p>'
    const firstLine = content.trim().split('\n')[0].toLowerCase()
    const greetings = ['dear', 'hello', 'hi', 'greetings']
    const hasGreeting = greetings.some(g => firstLine.includes(g))
    if (!hasGreeting) {
      return '<p>Dear Hiring Manager,</p>' + content
    }
    return content
  }
  
  cleaned = ensureGreeting(cleaned)
  
  cleaned = cleaned.replace(/<li>\s*<\/li>/gi, '')
  cleaned = cleaned.replace(/<li>\s*<br\s*\/?>\s*<\/li>/gi, '')
  cleaned = cleaned.replace(/<li>\s*&nbsp;\s*<\/li>/gi, '')
  cleaned = cleaned.replace(/<ul>\s*<\/ul>/gi, '')
  cleaned = cleaned.replace(/<ol>\s*<\/ol>/gi, '')
  cleaned = cleaned.replace(/<ul>\s*<li>\s*<\/li>\s*<\/ul>/gi, '')
  cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, '<br/>')
  cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '')
  cleaned = cleaned.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
  return cleaned.trim()
}

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
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'active' : ''}
          style={{
            padding: '6px 10px',
            background: editor.isActive('bold') ? '#00ed64' : 'transparent',
            color: editor.isActive('bold') ? '#001e2b' : '#a8b3bc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'active' : ''}
          style={{
            padding: '6px 10px',
            background: editor.isActive('italic') ? '#00ed64' : 'transparent',
            color: editor.isActive('italic') ? '#001e2b' : '#a8b3bc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontStyle: 'italic'
          }}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'active' : ''}
          style={{
            padding: '6px 10px',
            background: editor.isActive('strike') ? '#00ed64' : 'transparent',
            color: editor.isActive('strike') ? '#001e2b' : '#a8b3bc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            textDecoration: 'line-through'
          }}
        >
          S
        </button>
        <div style={{ width: '1px', background: '#2a3f4f', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'active' : ''}
          style={{
            padding: '6px 10px',
            background: editor.isActive('bulletList') ? '#00ed64' : 'transparent',
            color: editor.isActive('bulletList') ? '#001e2b' : '#a8b3bc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'active' : ''}
          style={{
            padding: '6px 10px',
            background: editor.isActive('orderedList') ? '#00ed64' : 'transparent',
            color: editor.isActive('orderedList') ? '#001e2b' : '#a8b3bc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          1. List
        </button>
        <div style={{ width: '1px', background: '#2a3f4f', margin: '0 4px' }} />
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={editor.isActive('link') ? 'active' : ''}
          style={{
            padding: '6px 10px',
            background: editor.isActive('link') ? '#00ed64' : 'transparent',
            color: editor.isActive('link') ? '#001e2b' : '#a8b3bc',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Link
        </button>
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
      <style jsx>{`
        .tiptap-editor-content {
          color: #e0e0e0;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          line-height: 1.6;
        }
        .tiptap-editor-content :global(p) {
          margin-bottom: 12px;
        }
        .tiptap-editor-content :global(ul),
        .tiptap-editor-content :global(ol) {
          padding-left: 24px;
          margin-bottom: 12px;
        }
        .tiptap-editor-content :global(li) {
          margin-bottom: 6px;
        }
        .tiptap-editor-content :global(strong) {
          color: #00ed64;
          font-weight: 600;
        }
        .tiptap-editor-content :global(a) {
          color: #00ed64;
          text-decoration: underline;
        }
        .tiptap-editor-content :global(table) {
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0;
        }
        .tiptap-editor-content :global(th),
        .tiptap-editor-content :global(td) {
          border: 1px solid #2a3f4f;
          padding: 8px;
        }
        .tiptap-editor-content :global(th) {
          background: #1c2d38;
        }
      `}</style>
    </div>
  )
}

export default function ApplyPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const dropzoneRef = useRef<HTMLDivElement>(null)
  
  const [step, setStep] = useState<Step>('url')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumePath, setResumePath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedEmail, setGeneratedEmail] = useState<ApplyResponse | null>(null)
  const [sent, setSent] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [bodyEditMode, setBodyEditMode] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const handleUrlSubmit = () => {
    if (!linkedinUrl.trim()) {
      setError('Please enter a LinkedIn URL')
      return
    }
    setError('')
    setStep('resume')
  }

  const handleResumeUpload = async () => {
    if (!resumeFile) return
    
    setUploading(true)
    setError('')
    
    try {
      const data = await uploadResume(resumeFile)
      setResumePath(data.path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }

  const handleNext = async () => {
    if (resumeFile && !resumePath) {
      await handleResumeUpload()
    }
    setStep('processing')
    generateEmail()
  }

  const handleSkipResume = () => {
    setStep('processing')
    generateEmail()
  }

  const generateEmail = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await applyToJob({
        linkedin_url: linkedinUrl,
        resume_path: resumePath || undefined
      })
      setGeneratedEmail(result)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('url')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!generatedEmail) return

    setLoading(true)
    setError('')

    try {
      await sendEmail({
        to_email: generatedEmail.email,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        resume_path: resumePath || undefined
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep('url')
    setLinkedinUrl('')
    setResumeFile(null)
    setResumePath('')
    setGeneratedEmail(null)
    setSent(false)
    setError('')
  }

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
      setResumeFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

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
      
      {/* Header */}
      <header style={{
        background: '#001e2b',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1c2d38'
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600 }}>ApplyMate</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/settings" style={{ color: '#00ed64', textDecoration: 'none', fontSize: '14px' }}>
            Settings
          </Link>
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
      </header>

      {/* Progress Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '24px',
        gap: '24px'
      }}>
        {['url', 'resume', 'processing', 'preview'].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: step === s ? '#00ed64' : 
                          ['url', 'resume', 'processing', 'preview'].indexOf(step) > i ? '#00ed64' : '#1c2d38',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 500,
              color: step === s ? '#001e2b' : '#a8b3bc'
            }}>
              {i + 1}
            </div>
            <span style={{ 
              color: step === s ? '#00ed64' : '#a8b3bc', 
              fontSize: '14px',
              textTransform: 'capitalize'
            }}>
              {s === 'url' ? 'URL' : s === 'resume' ? 'Resume' : s === 'processing' ? 'Processing' : 'Preview'}
            </span>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
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
      )}

      {/* Success Message */}
      {sent && (
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
          <button
            onClick={handleReset}
            className="btn btn-primary"
          >
            Apply to Another Job
          </button>
        </div>
      )}

      {/* Step 1: URL Input */}
      {step === 'url' && !sent && (
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
              onChange={(e) => setLinkedinUrl(e.target.value)}
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
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            
            <button
              onClick={handleUrlSubmit}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '16px' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Resume Upload */}
      {step === 'resume' && !sent && (
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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
              onChange={handleFileSelect}
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
              onClick={handleSkipResume}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '16px', fontSize: '16px' }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={loading || uploading}
              className="btn btn-primary"
              style={{ flex: 1, padding: '16px', fontSize: '16px' }}
            >
              {uploading ? 'Uploading...' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && !sent && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '80px 24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>🤖</div>
          <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Generating Email...</h2>
          <p style={{ color: '#a8b3bc', marginBottom: '32px' }}>Using AI to craft your personalized application</p>
          
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{
              height: '8px',
              background: '#1c2d38',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: '60%',
                background: 'linear-gradient(90deg, #00ed64, #00b84d)',
                borderRadius: '4px',
                animation: 'pulse 1.5s infinite'
              }} />
            </div>
          </div>
          
          <style>{`
            @keyframes pulse {
              0% { width: 0%; }
              50% { width: 70%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 'preview' && !sent && (
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
                onChange={(e) => generatedEmail && setGeneratedEmail({ ...generatedEmail, email: e.target.value })}
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
                onChange={(e) => generatedEmail && setGeneratedEmail({ ...generatedEmail, subject: e.target.value })}
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
                    onClick={() => setBodyEditMode(false)}
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
                    onClick={() => setBodyEditMode(true)}
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
                    onChange={(content: string) => generatedEmail && setGeneratedEmail({ ...generatedEmail, body: content })}
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

          {/* Job Details */}
          {generatedEmail && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              fontSize: '14px',
              color: '#a8b3bc'
            }}>
              <strong style={{ color: '#fff' }}>Job Details:</strong>
              <div style={{ marginTop: '8px' }}>
                <div>Title: {generatedEmail.title}</div>
                <div>Company: {generatedEmail.company}</div>
                {generatedEmail.location && <div>Location: {generatedEmail.location}</div>}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setStep('url')}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '16px', fontSize: '16px' }}
            >
              ← Back
            </button>
            <button
              onClick={handleSend}
              disabled={loading}
              className="btn btn-primary"
              style={{ flex: 1, padding: '16px', fontSize: '16px' }}
            >
              {loading ? 'Sending...' : 'Send Application'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}