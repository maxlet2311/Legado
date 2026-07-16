import { AppShell } from "@/components/layout/app-shell";
import { requireActiveUser } from "@/lib/auth/authorization-guards";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireActiveUser();

  return <AppShell profile={profile}>{children}</AppShell>;
}
