import fs from "node:fs";
import path from "node:path";

const distRoot = path.resolve("dist");
const limits = {
  total: 4 * 1024 * 1024,
  js: 420 * 1024,
  css: 150 * 1024,
};

if (!fs.existsSync(distRoot)) {
  throw new Error("dist가 없습니다. npm run build를 먼저 실행해 주세요.");
}

const files = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(filePath);
    else files.push({ filePath, size: fs.statSync(filePath).size });
  }
};
visit(distRoot);

const total = files.reduce((sum, file) => sum + file.size, 0);
const failures = [];
for (const file of files) {
  const extension = path.extname(file.filePath).slice(1);
  const limit = limits[extension];
  if (limit && file.size > limit) {
    failures.push(`${path.relative(distRoot, file.filePath)} ${(file.size / 1024).toFixed(1)}KB > ${(limit / 1024).toFixed(0)}KB`);
  }
}
if (total > limits.total) failures.push(`dist ${(total / 1024 / 1024).toFixed(2)}MB > 4MB`);

console.log(`bundle budget: ${(total / 1024 / 1024).toFixed(2)}MB, ${files.length} files`);
if (failures.length) throw new Error(`빌드 예산 초과\n${failures.join("\n")}`);
