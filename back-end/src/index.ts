import { APP_NAME } from "shared";
import { buildApp } from "./app";
import { getServerConfig } from "./core/server-config";

const { host: HOST, port: PORT } = getServerConfig(process.env);

async function start(): Promise<void> {
  const appOptions: {
    logger: { level: string };
    contentDir?: string;
  } = {
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
    },
  };

  const contentDir = process.env["CONTENT_DIR"];
  if (contentDir !== undefined) {
    appOptions.contentDir = contentDir;
  }

  const app = await buildApp(appOptions);

  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`${APP_NAME} back-end listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // In the container this process is PID 1, where the kernel ignores signals we
  // don't handle: `podman stop` would wait 10 s and SIGKILL (#482). Close
  // Fastify (in-flight requests finish, no new ones are accepted), then exit.
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      app.log.info(`${signal} received, shutting down`);
      app.close().then(
        () => process.exit(0),
        (err: unknown) => {
          app.log.error(err);
          process.exit(1);
        },
      );
    });
  }
}

void start();
