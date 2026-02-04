import { getGlobalVariables } from "@/lib/actions/variables";
import { GlobalsView } from "@/components/globals-view";

export default async function GlobalsPage() {
  const globals = await getGlobalVariables();
  return <GlobalsView globals={globals} />;
}
