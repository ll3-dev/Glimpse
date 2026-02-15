import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/src/lib/utils";

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
        "web:flex min-h-[100px] w-full rounded-md border border-app-border bg-white px-3 py-2.5 text-sm native:text-base text-app-text web:ring-offset-background web:focus-visible:outline-none web:focus-visible:ring-1 web:focus-visible:ring-app-primary",
        props.editable === false && "opacity-50 web:cursor-not-allowed",
        className
      )}
      placeholderTextColor={props.placeholderTextColor || "#d3d2d1"}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
