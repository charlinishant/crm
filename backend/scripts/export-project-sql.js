const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');

const prisma = require('../lib/prisma');

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
  return `'${str}'`;
}

function generateInsertSql(tableName, rows) {
  if (!rows || rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const colNames = columns.map((c) => `\`${c}\``).join(', ');

  const valueRows = rows.map((row) => {
    const vals = columns.map((col) => escapeSqlValue(row[col])).join(', ');
    return `(${vals})`;
  });

  const chunks = [];
  const chunkSize = 50;
  for (let i = 0; i < valueRows.length; i += chunkSize) {
    const chunkValues = valueRows.slice(i, i + chunkSize).join(',\n  ');
    chunks.push(`INSERT INTO \`${tableName}\` (${colNames})\nVALUES\n  ${chunkValues}\nON DUPLICATE KEY UPDATE \`id\` = VALUES(\`id\`);`);
  }

  return chunks.join('\n\n');
}

async function exportSql() {
  console.log('Fetching TRIRATNA and SHREE GANESH data from database...');

  // 1. Projects
  const projects = await prisma.project.findMany({
    where: { name: { in: ['TRIRATNA', 'SHREE GANESH'] } },
  });
  const projectIds = projects.map((p) => p.id);
  console.log(`Found ${projects.length} projects (IDs: ${projectIds.join(', ')})`);

  if (projects.length === 0) {
    throw new Error('No projects found with names TRIRATNA or SHREE GANESH.');
  }

  // 2. Towers
  const towers = await prisma.tower.findMany({
    where: { projectId: { in: projectIds } },
  });
  console.log(`Found ${towers.length} towers`);

  // 3. FloorPlans
  const floorPlans = await prisma.floorPlan.findMany({
    where: { projectId: { in: projectIds } },
  });
  const floorPlanIds = floorPlans.map((f) => f.id);
  console.log(`Found ${floorPlans.length} floor plans`);

  // 4. Units
  const units = await prisma.unit.findMany({
    where: { projectId: { in: projectIds } },
  });
  const unitIds = units.map((u) => u.id);
  console.log(`Found ${units.length} unit groups`);

  // 5. UnitModels
  const unitModels = await prisma.unitModel.findMany({
    where: { unitId: { in: unitIds } },
  });
  const unitModelIds = unitModels.map((um) => um.id);
  console.log(`Found ${unitModels.length} unit models`);

  // 6. FloorPlanSlots
  const floorPlanSlots = await prisma.floorPlanSlot.findMany({
    where: { floorPlanId: { in: floorPlanIds } },
  });
  console.log(`Found ${floorPlanSlots.length} floor plan slots`);

  // 7. Bookings
  const bookings = await prisma.booking.findMany({
    where: { unitItemId: { in: unitModelIds } },
  });
  console.log(`Found ${bookings.length} bookings`);

  // 8. Leads
  const leadIds = [...new Set(bookings.map((b) => b.leadId).filter(Boolean))];
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
  });
  console.log(`Found ${leads.length} unique leads`);

  const sqlHeader = `/* ==========================================================================
   SQL DATA DUMP: TRIRATNA & SHREE GANESH ONLY
   Generated on: ${new Date().toISOString()}
   Included Projects: TRIRATNA, SHREE GANESH
   Records:
     - Projects: ${projects.length}
     - Towers: ${towers.length}
     - Floor Plans: ${floorPlans.length}
     - Unit Groups: ${units.length}
     - Unit Models (Flats/Shops): ${unitModels.length}
     - Floor Plan Slots: ${floorPlanSlots.length}
     - Leads: ${leads.length}
     - Bookings: ${bookings.length}
   ========================================================================== */

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- --------------------------------------------------------
-- 1. Projects (TRIRATNA, SHREE GANESH)
-- --------------------------------------------------------
${generateInsertSql('Project', projects)}

-- --------------------------------------------------------
-- 2. Towers (Tower A)
-- --------------------------------------------------------
${generateInsertSql('Tower', towers)}

-- --------------------------------------------------------
-- 3. Floor Plans (FP-1 to FP-20, FP-1 to FP-18)
-- --------------------------------------------------------
${generateInsertSql('FloorPlan', floorPlans)}

-- --------------------------------------------------------
-- 4. Unit Groups
-- --------------------------------------------------------
${generateInsertSql('Unit', units)}

-- --------------------------------------------------------
-- 5. Unit Models (Individual Flats & Shops)
-- --------------------------------------------------------
${generateInsertSql('UnitModel', unitModels)}

-- --------------------------------------------------------
-- 6. Floor Plan Slots
-- --------------------------------------------------------
${generateInsertSql('FloorPlanSlot', floorPlanSlots)}

-- --------------------------------------------------------
-- 7. Leads (Purchasers)
-- --------------------------------------------------------
${generateInsertSql('Lead', leads)}

-- --------------------------------------------------------
-- 8. Bookings (Tentative Associations)
-- --------------------------------------------------------
${generateInsertSql('Booking', bookings)}

-- --------------------------------------------------------
-- Restore session checks
-- --------------------------------------------------------
SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
`;

  const outFiles = [
    path.resolve(__dirname, '..', 'triratna_shree_ganesh_data.sql'),
    path.resolve(__dirname, '..', '..', 'triratna_shree_ganesh_data.sql'),
  ];

  for (const f of outFiles) {
    fs.writeFileSync(f, sqlHeader, 'utf8');
    console.log(`Saved SQL file to: ${f}`);
  }

  const stat = fs.statSync(outFiles[0]);
  console.log(`SQL file generated successfully! Size: ${(stat.size / 1024).toFixed(2)} KB`);
}

exportSql()
  .catch((err) => {
    console.error('Export error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
