import Link from "next/link";

export default function ClientNotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold text-white mb-2">Client not found</h1>
      <p className="text-gray-400 mb-6">This client may have been removed.</p>
      <Link
        href="/clients"
        className="text-accent hover:underline"
      >
        Back to Clients
      </Link>
    </div>
  );
}
