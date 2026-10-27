import {Controller, Get} from '@nestjs/common';
import {ApiTags} from "@nestjs/swagger";
import {Whatsapp} from "@wppconnect-team/wppconnect";
import {WhatsappSessionService} from "../session.service";


@Controller('api')
@ApiTags('device')
export class DeviceController {
    constructor(private session: WhatsappSessionService) {
    }

    private get whatsapp(): Whatsapp {
        return this.session.client
    }

    @Get('/getHostDevice')
    getHostDevice() {
        return this.whatsapp.getHostDevice()
    }

    @Get('/getConnectionState')
    getConnectionState() {
        return this.whatsapp.getConnectionState()
    }

    @Get('/getBatteryLevel')
    getBatteryLevel() {
        return this.whatsapp.getBatteryLevel()
    }

    @Get('/isConnected')
    isConnected() {
        return this.whatsapp.isConnected()
    }

    @Get('/getWAVersion')
    getWAVersion() {
        return this.whatsapp.getWAVersion()
    }

}

