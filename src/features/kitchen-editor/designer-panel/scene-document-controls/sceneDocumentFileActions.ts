export function downloadJsonFile(args: {
  data: unknown;
  fileName: string;
}) {
  const blob = new Blob([JSON.stringify(args.data, null, 2)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = args.fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export async function readJsonFile(file: File): Promise<unknown> {
  const fileText = await file.text();

  return JSON.parse(fileText) as unknown;
}
