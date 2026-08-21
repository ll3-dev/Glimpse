import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required release environment variable: ${name}`);
  }
  return value;
}

const endpoint = requiredEnvironment('GLIMPSE_TAURI_UPDATER_ENDPOINT');
const pubkey = requiredEnvironment('GLIMPSE_TAURI_UPDATER_PUBKEY');
requiredEnvironment('TAURI_SIGNING_PRIVATE_KEY');

const endpointUrl = new URL(endpoint);
if (endpointUrl.protocol !== 'https:') {
  throw new Error('GLIMPSE_TAURI_UPDATER_ENDPOINT must use HTTPS');
}

const outputPath = resolve(
  import.meta.dir,
  '../src-tauri/.release/tauri.release.conf.json',
);
const releaseConfig = {
  bundle: {
    createUpdaterArtifacts: true,
  },
  plugins: {
    updater: {
      pubkey,
      endpoints: [endpoint],
      dangerousInsecureTransportProtocol: false,
    },
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(releaseConfig, null, 2)}\n`, {
  mode: 0o600,
});
console.info(`Prepared release-only Tauri config at ${outputPath}`);
