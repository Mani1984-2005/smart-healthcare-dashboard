import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

try {
  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  const prisma = new PrismaClient({ adapter });
  console.log("prisma client created");

  const patients = await prisma.patient.findMany();
  console.log(patients);
} catch (e) {
  console.error("ERROR", e);
}
