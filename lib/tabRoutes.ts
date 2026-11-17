export type PublicTabId = "track" | "carriers" | "features" | "faq";
export type WorkspaceTabId = "dashboard" | "data" | "batches" | "labels" | "analytics" | "settings" | "profile";

export const PUBLIC_TAB_PATHS: Record<PublicTabId, string> = {
  track: "/",
  carriers: "/",
  features: "/",
  faq: "/",
};

export const WORKSPACE_TAB_PATHS: Record<WorkspaceTabId, string> = {
  dashboard: "/dashboard",
  data: "/consignments",
  batches: "/batches",
  labels: "/labels",
  analytics: "/analytics",
  settings: "/settings",
  profile: "/profile",
};

export interface ResolvedTabRoute {
  view: "single" | "bulk";
  publicTab: PublicTabId;
  workspaceTab: WorkspaceTabId;
  canonicalPath: string;
}

export function resolveRouteFromPathname(pathname: string): ResolvedTabRoute {
  const clean = (pathname || "/").split("?")[0].replace(/\/+$/, "").toLowerCase() || "/";

  switch (clean) {
    case "/carriers":
    case "/couriers":
      return {
        view: "single",
        publicTab: "carriers",
        workspaceTab: "dashboard",
        canonicalPath: "/",
      };
    case "/features":
      return {
        view: "single",
        publicTab: "features",
        workspaceTab: "dashboard",
        canonicalPath: "/",
      };
    case "/faq":
      return {
        view: "single",
        publicTab: "faq",
        workspaceTab: "dashboard",
        canonicalPath: "/",
      };
    case "/dashboard":
      return {
        view: "bulk",
        publicTab: "track",
        workspaceTab: "dashboard",
        canonicalPath: "/dashboard",
      };
    case "/consignments":
    case "/data":
      return {
        view: "bulk",
        publicTab: "track",
        workspaceTab: "data",
        canonicalPath: "/consignments",
      };
    case "/batches":
      return {
        view: "bulk",
        publicTab: "track",
        workspaceTab: "batches",
        canonicalPath: "/batches",
      };
    case "/labels":
      return {
        view: "bulk",
        publicTab: "track",
        workspaceTab: "labels",
        canonicalPath: "/labels",
      };
    case "/analytics":
      return {
        view: "bulk",
        publicTab: "track",
        workspaceTab: "analytics",
        canonicalPath: "/analytics",
      };
    case "/settings":
      return {
        view: "bulk",
        publicTab: "track",
        workspaceTab: "settings",
        canonicalPath: "/settings",
      };
    case "/profile":
      return {
        view: "bulk",
        publicTab: "track",
        workspaceTab: "profile",
        canonicalPath: "/profile",
      };
    case "/":
    case "/track":
    default:
      return {
        view: "single",
        publicTab: "track",
        workspaceTab: "dashboard",
        canonicalPath: "/",
      };
  }
}

export function syncViewCookies(
  view: "single" | "bulk",
  workspaceTab?: WorkspaceTabId
) {
  if (typeof window === "undefined") return;
  try {
    document.cookie = `trackflow_active_view=${view}; path=/; max-age=604800; SameSite=Lax`;
    if (workspaceTab) {
      document.cookie = `trackflow_workspace_tab=${workspaceTab}; path=/; max-age=604800; SameSite=Lax`;
      localStorage.setItem("trackflow_workspace_tab", workspaceTab);
    }
    localStorage.setItem("trackflow_active_view", view);
  } catch {
    // Ignore storage/cookie errors
  }
}

export function silentNavigateTab(targetPath: string, replace: boolean = false) {
  if (typeof window === "undefined") return;
  try {
    const resolved = resolveRouteFromPathname(targetPath);
    syncViewCookies(resolved.view, resolved.workspaceTab);
    const currentPath = window.location.pathname;
    if (currentPath !== targetPath || window.location.search) {
      const nextState = {
        ...(window.history.state || {}),
        __NA: true,
        trackflowTab: targetPath,
      };
      if (replace) {
        window.history.replaceState(nextState, "", targetPath);
      } else {
        window.history.pushState(nextState, "", targetPath);
      }
    }
  } catch {
    // Ignore history API errors in restricted iframe contexts
  }
}

