import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
