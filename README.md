# WhatsApp API Free

## Chat web (estilo WhatsApp Web)

A pasta `web/` tem uma interface de chat (React + Vite) que conversa com esta API:
login, QR code na tela, lista de conversas, histórico, envio de texto e arquivos e
atualização em tempo real (mensagens novas e confirmações de leitura).

A sessão do WhatsApp sobe em segundo plano: a API responde imediatamente e o QR
aparece na interface (e continua no terminal).

### Testar grátis no GitHub Codespaces (sem instalar nada)

O repositório já vem configurado para o Codespaces: ele instala tudo, cria uma senha
aleatória e sobe o sistema sozinho.

1. No GitHub, abra o repositório na branch desejada → botão **Code** → aba **Codespaces** →
   **Create codespace on ...**.
2. Espere a instalação terminar (na primeira vez leva alguns minutos). Quando ela acaba,
   aparece um terminal com o endereço, o usuário e a senha:
   ```
    WppVenon no ar!
    Abra: https://SEU-CODESPACE-3000.app.github.dev/
    Usuário: admin
    Senha:   ...
   ```
   (Para ver a senha de novo: `cat .env`.)
3. Abra o endereço, faça login e escaneie o QR com o WhatsApp.

Observações:
- O plano gratuito dá 60 horas/mês nesta máquina. O Codespace **para sozinho** depois de
  30 minutos sem uso do editor (dá para aumentar até 4 h em *github.com/settings/codespaces →
  Default idle timeout*). Ao reabrir, o sistema sobe de novo e a sessão do WhatsApp continua salva.
- A porta fica **privada** por padrão: só você, logado no GitHub, consegue abrir o endereço.
- Depois de atualizar o código (`git pull`), rode `bash scripts/codespace-start.sh --rebuild`.
- Logs: `tail -f /tmp/wppvenon.log`.
- Se preferir definir a senha você mesmo, crie os secrets `ADMIN_USER`, `ADMIN_PASSWORD` e
  `SESSION_SECRET` em *github.com/settings/codespaces* antes de criar o Codespace.

### Deploy 24/7 (Railway, Oracle Cloud, Render, VPS...)

> **Não funciona na Vercel** (nem em outro serviço *serverless*): o venom mantém um
> Chrome aberto o tempo todo segurando a sessão do WhatsApp, e funções serverless são
> encerradas segundos depois de cada requisição. Use um serviço que rode um container
> continuamente.

O projeto tem um `Dockerfile` pronto (API + interface + Chromium). Opção gratuita para
deixar no ar o tempo todo: VM *Always Free* da **Oracle Cloud** (pede cartão só para verificação).
No **Railway** (pago, mais simples):

1. *New Project → Deploy from GitHub repo* e escolha este repositório/branch.
2. Em *Variables*, configure pelo menos `ADMIN_USER`, `ADMIN_PASSWORD` e `SESSION_SECRET` (tabela abaixo).
3. Em *Settings → Volumes*, adicione um volume montado em **`/app/tokens`**
   (guarda a sessão do WhatsApp; sem ele é preciso escanear o QR a cada deploy).
