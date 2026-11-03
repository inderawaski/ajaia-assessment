import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountForm } from "./account-form";

export default function Home() {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><Content /></Suspense>;
}

async function Content() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/dashboard");
  return <main className="mx-auto w-full max-w-sm p-6"><AccountForm /></main>;
}
