import ui from "@/components/ui";
import { useTheme } from "@react-navigation/native";
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
  const { dark } = useTheme();

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
      color: dark ? "#333" : "#eee",
      textColor: dark ? "#fff" : "#000",
    };
  }
  markedDates[showedAtDate.toISOString().split("T")[0]] = {
    startingDay: true,
    color: dark ? "#333" : "#eee",
    textColor: dark ? "#fff" : "#000",
  };
  markedDates[disabledAtDate.toISOString().split("T")[0]] = {
    endingDay: true,
    color: dark ? "#333" : "#eee",
    textColor: dark ? "#fff" : "#000",
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
              backgroundColor: dark ? "#000" : "#fff",
              calendarBackground: dark ? "#000" : "#fff",
              textSectionTitleColor: dark ? "#fff" : "#000",
              textSectionTitleDisabledColor: dark ? "#000" : "#ccc",
              selectedDayBackgroundColor: dark ? "#000" : "#ccc",
              todayTextColor: dark ? "#fff" : "#000",
              dayTextColor: dark ? "#fff" : "#000",
              arrowColor: dark ? "#fff" : "#000",
              textDisabledColor: dark ? "#555" : "#ccc",
              monthTextColor: dark ? "#fff" : "#000",
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
