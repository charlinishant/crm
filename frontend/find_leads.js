const fs = require("fs");
const lines = fs.readFileSync("src/user/SalesUserPanel.jsx", "utf8").split("\n");
const out = [];
lines.forEach((l, i) => {
  const t = l.toLowerCase();
  if (t.includes("getleadname") || t.includes("getleadphone") || t.includes("leadstage") || t.includes("action.*lead") || t.includes("lead.*action") || t.includes("booked") || t.includes("qualified") || t.includes(".map(")) {
    out.push(`${i + 1}: ${l.trim().slice(0, 100)}`);
  }
});
console.log(out.slice(0, 80).join("\n"));
