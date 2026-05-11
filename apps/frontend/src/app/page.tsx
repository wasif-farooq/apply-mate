'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { LogoIcon } from '@applybuddy/ui'

function MobileMenu({ user, onSignIn, onSignOut }: { 
  user: any; 
  onSignIn: () => void; 
  onSignOut: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="mobile-menu hide-desktop" style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '44px',
          minHeight: '44px',
        }}
        aria-label="Toggle menu"
      >
        {isOpen ? '✕' : '☰'}
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          background: '#0d1f2b',
          border: '1px solid #1c2d38',
          borderRadius: '12px',
          padding: '16px',
          minWidth: '200px',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/apply" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }} onClick={() => setIsOpen(false)}>
                Apply
              </Link>
              <Link href="/history" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }} onClick={() => setIsOpen(false)}>
                History
              </Link>
              <Link href="/settings" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }} onClick={() => setIsOpen(false)}>
                Settings
              </Link>
              <Link href="/resumes" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px', padding: '8px 0' }} onClick={() => setIsOpen(false)}>
                Resumes
              </Link>
              <button 
                onClick={() => { onSignOut(); setIsOpen(false); }}
                style={{
                  background: 'transparent',
                  border: '1px solid #ff6b6b',
                  color: '#ff6b6b',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={onSignIn}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Sign in with Google
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { user, signIn, signOut, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001e2b 0%, #003d4f 100%)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001e2b 0%, #003d4f 100%)',
      color: '#ffffff',
      padding: '60px 20px'
    }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header with User Info */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '40px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogoIcon style={{ width: '24px', height: '24px' }} />
            <span style={{ fontSize: '18px', fontWeight: 500 }}>ApplyBuddy</span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user ? (
              <>
                <Link href="/apply" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>
                  Apply
                </Link>
                <Link href="/history" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>
                  History
                </Link>
                <Link href="/settings" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>
                  Settings
                </Link>
                <Link href="/resumes" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>
                  Resumes
                </Link>
                <button 
                  onClick={signOut}
                  style={{
                    background: 'transparent',
                    border: '1px solid #ff6b6b',
                    color: '#ff6b6b',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button 
                onClick={signIn}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '14px' }}
              >
                Sign in with Google
              </button>
            )}
          </div>

          {/* Mobile Menu */}
          <MobileMenu user={user} onSignIn={signIn} onSignOut={signOut} />
        </div>
        
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 className="hero-title" style={{
            fontSize: 'var(--text-heading-1)',
            fontWeight: 500,
            marginBottom: '20px',
            letterSpacing: '-1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <LogoIcon style={{ width: '48px', height: '48px' }} />
            <span>ApplyBuddy</span>
          </h1>
          <p style={{
            fontSize: 'var(--text-subtitle)',
            color: '#a8b3bc',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            AI-powered job application assistant. Automate applying to jobs via LinkedIn posts.
          </p>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link href="/apply">
              <button className="btn btn-primary" style={{
                fontSize: '16px',
                padding: '14px 32px'
              }}>
                Go to Apply
              </button>
            </Link>
          ) : (
            <button 
              onClick={signIn}
              className="btn btn-primary" 
              style={{
                fontSize: '16px',
                padding: '14px 32px'
              }}
            >
              Get Started
            </button>
          )}
          <button className="btn btn-secondary" style={{
            fontSize: '16px',
            padding: '14px 32px',
            borderColor: '#1c2d38',
            color: '#ffffff'
          }} onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            Learn More
          </button>
        </div>

        {/* Features */}
        <div className="features-grid">
          <div className="card" style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '24px'
          }}>
            <h4 style={{ color: '#00ed64', marginBottom: '12px' }}>AI Agent</h4>
            <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
              Intelligent workflow that handles the entire application process
            </p>
          </div>

          <div className="card" style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '24px'
          }}>
            <h4 style={{ color: '#00ed64', marginBottom: '12px' }}>Auto Email</h4>
            <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
              Generate professional subject and body with AI
            </p>
          </div>

          <div className="card" style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '24px'
          }}>
            <h4 style={{ color: '#00ed64', marginBottom: '12px' }}>Preview</h4>
            <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
              Review email before sending - you stay in control
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" style={{ marginTop: '80px' }}>
          <h2 style={{
            fontSize: 'var(--text-heading-2)',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            How It Works
          </h2>
          <div className="steps-grid" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(0,237,100,0.1)',
                border: '2px solid #00ed64',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                🔗
              </div>
              <h4 style={{ color: '#fff', marginBottom: '6px', fontSize: '14px' }}>1. Paste LinkedIn URL</h4>
              <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                Copy the job post link from LinkedIn
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(0,237,100,0.1)',
                border: '2px solid #00ed64',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                📄
              </div>
              <h4 style={{ color: '#fff', marginBottom: '6px', fontSize: '14px' }}>2. Upload Resume</h4>
              <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                Attach your resume to personalize
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(0,237,100,0.1)',
                border: '2px solid #00ed64',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                ✨
              </div>
              <h4 style={{ color: '#fff', marginBottom: '6px', fontSize: '14px' }}>3. AI Generates Email</h4>
              <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                Creates personalized, professional email
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(0,237,100,0.1)',
                border: '2px solid #00ed64',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '24px'
              }}>
                🚀
              </div>
              <h4 style={{ color: '#fff', marginBottom: '6px', fontSize: '14px' }}>4. Send & Apply</h4>
              <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                Review and send your application
              </p>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div style={{ marginTop: '80px' }}>
          <h2 style={{
            fontSize: 'var(--text-heading-2)',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            Who It's For
          </h2>
          <div className="grid-responsive">
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🎯</div>
              <h4 style={{ color: '#fff', marginBottom: '8px' }}>Active Job Seekers</h4>
              <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
                Applying to multiple positions daily and need to scale your outreach
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔄</div>
              <h4 style={{ color: '#fff', marginBottom: '8px' }}>Career Changers</h4>
              <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
                Targeting new industries and want tailored applications for each role
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🏢</div>
              <h4 style={{ color: '#fff', marginBottom: '8px' }}>Company Hunters</h4>
              <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
                Focusing on specific companies and need personalized, standout pitches
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div style={{ marginTop: '80px', marginBottom: '40px' }}>
          <h2 style={{
            fontSize: 'var(--text-heading-2)',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            Why ApplyBuddy
          </h2>
          <div className="grid-responsive" style={{ maxWidth: '700px', margin: '0 auto', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(0,237,100,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '20px' }}>⏱️</span>
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '4px', fontSize: '14px' }}>Save 15+ Minutes</h4>
                <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                  No more starting from scratch - generate polished emails instantly
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(0,237,100,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '20px' }}>💌</span>
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '4px', fontSize: '14px' }}>Personalized at Scale</h4>
                <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                  Every email is tailored to the specific job - not generic templates
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(0,237,100,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '20px' }}>🔒</span>
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '4px', fontSize: '14px' }}>You Stay in Control</h4>
                <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                  Preview and edit every email before sending - full approval workflow
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(0,237,100,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '20px' }}>📊</span>
              </div>
              <div>
                <h4 style={{ color: '#fff', marginBottom: '4px', fontSize: '14px' }}>Track All Applications</h4>
                <p style={{ color: '#a8b3bc', fontSize: '12px', lineHeight: '1.4' }}>
                  Keep track of every application - never miss a follow-up
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div style={{ marginTop: '80px' }}>
          <div style={{
            background: 'rgba(0,237,100,0.05)',
            border: '1px solid rgba(0,237,100,0.2)',
            borderRadius: '16px',
            padding: '32px'
          }}>
            <h2 style={{
              fontSize: 'var(--text-heading-4)',
              fontWeight: 500,
              textAlign: 'center',
              marginBottom: '8px'
            }}>
              What's Coming Next
            </h2>
            <p style={{
              color: '#a8b3bc',
              textAlign: 'center',
              marginBottom: '32px',
              fontSize: '16px'
            }}>
              We're building the future of automated job applications
            </p>
            <div className="grid-responsive">
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '12px',
                padding: '24px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔗</div>
                <h4 style={{ color: '#fff', marginBottom: '8px' }}>LinkedIn Easy Apply</h4>
                <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
                  Process LinkedIn posts with Easy Apply button directly. Apply without leaving the platform.
                </p>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '12px',
                padding: '24px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🤖</div>
                <h4 style={{ color: '#fff', marginBottom: '8px' }}>AI Form Filling</h4>
                <p style={{ color: '#a8b3bc', fontSize: '14px' }}>
                  Automatically fill out application forms using your configured AI. Upload resume, let AI handle the rest.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid #1c2d38',
          padding: '32px 0',
          marginTop: '60px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <LogoIcon style={{ width: '20px', height: '20px' }} />
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>ApplyBuddy</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '8px' }}>
            <Link href="/terms" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
              Terms of Service
            </Link>
            <Link href="/privacy" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
              Privacy Policy
            </Link>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            © 2025 ApplyBuddy. All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  )
}