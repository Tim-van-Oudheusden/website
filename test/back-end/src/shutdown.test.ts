import { describe, expect, test } from "bun:test";
import { once } from "node:events";
import { connect } from "node:net";
import { resolve } from "node:path";

const backEndDir = resolve(import.meta.dir, "../../../back-end");

interface RunningBackEnd {
  child: Bun.Subprocess<"ignore", "pipe", "ignore">;
  port: number;
  /** Resolves once the back-end has logged `text` (awaits the real event, no polling). */
  logged: (text: string) => Promise<void>;
}

/**
 * Start the real back-end entry. stdout is drained for the whole run: a
 * closed pipe would make the back-end's next log write fail with EPIPE.
 */
async function startBackEnd(): Promise<RunningBackEnd> {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const child = Bun.spawn(["bun", "run", "src/index.ts"], {
    cwd: backEndDir,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), LOG_LEVEL: "info" },
    stdout: "pipe",
    stderr: "ignore",
  });

  const decoder = new TextDecoder();
  let output = "";
  const waiters: { text: string; resolve: (value: undefined) => void }[] = [];

  void (async () => {
    for await (const chunk of child.stdout) {
      output += decoder.decode(chunk, { stream: true });

      for (const waiter of waiters.filter(({ text }) => output.includes(text))) {
        waiter.resolve(undefined);
      }
    }
  })();

  const logged = (text: string): Promise<void> => {
    if (output.includes(text)) {
      return Promise.resolve();
    }

    const { promise, resolve } = Promise.withResolvers<undefined>();

    waiters.push({ text, resolve });

    return promise;
  };

  await logged("back-end listening on");

  return { child, port, logged };
}

describe("back-end process", () => {
  // In a container the back-end is PID 1, where the kernel ignores signals the
  // process does not handle: `podman stop` would wait 10 s and SIGKILL (#482).
  // A process that ignores the signal never resolves `exited`; the test timeout
  // then fails it, so no wall-clock race is needed here.
  test.each(["SIGTERM", "SIGINT"] as const)("exits cleanly and promptly on %s", async (signal) => {
    const { child } = await startBackEnd();

    try {
      child.kill(signal);

      expect(await child.exited).toBe(0);
      expect(child.signalCode).toBeNull();
    } finally {
      child.kill("SIGKILL");
    }
  }, 5000);

  test("lets an in-flight request finish before exiting", async () => {
    const { child, port, logged } = await startBackEnd();

    try {
      // A request whose body is only half sent is in flight until the rest arrives.
      const socket = connect(port, "127.0.0.1");

      await once(socket, "connect");
      let response = "";

      socket.on("data", (data: Buffer) => {
        response += data.toString();
      });

      const socketClosed = once(socket, "close");

      socket.write("POST /api/hello HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 2\r\n\r\n{");

      // `write` returning only means the bytes left this process; wait until the
      // server has parsed the headers (body still pending) before signalling (#535).
      await logged("incoming request");
      child.kill("SIGTERM");
      await logged("SIGTERM received");
      socket.write("}");
      await socketClosed;

      expect(response).toMatch(/^HTTP\/1\.1 \d{3} /);
      expect(await child.exited).toBe(0);
    } finally {
      child.kill("SIGKILL");
    }
  }, 5000);
});
