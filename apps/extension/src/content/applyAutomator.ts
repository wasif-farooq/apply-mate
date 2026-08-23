import * as S from './selectors'

/**
 * Drives LinkedIn's Easy Apply modal.
 *
 * This is the riskiest code in the extension: a LinkedIn markup change can
 * mean submitting a half-filled application to a real employer, and it cannot
 * be taken back. Hence the guards below -- assertRequiredFieldsFilled() runs
 * before every submit, and refuses rather than guesses. autoSubmit is a
 * caller-supplied flag so "prefill and let me press Submit" stays one setting
 * away.
 */

const STEP_TIMEOUT_MS = 10_000
const MAX_STEPS = 12

export interface EasyApplyResult {
  ok: boolean
  submitted: boolean
  reason?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function visible(el: Element | null): el is HTMLElement {
  if (!el) return false
  const rect = (el as HTMLElement).getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

async function waitFor(
  selector: string,
  timeout = STEP_TIMEOUT_MS
): Promise<HTMLElement | null> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const el = document.querySelector(selector)
    if (visible(el)) return el
    await sleep(250)
  }
  return null
}

function modal(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>('div.jobs-easy-apply-modal, div[role="dialog"]')
  return visible(el) ? el : null
}

function buttonByLabel(root: ParentNode, labels: string[]): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
  return (
    buttons.find((b) => {
      const text = `${b.innerText || ''} ${b.getAttribute('aria-label') || ''}`.toLowerCase()
      return labels.some((l) => text.includes(l)) && !b.disabled && visible(b)
    }) ?? null
  )
}

/**
 * Every required control in the modal must already have a value.
 *
 * We never invent answers. LinkedIn's Easy Apply forms routinely ask things
 * only the applicant can answer (salary, visa status, years with a specific
 * tool), and a fabricated answer is worse than no application.
 */
export function assertRequiredFieldsFilled(root: HTMLElement): string | null {
  const controls = Array.from(
    root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input[required], select[required], textarea[required], ' +
        'input[aria-required="true"], select[aria-required="true"], textarea[aria-required="true"]'
    )
  )

  for (const control of controls) {
    if (control.type === 'checkbox' || control.type === 'radio') {
      const name = control.getAttribute('name')
      if (!name) continue
      const group = root.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`)
      if (![...group].some((c) => c.checked)) {
        return `An unanswered required question: ${name}`
      }
      continue
    }
    if (!control.value || !control.value.trim()) {
      const label =
        control.getAttribute('aria-label') ||
        control.getAttribute('name') ||
        control.id ||
        'a required field'
      return `An unanswered required question: ${label}`
    }
  }

  // LinkedIn also renders its own inline error text on invalid steps.
  const errors = root.querySelectorAll('.artdeco-inline-feedback--error')
  if (errors.length > 0) {
    return 'LinkedIn is reporting a validation error on this step.'
  }

  return null
}

export async function runEasyApply(autoSubmit: boolean): Promise<EasyApplyResult> {
  const trigger = document.querySelector<HTMLButtonElement>(S.EASY_APPLY_BUTTON.join(', '))
  if (!visible(trigger)) {
    return { ok: false, submitted: false, reason: 'No Easy Apply button on this page.' }
  }

  trigger.click()

  const dialog = await waitFor('div.jobs-easy-apply-modal, div[role="dialog"]')
  if (!dialog) {
    return { ok: false, submitted: false, reason: 'Easy Apply dialog did not open.' }
  }

  for (let step = 0; step < MAX_STEPS; step++) {
    const root = modal()
    if (!root) {
      return { ok: false, submitted: false, reason: 'The dialog closed unexpectedly.' }
    }

    const submit = buttonByLabel(root, ['submit application', 'submit'])
    if (submit) {
      const problem = assertRequiredFieldsFilled(root)
      if (problem) {
        return { ok: false, submitted: false, reason: problem }
      }
      if (!autoSubmit) {
        return {
          ok: true,
          submitted: false,
          reason: 'Ready to submit. Review it and press Submit.',
        }
      }
      submit.click()
      await sleep(1500)
      return { ok: true, submitted: true }
    }

    const advance = buttonByLabel(root, ['next', 'continue to next step', 'review'])
    if (!advance) {
      return {
        ok: false,
        submitted: false,
        reason: 'Could not find the next step. Finish this application by hand.',
      }
    }

    const problem = assertRequiredFieldsFilled(root)
    if (problem) {
      return { ok: false, submitted: false, reason: problem }
    }

    advance.click()
    await sleep(900)
  }

  return {
    ok: false,
    submitted: false,
    reason: 'This application has more steps than we will click through.',
  }
}
