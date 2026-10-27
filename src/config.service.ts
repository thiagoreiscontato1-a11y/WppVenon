import {Injectable} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class WhatsappConfigService {
    public files_uri = '/api/files'
    public schema = "http"

    constructor(private configService: ConfigService) {
    }

    get files_url(): string {
        return `${this.schema}://${this.hostname}:${this.port}${this.files_uri}/`
    }

    get hostname(): string {
        return this.configService.get(
            'WHATSAPP_API_HOSTNAME',
            'localhost',
        )
    }

    get port(): string {
        return this.configService.get(
            'WHATSAPP_API_PORT',
            // Set by most hosting platforms (Railway, Render...)
            this.configService.get('PORT', '3000'),
        )
    }

    get files_folder(): string {
        return this.configService.get(
            'WHATSAPP_FILES_FOLDER',
            '/tmp/whatsapp-files',
        )
    }

    get files_lifetime(): number {
        return this.configService.get<number>(
            'WHATSAPP_FILES_LIFETIME',
            180,
        )
    }

    get session_name(): string {
        return this.configService.get(
            'WHATSAPP_SESSION_NAME',
            'sessionName',
        )
    }

    get auto_close(): number {
        return Number(this.configService.get(
            'WHATSAPP_AUTO_CLOSE',
            0,
        ))
    }

    get auth_disabled(): boolean {
        return this.configService.get('AUTH_DISABLED', '') === 'true'
    }

    get admin_user(): string {
        return this.configService.get('ADMIN_USER', 'admin')
    }

    get admin_password(): string {
        return this.configService.get('ADMIN_PASSWORD', '')
    }

    // Optional token for scripts/integrations: header X-VENOM-TOKEN or Authorization: Bearer
    get api_token(): string {
        return this.configService.get('API_TOKEN', '')
    }

    // Signs the session cookies. Without it a random one is generated on every start.
    get session_secret(): string {
        return this.configService.get('SESSION_SECRET', '')
    }

    get session_ttl_hours(): number {
        return Number(this.configService.get('SESSION_TTL_HOURS', 12))
    }

    // Number of reverse proxies in front of the API (1 on Railway/Render), used to get the client IP
    get trust_proxy(): number {
        return Number(this.configService.get('TRUST_PROXY', 0))
    }

    get mimetypes(): string[] | null {
        const types = this.configService.get('WHATSAPP_FILES_MIMETYPES', "")
        return types ? types.split(',') : null
    }

    get(name: string): any {
        return this.configService.get(name)
    }
}