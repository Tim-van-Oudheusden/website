import * as React from "react";

export function HomePage(): React.JSX.Element {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome</h1>
      <p className="text-muted-foreground max-w-prose text-center text-lg">
        This is the home page. Content coming soon.
      </p>
    </main>
  );
}
