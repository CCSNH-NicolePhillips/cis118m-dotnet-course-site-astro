import fs from "node:fs";
import path from "node:path";

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === ',') {
        out.push(current);
        current = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }

  out.push(current);
  return out;
}

function toNumberOrNull(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : null;
}

function parseArgs(argv) {
  const args = {
    file: null,
    compareFile: null,
    student: null,
    match: null,
    showAllZeroColumns: true,
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!args.file && !token.startsWith("--")) {
      args.file = token;
      continue;
    }

    if (token === "--student") {
      args.student = argv[++i] ?? null;
      continue;
    }

    if (token === "--match") {
      args.match = argv[++i] ?? null;
      continue;
    }

    if (token === "--compare") {
      args.compareFile = argv[++i] ?? null;
      continue;
    }

    if (token === "--no-all-zero") {
      args.showAllZeroColumns = false;
      continue;
    }

    throw new Error(`Unknown arg: ${token}`);
  }

  if (!args.file) {
    throw new Error(
      "Usage: node scripts/audit-canvas-export.mjs <export.csv> [--compare other.csv] [--student \"Last, First\"] [--match \"Week 7\"]"
    );
  }

  if (args.compareFile && args.student) {
    throw new Error("Use either --compare or --student (not both).");
  }

  if (args.compareFile && !String(args.compareFile).trim()) {
    throw new Error("--compare requires a filename.");
  }

  return args;
}

function normalizeCell(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.toUpperCase() === "EX") return "EX";
  const n = Number(trimmed);
  if (Number.isFinite(n)) return n;
  return trimmed;
}

