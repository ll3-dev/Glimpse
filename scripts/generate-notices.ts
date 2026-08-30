/**
 * THIRD-PARTY-NOTICES.md 생성 스크립트.
 *
 * 루트 node_modules를 순회하며 각 패키지의 package.json에서
 * name/version/license(+homepage)를 수집해 라이선스별로 그룹핑하고,
 * 저장소 루트에 THIRD-PARTY-NOTICES.md를 작성한다.
 *
 * 실행: bun run licenses:generate (또는 bun run scripts/generate-notices.ts)
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

interface PackageInfo {
  name: string;
  version: string;
  license: string;
  homepage?: string;
}

const rootDir = dirname(import.meta.dir);
const nodeModulesDir = join(rootDir, "node_modules");
const outputPath = join(rootDir, "THIRD-PARTY-NOTICES.md");

if (!existsSync(nodeModulesDir)) {
  console.error(
    `node_modules를 찾을 수 없습니다: ${nodeModulesDir} — 먼저 'bun install'을 실행하세요.`,
  );
  process.exit(1);
}

const packages = new Map<string, PackageInfo>();

function readPackageJson(packageJsonPath: string): void {
  let raw: string;
  try {
    raw = readFileSync(packageJsonPath, "utf8");
  } catch {
    console.error(`건너뜀: ${packageJsonPath}`);
    return; // 읽을 수 없는 항목은 건너뜀
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`건너뜀: ${packageJsonPath}`);
    return;
  }
  const name = typeof parsed.name === "string" ? parsed.name : undefined;
  if (!name) return;
  // 퍼스트파티 워크스페이스 패키지는 서드파티가 아니므로 제외
  if (name.startsWith("@glimpse/")) return;
  const version = typeof parsed.version === "string" ? parsed.version : "unknown";
  const licenseField = parsed.license ?? parsed.licenses;
  let license = "UNKNOWN";
  if (typeof licenseField === "string") {
    license = licenseField;
  } else if (Array.isArray(licenseField)) {
    // 구형 표기: licenses: [{type: "MIT", ...}, ...]
    const parts = licenseField
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : entry && typeof entry === "object" && typeof entry.type === "string"
            ? entry.type
            : undefined,
      )
      .filter((part): part is string => typeof part === "string");
    if (parts.length > 0) license = parts.join(" OR ");
  } else if (
    licenseField &&
    typeof licenseField === "object" &&
    typeof licenseField.type === "string"
  ) {
    // 구형 표기: license: {type: "MIT", ...}
    license = licenseField.type;
  }
  const homepage = typeof parsed.homepage === "string" ? parsed.homepage : undefined;
  // 중복(워크스페이스 링크 등)은 첫 발견을 유지
  const key = `${name}@${version}`;
  if (!packages.has(key)) {
    packages.set(key, { name, version, license, homepage });
  }
}

function walkNodeModules(dir: string, depth: number): void {
  if (depth > 6) return; // 비정상적으로 깊은 중첩 방지
  let entries: string[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }).map((entry) => entry.name);
  } catch {
    return; // 읽을 수 없는 디렉터리는 건너뜀
  }
  for (const entry of entries) {
    const entryPath = join(dir, entry);
    if (entry.startsWith("@")) {
      // 스코프 패키지: @scope/name 한 단계 더 들어감
      walkNodeModules(entryPath, depth + 1);
      continue;
    }
    if (entry.startsWith(".")) continue; // .bin, .cache 등 제외
    const packageJsonPath = join(entryPath, "package.json");
    if (existsSync(packageJsonPath)) {
      readPackageJson(packageJsonPath);
    }
    // 중첩 node_modules도 순회
    const nestedNodeModules = join(entryPath, "node_modules");
    if (existsSync(nestedNodeModules)) {
      walkNodeModules(nestedNodeModules, depth + 1);
    }
  }
}

walkNodeModules(nodeModulesDir, 0);

// 라이선스별 그룹핑 (라이선스 문자열 기준 정렬, 패키지는 name 순 정렬)
const byLicense = new Map<string, PackageInfo[]>();
for (const info of packages.values()) {
  const list = byLicense.get(info.license) ?? [];
  list.push(info);
  byLicense.set(info.license, list);
}
const licenseGroups = [...byLicense.entries()].sort(([a], [b]) =>
  a.localeCompare(b, "en"),
);
for (const [, list] of licenseGroups) {
  list.sort((a, b) => a.name.localeCompare(b.name, "en"));
}

const lines: string[] = [];
lines.push("# Third-Party Notices");
lines.push("");
lines.push(
  "이 애플리케이션은 다음 서드파티 소프트웨어를 포함하거나 사용합니다. 각 소프트웨어는 해당 라이선스의 조건에 따라 제공되며, 이 문서는 그 출처와 라이선스를 안내하기 위한 것입니다. 각 라이선스의 전문은 해당 패키지의 배포본에 동봉되어 있습니다.",
);
lines.push("");
lines.push(
  "> 이 문서는 `bun run licenses:generate`로 생성되었습니다. 수동 편집 대신 스크립트를 다시 실행해 갱신하세요.",
);
lines.push("");
lines.push(`총 ${packages.size}개 패키지, ${licenseGroups.length}개 라이선스 그룹.`);
lines.push("");

for (const [license, list] of licenseGroups) {
  lines.push(`## ${license} (${list.length})`);
  lines.push("");
  for (const info of list) {
    if (info.homepage) {
      lines.push(`- ${info.name}@${info.version} — ${info.homepage}`);
    } else {
      lines.push(`- ${info.name}@${info.version}`);
    }
  }
  lines.push("");
}

lines.push("## AI 모델 라이선스");
lines.push("");
lines.push(
  "이 애플리케이션이 사용하는 온디바이스 AI 모델(GGUF 등)은 앱에 번들되지 않고 런타임에 사용자가 다운로드합니다. 따라서 위 서드파티 패키지 목록에 포함되지 않으며, 각 모델의 라이선스는 앱 내 모델 카탈로그(`packages/shared/src/local-model-registry.ts`)의 항목별로 표시됩니다. 모델을 다운로드해 사용하기 전에 해당 라이선스를 확인하세요.",
);
lines.push("");

writeFileSync(outputPath, lines.join("\n"), "utf8");

console.log(
  `THIRD-PARTY-NOTICES.md 작성 완료: ${packages.size}개 패키지, ${licenseGroups.length}개 라이선스 그룹`,
);
