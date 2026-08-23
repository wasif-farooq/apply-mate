/**
 * LinkedIn DOM selectors.
 *
 * These are a port of what backend/utils/linkedin_parser.py used, but treat
 * that file as a hypothesis rather than truth: it targets logged-out,
 * server-fetched HTML, and we are reading the logged-in DOM, which differs.
 * Every lookup walks a chain and the caller must handle "nothing matched"
 * visibly -- the server-side parser's habit of returning empty strings is
 * exactly how a blank job description reached the model.
 */

export const JOB_TITLE = [
  'h1.job-title',
  'div[data-test-id="job-title"]',
  'span.job-details-jobs-unified-top-card__job-title-link',
  'h1.job-details-jobs-unified-top-card__job-title',
  'span.job-details-job-title-text',
  'div.jobs-unified-top-card__job-title',
  'h1.t-24',
]

export const COMPANY = [
  'div.job-details-jobs-unified-top-card__company-name a',
  'div.job-details-jobs-unified-top-card__company-name',
  'a[data-test-id="about-company"]',
  'a.jobs-unified-top-card__company-name',
  'span.jobs-company-name',
  'span.company-name',
]

export const LOCATION = [
  'div.job-details-jobs-unified-top-card__primary-description-container span.tvm__text',
  'span[data-test-id="job-location"]',
  'span.jobs-unified-top-card__location',
  'span.jobs-compact-details-item__text',
  'span.location',
]

export const DESCRIPTION = [
  'div.jobs-description__content',
  'div.jobs-description-content',
  'div[data-test-id="job-details-description"]',
  'article.jobs-description__container',
  'div.description',
]

export const EASY_APPLY_BUTTON = [
  'button.jobs-apply-button',
  'button[data-live-test-job-apply-button]',
  'button[aria-label*="Easy Apply"]',
]

/** Feed post containers, for the scanner. */
export const FEED_POST = [
  'div.feed-shared-update-v2',
  'div[data-id^="urn:li:activity"]',
  'div.occludable-update',
]

export const FEED_POST_TEXT = [
  'div.feed-shared-update-v2__description-wrapper',
  'div.update-components-text',
  'span.break-words',
]

export const FEED_POST_AUTHOR = [
  'span.update-components-actor__title span[aria-hidden="true"]',
  'span.update-components-actor__name',
  'span.feed-shared-actor__name',
]

export const FEED_POST_AUTHOR_LINK = [
  'a.update-components-actor__meta-link',
  'a.update-components-actor__container-link',
  'a.feed-shared-actor__container-link',
]

/**
 * Comment containers, stripped before any text extraction.
 *
 * This is not cosmetic. Email addresses posted in comments were being picked
 * up as the hiring contact, so applications went to whoever commented rather
 * than to the recruiter.
 */
export const COMMENT_CONTAINERS = [
  'div.feed-shared-update-v2__comments-container',
  'div.comments-comments-list',
  'div.social-details-social-activity',
  'div.comments-comment-item',
  'section.comments-comments-list',
  'div.feed-shared-update-v2__comment-list',
]

export const NOISE = [
  'script',
  'style',
  'noscript',
  'button',
  'svg',
  '.update-components-header',
  '.social-details-social-counts',
  '.feed-shared-social-action-bar',
]
