import * as Slot from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import { View, ViewProps } from "react-native";
import { cn } from "../lib/cn";
import { TextClassContext } from "./text";

const badgeVariants = cva(
  "web:inline-flex items-center rounded-md px-2 py-0.5 border border-transparent web:transition-colors web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-app-border/50 text-app-muted web:hover:opacity-80 active:opacity-80",
        secondary:
          "bg-app-bg border-app-border text-app-muted web:hover:opacity-80 active:opacity-80",
        destructive:
          "bg-tag-rose-bg text-tag-rose-text web:hover:opacity-80 active:opacity-80",
        outline: "border-app-border bg-transparent text-app-text",
        mint: "bg-tag-mint-bg text-tag-mint-text",
        peach: "bg-tag-peach-bg text-tag-peach-text",
        sky: "bg-tag-sky-bg text-tag-sky-text",
        lavender: "bg-tag-lavender-bg text-tag-lavender-text",
        rose: "bg-tag-rose-bg text-tag-rose-text",
        neutral: "bg-tag-neutral-bg text-tag-neutral-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const badgeTextVariants = cva("text-[11px] font-medium tracking-tight", {
  variants: {
    variant: {
      default: "text-app-muted",
      secondary: "text-app-muted",
      destructive: "text-tag-rose-text",
      outline: "text-app-text",
      mint: "text-tag-mint-text",
      peach: "text-tag-peach-text",
      sky: "text-tag-sky-text",
      lavender: "text-tag-lavender-text",
      rose: "text-tag-rose-text",
      neutral: "text-tag-neutral-text",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = ViewProps & {
  asChild?: boolean;
} & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot.View : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
