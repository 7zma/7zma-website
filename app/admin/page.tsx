"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CategoryImageManager } from "@/components/admin/category-image-manager";

export default function AdminPage() {
  const [state, setState] = useState("Checking secure admin access…");
  const [canManage, setCanManage] = useState(false);
  useEffect(() => { let alive = true; const client = createSupabaseBrowserClient();
    if (!client) { setState("Connect Supabase and configure the owner allowlist to activate the admin console."); return; }
    void (async () => {
      const authResult = await client.auth.getUser();
      const user = authResult.data.user;
      if (!user) { if (alive) setState("Sign in with the owner or an approved admin account."); return; }
      const [access, manager] = await Promise.all([
        client.rpc("has_role", { allowed_roles: ["owner", "manager", "support"] }),
        client.rpc("has_role", { allowed_roles: ["owner", "manager"] }),
      ]);
      if (alive) {
        const allowed = !access.error && Boolean(access.data);
        setCanManage(!manager.error && Boolean(manager.data));
        setState(!allowed ? "Admin access is not enabled for this account. MFA at assurance level 2 is required." : "Admin access verified.");
      }
    })(); return () => { alive = false; };
  }, []);
  return <main className="auth-shell admin-page"><Link className="auth-back" href="/">← 7ZMA</Link><section className="auth-card"><p className="eyebrow">PRIVATE CONSOLE</p><h1>Store administration</h1><p role="status">{state}</p><Link className="admin-signin-link" href="/account">Sign in with an approved account</Link><small>Every admin action is protected by role checks, fresh MFA, and an audit trail.</small></section>{canManage && <CategoryImageManager />}</main>;
}
