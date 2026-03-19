import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../lib/cn";

function Textarea({
  className,
  multiline = true,
  numberOfLines = 4,
  placeholderTextColorClassName,
  ...props
}: TextInputProps & {
  placeholderTextColorClassName?: string;
  ref?: React.RefObject<TextInput>;
}) {
  return (
    <TextInput
      className={cn(
        "web:flex min-h-[100px] w-full rounded-2xl border border-app-border bg-white px-4 py-3 text-sm native:text-base text-app-text shadow-sm shadow-black/[0.02] web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-app-primary/20 web:focus-visible:border-app-primary",
        props.editable === false && "opacity-50 web:cursor-not-allowed",
        className
      )}
      placeholderTextColor={props.placeholderTextColor || "#8b95a1"}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
