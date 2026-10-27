import {NextFunction, Request, Response} from "express";
import {AuthService} from "./auth.service";

export const SESSION_COOKIE = 'wppvenon_session'

// Reachable without logging in: the web chat files (it shows the login form) and the login itself
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/me', '/favicon.ico']
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

const APP_CSP = [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
].join('; ')

export function readCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie
    if (!header) {
        return undefined
    }
    for (const part of header.split(';')) {
        const index = part.indexOf('=')
        if (index > 0 && part.slice(0, index).trim() === name) {
            return decodeURIComponent(part.slice(index + 1).trim())
        }
    }
    return undefined
}

export function isHttps(req: Request): boolean {
    return req.secure || req.headers['x-forwarded-proto'] === 'https'
}

function apiToken(req: Request): string | undefined {
    const header = req.headers['x-venom-token']
    if (typeof header === 'string') {
        return header
    }
    const authorization = req.headers.authorization
    return authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
}

/**
 * Browsers always send Origin on cross-site POST/PUT/DELETE: reject the ones from other sites (CSRF).
 */
function isCrossSite(req: Request, allowedOrigins: string[]): boolean {
    const origin = req.headers.origin
    if (!origin || SAFE_METHODS.includes(req.method) || allowedOrigins.includes(origin)) {
        return false
    }
    let host: string
    try {
        host = new URL(origin).host
    } catch {
        return true
    }
    const allowed = [req.headers.host, req.headers['x-forwarded-host']].filter(Boolean)
    return !allowed.includes(host)
}

function setSecurityHeaders(req: Request, res: Response) {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (isHttps(req)) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    if (req.path.startsWith('/app')) {
        res.setHeader('Content-Security-Policy', APP_CSP)
    }
}

/**
 * Express middleware that runs before every route (API, Swagger, static files).
 */
export function authMiddleware(auth: AuthService, allowedOrigins: string[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
        setSecurityHeaders(req, res)

        if (req.path === '/') {
            return res.redirect('/app/')
        }
        if (isCrossSite(req, allowedOrigins)) {
            return res.status(403).json({statusCode: 403, message: 'Cross-site request blocked'})
        }
        if (!auth.enabled || req.path === '/app' || req.path.startsWith('/app/') || PUBLIC_PATHS.includes(req.path)) {
            return next()
        }
        if (auth.verifySession(readCookie(req, SESSION_COOKIE)) || auth.checkApiToken(apiToken(req))) {
            return next()
        }
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({statusCode: 401, message: 'Login required'})
        }
        // Swagger (/docs) and anything else: go to the login screen
        return res.redirect('/app/')
    }
}
