# Deploying to a VPS

This app is a single Node.js process (serving both the API and the built
React client) backed by a SQLite file — there's no separate database server
to install. This guide covers a standard Ubuntu 22.04 VPS with Nginx in front
for TLS/domain handling.

## 1. Server prep

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx ufw
```

Install Node.js LTS (via NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # confirm v20+
```

Create a dedicated non-root user to run the app (optional but recommended):

```bash
sudo adduser --disabled-password --gecos "" secondary
sudo su - secondary
```

## 2. Get the code

```bash
git clone https://github.com/soulreaper767/secondary.git
cd secondary
npm install
```

## 3. Configure environment

```bash
cp server/.env.example server/.env
nano server/.env
```

Set at minimum:
- `JWT_SECRET` — a long random string (`openssl rand -base64 48`), **never
  reuse the dev default**.
- `DATABASE_URL="file:./prod.db"` (or wherever you want the SQLite file to
  live — keep it outside any directory that gets wiped on redeploy).
- `PORT=4000` (or whatever you'll reverse-proxy to).
- `NODE_ENV=production`.
- `CLIENT_ORIGIN` isn't used in production (the app serves same-origin), but
  leave it set for local reference.

## 4. Build & migrate

```bash
npm run build              # builds client, then server (incl. prisma generate)
npm run db:migrate -w server   # applies migrations to the production DB (prisma migrate deploy)
npm run db:seed -w server      # OPTIONAL: only on first deploy, seeds demo data
```

For a real rollout you'll likely skip `db:seed` (it's demo data) and instead
create your real Admin user directly, e.g. via a one-off script or by
temporarily seeding then deleting the demo accounts from **Admin → Users**.

## 5. Run it under PM2

```bash
sudo npm install -g pm2
cd ~/secondary
pm2 start server/dist/index.js --name secondary-sales
pm2 save
pm2 startup   # follow the printed instructions to enable boot startup
```

Useful commands: `pm2 logs secondary-sales`, `pm2 restart secondary-sales`,
`pm2 status`.

## 6. Nginx reverse proxy + HTTPS

`/etc/nginx/sites-available/secondary`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10m;   # retailer image uploads
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/secondary /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Add HTTPS with certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Only Nginx (80/443) and SSH need to be open — the Node process on 4000 stays
internal.

## 8. Backups

The entire database is one SQLite file (`server/prod.db` or wherever you
pointed `DATABASE_URL`). Back it up with a simple cron job:

```bash
# /etc/cron.d/secondary-backup
0 2 * * * secondary sqlite3 /home/secondary/secondary/server/prod.db ".backup /home/secondary/backups/secondary-$(date +\%F).db"
```

Also back up `server/src/uploads/` (retailer images) — it's plain files, so
`rsync` or a tarball on the same cron cadence works fine. Keep backups
off-box (S3, another host, etc.) for anything that matters.

## 9. Updating / redeploying

```bash
cd ~/secondary
git pull
npm install
npm run build
npm run db:migrate -w server
pm2 restart secondary-sales
```

## 10. Outgrowing SQLite

If you reach heavier concurrent write load than SQLite comfortably handles,
switching to PostgreSQL only requires:

1. Change `provider = "sqlite"` to `provider = "postgresql"` in
   `server/prisma/schema.prisma`.
2. Point `DATABASE_URL` at your Postgres instance.
3. Re-run `prisma migrate deploy` against the new database (you'll need a
   fresh migration history generated against Postgres — Prisma's SQL dialect
   differs slightly between the two).

Everything else (routes, business logic, the client) is unaffected — Prisma
abstracts the database layer.
