import { redirect } from "next/navigation";

/** Alias so VA role checks can send non-VA users to the CRM dashboard. */
export default function DashboardAliasPage() {
  redirect("/");
}
