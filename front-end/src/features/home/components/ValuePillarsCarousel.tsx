import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

interface CardTiltCalculationInput {
  pointerX: number;
  pointerY: number;
  width: number;
  height: number;
  maxTiltDegrees?: number;
}

interface CardTiltAngles {
  rotateX: number;
  rotateY: number;
}

function normalizeSignedZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface PagedCarouselScrollInput {
  currentScrollLeft: number;
  direction: -1 | 1;
  cardOffsetLefts: readonly number[];
  viewportWidth: number;
  trackPaddingLeft: number;
}

function findNearestCardIndex(cardOffsetLefts: readonly number[], targetLeft: number): number {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < cardOffsetLefts.length; index += 1) {
    const distance = Math.abs(cardOffsetLefts[index] - targetLeft);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

export function resolvePagedCarouselScrollLeft({
  currentScrollLeft,
  direction,
  cardOffsetLefts,
  viewportWidth,
  trackPaddingLeft,
}: PagedCarouselScrollInput): number {
  if (cardOffsetLefts.length === 0) {
    return currentScrollLeft;
  }

  if (cardOffsetLefts.length === 1) {
    return Math.max(0, cardOffsetLefts[0] - trackPaddingLeft);
  }

  const cardStep = Math.abs(cardOffsetLefts[1] - cardOffsetLefts[0]);
  if (cardStep <= 0) {
    return currentScrollLeft;
  }

  const cardsPerPage = Math.max(1, Math.floor((viewportWidth + 1) / cardStep));
  const currentCardSpaceLeft = currentScrollLeft + trackPaddingLeft;
  const currentIndex = findNearestCardIndex(cardOffsetLefts, currentCardSpaceLeft);
  const targetIndex = clamp(
    currentIndex + (direction * cardsPerPage),
    0,
    cardOffsetLefts.length - 1,
  );

  return Math.max(0, cardOffsetLefts[targetIndex] - trackPaddingLeft);
}

export function calculateCardTiltAngles({
  pointerX,
  pointerY,
  width,
  height,
  maxTiltDegrees = 4,
}: CardTiltCalculationInput): CardTiltAngles {
  if (width <= 0 || height <= 0) {
    return { rotateX: 0, rotateY: 0 };
  }

  const normalizedX = clamp((pointerX / width) * 2 - 1, -1, 1);
  const normalizedY = clamp((pointerY / height) * 2 - 1, -1, 1);

  return {
    rotateX: normalizeSignedZero(-normalizedY * maxTiltDegrees),
    rotateY: normalizeSignedZero(normalizedX * maxTiltDegrees),
  };
}

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

interface ValuePillarItemProps {
  title: string;
  artworkPath: string;
  description: string;
}

function ValuePillarCard({ title, artworkPath, description }: ValuePillarItemProps): React.JSX.Element {
  const [tiltAngles, setTiltAngles] = React.useState<CardTiltAngles>({ rotateX: 0, rotateY: 0 });
  const descriptionRef = React.useRef<HTMLParagraphElement | null>(null);
  const [descriptionHeight, setDescriptionHeight] = React.useState(0);

  const handleMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setTiltAngles(calculateCardTiltAngles({
      pointerX: event.clientX - bounds.left,
      pointerY: event.clientY - bounds.top,
      width: bounds.width,
      height: bounds.height,
    }));
  }, []);

  const handleMouseLeave = React.useCallback((): void => {
    setTiltAngles({ rotateX: 0, rotateY: 0 });
  }, []);

  const updateDescriptionHeight = React.useCallback((): void => {
    const descriptionElement = descriptionRef.current;
    if (descriptionElement == null) {
      return;
    }

    setDescriptionHeight(descriptionElement.scrollHeight);
  }, []);

  React.useEffect(() => {
    updateDescriptionHeight();

    const descriptionElement = descriptionRef.current;
    if (descriptionElement == null) {
      return;
    }

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        updateDescriptionHeight();
      });
      resizeObserver.observe(descriptionElement);
      return () => {
        resizeObserver.disconnect();
      };
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateDescriptionHeight);
      return () => {
        window.removeEventListener("resize", updateDescriptionHeight);
      };
    }
  }, [description, updateDescriptionHeight]);

  return (
    <Card
      className="group relative mx-auto w-3/4 aspect-[3/4] overflow-hidden border-white/30 bg-transparent p-0 shadow-[0_12px_28px_-16px_rgba(0,0,0,0.75)] transition-transform duration-200 ease-out will-change-transform"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(900px) rotateX(${tiltAngles.rotateX}deg) rotateY(${tiltAngles.rotateY}deg)`,
        "--value-pillar-description-height": `${descriptionHeight}px`,
      }}
    >
      <img
        src={artworkPath}
        alt={`${title} artwork`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
      <div className="relative flex h-full flex-col justify-end overflow-hidden p-6">
        <h3 className="text-[1.375rem] sm:text-2xl font-semibold tracking-tight text-white">
          {title}
        </h3>
        <p
          ref={descriptionRef}
          className="pointer-events-none mt-3 overflow-hidden max-h-0 translate-y-1 text-base leading-relaxed text-white/90 opacity-0 transition-[opacity,transform] duration-400 group-hover:max-h-[var(--value-pillar-description-height)] group-hover:translate-y-0 group-hover:opacity-100"
        >
          {description}
        </p>
      </div>
    </Card>
  );
}

interface ValuePillarsCarouselProps {
  headingId: string;
  heading: string;
  body: string;
  inWhiteWell?: boolean;
}

export function ValuePillarsCarousel({
  headingId,
  heading,
  body,
  inWhiteWell = false,
}: ValuePillarsCarouselProps): React.JSX.Element {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const articleRefs = React.useRef<Array<HTMLElement | null>>([]);

  const scrollByViewport = React.useCallback((direction: -1 | 1): void => {
    const scroller = scrollerRef.current;
    if (scroller == null) {
      return;
    }

    const cardOffsetLefts = articleRefs.current
      .map((article) => article?.offsetLeft)
      .filter((offsetLeft): offsetLeft is number => offsetLeft != null);

    let trackPaddingLeft = 0;
    if (typeof window !== "undefined") {
      trackPaddingLeft = Number.parseFloat(window.getComputedStyle(scroller).paddingLeft) || 0;
    }

    const targetLeft = resolvePagedCarouselScrollLeft({
      currentScrollLeft: scroller.scrollLeft,
      direction,
      cardOffsetLefts,
      viewportWidth: scroller.clientWidth,
      trackPaddingLeft,
    });

    scroller.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-none flex-col items-center gap-8">
      <div className="max-w-3xl text-center">
        <h2
          id={headingId}
          className={cn(
            "font-semibold tracking-tight text-[1.75rem] sm:text-[2rem]",
            inWhiteWell ? "text-[var(--adw-dark-4)]" : "text-white",
          )}
        >
          {heading}
        </h2>
        <p
          className={cn(
            "mx-auto mt-4 max-w-[65ch] text-base sm:text-lg leading-relaxed",
            inWhiteWell ? "text-[var(--adw-dark-2)]" : "text-white/80",
          )}
        >
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
          className="overflow-x-auto px-12 pt-1.5 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-full snap-x snap-mandatory gap-4">
            {VALUE_PILLAR_ITEMS.map(({ title, artworkPath, description }, index) => (
              <article
                key={title}
                ref={(element) => { articleRefs.current[index] = element; }}
                className="basis-full shrink-0 snap-start sm:basis-1/3 lg:basis-1/3"
              >
                <ValuePillarCard title={title} artworkPath={artworkPath} description={description} />
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
