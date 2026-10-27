import {Controller, Get, Res} from '@nestjs/common';
import {ApiTags} from "@nestjs/swagger";
import {Whatsapp} from "venom-bot";
import {WhatsappSessionService} from "../session.service";
import {Readable} from "stream";
import {Response} from 'express';


@Controller('api')
@ApiTags('screenshot')
export class ScreenshotController {
    constructor(private session: WhatsappSessionService) {
    }

    private get whatsapp(): Whatsapp {
        return this.session.client
    }

    @Get('/screenshot')
    async screenshot(@Res() res: Response,) {
        const buffer = await this.whatsapp.page.screenshot();
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        res.set({
            'Content-Type': 'image/png',
            'Content-Length': buffer.length,
        });
        stream.pipe(res)
    }
}

