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
      let message = "Failed to reach back-end";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  let buttonText = "Say Hello";
  if (loading) {
    buttonText = "Requesting...";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        onClick={() => { void handleClick(); }}
        disabled={loading}
        variant="default"
        size="lg"
      >
        {buttonText}
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
