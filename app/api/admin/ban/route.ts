import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isOrganizer } from "@/lib/auth/organizer";
import { getCurrentUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
export const dynamic="force-dynamic";
type Body={userSub?:string;reason?:string};
export async function POST(request:Request){const organizer=await getCurrentUser();if(!isOrganizer(organizer))return NextResponse.json({error:"not found"},{status:404});let body:Body;try{body=(await request.json()) as Body}catch{return NextResponse.json({error:"unreadable"},{status:400})}const userSub=body.userSub?.trim();const reason=body.reason?.trim();if(!userSub)return NextResponse.json({message:"Choose a maker first."},{status:422});if(!reason||reason.length<5||reason.length>500)return NextResponse.json({message:"Give a clear misconduct reason (5–500 characters)."},{status:422});if(userSub===organizer.sub)return NextResponse.json({message:"You cannot ban your own organizer account."},{status:422});const db=getDb();const [target]=await db.select({sub:users.sub,email:users.email,bannedAt:users.bannedAt}).from(users).where(eq(users.sub,userSub)).limit(1);if(!target)return NextResponse.json({message:"Maker not found."},{status:404});if(target.bannedAt)return NextResponse.json({message:"That account is already banned."},{status:409});await db.update(users).set({bannedAt:sql`now()`,banReason:reason}).where(and(eq(users.sub,target.sub),eq(users.email,target.email)));return NextResponse.json({ok:true});}