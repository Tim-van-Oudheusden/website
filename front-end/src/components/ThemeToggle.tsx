import * as React from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle(): React.JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <SunIcon className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { setTheme("light"); }}>
          <SunIcon className="mr-2 size-4" />
          Light
          {theme === "light" && <span className="text-muted-foreground ml-auto text-xs">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTheme("dark"); }}>
          <MoonIcon className="mr-2 size-4" />
          Dark
          {theme === "dark" && <span className="text-muted-foreground ml-auto text-xs">Active</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTheme("system"); }}>
          <MonitorIcon className="mr-2 size-4" />
          System
          {theme === "system" && <span className="text-muted-foreground ml-auto text-xs">Active</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
