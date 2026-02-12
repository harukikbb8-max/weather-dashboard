"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white/90">
            Weather Dashboard
          </h1>
          <p className="text-sm text-white/50">パスワードを入力してください</p>
        </div>

        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                       text-white placeholder:text-white/30 text-sm
                       focus:outline-none focus:border-white/30 transition-colors"
          />

          {error && (
            <p className="text-red-400 text-xs text-center">
              パスワードが正しくありません
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-xl text-sm font-medium
                       bg-white/10 hover:bg-white/15 text-white/90
                       border border-white/10 hover:border-white/20
                       transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "ログイン"}
          </button>
        </div>
      </form>
    </div>
  );
}
