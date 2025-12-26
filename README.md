# mina-dent (bootstrap)

## Run locally (Windows)
1) Install:
- Node.js LTS (22+)
- Docker Desktop

2) Start database:
```powershell
docker compose up -d
```

3) Install dependencies:
```powershell
npm ci
```

4) Setup API env:
Copy:
- `apps/api/.env.example` -> `apps/api/.env`

5) Prepare DB:
```powershell
npm -w apps/api run db:generate
npm -w apps/api run db:push
```

6) Seed admin:
```powershell
npm -w apps/api run build:seed
node apps/api/dist/seed.js
```

7) Run dev:
```powershell
npm run dev
```

Open:
- Web: http://localhost:3000
- API: http://localhost:3001
