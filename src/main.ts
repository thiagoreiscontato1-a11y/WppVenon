import {NestFactory} from '@nestjs/core';
import {NestExpressApplication} from "@nestjs/platform-express";
import {AppModule} from './app.module';
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";
import {WhatsappConfigService} from "./config.service";
import {AuthService} from "./auth/auth.service";
import {authMiddleware} from "./auth/auth.middleware";
const fileUpload = require('express-fileupload');

const MAX_UPLOAD_BYTES = 64 * 1024 * 1024

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: process.env.DEBUG != undefined ? ['log', 'debug', 'error', 'verbose', 'warn'] :
            ['log', 'error', 'warn'],
    });
    const config = app.get(WhatsappConfigService);
    app.disable('x-powered-by');
    if (config.trust_proxy > 0) {
        app.set('trust proxy', config.trust_proxy);
    }
    // Before everything else, so nothing (not even uploads) is processed without login
    app.use(authMiddleware(app.get(AuthService)));
    app.use(fileUpload({
        limits: {fileSize: MAX_UPLOAD_BYTES},
        abortOnLimit: true,
    }))
    app.enableShutdownHooks();
    const options = new DocumentBuilder()
        .setTitle('WhatsApp venom API')
        .setDescription('WhatsApp HTTP API that you can configure in a click!')
        .setExternalDoc("Github WhatsApp API venom", "https://github.com/diazzaid/whatsapp-venom-api")
        .setVersion('1.0')
        .addTag('device', 'Device information')
        .addTag('chatting', 'Chat methods')
        .addApiKey({
                type: 'apiKey',
                description: 'Your secret key',
                name: 'X-VENOM-TOKEN'
            }
        )
        .build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);

    await app.listen(config.port);
    console.log(`WhatsApp HTTP API is running on: ${await app.getUrl()}`);
}

bootstrap();
