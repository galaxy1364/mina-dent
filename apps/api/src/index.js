import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

// 1) origin هایی که اجازه داریم
const corsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// 2) CORS را روشن کن
await app.register(cors, {
  origin: (origin, cb) => {
    // بعضی درخواست‌ها origin ندارن (مثل curl/postman)
    if (!origin) return cb(null, true);

    if (corsOrigins.includes(origin)) return cb(null, true);

    cb(new Error("CORS blocked: " + origin), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.get("/healthz", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? "3001");
const host = "0.0.0.0";

app.listen({ port, host })
  .then(() => app.log.info(`listening on ${host}:${port}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
