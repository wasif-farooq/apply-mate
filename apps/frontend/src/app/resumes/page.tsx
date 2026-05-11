'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { Header } from '@applybuddy/ui'
import { useAuth } from '@/lib/auth'
import { getResumes, uploadResume, setDefaultResume, deleteResume, Resume } from '@/lib/api'

function ResumeList({
  resumes,
  loading,
  onSetDefault,
  onDelete
}: {
  resumes: Resume[]
  loading: boolean
  onSetDefault: (id: number) => void
  onDelete: (id: number) => void
}) {
  if (loading && resumes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#a8b3bc' }}>
        Loading resumes...
      </div>
    )
  }

  if (resumes.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        border: '1px dashed rgba(255,255,255,0.1)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <div style={{ color: '#a8b3bc', fontSize: '16px' }}>No resumes uploaded yet</div>
        <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
          Upload your first resume to get started
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {resumes.map((resume) => (
        <div
          key={resume.id}
          style={{
            background: resume.is_default ? 'rgba(0,237,100,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${resume.is_default ? '#00ed64' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 200px' }}>
            <div style={{ fontSize: '24px' }}>📄</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#fff' }}>
                {resume.filename}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {resume.is_default && (
                  <span style={{
                    background: '#00ed64',
                    color: '#001e2b',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    marginRight: '8px'
                  }}>
                    Default
                  </span>
                )}
                Uploaded {new Date(resume.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!resume.is_default && (
              <button
                onClick={() => onSetDefault(resume.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: '#a8b3bc',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Set Default
              </button>
            )}
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this resume?')) {
                  onDelete(resume.id)
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid #ff6b6b',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#ff6b6b',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ResumesPage() {
  useAuthGuard()
  const { user, signOut } = useAuth()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadResumes()
  }, [])

  const loadResumes = async () => {
    try {
      const data = await getResumes()
      setResumes(data)
    } catch (err) {
      console.error('Failed to load resumes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await uploadSingleFile(file)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are allowed')
      return
    }

    await uploadSingleFile(file)
  }

  const uploadSingleFile = async (file: File) => {
    setUploading(true)
    try {
      await uploadResume(file)
      await loadResumes()
    } catch (err) {
      alert('Failed to upload resume')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultResume(id)
      await loadResumes()
    } catch (err) {
      alert('Failed to set default resume')
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteResume(id)
      await loadResumes()
    } catch (err) {
      alert('Failed to delete resume')
      console.error(err)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#001e2b', color: '#ffffff' }}>
      <Header
        logo="ApplyBuddy"
        showLogoIcon={true}
        rightElement={
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link href="/apply" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>Apply</Link>
              <Link href="/history" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>History</Link>
              <Link href="/settings" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>Settings</Link>
              <Link href="/resumes" style={{ color: '#00ed64', textDecoration: 'none', fontSize: '14px' }}>Resumes</Link>
            </div>
            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                border: '1px solid #ff6b6b',
                color: '#ff6b6b',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: 'auto',
                minHeight: 'auto',
              }}
            >
              <span className="hide-mobile">Sign Out</span>
              <span className="hide-desktop">✕</span>
            </button>
          </div>
        }
      />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 600, marginBottom: '8px' }}>My Resumes</h1>
          <p style={{ color: '#a8b3bc', fontSize: '16px' }}>
            Upload and manage your resumes for job applications
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            background: dragActive ? 'rgba(0,237,100,0.1)' : 'rgba(255,255,255,0.03)',
            border: `2px dashed ${dragActive ? '#00ed64' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            cursor: uploading ? 'default' : 'pointer',
            marginBottom: '32px',
            transition: 'all 0.2s'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {uploading ? (
            <div>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid #1c2d38',
                borderTopColor: '#00ed64',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ color: '#a8b3bc' }}>Uploading...</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                Drop PDF here or click to upload
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                PDF files only
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
            Uploaded Resumes ({resumes.length})
          </h2>
          <ResumeList
            resumes={resumes}
            loading={loading}
            onSetDefault={handleSetDefault}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}