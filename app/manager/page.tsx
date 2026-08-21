import { requireManagerUser } from "../../lib/auth.server";
import { ManagerClient } from "./manager-client";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const user = await requireManagerUser("/manager");
  return <ManagerClient displayName={user.email} />;
}
