import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchUserData, createOrderRecord, updateUserSpentBeans } from "@/lib/airtable";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items, customNotes } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items selected" }, { status: 400 });
    }

    const userData = await fetchUserData(session.email);

    const totalBeans = items.reduce(
      (sum: number, item: { costBeans: number; quantity: number }) =>
        sum + item.costBeans * item.quantity,
      0
    );

    const totalHours = items.reduce(
      (sum: number, item: { costHours: number; quantity: number }) =>
        sum + item.costHours * item.quantity,
      0
    );

    if (totalBeans > userData.coffeeBeans && totalHours > userData.approvedHours) {
      return NextResponse.json(
        { error: "Insufficient balance to place this order." },
        { status: 400 }
      );
    }

    // 1. Create the order record in Airtable
    const result = await createOrderRecord({
      userEmail: session.email,
      items,
      totalHours,
      totalBeans,
      customNotes,
    });

    // 2. Safely add totalBeans to live 'Coffee Beans Spent' in Airtable
    if (userData.userRecordId && totalBeans > 0) {
      await updateUserSpentBeans(userData.userRecordId, totalBeans);
    }

    return NextResponse.json({ success: true, orderId: result.records?.[0]?.id });
  } catch (err: any) {
    console.error("Order API Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
