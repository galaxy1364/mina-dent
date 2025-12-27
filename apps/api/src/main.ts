import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import * as cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";

function buildCorsOrigins(): string[] {
  const raw = (process.env.CORS_ORIGIN ?? "").trim();

  const fromEnv = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const localDefaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  return Array.from(new Set([...fromEnv, ...localDefaults]));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // Graceful shutdown
  app.enableShutdownHooks();

  // Cookies
  app.use(cookieParser());

  // Validation (امن و تمیز)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // (اختیاری) همه APIها زیر /api
  // app.setGlobalPrefix("api");

  const corsOrigins = buildCorsOrigins();

  // CORS: با credentials نباید origin = "*"
  app.enableCors({
    origin: (origin, cb) => {
      // بعضی درخواست‌ها (مثل curl یا same-origin) origin ندارن
      if (!origin) return cb(null, true);

      if (corsOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // نکته: اگر allowedHeaders رو محدود کنی ممکنه preflight گیر کنه.
 

    // allowedHeaders: ["Content-Type", "Authorization"],
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");

  process.stdout.write(
    `api: listening on ${port}\n` +
      `api: cors origins = ${corsOrigins.join(", ")}\n`
  );
}

bootstrap().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
