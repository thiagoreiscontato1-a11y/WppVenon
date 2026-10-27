import {Injectable, Logger} from "@nestjs/common";
import * as crypto from "crypto";
import {WhatsappConfigService} from "../config.service";

const MIN_PASSWORD_LENGTH = 12
const MIN_TOKEN_LENGTH = 32

// Brute force protection for the login form
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES_PER_IP = 10
const MAX_FAILURES_GLOBAL = 100

interface SessionPayload {
    // username
    u: string
    // expiration, epoch ms
    exp: number
}

/**
 * Single user login configured through environment variables (ADMIN_USER / ADMIN_PASSWORD).
 * Sessions are stateless HMAC signed tokens kept in an HttpOnly cookie.
 */
@Injectable()
export class AuthService {
    readonly enabled: boolean
    readonly sessionTtlMs: number
    private readonly username: string
    private readonly passwordSalt = crypto.randomBytes(16)
    private readonly passwordHash: Buffer | null
    private readonly apiTokenHash: Buffer | null
    private readonly secret: Buffer
    private failures = new Map<string, number[]>()

    constructor(private config: WhatsappConfigService, private log: Logger) {
        this.enabled = !config.auth_disabled
        this.username = config.admin_user
        this.sessionTtlMs = config.session_ttl_hours * 60 * 60 * 1000

        const password = config.admin_password
        const apiToken = config.api_token
        if (this.enabled) {
            if (!password || password.length < MIN_PASSWORD_LENGTH) {
                throw new Error(
                    `ADMIN_PASSWORD must be set with at least ${MIN_PASSWORD_LENGTH} characters ` +
                    `(or set AUTH_DISABLED=true for local development only).`)
            }
            if (apiToken && apiToken.length < MIN_TOKEN_LENGTH) {
                throw new Error(`API_TOKEN must have at least ${MIN_TOKEN_LENGTH} characters.`)
            }
        } else {
            this.log.warn('AUTH_DISABLED=true: the API is open to anyone who can reach it!', 'AuthService')
        }
        this.passwordHash = password ? this.hash(password) : null
        this.apiTokenHash = apiToken ? this.hash(apiToken) : null

        const secret = config.session_secret
        if (secret) {
            this.secret = Buffer.from(secret)
        } else {
            this.secret = crypto.randomBytes(32)
            this.log.warn('SESSION_SECRET is not set: everybody is logged out when the server restarts.', 'AuthService')
        }
    }

    private hash(value: string): Buffer {
        return crypto.scryptSync(value, this.passwordSalt, 64)
    }

    private safeEqual(a: Buffer, b: Buffer): boolean {
        return a.length === b.length && crypto.timingSafeEqual(a, b)
    }

    private sign(data: string): string {
        return crypto.createHmac('sha256', this.secret).update(data).digest('hex')
    }

    /**
     * True while the IP (or the whole server, under a wider attack) has too many recent failed logins.
     */
    isBlocked(ip: string): boolean {
        const now = Date.now()
        let total = 0
        for (const [key, times] of this.failures) {
            const recent = times.filter((t) => now - t < ATTEMPT_WINDOW_MS)
            if (recent.length) {
                this.failures.set(key, recent)
            } else {
                this.failures.delete(key)
            }
            total += recent.length
        }
        return (this.failures.get(ip)?.length || 0) >= MAX_FAILURES_PER_IP || total >= MAX_FAILURES_GLOBAL
    }

    checkCredentials(ip: string, username: string, password: string): boolean {
        // Always hash both so the response time doesn't tell which one was wrong
        const userOk = this.safeEqual(this.hash(String(username || '')), this.hash(this.username))
        const passwordOk = this.passwordHash !== null && this.safeEqual(this.hash(String(password || '')), this.passwordHash)
        if (userOk && passwordOk) {
            this.failures.delete(ip)
            return true
        }
        this.failures.set(ip, [...(this.failures.get(ip) || []), Date.now()])
        this.log.warn(`Failed login attempt from ${ip}`, 'AuthService')
        return false
    }

    checkApiToken(token: string | undefined): boolean {
        return Boolean(token && this.apiTokenHash && this.safeEqual(this.hash(token), this.apiTokenHash))
    }

    createSession(): string {
        const payload: SessionPayload = {u: this.username, exp: Date.now() + this.sessionTtlMs}
        const data = Buffer.from(JSON.stringify(payload)).toString('hex')
        return `${data}.${this.sign(data)}`
    }

    /**
     * Returns the username of a valid, not expired session token.
     */
    verifySession(token: string | undefined): string | null {
        if (!token) {
            return null
        }
        const [data, signature] = token.split('.')
        if (!data || !signature || !this.safeEqual(Buffer.from(signature), Buffer.from(this.sign(data)))) {
            return null
        }
        try {
            const payload: SessionPayload = JSON.parse(Buffer.from(data, 'hex').toString())
            return payload.exp > Date.now() && payload.u === this.username ? payload.u : null
        } catch {
            return null
        }
    }
}
