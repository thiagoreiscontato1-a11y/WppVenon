import {Logger, Module} from '@nestjs/common';
import {ChattingController} from './api/chatting.controller';
import {DeviceController} from "./api/device.controller";
import {WhatsappService} from "./whatsapp.service";
import {WhatsappSessionService} from "./session.service";
import {WebController} from "./api/web.controller";
import * as path from "path";
import {ScreenshotController} from "./api/screenshot.controller";
import {ConfigModule} from "@nestjs/config";
import {WhatsappConfigService} from "./config.service";
import {ServeStaticModule} from "@nestjs/serve-static";

@Module({
    imports: [
        WhatsappConfigService,
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ServeStaticModule.forRootAsync({
            imports: [WhatsappConfigService],
            extraProviders: [WhatsappConfigService],
            inject: [WhatsappConfigService],
            useFactory: (config: WhatsappConfigService) => {
                return [{
                    rootPath: config.files_folder,
                    serveRoot: config.files_uri,
                }, {
                    // Built web chat (cd web && npm run build)
                    rootPath: path.join(__dirname, '..', 'web', 'dist'),
                    serveRoot: '/app',
                }]
            },
        }),
    ],
    controllers: [ChattingController, DeviceController, ScreenshotController, WebController],
    providers: [WhatsappSessionService, WhatsappService, Logger, WhatsappConfigService],
})
export class AppModule {
}
