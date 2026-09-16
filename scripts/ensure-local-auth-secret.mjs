import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const envFiles = [
  ".env.development.local",
  ".env.local",
  ".env.development",
  ".env",
];

function configuredSecret(contents, variable) {
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      new RegExp(`^\\s*(?:export\\s+)?${variable}\\s*=\\s*(.*?)\\s*$`),
    );

    if (!match) {
      continue;
    }

    const value = match[1].replace(/^(['"])(.*)\1$/, "$2").trim();
    return value.length > 0;
  }

  return null;
}

if (process.env.AUTH_SECRET?.trim() || process.env.AUTH_SECRET_DEV?.trim()) {
  process.exit(0);
}

const envContents = new Map();

for (const filename of envFiles) {
  try {
    envContents.set(
      filename,
      await readFile(path.join(process.cwd(), filename), "utf8"),
    );
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}

for (const variable of ["AUTH_SECRET", "AUTH_SECRET_DEV"]) {
  for (const [filename, contents] of envContents) {
    const state = configuredSecret(contents, variable);

    if (state === true) {
      process.exit(0);
    }
    if (state === false) {
      console.error(
        `${filename} defines an empty ${variable}. Remove it or set a secure value.`,
      );
      process.exit(1);
    }
  }
}

const envLocalPath = path.join(process.cwd(), ".env.local");
const secret = randomBytes(32).toString("base64url");
let contents = "";

try {
  contents = await readFile(envLocalPath, "utf8");
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
    throw error;
  }
}

const separator = contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";
await writeFile(
  envLocalPath,
  `${contents}${separator}AUTH_SECRET_DEV="${secret}"\n`,
  { mode: 0o600 },
);
console.log("Generated a persistent AUTH_SECRET_DEV in .env.local.");
