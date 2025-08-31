import { BaseProgressMonitor, type ProgressMessage } from './ProgressMonitor'

export class RestPollingMonitor extends BaseProgressMonitor {
  name = 'REST Polling'
  private pollInterval: number | null = null
  private pollDelay = 500 // Poll every 500ms when active
  private isPolling = false
  private lastJobId: string | null = null
  private noJobCount = 0 // Track consecutive polls with no job
  private hasSeenJob = false // Track if we've seen a job start
  private lastStep = -1 // Track last step to avoid duplicate messages
  private lastJob = '' // Track last job status
  private lastPreviewHash = '' // Track last preview to avoid duplicates

  constructor() {
    super()
  }

  private getApiUrl(): string {
    // Get from localStorage directly to avoid circular dependency
    const stored = localStorage.getItem('sdnextnewui-store')
    const data = stored ? JSON.parse(stored) : {}
    return data.state?.apiSettings?.apiUrl || 'http://127.0.0.1:7860/sdapi/v1'
  }

  async isSupported(): Promise<boolean> {
    try {
      const apiUrl = this.getApiUrl()
      console.log('Testing REST progress endpoint at:', apiUrl)

      // The apiUrl already includes /sdapi/v1, so just append /progress
      const progressUrl = `${apiUrl}/progress`
      console.log('Progress URL:', progressUrl)

      try {
        const response = await fetch(progressUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        })

        console.log('Progress endpoint response status:', response.status)

        // Status 200 = working, 404 = not found but API exists
        // 405 = method not allowed (endpoint doesn't exist)
        // Consider it supported if we get any response from the server
        const supported = response.status !== 405 && response.status < 500
        console.log('REST progress supported:', supported)
        return supported
      } catch (fetchError) {
        console.error('Progress endpoint fetch error:', fetchError)
        return false
      }
    } catch (error) {
      console.error('REST polling isSupported error:', error)
      return false
    }
  }

  async connect(): Promise<void> {
    this.connected = true
    console.log('REST Polling monitor connected')
  }

  disconnect(): void {
    this.connected = false
    this.stopPolling()
    console.log('REST Polling monitor disconnected')
  }

  startPolling(jobId?: string): void {
    console.log('Starting REST polling...')
    if (this.isPolling) return

    this.noJobCount = 0
    this.hasSeenJob = false
    this.isPolling = true
    this.lastJobId = jobId || null

    const poll = async () => {
      if (!this.isPolling || !this.connected) {
        this.stopPolling()
        return
      }

      try {
        const apiUrl = this.getApiUrl()
        // The apiUrl already includes /sdapi/v1
        const url = this.lastJobId
          ? `${apiUrl}/progress?job_id=${this.lastJobId}`
          : `${apiUrl}/progress`

        const response = await fetch(url)

        if (response.ok) {
          const data = await response.json()
          // Only log when state changes to reduce console spam
          if (data.state?.sampling_step !== this.lastStep || data.state?.job !== this.lastJob) {
            console.log('Progress response:', JSON.stringify(data, null, 2))
          }

          // Check if there's actually a job running or if progress is 0
          const hasActiveJob = data.state && data.state.job_count > 0
          const hasProgress = data.progress > 0

          if (!hasActiveJob && !hasProgress) {
            this.noJobCount++

            // Only stop if we've seen a job before (completed) or waited long enough for one to start
            if (this.hasSeenJob) {
              // Job finished - send completion and stop
              console.log('Job completed, stopping polling')
              this.stopPolling()
              const message: ProgressMessage = {
                current: 1,
                total: 1,
                status: 'completed',
              }
              this.notifyHandlers(message)
              return
            } else if (this.noJobCount >= 10) {
              // Waited 5 seconds (10 * 500ms) for job to start, give up
              console.log('No job started after 5 seconds, stopping polling')
              this.stopPolling()
              return
            }
            // Otherwise keep polling for job to start
          } else {
            // Reset counter if we see a job
            this.noJobCount = 0
            this.hasSeenJob = true

            // SD.Next provides sampling_step directly
            if (data.state && data.state.sampling_steps !== undefined) {
              const currentStep = data.state.sampling_step || 0
              const totalSteps = data.state.sampling_steps || 1

              const message: ProgressMessage = {
                current: currentStep,
                total: totalSteps,
                status: data.state.job || 'processing',
                preview: data.current_image,
                eta: data.eta_relative,
              }

              // Create a simple hash of the preview (first 20 chars) to detect changes
              const previewHash = data.current_image ? data.current_image.substring(0, 20) : ''

              // Send progress updates if:
              // 1. Step changed from last time
              // 2. Preview image changed (not just exists)
              // 3. Job status changed
              if (
                currentStep !== this.lastStep ||
                data.state.job !== this.lastJob ||
                (previewHash && previewHash !== this.lastPreviewHash)
              ) {
                this.lastStep = currentStep
                this.lastJob = data.state.job
                this.lastPreviewHash = previewHash
                console.log('Progress message:', message)
                this.notifyHandlers(message)
              }
            }
          }
        }
      } catch (error) {
        console.error('REST polling error:', error)
      }

      // Schedule next poll
      this.pollInterval = window.setTimeout(poll, this.pollDelay)
    }

    poll()
  }

  stopPolling(): void {
    this.isPolling = false
    this.noJobCount = 0
    this.hasSeenJob = false
    this.lastStep = -1
    this.lastJob = ''
    this.lastPreviewHash = ''
    if (this.pollInterval !== null) {
      clearTimeout(this.pollInterval)
      this.pollInterval = null
    }
  }
}
