import { Suspense } from "react";
import Verify2FaForm from "./Verify2FaForm";

export default function Verify2FaPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <Verify2FaForm />
    </Suspense>
  );
}
