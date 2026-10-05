import type { JSX } from "react";

import type { HelloResponse } from "shared";
import { ROUTES } from "shared";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useApiGet } from "@/shared/hooks/use-api-get";

interface HelloButtonViewProps {
  loading: boolean;
  message: string | null;
  error: string | null;
  onActivate: () => void;
}

/** Presentational shell: renders the loading/data/error tri-state from props. */
export function HelloButtonView({
  loading,
  message,
  error,
  onActivate,
}: HelloButtonViewProps): JSX.Element {
  let buttonText = "Say Hello";

  if (loading) {
    buttonText = "Requesting...";
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={onActivate} disabled={loading} variant="default" size="lg">
        {buttonText}
      </Button>

      {message !== null && (
        <Badge variant="secondary" className="text-base px-4 py-1.5">
          {message}
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

export function HelloButton(): JSX.Element {
  const { status, data, error, refetch } = useApiGet<HelloResponse>(ROUTES.HELLO);

  return (
    <HelloButtonView
      loading={status === "loading"}
      message={data?.message ?? null}
      error={error}
      onActivate={() => {
        void refetch();
      }}
    />
  );
}
