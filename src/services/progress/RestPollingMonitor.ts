import { BaseProgressMonitor, type ProgressMessage } from './ProgressMonitor'

export class RestPollingMonitor extends BaseProgressMonitor {
  name = 'REST Polling'
  private pollInterval: number | null = null
  private pollDelay = 500 // Poll every 500ms when active
  private isPolling = false
  private lastJobId: string | null = null
  private generationStarted = false // Track if we've seen generation start
  private lastPhase: string = '' // Track last phase to detect changes
  private lastStep = -1 // Track last step to avoid duplicate messages
  private lastJob = '' // Track last job status
  private lastPreviewHash = '' // Track last preview to avoid duplicates
  private vaeStarted = false // Track if VAE phase has started
  private vaeCompleted = false // Track if VAE phase has completed
  private completionCheckCount = 0 // Count checks after VAE/final phase
  private maxCompletionChecks = 6 // Wait up to 3 seconds (6 * 500ms) after VAE for final image
  private lastActiveState: {
    job?: string
    job_count?: number
    job_no?: number
    sampling_step?: number
    sampling_steps?: number
  } | null = null // Store last active state for debugging

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

    this.isPolling = true
    this.generationStarted = false
    this.vaeStarted = false
    this.vaeCompleted = false
    this.completionCheckCount = 0
    this.lastJobId = jobId || null
    this.lastPhase = ''
    this.lastStep = -1

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

          // Determine current phase
          let phase: ProgressMessage['phase'] = 'waiting'
          let shouldNotify = false

          const hasActiveJob = data.state && (data.state.job_count > 0 || data.state.job)
          const hasProgress = data.progress > 0
          const currentJob = data.state?.job || ''
          const currentStep = data.state?.sampling_step || 0
          const totalSteps = data.state?.sampling_steps || 0

          // Log state changes for debugging
          if (currentJob !== this.lastJob || this.lastPhase === '') {
            console.log('Progress state:', {
              job: currentJob,
              hasActiveJob,
              hasProgress,
              step: `${currentStep}/${totalSteps}`,
              phase: this.lastPhase,
            })
          }

          // Phase detection logic
          if (hasActiveJob || hasProgress) {
            this.generationStarted = true
            this.lastActiveState = data.state

            // Detect phase based on job name
            if (
              currentJob.toLowerCase().includes('vae') ||
              currentJob.toLowerCase().includes('decode') ||
              (currentStep === totalSteps && totalSteps > 0 && this.lastPhase === 'sampling')
            ) {
              phase = 'vae'
              this.vaeStarted = true
              this.vaeCompleted = false // Reset completion flag
              shouldNotify = phase !== this.lastPhase
              console.log('VAE phase started')
            } else if (currentJob.toLowerCase().includes('postprocess')) {
              phase = 'postprocessing'
              shouldNotify = phase !== this.lastPhase
            } else if (totalSteps > 0) {
              phase = 'sampling'
              // Notify on step changes during sampling
              shouldNotify = currentStep !== this.lastStep || phase !== this.lastPhase
            } else {
              // Job exists but no clear phase - could be transitioning
              phase = this.lastPhase || 'waiting'
            }

            // Log phase transitions
            if (phase !== this.lastPhase) {
              console.log(`Progress phase transition: ${this.lastPhase || 'none'} -> ${phase}`)
            }

            // Create progress message
            const message: ProgressMessage = {
              current: currentStep,
              total: totalSteps || 1,
              status: currentJob || phase,
              phase: phase,
              preview: data.current_image,
              eta: data.eta_relative,
              job: currentJob,
              jobCount: data.state?.job_count,
              jobNo: data.state?.job_no,
            }

            // Update tracking variables
            this.lastStep = currentStep
            this.lastJob = currentJob
            this.lastPhase = phase

            // Notify if needed
            if (shouldNotify) {
              this.notifyHandlers(message)
            }

            // Reset completion check counter when we see activity
            this.completionCheckCount = 0
          } else {
            // No active job - check if this is completion or still waiting
            if (this.generationStarted) {
              // We had a job before, now it's gone

              this.completionCheckCount++

              // Quick completion if we were in VAE phase
              if (this.lastPhase === 'vae' && !this.vaeCompleted) {
                console.log('VAE completed - generation finished')
                this.vaeCompleted = true
                phase = 'completed'

                const message: ProgressMessage = {
                  current: 1,
                  total: 1,
                  status: 'completed',
                  phase: 'completed',
                  preview: data.current_image,
                }

                this.notifyHandlers(message)
                this.stopPolling()
                return
              }

              // If we've been through sampling or any significant phase
              if (
                (this.lastPhase === 'sampling' ||
                  this.lastPhase === 'postprocessing' ||
                  this.vaeStarted) &&
                this.completionCheckCount >= 2
              ) {
                console.log(
                  `Generation likely completed (was in ${this.lastPhase}, no job for ${this.completionCheckCount} checks)`
                )
                phase = 'completed'

                const message: ProgressMessage = {
                  current: 1,
                  total: 1,
                  status: 'completed',
                  phase: 'completed',
                  preview: data.current_image,
                }

                this.notifyHandlers(message)
                this.stopPolling()
                return
              }

              // For simple generations that may not show clear phases
              if (this.completionCheckCount >= 4) {
                console.log('Generation completed (no active job after 4 checks)')
                phase = 'completed'

                const message: ProgressMessage = {
                  current: 1,
                  total: 1,
                  status: 'completed',
                  phase: 'completed',
                  preview: data.current_image,
                }

                this.notifyHandlers(message)
                this.stopPolling()
                return
              }

              console.log(
                `Waiting for completion confirmation (${this.completionCheckCount} checks)`
              )
            } else if (this.completionCheckCount >= 10) {
              // Waited 5 seconds for job to start, give up
              console.log('No job started after 5 seconds, stopping polling')
              this.stopPolling()
              return
            } else {
              this.completionCheckCount++
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

  stopPolling(forceComplete: boolean = false): void {
    // If we're stopping after a generation and we were actively monitoring, send completion
    if (forceComplete && this.generationStarted && this.lastPhase !== 'completed') {
      console.log('Force completing progress indicator')
      const message: ProgressMessage = {
        current: 1,
        total: 1,
        status: 'completed',
        phase: 'completed',
        preview: undefined,
      }
      this.notifyHandlers(message)
    }

    this.isPolling = false
    this.generationStarted = false
    this.vaeStarted = false
    this.vaeCompleted = false
    this.completionCheckCount = 0
    this.lastStep = -1
    this.lastJob = ''
    this.lastPreviewHash = ''
    this.lastPhase = ''
    this.lastActiveState = null
    if (this.pollInterval !== null) {
      clearTimeout(this.pollInterval)
      this.pollInterval = null
    }
  }
}