function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(process.cwd(), args.file);
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);

  if (lines.length < 3) {
    throw new Error("CSV is too small to be a Canvas gradebook export.");
  }

  const header = parseCsvLine(lines[0]);
  const pointsRow = parseCsvLine(lines[1]);

  const pointsLabel = (pointsRow[0] ?? "").trim();
  if (!/points\s+possible/i.test(pointsLabel)) {
    throw new Error(
      `Second row does not look like a Canvas 'Points Possible' row (got: ${JSON.stringify(pointsRow[0])}).`
    );
  }

  const identityCols = new Set(["Student", "ID", "SIS User ID", "SIS Login ID", "Section"]);
  const identityIndexes = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => identityCols.has(h))
    .map(({ i }) => i);

  const assignmentIndexes = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !identityCols.has(h));

  const students = lines.slice(2).map(parseCsvLine);

  if (args.compareFile) {
    const otherPath = path.resolve(process.cwd(), args.compareFile);
    const otherText = fs.readFileSync(otherPath, "utf8");
    const otherLines = otherText.split(/\r?\n/).filter((l) => l.length > 0);
    const otherHeader = parseCsvLine(otherLines[0]);
    const otherStudents = otherLines.slice(2).map(parseCsvLine);

    const matcher = args.match ? new RegExp(args.match, "i") : null;

    const thisAssignCols = header
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !identityCols.has(h));
    const otherAssignCols = otherHeader
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => !identityCols.has(h));

    const onlyThis = thisAssignCols.filter((c) => !otherHeader.includes(c.h)).map((c) => c.h);
    const onlyOther = otherAssignCols.filter((c) => !header.includes(c.h)).map((c) => c.h);
    const common = thisAssignCols
      .filter((c) => otherHeader.includes(c.h))
      .filter((c) => (!matcher ? true : matcher.test(c.h)));

    const thisByStudent = new Map(students.map((r) => [String(r[0] ?? "").trim(), r]));
    const otherByStudent = new Map(otherStudents.map((r) => [String(r[0] ?? "").trim(), r]));
    const commonStudents = [...thisByStudent.keys()].filter((k) => otherByStudent.has(k));

    console.log(`Compare: ${path.basename(filePath)}  <->  ${path.basename(otherPath)}`);
    console.log(`Common students: ${commonStudents.length}`);
    console.log(`Columns only in left: ${onlyThis.length}`);
    if (onlyThis.length) console.log(`  ${onlyThis.join(", ")}`);
    console.log(`Columns only in right: ${onlyOther.length}`);
    if (onlyOther.length) console.log(`  ${onlyOther.join(", ")}`);

    let totalDiffs = 0;
    const examples = [];
    for (const c of common) {
      const otherIdx = otherHeader.indexOf(c.h);
      let colDiffs = 0;
      for (const studentName of commonStudents) {
        const leftRow = thisByStudent.get(studentName);
        const rightRow = otherByStudent.get(studentName);
        const left = normalizeCell(leftRow?.[c.i]);
        const right = normalizeCell(rightRow?.[otherIdx]);
        const same = left === right;
        if (!same) {
          colDiffs++;
          if (examples.length < 25) {
            examples.push({ studentName, column: c.h, left, right });
          }
        }
      }
      if (colDiffs > 0) {
        totalDiffs += colDiffs;
        console.log(`Changed: ${c.h} (${colDiffs} students)`);
      }
    }

    console.log("");
    console.log(`Total changed cells (common cols): ${totalDiffs}`);
    if (examples.length) {
      console.log("Sample diffs (up to 25):");
      for (const e of examples) {
        console.log(`  - ${e.studentName} | ${e.column}: ${String(e.left)} -> ${String(e.right)}`);
      }
    }

    return;
  }

  const colStats = assignmentIndexes.map(({ h, i }) => {
    const pointsPossible = toNumberOrNull(pointsRow[i]);

    let nonEmpty = 0;
    let numericCount = 0;
    let zeroCount = 0;
    let max = null;
    let excusedCount = 0;

    for (const row of students) {
      const raw = (row[i] ?? "").trim();
      if (!raw) continue;
      nonEmpty++;

      if (raw.toUpperCase() === "EX") {
        excusedCount++;
        continue;
      }

      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      numericCount++;
      if (n === 0) zeroCount++;
      if (max === null || n > max) max = n;
    }

    return {
      name: h,
      index: i,
      pointsPossible,
      nonEmpty,
      numericCount,
      zeroCount,
      max,
      excusedCount,
    };
  });

  const allZero = colStats
    .filter((c) => (c.pointsPossible ?? 0) > 0)
    .filter((c) => (c.max ?? 0) === 0);

  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Students: ${students.length}`);
  console.log(`Columns: ${header.length} (${colStats.length} assignments)`);

  if (args.showAllZeroColumns) {
    console.log("");
    console.log("All-zero columns (points possible > 0, max exported score == 0):");
    if (allZero.length === 0) {
      console.log("  (none)");
    } else {
      for (const c of allZero) {
        console.log(`  - ${c.name} (points=${c.pointsPossible}, nonEmpty=${c.nonEmpty})`);
      }
    }
  }

  if (args.student) {
    const target = args.student.trim();
    const row = students.find((r) => String(r[0] ?? "").trim() === target);
    console.log("");
    if (!row) {
      console.log(`Student not found: ${target}`);
      const sample = students.slice(0, 5).map((r) => r[0]).filter(Boolean);
      if (sample.length) console.log(`Sample names: ${sample.join(" | ")}`);
      return;
    }

    console.log(`Student: ${target}`);

    const matcher = args.match ? new RegExp(args.match, "i") : null;
    const colsToShow = assignmentIndexes.filter(({ h }) => (!matcher ? true : matcher.test(h)));

    for (const { h, i } of colsToShow) {
      const v = (row[i] ?? "").trim();
      console.log(`  ${h}: ${v || "(blank)"}`);
    }
  }

  // Sanity: report missing identity columns if any
  const missingIdentity = [...identityCols].filter((c) => !header.includes(c));
  if (missingIdentity.length) {
    console.log("");
    console.log(`Warning: missing identity columns: ${missingIdentity.join(", ")}`);
  }

  // Helpful: show quiz columns
  const quizCols = colStats.filter((c) => /\bQuiz\b/i.test(c.name)).map((c) => c.name);
  console.log("");
  console.log(`Quiz columns in export (${quizCols.length}): ${quizCols.join(", ")}`);
}

main();
