import { fetchTodaysVaRequests, getVaAuthUser, getVaRole } from "@/lib/va-server";
import VaLoginForm from "./VaLoginForm";
import VaPortal from "./VaPortal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "VA Portal | Millennium CRM",
};

export default async function VaPage() {
  const user = await getVaAuthUser();

  if (!user) {
    return <VaLoginForm />;
  }

  const role = await getVaRole(user.id, user.email);
  if (role !== "va") {
    return <VaLoginForm denied />;
  }

  const { requests, error } = await fetchTodaysVaRequests(user.id);

  return (
    <>
      {error && (
        <div className="bg-navy px-4 pt-4">
          <div className="max-w-5xl mx-auto bg-red-500/10 border border-red-500/40 rounded-xl p-4">
            <p className="text-red-400 font-medium">Could not load today&apos;s queue</p>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
      <VaPortal requests={requests} vaEmail={user.email ?? ""} />
    </>
  );
}
