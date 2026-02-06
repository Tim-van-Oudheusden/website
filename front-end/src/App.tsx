import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelloButton } from "@/components/HelloButton";

export function App(): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Website</h1>
      <p className="text-muted-foreground">
        React + TypeScript + Vite + Bun + ShadCN
      </p>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Counter Demo</CardTitle>
          <CardDescription>
            Using ShadCN components with Tailwind CSS v4
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Badge variant="secondary" className="text-lg px-4 py-1">
            Count: {count}
          </Badge>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => { setCount(0); }}>
            Reset
          </Button>
          <Button onClick={() => { setCount((c) => c + 1); }}>Increment</Button>
        </CardFooter>
      </Card>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Back-end Integration</CardTitle>
          <CardDescription>
            Request a greeting from the Fastify back-end
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <HelloButton />
        </CardContent>
      </Card>
    </div>
  );
}
