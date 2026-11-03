import { NextResponse } from "next/server";
import { deleteVacation } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteVacation(id);
  if (!deleted) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
