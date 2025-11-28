// src/db.js
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

function getFilePath(name) {
  return path.join(dataDir, `${name}.json`);
}

function readJson(name, fallback) {
  const file = getFilePath(name);
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(name, value) {
  const file = getFilePath(name);
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  } catch (err) {
    console.error(`Failed to write ${name}.json:`, err);
  }
}

module.exports = {
  readJson,
  writeJson
};
