# Постоянный вход Google

Worker получает offline-доступ к Google Calendar и автоматически выдаёт приложению свежий access token при каждом запуске.

Запуск:
1. В корне проекта откройте `install-persistent-google-auth.bat`.
2. Подтвердите вход Cloudflare.
3. Введите Google OAuth Client Secret локально в PowerShell.
4. Добавьте показанный адрес `/auth/callback` в Authorized redirect URIs клиента Google OAuth.
5. Опубликуйте обновлённый `pmk-google-auth-config.json`.

Чувствительные значения сохраняются в Cloudflare и не коммитятся в GitHub.
