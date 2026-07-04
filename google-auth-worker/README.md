# PMK Google persistent auth backend

Этот backend нужен, чтобы ПМК Календарь не просил Google-вход при каждом новом запуске.

## Что делает

- `/auth/start` — отправляет пользователя в Google OAuth.
- `/auth/callback` — получает `refresh_token`, создаёт безопасную сессию устройства.
- `/token` — по сохранённой сессии выдаёт новый короткий `access_token` для Google Calendar.
- `/revoke` — отключает постоянный вход.

## Деплой Cloudflare Worker

1. Создать OAuth Client в Google Cloud Console.
2. В Authorized redirect URIs добавить:

```text
https://ВАШ-WORKER.workers.dev/auth/callback
```

3. Создать Cloudflare KV namespace.
4. Скопировать `wrangler.toml.example` в `wrangler.toml` и вставить KV id и Google Client ID.
5. Добавить secret:

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

6. Задеплоить:

```bash
npx wrangler deploy
```

7. После деплоя обновить `pmk-google-auth-config.json`:

```json
{
  "enabled": true,
  "apiUrl": "https://ВАШ-WORKER.workers.dev",
  "label": "Постоянный вход Google"
}
```

После этого в приложении нужно один раз нажать «Подключить Google». Дальше доступ будет восстанавливаться автоматически.
