import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import * as cookieParser from "cookie-parser";

function buildCorsOrigins(): string[] {
  // 1) اگر env داده شده بود، همون رو هم قبول می‌کنیم
  const raw = (process.env.CORS_ORIGIN ?? "").trim();

  // اجازه می‌دیم کاربر چندتا origin بده: با کاما جدا کند
  const fromEnv = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // 2) برای لوکال حتماً هر دو حالت localhost و 127.0.0.1 را داریم
  const localDefaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  // 3) یکتا سازی
  return Array.from(new Set([...fromEnv, ...localDefaults]));
}

async function bootstrap() {
  // cors را اینجا خاموش می‌گذاریم و بعد با enableCors روشن می‌کنیم (واضح و کنترل‌شده)
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(cookieParser());

  const corsOrigins = buildCorsOrigins();

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
