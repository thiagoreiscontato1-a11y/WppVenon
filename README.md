# WhatsApp API Free

## Chat web (estilo WhatsApp Web)

A pasta `web/` tem uma interface de chat (React + Vite) que conversa com esta API:
QR code na tela, lista de conversas, histórico, envio de texto e arquivos e
atualização em tempo real (mensagens novas e confirmações de leitura).

```bash
# 1. API (raiz do projeto)
npm install
npm start                 # http://localhost:3000 (Swagger)

# 2. Interface, em modo desenvolvimento (outro terminal)
npm run web:install
npm run web:dev           # http://localhost:5173/app/
```

Para usar sem o servidor do Vite: `npm run web:build` e abra http://localhost:3000/app/
(a própria API serve o build).

A sessão do WhatsApp agora sobe em segundo plano: a API responde imediatamente e o QR
aparece na interface (e continua no terminal).

Endpoints usados pela interface (ids completos: `5511999999999@c.us` ou `...@g.us` para grupos):

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| GET | `/api/session` | Status da sessão e QR code |
| POST | `/api/session/restart` | Reinicia a sessão após erro/desconexão |
| GET | `/api/events` | Server-Sent Events: `status`, `message`, `ack` |
| GET | `/api/chats` | Conversas, mais recentes primeiro |
| GET | `/api/chats/:chatId/messages` | Mensagens carregadas da conversa |
| POST | `/api/chats/:chatId/messages` | Envia texto `{text, replyTo?}` |
| POST | `/api/chats/:chatId/files` | Envia arquivo (multipart, campo `file`, `caption` opcional) |
| POST | `/api/chats/:chatId/seen` | Marca como lida |

Variáveis de ambiente novas: `WHATSAPP_SESSION_NAME` (padrão `sessionName`) e
`WHATSAPP_AUTO_CLOSE` (ms até desistir de esperar o QR; padrão `0` = nunca).

> ⚠️ A API não tem autenticação: qualquer pessoa que alcance a porta 3000 pode ler e
> enviar mensagens. Mantenha-a apenas em `localhost`/rede interna até adicionarmos login.

WhatsApp venom API that you can configure in a click! It's really Free! :)

The project is an HTTP wrapper around https://github.com/orkestral/venom, so we can also support these methods:

|                                                            |     |
| ---------------------------------------------------------- | --- |
| Automatic QR Refresh                                       | ✔   |
| Send **text, image, video, audio and docs**                | ✔   |
| Get **contacts, chats, groups, group members, Block List** | ✔   |
| Send contacts                                              | ✔   |
| Send stickers                                              | ✔   |
| Send stickers GIF                                          | ✔   |
| insert user section                                        | ✔   |
| 📍 Send location!!                                         | ✔   |
| 🕸🕸 **and much more**                                       | ✔   |

# Installation
## untuk windows os 
rubah pada bagian /src/config.service.ts
bari ke 33 dari '/tmp/whatsapp-files',
 menjadi 'D:/api-wa/whatsapp-api-venom/tokens/whatsapp-files',
 sesuaikan dengan direktori masing-masing
 
1. git clone https://github.com/diazzaid/whatsapp-api-venom.git
2. cd whatsapp-api-venom
3. npm i
4. npm start
5. scan qrcode via terminal
![image](https://user-images.githubusercontent.com/25816482/126972185-4747f027-8640-4626-85cc-0a9295558a81.png)
6. session Connected
![image](https://user-images.githubusercontent.com/25816482/126972405-20eeca06-6f81-4ad1-a99d-9df2b16f76d7.png)

Run WhatsApp venom API:

After that open in a browser the link and you'll see Swagger (OpenApi) API specification for WhatsApp venom API
http://localhost:3000/#/

## Send a text message

Let's try to send a message:
1. via curl

curl --location --request POST 'http://localhost:3000/api/send-message' \
--header 'Content-Type: application/json' \
--data-raw '{
  "number": "6281224993382",
  "message": "api testing"
}'

2. swagger
open browser http://localhost:3000/
![image](https://user-images.githubusercontent.com/25816482/126971406-dc142e75-8480-413f-b96c-c80a3e64bcbe.png)


## Get a screenshot

Go to the "screenshot" section and get a screenshot http://localhost:3000/#/screenshot
![image](https://user-images.githubusercontent.com/25816482/126974407-24d35d18-a2f7-4262-aae0-6e68b293bfa1.png)



thanks to 

venom https://github.com/orkestral/venom.

allburov https://github.com/allburov/whatsapp-http-api




