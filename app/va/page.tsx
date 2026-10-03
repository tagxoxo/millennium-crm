import {
  fetchCancelOutreach,
  fetchInboundLeads,
  fetchTodaysVaRequests,
  getVaAuthUser,
  getVaRole,
} from "@/lib/va-server";
import VaLoginForm from "./VaLoginForm";
import VaPortal from "./VaPortal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "VA Portal | Millennium CRM",
};

export default async function VaPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const user = await getVaAuthUser();

  if (!user) {
    return <VaLoginForm />;
  }

  const role = await getVaRole(user.id, user.email);
  if (role !== "va") {
    return <VaLoginForm denied />;
  }

  const [
    { requests, error },
    { rows: cancels, error: cancelError },
    { rows: inbound, error: inboundError },
  ] = await Promise.all([
    fetchTodaysVaRequests(user.id),
    fetchCancelOutreach(),
    fetchInboundLeads(),
  ]);

  const loadError = error ?? cancelError ?? inboundError;
  const initialTab =
    searchParams.tab === "cancels"
      ? "cancels"
      : searchParams.tab === "inbound"
        ? "inbound"
        : "requests";

  return (
    <>
      {loadError && (
        <div className="bg-navy px-4 pt-4 lg:pr-[336px]">
          <div className="max-w-5xl mx-auto bg-red-500/10 border border-red-500/40 rounded-xl p-4">
            <p className="text-red-400 font-medium">Could not load today&apos;s queue</p>
            <p className="text-red-300/80 text-sm mt-1">{loadError}</p>
          </div>
        </div>
      )}
      <VaPortal
        requests={requests}
        cancels={cancels}
        inbound={inbound}
        vaEmail={user.email ?? ""}
        initialTab={initialTab}
      />
    </>
  );
}
