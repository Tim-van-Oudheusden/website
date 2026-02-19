import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

const VALUE_PILLAR_ITEMS = [
  {
    title: "Mastering Office culture",
    artworkPath: "/images/mastering_office_culture.png",
    description: "Dive deeper into topics about automation, note taking, work & life balance and managing colleague relations.",
  },
  {
    title: "Big Tech independence",
    artworkPath: "/images/big_tech_independence.png",
    description: "Follow an up-to-date blog, featuring open source alternatives, self-hosting and Linux as an operating system.",
  },
  {
    title: "Elevate your capabilities",
    artworkPath: "/images/elevate_your_capabilities.png",
    description: "My personal recommendations for rebooting your life, entering the driver seat and achieving your goals.",
  },
  {
    title: "Managing Stress",
    artworkPath: "/images/managing_stress.png",
    description: "Learn to manage your stress at work and at home, with meditation, writing and focus excercises.",
  },
  {
    title: "Level Up Engineering",
    artworkPath: "/images/level_up_engineering.png",
    description: "Navigate a world dominated by A.i. and agile, and level up with me to become the engineer you want to be.",
  },
] as const;

interface ValuePillarsCarouselProps {
  headingId: string;
  heading: string;
  body: string;
}

export function ValuePillarsCarousel({
  headingId,
  heading,
  body,
}: ValuePillarsCarouselProps): React.JSX.Element {
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const scrollByViewport = React.useCallback((direction: -1 | 1): void => {
    const scroller = scrollerRef.current;
    if (scroller == null) {
      return;
    }

    scroller.scrollBy({
      left: direction * scroller.clientWidth,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-none flex-col items-center gap-8">
      <div className="max-w-3xl text-center">
        <h2 id={headingId} className="font-semibold tracking-tight text-white text-2xl sm:text-3xl">
          {heading}
        </h2>
        <p className="mt-4 leading-relaxed text-white/80">
          {body}
        </p>
      </div>

      <div className="relative w-full">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1/2 left-0 z-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Previous cards"
          onClick={() => { scrollByViewport(-1); }}
        >
          <ChevronLeftIcon className="size-5" />
        </Button>

        <div
          ref={scrollerRef}
          className="overflow-x-auto px-12 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-full snap-x snap-mandatory gap-4">
            {VALUE_PILLAR_ITEMS.map(({ title, artworkPath, description }) => (
              <article key={title} className="basis-full shrink-0 snap-start sm:basis-1/3 lg:basis-1/3">
                <Card className="group relative mx-auto w-3/4 aspect-[3/4] overflow-hidden border-white/30 bg-transparent p-0">
                  <img
                    src={artworkPath}
                    alt={`${title} artwork`}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                  <div className="relative flex h-full items-end overflow-hidden p-6">
                    <div className="w-full transition-[padding] duration-300 group-hover:pb-18">
                      <h3 className="text-xl font-semibold tracking-tight text-white">
                        {title}
                      </h3>
                    </div>
                    <p className="pointer-events-none absolute right-6 bottom-6 left-6 translate-y-[calc(100%+0.75rem)] text-sm leading-relaxed text-white/90 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {description}
                    </p>
                  </div>
                </Card>
              </article>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute top-1/2 right-0 z-10 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Next cards"
          onClick={() => { scrollByViewport(1); }}
        >
          <ChevronRightIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
}
