import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { MenuIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Articles", href: "/articles" },
  { label: "Projects", href: "/projects" },
];

export function TopBar(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
        <Link to="/" className="text-[1.35rem] font-semibold tracking-tight">
          Website
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" className="h-10 px-4 text-base" asChild>
              <Link to={link.href}>{link.label}</Link>
            </Button>
          ))}
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
                    className="justify-start"
                    asChild
                    onClick={() => { setOpen(false); }}
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
