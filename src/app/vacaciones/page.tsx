import VacationManager from "@/components/VacationManager";
import { getArchitects, getVacations } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VacacionesPage() {
  const [architects, vacations] = await Promise.all([getArchitects(), getVacations()]);
  return <VacationManager architects={architects} vacations={vacations} />;
}
