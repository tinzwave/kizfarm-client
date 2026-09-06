"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/kizfarm/supabase-client";
import { getCurrentProfile, isAdminProfile } from "@/lib/kizfarm/supabase-auth";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(signInError.message);

      const profile = await getCurrentProfile();
      if (!isAdminProfile(profile)) {
        await supabase.auth.signOut();
        throw new Error("This account does not have admin access.");
      }
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Admin login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="w-full bg-[#1B6D24] text-white py-2 rounded disabled:opacity-60 flex items-center justify-center gap-2"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin">autorenew</span>
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
          {error && <div className="text-red-600">{error}</div>}
        </form>
      </div>
    </main>
  );
}
