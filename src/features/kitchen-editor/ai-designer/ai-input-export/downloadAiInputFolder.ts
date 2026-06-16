import type { DownloadableAiInputFile } from "./aiInputPackageTypes";

const AI_INPUT_FOLDER_NAME = "ai-kitchen-designer-inputs";
const AI_INPUT_ZIP_FILE_NAME = `${AI_INPUT_FOLDER_NAME}.zip`;
const ZIP_MIME_TYPE = "application/zip";
const ZIP_TEXT_FILE_MODE = 0o100644;
const OBJECT_URL_REVOKE_DELAY_MS = 1000;
const ZIP_UTF8_GENERAL_PURPOSE_FLAG = 0x0800;
const ZIP_STORE_COMPRESSION_METHOD = 0;
const ZIP_VERSION_NEEDED_TO_EXTRACT = 20;
const ZIP_VERSION_MADE_BY = 20;

export function downloadAiInputFolder(files: readonly DownloadableAiInputFile[]) {
  const zipBlob = createStoredZipBlob({
    folderName: AI_INPUT_FOLDER_NAME,
    files,
  });
  const objectUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = AI_INPUT_ZIP_FILE_NAME;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, OBJECT_URL_REVOKE_DELAY_MS);
}

function createStoredZipBlob(args: {
  folderName: string;
  files: readonly DownloadableAiInputFile[];
}): Blob {
  const encoder = new TextEncoder();
  const currentDate = new Date();
  const zipDateTime = createZipDateTime(currentDate);
  const localFileParts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let localFileOffset = 0;

  args.files.forEach((file) => {
    const filePath = createZipEntryPath({
      folderName: args.folderName,
      filePath: file.filePath,
    });
    const fileNameBytes = encoder.encode(filePath);
    const fileContentBytes = encoder.encode(file.content);
    const crc32 = calculateCrc32(fileContentBytes);
    const localFileHeader = createLocalFileHeader({
      fileNameBytes,
      fileContentByteLength: fileContentBytes.byteLength,
      crc32,
      zipDateTime,
    });
    const centralDirectoryHeader = createCentralDirectoryHeader({
      fileNameBytes,
      fileContentByteLength: fileContentBytes.byteLength,
      crc32,
      localFileOffset,
      zipDateTime,
    });

    localFileParts.push(localFileHeader, fileNameBytes, fileContentBytes);
    centralDirectoryParts.push(centralDirectoryHeader, fileNameBytes);
    localFileOffset += localFileHeader.byteLength + fileNameBytes.byteLength + fileContentBytes.byteLength;
  });

  const centralDirectoryOffset = localFileOffset;
  const centralDirectoryByteLength = getTotalByteLength(centralDirectoryParts);
  const endOfCentralDirectory = createEndOfCentralDirectory({
    entryCount: args.files.length,
    centralDirectoryByteLength,
    centralDirectoryOffset,
  });

  return new Blob([...localFileParts, ...centralDirectoryParts, endOfCentralDirectory], {
    type: ZIP_MIME_TYPE,
  });
}

function createZipEntryPath(args: {
  folderName: string;
  filePath: string;
}): string {
  const folderName = sanitizeZipPathPart(args.folderName);
  const filePath = args.filePath
    .split("/")
    .map(sanitizeZipPathPart)
    .filter((pathPart) => pathPart.length > 0)
    .join("/");

  return `${folderName}/${filePath}`;
}

function sanitizeZipPathPart(pathPart: string): string {
  return pathPart.replace(/\\/g, "/").replace(/^\.+$/g, "").replace(/^\/+|\/+$/g, "");
}

function createLocalFileHeader(args: {
  fileNameBytes: Uint8Array;
  fileContentByteLength: number;
  crc32: number;
  zipDateTime: ZipDateTime;
}): Uint8Array {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, ZIP_VERSION_NEEDED_TO_EXTRACT, true);
  view.setUint16(6, ZIP_UTF8_GENERAL_PURPOSE_FLAG, true);
  view.setUint16(8, ZIP_STORE_COMPRESSION_METHOD, true);
  view.setUint16(10, args.zipDateTime.time, true);
  view.setUint16(12, args.zipDateTime.date, true);
  view.setUint32(14, args.crc32, true);
  view.setUint32(18, args.fileContentByteLength, true);
  view.setUint32(22, args.fileContentByteLength, true);
  view.setUint16(26, args.fileNameBytes.byteLength, true);
  view.setUint16(28, 0, true);

  return header;
}

function createCentralDirectoryHeader(args: {
  fileNameBytes: Uint8Array;
  fileContentByteLength: number;
  crc32: number;
  localFileOffset: number;
  zipDateTime: ZipDateTime;
}): Uint8Array {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, ZIP_VERSION_MADE_BY, true);
  view.setUint16(6, ZIP_VERSION_NEEDED_TO_EXTRACT, true);
  view.setUint16(8, ZIP_UTF8_GENERAL_PURPOSE_FLAG, true);
  view.setUint16(10, ZIP_STORE_COMPRESSION_METHOD, true);
  view.setUint16(12, args.zipDateTime.time, true);
  view.setUint16(14, args.zipDateTime.date, true);
  view.setUint32(16, args.crc32, true);
  view.setUint32(20, args.fileContentByteLength, true);
  view.setUint32(24, args.fileContentByteLength, true);
  view.setUint16(28, args.fileNameBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, ZIP_TEXT_FILE_MODE * 0x10000, true);
  view.setUint32(42, args.localFileOffset, true);

  return header;
}

function createEndOfCentralDirectory(args: {
  entryCount: number;
  centralDirectoryByteLength: number;
  centralDirectoryOffset: number;
}): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, args.entryCount, true);
  view.setUint16(10, args.entryCount, true);
  view.setUint32(12, args.centralDirectoryByteLength, true);
  view.setUint32(16, args.centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return header;
}

type ZipDateTime = Readonly<{
  date: number;
  time: number;
}>;

function createZipDateTime(date: Date): ZipDateTime {
  const year = Math.max(date.getFullYear(), 1980);
  const zipDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const zipTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);

  return {
    date: zipDate,
    time: zipTime,
  };
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  data.forEach((byte) => {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrc32Table(): readonly number[] {
  return Array.from({ length: 256 }, (_, index) => {
    let crc = index;

    for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    return crc >>> 0;
  });
}

function getTotalByteLength(parts: readonly Uint8Array[]): number {
  return parts.reduce((totalByteLength, part) => totalByteLength + part.byteLength, 0);
}

const CRC32_TABLE = createCrc32Table();
