import Fastify from "fastify";
const app = Fastify({ logger: true });

app.get("/healthz", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? "3001");
const host = "0.0.0.0";

app.listen({ port, host })
  .then(() => app.log.info(`listening on ${host}:${port}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
