# Запуск постоянного Google-входа без Windows

Можно сделать с телефона или любого браузера через Cloudflare Dashboard.

## 1. Создать Worker

1. Откройте Cloudflare Dashboard.
2. Workers & Pages → Create application → Worker.
3. Имя: `pmk-google-auth`.
4. Откройте Edit code.
5. Вставьте код из файла `google-auth-worker/src/index.js`.
6. Deploy.

## 2. Добавить переменные Worker

В настройках Worker откройте Settings → Variables and Secrets.

Добавьте обычные переменные:

```text
GOOGLE_CLIENT_ID=590025911241-pcl02les7r12l6stk1mb4aesdv294nba.apps.googleusercontent.com
APP_ORIGIN=https://kivme1984.github.io
APP_PATH=/pmk-calendar/
SESSION_DAYS=365
```

Добавьте секреты:

```text
GOOGLE_CLIENT_SECRET=секрет из Google OAuth Client
TOKEN_ENCRYPTION_KEY=32-байтный base64url ключ
STATE_HMAC_KEY=любой длинный случайный секрет
```

Для `TOKEN_ENCRYPTION_KEY` можно временно использовать генератор Base64URL 32 bytes. Главное: значение должно декодироваться ровно в 32 байта.

## 3. Добавить Redirect URI в Google

После деплоя Worker будет иметь адрес вида:

```text
https://pmk-google-auth.ИМЯ.workers.dev
```

В Google Cloud Console → APIs & Services → Credentials → OAuth Client добавьте Authorized redirect URI:

```text
https://pmk-google-auth.ИМЯ.workers.dev/auth/callback
```

## 4. Включить постоянный вход на сайте

В файле `pmk-google-auth-config.json` нужно поставить:

```json
{
  "enabled": true,
  "apiUrl": "https://pmk-google-auth.ИМЯ.workers.dev",
  "label": "Постоянный вход Google"
}
```

После публикации откройте:

```text
https://kivme1984.github.io/pmk-calendar/reset.html?test=82-20&release=persistent-google-auth
```

В приложении нажмите «Подключить Google» один раз.
