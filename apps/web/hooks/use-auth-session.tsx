import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export const useAuthSession = () => {
  const { data, isPending } = authClient.useSession();

  if (!isPending && !data) {
    return redirect("/auth");
  }

  return { data };
};
