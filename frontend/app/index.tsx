import { Redirect } from "expo-router";

import { useAuthStore } from "@/store/auth-store";

export default function Index() {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.status !== "ACTIVE") return <Redirect href="/(app)/verification" />;
  return <Redirect href="/(app)/home" />;
}
