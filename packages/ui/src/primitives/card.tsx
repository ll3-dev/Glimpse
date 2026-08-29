import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Text, TextProps, View, ViewProps } from "react-native";
import { TextClassContext } from "./text";
import { cn } from "../lib/cn";

const cardVariants = cva("border bg-app-surface", {
  variants: {
    variant: {
      default: "rounded-xl border-app-border",
      muted: "rounded-xl border-transparent bg-app-bg",
      elevated: "rounded-2xl border-app-border shadow-sm shadow-black/5",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Card({
  variant,
  className,
  ...props
}: ViewProps & {
  ref?: React.RefObject<View>;
} & VariantProps<typeof cardVariants>) {
  return (
    <View
      className={cn(
        cardVariants({ variant }),
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: ViewProps & {
  ref?: React.RefObject<View>;
}) {
  return (
    <View
      className={cn("flex flex-col space-y-1 p-4", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: TextProps & {
  ref?: React.RefObject<Text>;
}) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn(
        "text-base text-app-text font-semibold leading-tight tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: TextProps & {
  ref?: React.RefObject<Text>;
}) {
  return (
    <Text
      className={cn("text-xs text-app-muted font-medium", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: ViewProps & {
  ref?: React.RefObject<View>;
}) {
  return (
    <TextClassContext.Provider value="text-app-text">
      <View className={cn("p-4 pt-0", className)} {...props} />
    </TextClassContext.Provider>
  );
}

function CardFooter({
  className,
  ...props
}: ViewProps & {
  ref?: React.RefObject<View>;
}) {
  return (
    <View
      className={cn("flex flex-row items-center p-4 pt-0", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
export { cardVariants };
