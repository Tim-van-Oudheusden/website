import * as React from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useTheme } from "@/shared/hooks/use-theme";

interface ThemeToggleProps {
  triggerClassName?: string;
  iconClassName?: string;
}

export function ThemeToggle({ triggerClassName, iconClassName }: ThemeToggleProps): React.JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName}>
          <SunIcon className={cn("scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90", iconClassName)} />
          <MoonIcon className={cn("absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0", iconClassName)} />
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
