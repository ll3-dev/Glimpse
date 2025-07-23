import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Button,
  buttonTextVariants,
  buttonVariants,
} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text, TextClassContext } from "@/components/ui/text";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { View } from "@/components/ui/view";
import { Badge, badgeTextVariants, badgeVariants } from "@/components/ui/badge";

const ui = {
  View,
  Button: Object.assign(Button, {
    buttonTextVariants,
    buttonVariants,
  }),
  Input,
  Text: Object.assign(Text, {
    TextClassContext,
  }),
  AlertDialog: Object.assign(AlertDialog, {
    Action: AlertDialogAction,
    Cancel: AlertDialogCancel,
    Content: AlertDialogContent,
    Description: AlertDialogDescription,
    Footer: AlertDialogFooter,
    Header: AlertDialogHeader,
    Overlay: AlertDialogOverlay,
    Portal: AlertDialogPortal,
    Title: AlertDialogTitle,
    Trigger: AlertDialogTrigger,
  }),
  Card: Object.assign(Card, {
    Content: CardContent,
    Description: CardDescription,
    Footer: CardFooter,
    Header: CardHeader,
    Title: CardTitle,
  }),
  Separator,
  Textarea,
  ToolTip: Object.assign(Tooltip, {
    Content: TooltipContent,
    Trigger: TooltipTrigger,
  }),
  Badge: Object.assign(Badge, {
    badgeTextVariants,
    badgeVariants,
  }),
};

export default ui;
