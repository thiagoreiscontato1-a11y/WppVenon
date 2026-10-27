import {ApiProperty} from "@nestjs/swagger";

export class SendChatMessage {
    @ApiProperty({example: 'Olá!'})
    text: string;
    @ApiProperty({required: false, description: 'Id of the message being replied to'})
    replyTo?: string;
}

export class SendChatFile {
    @ApiProperty({type: 'string', format: 'binary'})
    file: any;
    @ApiProperty({required: false})
    caption?: string;
}
