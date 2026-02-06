import * as React from "react";
import { useState } from "react";
import { ROUTES, type HelloResponse } from "shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";

export function HelloButton(): React.JSX.Element {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await apiGet<HelloResponse>(ROUTES.HELLO);
      setResponse(data.message);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to reach back-end";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        onClick={() => { void handleClick(); }}
        disabled={loading}
        variant="default"
        size="lg"
      >
        {loading ? "Requesting..." : "Say Hello"}
      </Button>

      {response !== null && (
        <Badge variant="secondary" className="text-base px-4 py-1.5">
          {response}
        </Badge>
      )}

      {error !== null && (
        <Badge variant="destructive" className="text-base px-4 py-1.5">
          {error}
        </Badge>
      )}
    </div>
  );
}
