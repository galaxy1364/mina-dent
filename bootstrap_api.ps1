Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function WriteFile([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  if (Test-Path $path) { throw "STOP: file already exists: $path" }
  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

function BackupIfExists([string]$path) {
  if (Test-Path $path) {
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    Copy-Item $path "$path.bak.$ts" -Force
  }
}

# Sanity: must run at repo root (or at least where compose is expected)
if (!(Test-Path ".") ) { throw "STOP: invalid working directory" }

# 1) docker-compose.yml (db + api)
BackupIfExists "docker-compose.yml"
WriteFile "docker-compose.yml" @"
services:
  db:
    image: postgres:16
    container_name: mina-dent-db
    environment:
      POSTGRES_DB: mina_dent
      POSTGRES_USER: mina
      POSTGRES_PASSWORD: mina_dev_password_change_me
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mina -d mina_dent"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: mina-dent-api
    environment:
      NODE_ENV: development
      PORT: "3001"
      DATABASE_URL: "postgresql://mina:mina_dev_password_change_me@db:5432/mina_dent?schema=public"
      JWT_SECRET: "dev_only_change_me"
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

volumes:
  db_data:
"@

# 2) API app (Fastify + Prisma)
WriteFile "apps/api/Dockerfile" @"
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json
EXPOSE 3001
CMD ["node","dist/index.js"]
"@

WriteFile "apps/api/package.json" @"
{
  "name": "mina-dent-api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "node --watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init",
    "prisma:deploy": "prisma migrate deploy"
  },
  "dependencies": {
    "@prisma/client": "5.19.1",
    "fastify": "4.28.1",
    "fastify-plugin": "4.5.1",
    "jsonwebtoken": "9.0.2",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "prisma": "5.19.1",
    "typescript": "5.5.4"
  }
}
"@

WriteFile "apps/api/package-lock.json" @"
{
  "name": "mina-dent-api",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {}
}
"@

WriteFile "apps/api/tsconfig.json" @"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"]
}
"@

WriteFile "apps/api/prisma/schema.prisma" @"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  phone     String   @unique
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  roles     UserRole[]
}

model Role {
  id        String   @id @default(uuid())
  key       String   @unique
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     UserRole[]
}

model UserRole {
  id        String   @id @default(uuid())
  userId    String
  roleId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
}

model Patient {
  id        String   @id @default(uuid())
  nationalId String? @unique
  phone     String?
  fullName  String
  birthYear Int?
  notes     String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  appointments Appointment[]
}

model Unit {
  id        String   @id @default(uuid())
  title     String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  appointments Appointment[]
}

model Appointment {
  id         String   @id @default(uuid())
  patientId  String
  unitId     String
  startsAt   DateTime
  endsAt     DateTime
  status     String   @default("scheduled") // scheduled|done|cancelled|no_show
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  patient Patient @relation(fields: [patientId], references: [id], onDelete: Restrict)
  unit    Unit    @relation(fields: [unitId], references: [id], onDelete: Restrict)

  @@index([unitId, startsAt])
  @@index([patientId, startsAt])
}
"@

WriteFile "apps/api/src/db.ts" @"
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const prisma = new PrismaClient();
  await prisma.\$connect();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.\$disconnect();
  });
});
"@

WriteFile "apps/api/src/index.ts" @"
import Fastify from 'fastify';
import dbPlugin from './db.js';

const app = Fastify({
  logger: true
});

await app.register(dbPlugin);

app.get('/healthz', async () => {
  return { ok: true };
});

app.get('/patients', async (req, reply) => {
  const patients = await app.prisma.patient.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  return reply.send({ items: patients });
});

app.post('/patients', async (req, reply) => {
  const body = req.body as any;
  if (!body?.fullName || typeof body.fullName !== 'string') {
    return reply.code(400).send({ error: 'fullName_required' });
  }
  const p = await app.prisma.patient.create({
    data: {
      fullName: body.fullName,
      phone: body.phone ?? null,
      nationalId: body.nationalId ?? null,
      birthYear: body.birthYear ?? null,
      notes: body.notes ?? null
    }
  });
  return reply.code(201).send(p);
});

const port = Number(process.env.PORT ?? "3001");
const host = "0.0.0.0";

await app.listen({ port, host });
"@

Write-Host "OK: files created. Next: run docker compose build/up and prisma migrate." -ForegroundColor Green
