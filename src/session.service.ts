import {Injectable, Logger, OnApplicationShutdown, OnModuleInit, ServiceUnavailableException} from "@nestjs/common";
import {create, Whatsapp} from "@wppconnect-team/wppconnect";
import {puppeteerConfig} from "@wppconnect-team/wppconnect/dist/config/puppeteer.config";
import {Observable, Subject} from "rxjs";
import {WhatsappConfigService} from "./config.service";

export type SessionStatus = 'starting' | 'qr' | 'connected' | 'disconnected' | 'error'

export interface SessionState {
    status: SessionStatus
    // Last raw status reported by WPPConnect (isLogged, qrReadSuccess, disconnectedMobile...)
    detail: string | null
    // QR code as a data URL (data:image/png;base64,...) while status === 'qr'
    qr: string | null
}

export interface SessionEvent {
    type: 'status' | 'message' | 'ack'
    data: any
}

const DISCONNECTED_STATUSES = ['browserClose', 'autocloseCalled', 'disconnectedMobile', 'serverClose']

// After a connected session drops (e.g. the browser crashed), start it again by itself
const AUTO_RESTART_DELAY_MS = 5000
const MAX_AUTO_RESTARTS = 5
const CLOSE_TIMEOUT_MS = 10000

/**
 * Owns the WPPConnect client. The client is created in background so the HTTP server
 * is available right away (the web chat needs it to show the QR code).
 */
@Injectable()
export class WhatsappSessionService implements OnModuleInit, OnApplicationShutdown {
    private whatsapp: Whatsapp | null = null
    private readyCallbacks: ((client: Whatsapp) => void)[] = []
    private readonly events = new Subject<SessionEvent>()
    private state: SessionState = {status: 'starting', detail: null, qr: null}
    private wasConnected = false
    private autoRestarts = 0
    private autoRestartTimer: NodeJS.Timeout | null = null

    constructor(
        private config: WhatsappConfigService,
        private log: Logger,
    ) {
    }

    onModuleInit() {
        this.start()
    }

    get client(): Whatsapp {
        if (!this.whatsapp) {
            throw new ServiceUnavailableException(`WhatsApp session is not ready (status: ${this.state.status})`)
        }
        return this.whatsapp
    }

    get events$(): Observable<SessionEvent> {
        return this.events.asObservable()
    }

    getState(): SessionState {
        return {...this.state}
    }

    /**
     * Runs the callback every time a client connects (immediately if one already is).
     */
    onReady(callback: (client: Whatsapp) => void) {
        this.readyCallbacks.push(callback)
        if (this.whatsapp) {
            callback(this.whatsapp)
        }
    }

    /**
     * Starts a new session when the current one failed or was disconnected.
     */
    async restart(): Promise<SessionState> {
        if (this.state.status === 'starting' || this.state.status === 'qr') {
            return this.getState()
        }
        if (this.whatsapp) {
            const client = this.whatsapp
            this.whatsapp = null
            // A crashed browser may never answer close()
            const timeout = new Promise((resolve) => setTimeout(resolve, CLOSE_TIMEOUT_MS))
            await Promise.race([client.close(), timeout])
                .catch((error) => this.log.warn(`Error closing the client: ${error}`, 'WhatsappSessionService'))
        }
        this.setState({status: 'starting', qr: null, detail: null})
        this.start()
        return this.getState()
    }

    emit(event: SessionEvent) {
        this.events.next(event)
    }

    private setState(patch: Partial<SessionState>) {
        this.state = {...this.state, ...patch}
        this.emit({type: 'status', data: this.getState()})
        if (patch.status === 'disconnected' || patch.status === 'error') {
            this.scheduleAutoRestart()
        }
    }

    private scheduleAutoRestart() {
        if (!this.wasConnected || this.autoRestartTimer || this.autoRestarts >= MAX_AUTO_RESTARTS) {
            return
        }
        this.autoRestarts++
        this.log.warn(`Session dropped, restarting in ${AUTO_RESTART_DELAY_MS / 1000}s ` +
            `(attempt ${this.autoRestarts}/${MAX_AUTO_RESTARTS})`, 'WhatsappSessionService')
        this.autoRestartTimer = setTimeout(() => {
            this.autoRestartTimer = null
            this.restart()
        }, AUTO_RESTART_DELAY_MS)
    }

    private start() {
        this.log.log('Starting WhatsApp session...', 'WhatsappSessionService')
        const chromePath = process.env.CHROME_PATH
        create({
            session: this.config.session_name,
            catchQR: (base64Qr, asciiQR) => {
                console.log(asciiQR);
                this.setState({status: 'qr', qr: base64Qr})
            },
            statusFind: (statusFind) => {
                console.log(statusFind);
                const patch: Partial<SessionState> = {detail: statusFind}
                if (DISCONNECTED_STATUSES.includes(statusFind)) {
                    patch.status = 'disconnected'
                    patch.qr = null
                }
                this.setState(patch)
            },
            headless: true,
            devtools: false,
            debug: false,
            logQR: true,
            // Keep WPPConnect's defaults (e.g. --disable-dev-shm-usage, without it Chromium
            // crashes in containers) and add --no-sandbox, needed when running in Docker
            browserArgs: [...puppeteerConfig.chromiumArgs, '--no-sandbox'],
            puppeteerOptions: chromePath ? {executablePath: chromePath} : {},
            // 0 = never close while waiting for the QR scan (the web chat shows it)
            autoClose: this.config.auto_close,
            deviceName: 'WppVenon',
            disableWelcome: true,
            updatesLog: false,
            disableGoogleAnalytics: true,
        }        ).then((client) => {
            this.whatsapp = client
            this.wasConnected = true
            this.autoRestarts = 0
            this.setState({status: 'connected', qr: null})
            this.log.log('WhatsApp session connected', 'WhatsappSessionService')
            this.registerListeners(client)
            this.readyCallbacks.forEach((callback) => callback(client))
        }).catch((error) => {
            this.log.error(`Failed to start WhatsApp session: ${error}`, undefined, 'WhatsappSessionService')
            this.setState({status: 'error', qr: null, detail: String(error)})
        })
    }

    private registerListeners(client: Whatsapp) {
        client.onAnyMessage((message) => this.emit({type: 'message', data: message}))
        client.onAck((ack) => this.emit({type: 'ack', data: ack}))
        client.onStateChange((state) => {
            this.log.log(`State changed: ${state}`, 'WhatsappSessionService')
            this.setState({detail: String(state)})
        })
    }

    onApplicationShutdown(signal?: string): any {
        if (this.autoRestartTimer) {
            clearTimeout(this.autoRestartTimer)
        }
        this.events.complete()
        if (this.whatsapp) {
            this.log.log('Close a browser...', 'WhatsappSessionService')
            return this.whatsapp.close()
        }
    }
}
