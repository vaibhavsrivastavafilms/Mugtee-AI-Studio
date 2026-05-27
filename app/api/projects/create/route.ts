import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          title: body.title,
          prompt: body.prompt,
          platform: body.platform || "instagram",
          category: body.category || "cinematic",
        },
      ])
      .select();

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
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}