4. Em *Settings → Networking*, gere um domínio público e abra `https://SEU-DOMINIO/`.

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| -------- | ----------- | --------- |
| `ADMIN_PASSWORD` | **sim** | Senha de acesso, mínimo 12 caracteres. Sem ela a API não sobe. |
| `ADMIN_USER` | não | Usuário (padrão `admin`). |
| `SESSION_SECRET` | recomendada | Chave aleatória longa que assina os cookies de login. Sem ela, todos são deslogados a cada reinício. Gere com `openssl rand -hex 32` ou um gerador de senhas. |
| `SESSION_TTL_HOURS` | não | Duração do login em horas (padrão `12`). |
| `API_TOKEN` | não | Token (mín. 32 caracteres) para scripts/integrações, enviado no cabeçalho `X-VENOM-TOKEN` ou `Authorization: Bearer`. |
| `TRUST_PROXY` | não | Quantos proxies existem na frente da API (o Dockerfile já define `1`, correto para Railway/Render). |
| `ALLOWED_ORIGINS` | não | Endereços públicos de onde a interface é aberta, separados por vírgula, quando um proxy reescreve o `Host` (ex.: `https://chat.meudominio.com`). O Codespaces é detectado sozinho. |
| `AUTH_DISABLED` | não | `true` desliga o login. **Somente para desenvolvimento local.** |
| `WHATSAPP_SESSION_NAME` | não | Nome da sessão do venom (padrão `sessionName`). |
| `WHATSAPP_AUTO_CLOSE` | não | ms até desistir de esperar o QR; padrão `0` = nunca. |
| `PORT` / `WHATSAPP_API_PORT` | não | Porta HTTP (padrão `3000`). |

### Segurança

- Tudo exige login: API, arquivos, eventos em tempo real e a documentação Swagger (`/docs`).
- Sessão em cookie assinado (HMAC-SHA256), `HttpOnly`, `Secure` (em HTTPS) e `SameSite=Strict`.
- Bloqueio por força bruta: 10 tentativas erradas por IP (ou 100 no total) bloqueiam o login por 15 minutos.
- Requisições de outros sites são recusadas (proteção CSRF por `Origin`), e há cabeçalhos
  de segurança (CSP, HSTS, `X-Frame-Options`...).
- Para trocar a senha, altere `ADMIN_PASSWORD`. Para deslogar todo mundo, troque `SESSION_SECRET`.

### Rodando localmente

```bash
# 1. API (raiz do projeto). Crie um arquivo .env com, por exemplo:
#    ADMIN_USER=admin
#    ADMIN_PASSWORD=uma-senha-com-12+-caracteres
npm install
npm start                 # http://localhost:3000 (Swagger em /docs)

# 2. Interface em modo desenvolvimento (outro terminal)
npm run web:install
npm run web:dev           # http://localhost:5173/app/
```

Ou `npm run web:build` e abra http://localhost:3000/ (a própria API serve a interface em `/app`).

### Endpoints

Ids completos: `5511999999999@c.us` para contatos ou `...@g.us` para grupos.

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| POST | `/api/auth/login` | Login `{username, password}` (define o cookie de sessão) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Quem está logado |
| GET | `/api/session` | Status da sessão do WhatsApp e QR code |
| POST | `/api/session/restart` | Reinicia a sessão após erro/desconexão |
| GET | `/api/events` | Server-Sent Events: `status`, `message`, `ack` |
| GET | `/api/chats` | Conversas, mais recentes primeiro |
| GET | `/api/chats/:chatId/messages` | Mensagens carregadas da conversa |
| POST | `/api/chats/:chatId/messages` | Envia texto `{text, replyTo?}` |
| POST | `/api/chats/:chatId/files` | Envia arquivo (multipart, campo `file`, `caption` opcional; até 64 MB) |
| POST | `/api/chats/:chatId/seen` | Marca como lida |

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
http://localhost:3000/docs

## Send a text message

Let's try to send a message:
1. via curl

curl --location --request POST 'http://localhost:3000/api/send-message' \
--header 'X-VENOM-TOKEN: <API_TOKEN>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "number": "6281224993382",
  "message": "api testing"
}'

2. swagger
open browser http://localhost:3000/docs
![image](https://user-images.githubusercontent.com/25816482/126971406-dc142e75-8480-413f-b96c-c80a3e64bcbe.png)


## Get a screenshot

Go to the "screenshot" section and get a screenshot http://localhost:3000/docs#/screenshot
![image](https://user-images.githubusercontent.com/25816482/126974407-24d35d18-a2f7-4262-aae0-6e68b293bfa1.png)



thanks to 

venom https://github.com/orkestral/venom.

allburov https://github.com/allburov/whatsapp-http-api




