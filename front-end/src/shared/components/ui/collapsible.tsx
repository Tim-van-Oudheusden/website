import { cn } from "cn";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type { ComponentProps } from "react";

function Collapsible({
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

/** Opens and closes over Radix's measured height (tw-animate-css, 200ms ease-out); instant under reduced motion. */
function CollapsibleContent({
  className,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden motion-safe:data-[state=open]:animate-collapsible-down motion-safe:data-[state=closed]:animate-collapsible-up",
        className,
      )}
      {...props}
    />
  );
}

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
};
