import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "./.env") });

const prisma = new PrismaClient();

async function run() {
  console.log("Inspecting database users and organization subscriptions...");
  try {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscriptions: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((u) => {
      console.log(`- User: ${u.name} (${u.email}) [ID: ${u.id}]`);
      console.log(`  Memberships count: ${u.memberships.length}`);
      u.memberships.forEach((m) => {
        console.log(`    - Org: ${m.organization.name} [ID: ${m.organizationId}] Role: ${m.role}`);
        console.log(`      Subscriptions count: ${m.organization.subscriptions.length}`);
        m.organization.subscriptions.forEach((s) => {
          console.log(`        - Plan: ${s.plan} Status: ${s.status} [ID: ${s.id}] StripeSubId: ${s.stripeSubscriptionId} RazorpaySubId: ${s.razorpaySubscriptionId}`);
        });
      });
    });

  } catch (err: any) {
    console.error("Database query failed:", err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
