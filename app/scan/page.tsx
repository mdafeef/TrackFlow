import React from "react";
import { CameraScanClient } from "@/components/CameraScanClient";

interface ScanPageProps {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[]>>;
}

export default async function DedicatedCameraScanPage({
  params,
  searchParams,
}: ScanPageProps) {
  await params;
  await searchParams;

  return <CameraScanClient />;
}
