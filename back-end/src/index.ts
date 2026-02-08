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
}

void start();
