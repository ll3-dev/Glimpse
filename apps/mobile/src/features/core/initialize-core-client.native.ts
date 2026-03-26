import RNBlobUtil from 'react-native-blob-util';
import { mobileCoreClient } from './mobile-core-client';

const CORE_DIRECTORY = `${RNBlobUtil.fs.dirs.DocumentDir}/glimpse`;
const CORE_DB_PATH = `${CORE_DIRECTORY}/glimpse.sqlite`;

let initializationPromise: Promise<string> | null = null;

export function initializeCoreClient(): Promise<string> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const directoryExists = await RNBlobUtil.fs.isDir(CORE_DIRECTORY);

    if (!directoryExists) {
      await RNBlobUtil.fs.mkdir(CORE_DIRECTORY);
    }

    await mobileCoreClient.initialize(CORE_DB_PATH);
    return CORE_DB_PATH;
  })();

  return initializationPromise;
}
