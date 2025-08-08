import React from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  required: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ required, requireAll = false, fallback = null, children }: PermissionGateProps) {
  const { isLoading, hasPermission } = usePermissions();

  if (isLoading) return null; // let parent show its own loading
  if (!hasPermission(required, requireAll)) return <>{fallback}</>;
  return <>{children}</>;
}
