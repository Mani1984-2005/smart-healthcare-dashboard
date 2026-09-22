import prisma from './backend/db.js';

console.log('DB_URL', process.env.DATABASE_URL || 'missing');
const patients = await prisma.patient.findMany({ take: 3, select: { id: true, name: true } });
console.log(JSON.stringify(patients, null, 2));
await prisma.$disconnect();
