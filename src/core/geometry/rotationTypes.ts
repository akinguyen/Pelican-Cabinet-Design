export type RotationDegrees3D = Readonly<{
  xDegrees?: number;
  yDegrees?: number;
  zDegrees?: number;
}>;

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function degreesToUserFacingZRadians(degrees: number): number {
  return (-degrees * Math.PI) / 180;
}
