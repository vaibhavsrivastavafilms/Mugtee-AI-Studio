import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("projects")
    .select("*");

  if (error) {
    return NextResponse.json({
      success: false,
      error,
    });
  }

  return NextResponse.json({
    success: true,
    data,
  });
}