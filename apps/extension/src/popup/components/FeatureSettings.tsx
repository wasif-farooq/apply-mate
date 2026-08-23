import { useEffect, useState } from 'react'
import { useSettingsStorage } from '../../hooks'
import { DEFAULT_FEATURES, type FeatureSettings as Features } from '../../utils/constants'

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`ext-toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <strong>{label}</strong>
        {hint && <em>{hint}</em>}
      </span>
    </label>
  )
}

export default function FeatureSettings() {
  const { getFeatures, setFeatures } = useSettingsStorage()
  const [features, setLocal] = useState<Features>(DEFAULT_FEATURES)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getFeatures().then(setLocal)
  }, [getFeatures])

  const update = async (patch: Partial<Features>) => {
    const next = { ...features, ...patch }
    setLocal(next)
    await setFeatures(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="settings-section">
      <h2 className="settings-title">
        What the extension may do {saved && <span className="default-badge">Saved</span>}
      </h2>

      <Toggle
        label="Capture posts"
        hint="Read the job or post you are viewing instead of scraping it server-side."
        checked={features.capturePosts}
        onChange={(v) => update({ capturePosts: v })}
      />

      <Toggle
        label="Scan the feed"
        hint="Scroll your feed collecting posts, then score the jobs against your resume."
        checked={features.feedScan}
        onChange={(v) => update({ feedScan: v })}
      />

      <Toggle
        label="Easy Apply"
        hint="Let the extension work through LinkedIn's Easy Apply form."
        checked={features.easyApply}
        onChange={(v) => update({ easyApply: v })}
      />

      <Toggle
        label="Submit Easy Apply automatically"
        hint={
          features.easyApplyAutoSubmit
            ? 'On: applications are sent without a final confirmation. If LinkedIn changes its form, a wrong application can reach a real employer.'
            : 'Off: the form is filled and left open for you to review and submit.'
        }
        checked={features.easyApplyAutoSubmit}
        disabled={!features.easyApply}
        onChange={(v) => update({ easyApplyAutoSubmit: v })}
      />

      <div className="section">
        <div className="section-label">Posts per scan: {features.maxPostsPerScan}</div>
        <input
          type="range"
          min={10}
          max={100}
          step={10}
          value={features.maxPostsPerScan}
          onChange={(e) => update({ maxPostsPerScan: Number(e.target.value) })}
        />
      </div>

      <div className="section">
        <div className="section-label">
          Pre-select jobs scoring at least {features.minScoreToQueue}
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={features.minScoreToQueue}
          onChange={(e) => update({ minScoreToQueue: Number(e.target.value) })}
        />
      </div>
    </div>
  )
}
