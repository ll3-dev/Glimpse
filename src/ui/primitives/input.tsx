import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/src/lib/utils";

function Input({
  className,
  placeholderTextColorClassName,
  ...props
}: TextInputProps & {
  placeholderTextColorClassName?: string;
  ref?: React.RefObject<TextInput>;
}) {
  return (
    <TextInput
      className={cn(
        "web:flex h-11 native:h-11 web:w-full rounded-md border border-app-border bg-white px-3 web:py-2 text-sm native:text-base text-app-text web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none web:focus-visible:ring-1 web:focus-visible:ring-app-primary web:focus-visible:ring-offset-0",
        props.editable === false && "opacity-50 web:cursor-not-allowed",
        className
      )}
      placeholderTextColor={props.placeholderTextColor || "#d3d2d1"}
      {...props}
    />
  );
}

export { Input };
