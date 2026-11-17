import { cookies } from "next/headers";
import { TrackingAppClient } from "@/components/TrackingAppClient";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/authSession";
import {
  resolveRouteFromPathname,
  WorkspaceTabId,
} from "@/lib/tabRoutes";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const VALID_WORKSPACE_TABS = new Set<WorkspaceTabId>([
  "dashboard",
  "data",
  "batches",
  "labels",
  "analytics",
  "settings",
  "profile",
]);

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const cookieStore = await cookies();

  // 1. Verify authenticated user on the server so BulkDashboard renders on SSR frame 0
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const initialAuthUser = verifySessionToken(sessionToken);

  // 2. Resolve route from Next.js rewrite parameter (__tf_path) or active view cookie
  const rawRewrittenPath =
    typeof resolvedParams.__tf_path === "string"
      ? resolvedParams.__tf_path
      : Array.isArray(resolvedParams.__tf_path)
      ? resolvedParams.__tf_path[0]
      : undefined;

  const savedViewCookie = cookieStore.get("trackflow_active_view")?.value;
  const savedWorkspaceTabCookie = cookieStore.get("trackflow_workspace_tab")
    ?.value as WorkspaceTabId | undefined;

  let initialView: "single" | "bulk" = "single";
  let initialPublicTab = resolveRouteFromPathname("/").publicTab;
  let initialWorkspaceTab: WorkspaceTabId =
    savedWorkspaceTabCookie && VALID_WORKSPACE_TABS.has(savedWorkspaceTabCookie)
      ? savedWorkspaceTabCookie
      : "dashboard";

  if (rawRewrittenPath) {
    const route = resolveRouteFromPathname(rawRewrittenPath);
    initialView = route.view;
    initialPublicTab = route.publicTab;
    initialWorkspaceTab = route.workspaceTab;
  } else if (savedViewCookie === "bulk") {
    initialView = "bulk";
  }

  return (
    <TrackingAppClient
      initialView={initialView}
      initialPublicTab={initialPublicTab}
      initialWorkspaceTab={initialWorkspaceTab}
      initialAuthUser={initialAuthUser}
    />
  );
}
