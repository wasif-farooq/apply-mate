'use client'

import Link from 'next/link'
import { LogoIcon } from '@applybuddy/ui'

export default function Terms() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #001e2b 0%, #003d4f 100%)',
      color: '#ffffff',
      padding: '60px 20px'
    }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
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
        </div>

        {/* Content */}
        <div style={{ color: '#a8b3bc', lineHeight: '1.8', fontSize: '15px' }}>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: 600, marginBottom: '32px' }}>
            Terms of Service
          </h1>

          <p style={{ marginBottom: '24px', color: '#a8b3bc' }}>
            <strong style={{ color: '#fff' }}>Effective Date:</strong> May 11, 2026
          </p>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using ApplyBuddy, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              2. Description of Service
            </h2>
            <p>
              ApplyBuddy is an AI-powered job application assistant that helps users automate applying to jobs via LinkedIn posts. The service generates personalized emails based on job postings and user-provided resumes.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              3. User Accounts and Authentication
            </h2>
            <p>
              ApplyBuddy uses Google OAuth for user authentication. By signing in with Google, you authorize ApplyBuddy to access your basic profile information (name, email, profile picture) and maintain a refresh token for session management.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              4. Google OAuth and Permissions
            </h2>
            <p>
              When you sign in with Google, we request the following permissions:
            </p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>openid:</strong> For OpenID Connect identity verification</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>email:</strong> To access your email address</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>profile:</strong> To access your name and profile picture</li>
            </ul>
            <p style={{ marginTop: '16px' }}>
              These permissions are used solely for authentication and account management. We do not access or store your Google contacts, calendar, or other Google services.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              5. Email Sending
            </h2>
            <p>
              ApplyBuddy uses the Gmail API to send application emails on your behalf. When you enable email sending, we request the <strong style={{ color: '#fff' }}>https://www.googleapis.com/auth/gmail.send</strong> scope, which allows us to compose and send emails only from your authenticated email account.
            </p>
            <p style={{ marginTop: '12px' }}>
              We do not read your emails, access your inbox, or store your email data. Emails are sent only when you explicitly approve and initiate an application through the service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              6. User Content and Resumes
            </h2>
            <p>
              You provide resumes and other content to personalize your job applications. We store this content securely and use it solely for generating application emails. Your resume data is associated with your account and is not shared with third parties.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              7. Prohibited Uses
            </h2>
            <p>You may not use ApplyBuddy to:</p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}>Send spam or unsolicited communications</li>
              <li style={{ marginBottom: '8px' }}>Impersonate any person or entity</li>
              <li style={{ marginBottom: '8px' }}>Engage in any illegal activity</li>
              <li style={{ marginBottom: '8px' }}>Violate any applicable laws or regulations</li>
              <li style={{ marginBottom: '8px' }}>Attempt to gain unauthorized access to any systems</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              8. Limitation of Liability
            </h2>
            <p>
              ApplyBuddy is provided "as is" without any warranties, express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free. You use the service at your own risk.
            </p>
            <p style={{ marginTop: '12px' }}>
              In no event shall ApplyBuddy be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              9. Third-Party Services
            </h2>
            <p>
              ApplyBuddy uses third-party AI providers (including but not limited to OpenAI, Anthropic, Google AI) to generate email content. When you use these services, your job application data may be processed by these providers in accordance with their privacy policies.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              10. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Any changes will be effective immediately upon posting. Your continued use of ApplyBuddy after any changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              11. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:{' '}
              <a href="mailto:wasiffarooq1122@gmail.com" style={{ color: '#00ed64' }}>
                wasiffarooq1122@gmail.com
              </a>
            </p>
          </section>
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
            marginBottom: '8px'
          }}>
            <LogoIcon style={{ width: '20px', height: '20px' }} />
            <span style={{ color: '#fff', fontSize: '16px', fontWeight: 500 }}>ApplyBuddy</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            © 2025 ApplyBuddy. All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  )
}