import { Suspense } from "react";
import { LoadingScreen } from "@/frontend/ui/loading-screen";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import { AccountForm } from "@/frontend/accounts/account-form";

export default function Home() {
  return <Suspense fallback={<LoadingScreen />}><Content /></Suspense>;
}

async function Content() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/dashboard");
  return <main className="mx-auto my-auto w-full max-w-md p-6"><div className="workspace-panel"><AccountForm /></div></main>;
}
