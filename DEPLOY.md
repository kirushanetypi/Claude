# Деплой

Продовая сборка — один контейнер с Next.js + Caddy-фронт для TLS, SQLite в volume.

## Что деплоится

- `Dockerfile` — multi-stage node:22-bookworm, полный `node_modules` в runner
- `docker-compose.yml` — два сервиса: `app` (Next.js на 3000 в docker-сети) и `caddy` (80/443, авто-TLS Let's Encrypt)
- `Caddyfile` — reverse proxy на `app:3000`, подставляет `$DOMAIN`
- `entrypoint.sh` — при старте: `drizzle-kit migrate` → опционально `init-admin.ts` → `next start`
- `scripts/init-admin.ts` — создаёт первого юзера если БД пустая и заданы `INITIAL_USER_*`
- `scripts/bootstrap.sh` — one-shot setup: ставит Docker, клонит репу, пишет `.env.production`, поднимает compose

## One-liner на свежем Debian/Ubuntu VPS

```bash
DOMAIN=finance.kirushanetypi.com \
INITIAL_USER_EMAIL=you@example.com \
INITIAL_USER_NAME=Kirill \
INITIAL_USER_PASSWORD='strong-password-here' \
bash <(curl -fsSL https://raw.githubusercontent.com/kirushanetypi/Claude/claude/finance-web-app-50hMJ/scripts/bootstrap.sh)
```

### Что делает bootstrap
1. Ставит Docker и git (если не стоят)
2. Клонит репу в `/opt/finance`
3. Генерирует `AUTH_SECRET = openssl rand -base64 32`
4. Пишет `/opt/finance/.env.production` с правами 600
5. Открывает 80/443 в ufw (если активен)
6. `docker compose --env-file .env.production up -d --build`

Сборка образа на 1 GB RAM занимает ~7-10 минут (Next 16 + Tailwind v4 + 500+ пакетов).

## DNS

A-запись `finance.kirushanetypi.com` → IP VPS. Caddy сам получит TLS-сертификат при первом запросе (проверит HTTP-01 challenge через 80 порт). Если используешь Cloudflare — ставь запись в **DNS-only mode** (proxied=false), иначе Let's Encrypt не сможет достучаться для ACME challenge.

## Дальнейшее управление

```bash
cd /opt/finance

# логи
docker compose logs -f app
docker compose logs -f caddy

# обновить код
git pull && docker compose --env-file .env.production up -d --build

# stop / start
docker compose --env-file .env.production stop
docker compose --env-file .env.production start

# создать доп. юзеров после первого запуска (лимит 5)
docker compose exec app npm run create-user -- --email b@test.ru --name "Имя" --password "pass12345"

# бэкап БД
docker compose exec app sqlite3 /data/app.db ".backup /data/backup-$(date +%F).db"
docker cp finance-app:/data/backup-$(date +%F).db ./backup.db
```

## Переменные окружения

| Переменная | Назначение |
|---|---|
| `DOMAIN` | FQDN; Caddy его слушает, Next валидирует cookies |
| `AUTH_SECRET` | JWT secret (`openssl rand -base64 32`) |
| `AUTH_URL` | обычно `https://$DOMAIN` |
| `AUTH_TRUST_HOST` | `true` за обратным прокси |
| `DATABASE_URL` | путь к sqlite; дефолт `/data/app.db` |
| `INITIAL_USER_EMAIL/NAME/PASSWORD` | создаёт первого юзера при пустой БД |

## Известное

- **Сборка на 1 GB VPS**: подкручивать swap если кончится RAM; ставить `--memory=800m` не стоит, Next лучше пусть жрёт.
- **Лимит 5 юзеров**: жёстко в `scripts/create-user.ts`. Изменить можно в константе `MAX_USERS`.
- **Backup**: `/data` — единственный stateful volume. Бэкапить его регулярно.
