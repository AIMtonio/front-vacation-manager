import VacationCalendar from "@/components/VacationCalendar";
import { getArchitects, getVacations } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [architects, vacations] = await Promise.all([getArchitects(), getVacations()]);
  return <VacationCalendar architects={architects} vacations={vacations} />;
}
