import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold text-white mb-2">Policy Not Found</h1>
      <p className="text-gray-400 mb-6">
        This policy does not exist or may have been deleted.
      </p>
      <Link
        href="/policies"
        className="text-accent hover:underline"
      >
        ← Back to Policies
      </Link>
    </div>
  );
}
