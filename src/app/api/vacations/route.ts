import { NextResponse } from "next/server";
import { createVacation, getVacations, ValidationError } from "@/lib/db";
import type { NewVacation } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getVacations());
}

export async function POST(request: Request) {
  let body: NewVacation;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  try {
    const vacation = await createVacation(body);
    return NextResponse.json(vacation, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
