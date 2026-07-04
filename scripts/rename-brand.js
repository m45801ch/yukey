const fs = require("fs");
const path = require("path");

const localesDir = path.join(__dirname, "../src/i18n/locales");

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  // 替換翻譯檔案中的 Handy 品牌字眼，只替換 Handy/handy 且避免改到感謝原作者的完整段落
  let updated = content.replace(/Handy/g, "yukey").replace(/handy/g, "yukey");

  if (content !== updated) {
    fs.writeFileSync(filePath, updated, "utf8");
    console.log(`Updated brand names in: ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith(".json")) {
      replaceInFile(fullPath);
    }
  }
}

console.log("Starting brand rename in translation files...");
processDirectory(localesDir);
console.log("Brand rename completed.");
