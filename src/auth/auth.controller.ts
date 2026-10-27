import {Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Res, UnauthorizedException} from '@nestjs/common';
import {ApiOperation, ApiProperty, ApiTags} from "@nestjs/swagger";
import {Request, Response} from "express";
import {AuthService} from "./auth.service";
import {isHttps, readCookie, SESSION_COOKIE} from "./auth.middleware";

export class LoginRequest {
    @ApiProperty({example: 'admin'})
    username: string;
    @ApiProperty()
    password: string;
}

@Controller('api/auth')
@ApiTags('auth')
export class AuthController {
    constructor(private auth: AuthService) {
    }

    @Post('/login')
    @HttpCode(200)
    @ApiOperation({summary: 'Log in and receive the session cookie'})
    login(@Body() body: LoginRequest, @Req() req: Request, @Res({passthrough: true}) res: Response) {
        if (!this.auth.enabled) {
            return {username: null, authEnabled: false}
        }
        const ip = req.ip || req.socket.remoteAddress || 'unknown'
        if (this.auth.isBlocked(ip)) {
            throw new HttpException('Muitas tentativas. Aguarde 15 minutos e tente novamente.', HttpStatus.TOO_MANY_REQUESTS)
        }
        if (!this.auth.checkCredentials(ip, body?.username, body?.password)) {
            throw new UnauthorizedException('Usuário ou senha inválidos')
        }
        res.cookie(SESSION_COOKIE, this.auth.createSession(), {
            httpOnly: true,
            secure: isHttps(req),
            sameSite: 'strict',
            path: '/',
            maxAge: this.auth.sessionTtlMs,
        })
        return {username: body.username, authEnabled: true}
    }

    @Post('/logout')
    @HttpCode(200)
    @ApiOperation({summary: 'Log out (clears the session cookie)'})
    logout(@Req() req: Request, @Res({passthrough: true}) res: Response) {
        res.clearCookie(SESSION_COOKIE, {httpOnly: true, secure: isHttps(req), sameSite: 'strict', path: '/'})
        return {ok: true}
    }

    @Get('/me')
    @ApiOperation({summary: 'Who is logged in (authenticated: false when nobody)'})
    me(@Req() req: Request) {
        if (!this.auth.enabled) {
            return {authenticated: true, username: null, authEnabled: false}
        }
        const username = this.auth.verifySession(readCookie(req, SESSION_COOKIE))
        return {authenticated: Boolean(username), username, authEnabled: true}
    }
}
