import { cn } from "cn";
import { MenuIcon } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Articles", href: "/articles" },
  { label: "Projects", href: "/projects" },
];

function isActiveNavPath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopBar(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    function handleScroll(): void {
      setScrolled(window.scrollY > 0);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className="bg-[var(--adw-page-brown-bg)] sticky top-0 z-40 w-full"
      data-scrolled={String(scrolled)}
    >
      <div className="mx-auto flex h-[4.2rem] max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0">
          <img src="/images/logo.svg" alt="Build with Tim" width={156} height={40} className="h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {navLinks.map((link) => {
            const isActive = isActiveNavPath(location.pathname, link.href);

            return (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-10 px-4 text-[18px] font-medium",
                )}
                asChild
              >
                <Link to={link.href} data-active-nav={isActive ? "true" : "false"}>
                  <span
                    data-active-nav-text={isActive ? "true" : "false"}
                    className={cn(
                      "inline-flex border-b-2 border-transparent leading-none pb-[1px]",
                      isActive ? "border-[var(--adw-dark-4)] dark:border-[var(--adw-light-4)]" : "",
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              </Button>
            );
          })}
          <ThemeToggle triggerClassName="size-11" iconClassName="size-5" />
        </nav>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle triggerClassName="size-11" iconClassName="size-5" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11">
                <MenuIcon className="size-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-4">
                {navLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className="justify-start text-[18px] font-medium"
                    asChild
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    <Link to={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
