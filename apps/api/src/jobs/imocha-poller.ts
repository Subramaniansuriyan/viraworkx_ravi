/**
 * iMocha result poller.
 *
 * Runs every 5 minutes and checks iMocha's /reports endpoint for any
 * assessments that are still 'invited' or 'started' in our DB but have
 * actually been completed in iMocha.
 *
 * This is the reliable fallback when the iMocha webhook is not delivered.
 */
import prisma from '../config/database.js'
import { imochaService, IMochaWebhookPayload } from '../services/imocha.service.js'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

async function pollImochaResults(): Promise<void> {
  if (!imochaService.isLive()) return

  // Find all pending assessments that have an iMocha invitation ID
  const pending = await prisma.assessment.findMany({
    where: {
      status: { in: ['invited', 'started'] },
      imochaInvitationId: { not: null },
    },
    select: { id: true, imochaTestId: true, imochaInvitationId: true, imochaAttemptId: true },
  })

  if (pending.length === 0) return

  console.log(`[iMocha Poller] Checking ${pending.length} pending assessment(s)...`)

  for (const assessment of pending) {
    try {
      const result = await imochaService.fetchInvitationResult(
        assessment.imochaTestId,
        assessment.imochaInvitationId!
      )

      // Only process if iMocha reports the test as completed
      const terminalStatuses = ['completed', 'finished', 'passed', 'failed']
      const isComplete = terminalStatuses.some(s => result.status?.toLowerCase().includes(s))
      if (!isComplete && result.score == null) continue

      console.log(
        `[iMocha Poller] Assessment ${assessment.id} completed — score: ${result.score}/${result.maxScore}`
      )

      // Process through the normal webhook handler
      const payload: IMochaWebhookPayload = {
        event: 'test.completed',
        timestamp: result.completedAt || new Date().toISOString(),
        data: {
          attemptId: assessment.imochaAttemptId || `polled-${Date.now()}`,
          invitationId: assessment.imochaInvitationId!,
          testId: assessment.imochaTestId,
          candidateEmail: '',
          score: result.score ?? undefined,
          maxScore: result.maxScore ?? undefined,
          percentile: result.percentile ?? undefined,
          reportUrl: result.reportUrl ?? undefined,
        },
      }

      await imochaService.handleWebhook(payload)
    } catch {
      // Silently skip — test may still be in progress or iMocha API unavailable
    }
  }
}

let pollerTimer: NodeJS.Timeout | null = null

export function startImochaPoller(): void {
  if (pollerTimer) return // already running

  // Run once immediately on startup to catch any missed results
  pollImochaResults().catch(err => console.error('[iMocha Poller] Startup poll error:', err))

  pollerTimer = setInterval(() => {
    pollImochaResults().catch(err => console.error('[iMocha Poller] Poll error:', err))
  }, POLL_INTERVAL_MS)

  console.log('[iMocha Poller] Started — polling every 5 minutes')
}

export function stopImochaPoller(): void {
  if (pollerTimer) {
    clearInterval(pollerTimer)
    pollerTimer = null
  }
}
