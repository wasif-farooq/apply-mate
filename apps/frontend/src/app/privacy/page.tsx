'use client'

import Link from 'next/link'
import { LogoIcon } from '@applybuddy/ui'

export default function Privacy() {
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
            Privacy Policy
          </h1>

          <p style={{ marginBottom: '24px', color: '#a8b3bc' }}>
            <strong style={{ color: '#fff' }}>Effective Date:</strong> May 11, 2026
          </p>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              1. Introduction
            </h2>
            <p>
              ApplyBuddy ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered job application assistant.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              2. Information We Collect
            </h2>
            <p><strong style={{ color: '#fff' }}>Account Information:</strong> When you sign in with Google, we collect your name, email address, and profile picture. This information is used for authentication and account management.</p>
            <p style={{ marginTop: '12px' }}><strong style={{ color: '#fff' }}>User Content:</strong> We collect resumes, job application data, and any other content you upload to personalize your job applications.</p>
            <p style={{ marginTop: '12px' }}><strong style={{ color: '#fff' }}>Application History:</strong> We store records of your job applications, including LinkedIn URLs, generated emails, and sending status.</p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              3. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}>Authenticate your account and maintain your session</li>
              <li style={{ marginBottom: '8px' }}>Generate personalized email content for job applications</li>
              <li style={{ marginBottom: '8px' }}>Send emails on your behalf through the Gmail API</li>
              <li style={{ marginBottom: '8px' }}>Track and display your application history</li>
              <li style={{ marginBottom: '8px' }}>Provide customer support and respond to your inquiries</li>
              <li style={{ marginBottom: '8px' }}>Improve and optimize our services</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              4. Data Storage and Security
            </h2>
            <p>
              Your data is stored securely in our database. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p style={{ marginTop: '12px' }}>
              Your Google refresh token is encrypted before storage. Resume files are stored securely and associated only with your account.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              5. Google OAuth Data
            </h2>
            <p>
              When you sign in with Google, we receive:
            </p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}>Your name</li>
              <li style={{ marginBottom: '8px' }}>Your email address</li>
              <li style={{ marginBottom: '8px' }}>Your profile picture</li>
              <li style={{ marginBottom: '8px' }}>A refresh token for session management</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              We do not access your Google contacts, Google Drive, Gmail inbox, Google Calendar, or any other Google services beyond what is required for authentication.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              6. Gmail API Usage
            </h2>
            <p>
              If you choose to enable email sending through Gmail, we use the Gmail API with the <strong style={{ color: '#fff' }}>gmail.send</strong> scope. This allows us to:
            </p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}>Compose emails from your Google account</li>
              <li style={{ marginBottom: '8px' }}>Send application emails to hiring managers</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              We <strong style={{ color: '#fff' }}>do not</strong>:
            </p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}>Read your emails or inbox</li>
              <li style={{ marginBottom: '8px' }}>Access your email contacts</li>
              <li style={{ marginBottom: '8px' }}>Store or archive your emails</li>
              <li style={{ marginBottom: '8px' }}>Modify existing emails in your account</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              Emails are sent only when you explicitly approve and initiate an application through our service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              7. Third-Party Disclosure
            </h2>
            <p>
              We share your information with third parties only in the following circumstances:
            </p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>AI Providers:</strong> Job posting content is sent to AI providers (OpenAI, Anthropic, Google AI) to generate personalized email content. This data is processed in accordance with the respective provider's privacy policies.</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>Google:</strong> As described above, for authentication and email sending.</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>Legal Requirements:</strong> If required by law, such as in response to a subpoena or court order.</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              We do not sell, trade, or otherwise transfer your personal information to outside parties.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              8. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul style={{ marginTop: '12px', paddingLeft: '24px' }}>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>Delete:</strong> Request deletion of your account and associated data</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>Export:</strong> Request export of your data in a machine-readable format</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: '#fff' }}>Revoke:</strong> Revoke Gmail API access at any time through your Google account settings</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              To exercise these rights, please contact us at{' '}
              <a href="mailto:wasiffarooq1122@gmail.com" style={{ color: '#00ed64' }}>
                wasiffarooq1122@gmail.com
              </a>
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              9. Cookies and Tracking
            </h2>
            <p>
              ApplyBuddy uses session cookies for authentication purposes. These cookies are essential for maintaining your logged-in state and are deleted when you close your browser.
            </p>
            <p style={{ marginTop: '12px' }}>
              We do not use third-party tracking or advertising cookies.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              10. Children&apos;s Privacy
            </h2>
            <p>
              ApplyBuddy is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a minor, we will take steps to delete such information promptly.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '16px' }}>
              12. Contact Information
            </h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact us at:{' '}
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