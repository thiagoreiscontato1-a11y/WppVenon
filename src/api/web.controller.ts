import {BadRequestException, Body, Controller, Get, MessageEvent, Param, Post, Req, Sse} from '@nestjs/common';
import {ApiBody, ApiConsumes, ApiOperation, ApiTags} from "@nestjs/swagger";
import {Whatsapp} from "@wppconnect-team/wppconnect";
import {Request} from "express";
import {concat, interval, merge, Observable, of} from "rxjs";
import {map} from "rxjs/operators";
import {SessionEvent, WhatsappSessionService} from "../session.service";
import {toWebAck, toWebChat, toWebMessage} from "./web.mapper";
import {SendChatFile, SendChatMessage} from "./web.dto";

const KEEP_ALIVE_MS = 25000
const MESSAGES_PER_CHAT = 100

/**
 * Endpoints used by the web chat (web/ folder).
 * Chat ids are full WhatsApp ids: 5511999999999@c.us for contacts, ...@g.us for groups.
 */
@Controller('api')
@ApiTags('web chat')
export class WebController {
    constructor(private session: WhatsappSessionService) {
    }

    private get whatsapp(): Whatsapp {
        return this.session.client
    }

    @Get('/session')
    @ApiOperation({summary: 'Session status and QR code (while waiting for the scan)'})
    getSession() {
        return this.session.getState()
    }

    @Post('/session/restart')
    @ApiOperation({summary: 'Start a new session after an error or a disconnection'})
    restartSession() {
        return this.session.restart()
    }

    @Sse('/events')
    @ApiOperation({summary: 'Server-Sent Events stream: status, message and ack events'})
    events(): Observable<MessageEvent> {
        const current = of<SessionEvent>({type: 'status', data: this.session.getState()})
        const events = concat(current, this.session.events$).pipe(
            map((event): MessageEvent => ({type: event.type, data: this.toWebEvent(event)})),
        )
        // Keeps proxies from closing an idle connection
        const keepAlive = interval(KEEP_ALIVE_MS).pipe(map((): MessageEvent => ({type: 'ping', data: ''})))
        return merge(events, keepAlive)
    }

    @Get('/chats')
    @ApiOperation({summary: 'List chats, most recent first'})
    async getChats() {
        const chats = await this.whatsapp.listChats()
        return chats
            .map(toWebChat)
            .filter((chat) => chat.id && !chat.id.endsWith('@broadcast'))
            .sort((a, b) => b.timestamp - a.timestamp)
    }

    @Get('/chats/:chatId/messages')
    @ApiOperation({summary: `Last ${MESSAGES_PER_CHAT} messages of a chat, oldest first`})
    async getMessages(@Param('chatId') chatId: string) {
        const messages = await this.whatsapp.getMessages(chatId, {count: MESSAGES_PER_CHAT})
        return messages.map(toWebMessage).sort((a, b) => a.timestamp - b.timestamp)
    }

    @Post('/chats/:chatId/messages')
    @ApiOperation({summary: 'Send a text message (optionally as a reply)'})
    sendMessage(@Param('chatId') chatId: string, @Body() message: SendChatMessage) {
        if (!message.text || !message.text.trim()) {
            throw new BadRequestException('text is required')
        }
        return this.whatsapp.sendText(chatId, message.text, message.replyTo ? {quotedMsg: message.replyTo} : {})
    }

    @Post('/chats/:chatId/files')
    @ApiOperation({summary: 'Send a file (multipart/form-data, field "file")'})
    @ApiConsumes('multipart/form-data')
    @ApiBody({type: SendChatFile})
    sendFile(@Param('chatId') chatId: string, @Req() req: Request, @Body('caption') caption?: string) {
        // Parsed by express-fileupload (see main.ts)
        const file = (req as any).files?.file
        if (!file || Array.isArray(file)) {
            throw new BadRequestException('Send exactly one file in the "file" field')
        }
        const base64 = `data:${file.mimetype};base64,${file.data.toString('base64')}`
        if (file.mimetype.startsWith('image/')) {
            return this.whatsapp.sendImageFromBase64(chatId, base64, file.name, caption || '')
        }
        return this.whatsapp.sendFileFromBase64(chatId, base64, file.name, caption || '')
    }

    @Post('/chats/:chatId/seen')
    @ApiOperation({summary: 'Mark a chat as read'})
    sendSeen(@Param('chatId') chatId: string) {
        return this.whatsapp.sendSeen(chatId)
    }

    private toWebEvent(event: SessionEvent) {
        switch (event.type) {
            case 'message':
                return toWebMessage(event.data)
            case 'ack':
                return toWebAck(event.data)
            default:
                return event.data
        }
    }
}
