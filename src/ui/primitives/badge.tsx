import * as Slot from "@rn-primitives/slot";
import { cva, type VariantProps } from "class-variance-authority";
import { View, ViewProps } from "react-native";
import { cn } from "@/src/lib/utils";
import { TextClassContext } from "@/src/ui/primitives/text";

const badgeVariants = cva(
  "web:inline-flex items-center rounded-full border border-app-border px-2.5 py-0.5 web:transition-colors web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-app-primary web:hover:opacity-80 active:opacity-80",
        secondary:
          "border-transparent bg-app-bg web:hover:opacity-80 active:opacity-80",
        destructive:
          "border-transparent bg-app-accent web:hover:opacity-80 active:opacity-80",
        outline: "text-app-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const badgeTextVariants = cva("text-[10px] font-bold uppercase tracking-tight ", {
  variants: {
    variant: {
      default: "text-white",
      secondary: "text-app-muted",
      destructive: "text-white",
      outline: "text-app-text",
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
