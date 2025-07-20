import ui from "@/components/ui";
import { PropsWithChildren, useState } from "react";
import { Calendar } from "react-native-calendars";
import { MarkedDates } from "react-native-calendars/src/types";

interface CalendarProps extends PropsWithChildren {
  className?: string;
  showedAt: number;
  disabledAt: number;
  onChange: (date: string) => void;
}

export default function CalenderSelector({
  className,
  disabledAt,
  onChange,
  showedAt,
  children,
}: CalendarProps) {
  const [dialogVisible, setDialogVisible] = useState(false);

  const showedAtDate = new Date(showedAt);
  const disabledAtDate = new Date(disabledAt);

  const markedDates: MarkedDates = {};

  for (
    let d = new Date(showedAtDate);
    d <= disabledAtDate;
    d.setDate(d.getDate() + 1)
  ) {
    const dateString = d.toISOString().split("T")[0];
    markedDates[dateString] = {
      color: "black",
      textColor: "white",
    };
  }
  markedDates[showedAtDate.toISOString().split("T")[0]] = {
    startingDay: true,
    color: "black",
    textColor: "white",
  };
  markedDates[disabledAtDate.toISOString().split("T")[0]] = {
    endingDay: true,
    color: "black",
    textColor: "white",
  };

  return (
    <ui.AlertDialog
      className={className}
      open={dialogVisible}
      onOpenChange={setDialogVisible}
    >
      <ui.AlertDialog.Trigger asChild>{children}</ui.AlertDialog.Trigger>
      <ui.AlertDialog.Content>
        <ui.AlertDialog.Header>
          <Calendar
            className="w-[calc(80vw)]"
            markingType="period"
            markedDates={markedDates}
            onDayPress={(day) => {
              onChange(day.dateString);
              setDialogVisible(false);
            }}
            minDate={new Date().toISOString().split("T")[0]}
            theme={{
              selectedDayBackgroundColor: "black",
              todayTextColor: "black",
              arrowColor: "black",
              textSectionTitleColor: "black",
              textDayFontFamily: "System",
              textMonthFontFamily: "System",
              textDayHeaderFontFamily: "System",
              textDayFontSize: 16,
              textMonthFontSize: 20,
              textDayHeaderFontSize: 16,
            }}
          />
        </ui.AlertDialog.Header>
        <ui.AlertDialog.Footer className="flex-row justify-between">
          <ui.AlertDialog.Cancel className="flex-1">
            <ui.Text>취소</ui.Text>
          </ui.AlertDialog.Cancel>
        </ui.AlertDialog.Footer>
      </ui.AlertDialog.Content>
    </ui.AlertDialog>
  );
}
