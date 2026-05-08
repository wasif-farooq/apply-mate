'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

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
          marginBottom: '40px'
        }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none' }}>
            <span style={{ fontSize: '18px', fontWeight: 500 }}>ApplyMate</span>
          </Link>
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Link href="/apply" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>
                Apply
              </Link>
              <Link href="/history" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>
                History
              </Link>
              <Link href="/settings" style={{ color: '#a8b3bc', textDecoration: 'none', fontSize: '14px' }}>
                Settings
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
            </div>
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
        
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '56px',
            fontWeight: 500,
            marginBottom: '20px',
            letterSpacing: '-1px'
          }}>
            ApplyMate
          </h1>
          <p style={{
            fontSize: '20px',
            color: '#a8b3bc',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            AI-powered job application assistant. Automate applying to jobs via LinkedIn posts.
          </p>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
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
          }}>
            Learn More
          </button>
        </div>

        {/* Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginTop: '80px'
        }}>
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

      </div>
    </div>
  )
}