import { useCallback, useEffect, useState } from 'react'
import { ErrorToast, Header, LoadingOverlay } from '../components'
import { useAuthStorage, useResumes, useSettingsStorage } from '../../hooks'
import { batchApply, listFeedJobs, saveScan, scanJobs, skipFeedJob } from '../../services/api'
import { onScanProgress, runEasyApply, scanFeed } from '../../services/pageBridge'
import type { FeedJob, ScanProgress } from '../../types'
import { DEFAULT_FEATURES, type FeatureSettings } from '../../utils/constants'
import '../../styles/theme.css'
import '../../styles/components.css'
import '../../styles/pages.css'

interface ReviewPageProps {
  backendUrl: string
  onBack: () => void
  onLogout?: () => void
  onSettings?: () => void
}

export default function ReviewPage({
  backendUrl,
  onBack,
  onLogout,
  onSettings,
}: ReviewPageProps) {
  const { getToken } = useAuthStorage()
  const { getFeatures } = useSettingsStorage()
  const { selectedResume } = useResumes(backendUrl, 0)

  const [features, setFeatures] = useState<FeatureSettings>(DEFAULT_FEATURES)
  const [jobs, setJobs] = useState<FeedJob[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    getFeatures().then(setFeatures)
  }, [getFeatures])

  useEffect(() => onScanProgress(setProgress), [])

  const refresh = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const data = await listFeedJobs(backendUrl, token, { status: 'scored' })
      setJobs(data.jobs)
      setSelected(
        new Set(
          data.jobs
            .filter((j) => (j.ai_score ?? 0) >= features.minScoreToQueue)
            .map((j) => j.id)
        )
      )
    } catch (err: any) {
      setError(err?.message || 'Could not load jobs.')
    }
  }, [backendUrl, getToken, features.minScoreToQueue])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleScan = async () => {
    setBusy('Scanning your feed...')
    setError('')
    setNotice('')
    setProgress(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const result = await scanFeed(features.maxPostsPerScan)
      if (!result.ok || !result.posts) {
        throw new Error(result.reason || 'Scan failed.')
      }

      // Store everything, jobs and not, so the next scan can skip these URLs.
      const saved = await saveScan(backendUrl, token, result.posts)

      const jobPosts = result.posts.filter((p) => p.post_type === 'job')
      if (jobPosts.length === 0) {
        setNotice(`Saw ${result.posts.length} posts, none of them jobs.`)
        return
      }

      setBusy(`Scoring ${jobPosts.length} jobs against your resume...`)
      const scored = await scanJobs(backendUrl, token, jobPosts, selectedResume?.id)

      setNotice(
        `${saved.saved} new posts, ${scored.scored.length} jobs scored` +
          (scored.skipped ? `, ${scored.skipped} could not be scored` : '') +
          '.'
      )
      await refresh()
    } catch (err: any) {
      setError(err?.message || 'Scan failed.')
    } finally {
      setBusy('')
    }
  }

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSkip = async (id: number) => {
    try {
      const token = await getToken()
      if (!token) return
      await skipFeedJob(backendUrl, token, id)
      setJobs((prev) => prev.filter((j) => j.id !== id))
    } catch (err: any) {
      setError(err?.message || 'Could not skip that job.')
    }
  }

  const handleApply = async (mode: 'email' | 'easy_apply') => {
    if (selected.size === 0) {
      setError('Select at least one job.')
      return
    }
    setBusy(mode === 'email' ? 'Generating applications...' : 'Queueing Easy Apply...')
    setError('')
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const result = await batchApply(
        backendUrl,
        token,
        [...selected],
        mode,
        selectedResume?.id
      )
      const failed = result.results.filter((r) => r.status === 'failed')
      setNotice(
        `${result.results.length - failed.length} of ${result.results.length} succeeded.` +
          (failed.length ? ` First failure: ${failed[0].error ?? 'unknown'}` : '')
      )
      await refresh()
    } catch (err: any) {
      setError(err?.message || 'Batch apply failed.')
    } finally {
      setBusy('')
    }
  }

  const handleEasyApplyHere = async () => {
    setBusy('Working through Easy Apply...')
    setError('')
    try {
      const result = await runEasyApply(features.easyApplyAutoSubmit)
      if (!result.ok) {
        setError(result.reason || 'Easy Apply could not complete.')
        return
      }
      setNotice(
        result.submitted
          ? 'Application submitted.'
          : result.reason || 'Form filled. Review it and press Submit.'
      )
    } catch (err: any) {
      setError(err?.message || 'Easy Apply failed.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="apply-page">
      <Header onSettings={onSettings} onLogout={onLogout} />

      <div className="main-content">
        {error && <ErrorToast message={error} onDismiss={() => setError('')} />}

        <button className="ext-secondary-btn" onClick={onBack}>
          ← Back
        </button>

        {features.feedScan ? (
          <button className="action-btn" onClick={handleScan} disabled={!!busy}>
            {busy ? '⏳ Working...' : '🔄 Scan feed'}
          </button>
        ) : (
          <div className="ext-notice">Feed scanning is off. Turn it on in Settings.</div>
        )}

        {progress && !progress.done && (
          <div className="ext-notice">
            Scanned {progress.scanned} posts, {progress.jobs} jobs so far...
          </div>
        )}
        {notice && <div className="ext-notice">{notice}</div>}

        <div className="section">
          <div className="section-label">
            Scored jobs ({jobs.length}) — {selected.size} selected
          </div>
          {jobs.length === 0 ? (
            <div className="no-resumes">
              <p>Nothing scored yet. Run a scan from your LinkedIn feed.</p>
            </div>
          ) : (
            <div className="resume-list">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`resume-item ${selected.has(job.id) ? 'selected' : ''}`}
                  onClick={() => toggle(job.id)}
                >
                  <span className="resume-icon">{(job.ai_score ?? 0) >= 70 ? '🟢' : '🟡'}</span>
                  <div className="resume-info">
                    <div className="resume-name">
                      {job.title || 'Untitled role'}
                      {job.has_easy_apply && <span className="default-badge">Easy Apply</span>}
                    </div>
                    <div className="resume-meta">
                      {job.company || 'Unknown company'} • score {job.ai_score ?? '—'}
                    </div>
                    {job.match_reason && (
                      <div className="resume-meta">{job.match_reason}</div>
                    )}
                  </div>
                  <button
                    className="ext-link-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSkip(job.id)
                    }}
                  >
                    Skip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="action-btn"
          onClick={() => handleApply('email')}
          disabled={!!busy || selected.size === 0}
        >
          ✉️ Generate emails for selected
        </button>

        {features.easyApply && (
          <>
            <button
              className="ext-secondary-btn"
              onClick={() => handleApply('easy_apply')}
              disabled={!!busy || selected.size === 0}
            >
              ⚡ Queue selected for Easy Apply
            </button>
            <button className="ext-secondary-btn" onClick={handleEasyApplyHere} disabled={!!busy}>
              {features.easyApplyAutoSubmit
                ? '⚡ Easy Apply on this page (auto-submits)'
                : '⚡ Fill Easy Apply on this page'}
            </button>
          </>
        )}
      </div>

      <LoadingOverlay visible={!!busy} message={busy} />
    </div>
  )
}
