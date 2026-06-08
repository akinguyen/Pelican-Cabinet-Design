import type { Point3DInches } from "@/core/geometry/pointTypes";

export type AssemblyFrontOutlineLineCandidate = Readonly<{
  rootAssemblyId: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>;

type HorizontalLineGroup = Readonly<{
  rootAssemblyId: string;
  direction: UnitVector3D;
  intervals: LineInterval[];
}>;

type VerticalLineGroup = Readonly<{
  rootAssemblyId: string;
  intervals: LineInterval[];
}>;

type LineInterval = Readonly<{
  startInches: number;
  endInches: number;
  supportPointInches: Point3DInches;
}>;

type UnitVector3D = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

const FRONT_OUTLINE_MERGE_TOLERANCE_INCHES = 0.01;
const FRONT_OUTLINE_KEY_TOLERANCE_INCHES = 0.02;

export function mergeAssemblyFrontOutlineLineCandidates(
  outlineLines: readonly AssemblyFrontOutlineLineCandidate[],
): readonly AssemblyFrontOutlineLineCandidate[] {
  const horizontalGroups = new Map<string, HorizontalLineGroup>();
  const verticalGroups = new Map<string, VerticalLineGroup>();

  outlineLines.forEach((line) => {
    if (isVerticalLine(line)) {
      addVerticalLineToGroups(verticalGroups, line);
      return;
    }

    addHorizontalLineToGroups(horizontalGroups, line);
  });

  return [
    ...Array.from(horizontalGroups.values()).flatMap(createMergedHorizontalLines),
    ...Array.from(verticalGroups.values()).flatMap(createMergedVerticalLines),
  ];
}

function addHorizontalLineToGroups(
  groups: Map<string, HorizontalLineGroup>,
  line: AssemblyFrontOutlineLineCandidate,
): void {
  const direction = createCanonicalUnitVector(
    line.endPointInches.xInches - line.startPointInches.xInches,
    line.endPointInches.yInches - line.startPointInches.yInches,
    line.endPointInches.zInches - line.startPointInches.zInches,
  );
  const supportPointInches = createHorizontalSupportPoint(line, direction);
  const directionKey = createDirectionKey(direction);
  const supportKey = [
    line.rootAssemblyId,
    "horizontal",
    directionKey,
    createQuantizedKey(supportPointInches.xInches),
    createQuantizedKey(supportPointInches.yInches),
    createQuantizedKey(supportPointInches.zInches),
  ].join("/");
  const lineInterval = createLineInterval(line, direction, supportPointInches);
  const currentGroup = groups.get(supportKey);

  if (currentGroup === undefined) {
    groups.set(supportKey, {
      rootAssemblyId: line.rootAssemblyId,
      direction,
      intervals: [lineInterval],
    });
    return;
  }

  groups.set(supportKey, {
    ...currentGroup,
    intervals: [...currentGroup.intervals, lineInterval],
  });
}

function addVerticalLineToGroups(
  groups: Map<string, VerticalLineGroup>,
  line: AssemblyFrontOutlineLineCandidate,
): void {
  const supportKey = [
    line.rootAssemblyId,
    "vertical",
    createQuantizedKey((line.startPointInches.xInches + line.endPointInches.xInches) / 2),
    createQuantizedKey((line.startPointInches.yInches + line.endPointInches.yInches) / 2),
  ].join("/");
  const supportPointInches = {
    xInches: (line.startPointInches.xInches + line.endPointInches.xInches) / 2,
    yInches: (line.startPointInches.yInches + line.endPointInches.yInches) / 2,
    zInches: 0,
  };
  const lineInterval = {
    startInches: Math.min(line.startPointInches.zInches, line.endPointInches.zInches),
    endInches: Math.max(line.startPointInches.zInches, line.endPointInches.zInches),
    supportPointInches,
  };
  const currentGroup = groups.get(supportKey);

  if (currentGroup === undefined) {
    groups.set(supportKey, {
      rootAssemblyId: line.rootAssemblyId,
      intervals: [lineInterval],
    });
    return;
  }

  groups.set(supportKey, {
    ...currentGroup,
    intervals: [...currentGroup.intervals, lineInterval],
  });
}

function createMergedHorizontalLines(
  group: HorizontalLineGroup,
): readonly AssemblyFrontOutlineLineCandidate[] {
  return mergeLineIntervals(group.intervals).map((interval) => ({
    rootAssemblyId: group.rootAssemblyId,
    startPointInches: createPointOnLine(interval.supportPointInches, group.direction, interval.startInches),
    endPointInches: createPointOnLine(interval.supportPointInches, group.direction, interval.endInches),
  }));
}

function createMergedVerticalLines(
  group: VerticalLineGroup,
): readonly AssemblyFrontOutlineLineCandidate[] {
  return mergeLineIntervals(group.intervals).map((interval) => ({
    rootAssemblyId: group.rootAssemblyId,
    startPointInches: {
      xInches: interval.supportPointInches.xInches,
      yInches: interval.supportPointInches.yInches,
      zInches: interval.startInches,
    },
    endPointInches: {
      xInches: interval.supportPointInches.xInches,
      yInches: interval.supportPointInches.yInches,
      zInches: interval.endInches,
    },
  }));
}

function mergeLineIntervals(intervals: readonly LineInterval[]): readonly LineInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sortedIntervals = [...intervals].sort((first, second) => first.startInches - second.startInches);
  const mergedIntervals: LineInterval[] = [sortedIntervals[0]];

  sortedIntervals.slice(1).forEach((interval) => {
    const lastInterval = mergedIntervals[mergedIntervals.length - 1];

    if (interval.startInches <= lastInterval.endInches + FRONT_OUTLINE_MERGE_TOLERANCE_INCHES) {
      mergedIntervals[mergedIntervals.length - 1] = {
        ...lastInterval,
        endInches: Math.max(lastInterval.endInches, interval.endInches),
      };
      return;
    }

    mergedIntervals.push(interval);
  });

  return mergedIntervals;
}

function createHorizontalSupportPoint(
  line: AssemblyFrontOutlineLineCandidate,
  direction: UnitVector3D,
): Point3DInches {
  const startDistanceInches = dotPointWithDirection(line.startPointInches, direction);

  return {
    xInches: line.startPointInches.xInches - direction.x * startDistanceInches,
    yInches: line.startPointInches.yInches - direction.y * startDistanceInches,
    zInches: line.startPointInches.zInches - direction.z * startDistanceInches,
  };
}

function createLineInterval(
  line: AssemblyFrontOutlineLineCandidate,
  direction: UnitVector3D,
  supportPointInches: Point3DInches,
): LineInterval {
  const startInches = dotRelativePointWithDirection(line.startPointInches, supportPointInches, direction);
  const endInches = dotRelativePointWithDirection(line.endPointInches, supportPointInches, direction);

  return {
    startInches: Math.min(startInches, endInches),
    endInches: Math.max(startInches, endInches),
    supportPointInches,
  };
}

function createPointOnLine(
  supportPointInches: Point3DInches,
  direction: UnitVector3D,
  distanceInches: number,
): Point3DInches {
  return {
    xInches: supportPointInches.xInches + direction.x * distanceInches,
    yInches: supportPointInches.yInches + direction.y * distanceInches,
    zInches: supportPointInches.zInches + direction.z * distanceInches,
  };
}

function dotPointWithDirection(pointInches: Point3DInches, direction: UnitVector3D): number {
  return pointInches.xInches * direction.x + pointInches.yInches * direction.y + pointInches.zInches * direction.z;
}

function dotRelativePointWithDirection(
  pointInches: Point3DInches,
  supportPointInches: Point3DInches,
  direction: UnitVector3D,
): number {
  return (
    (pointInches.xInches - supportPointInches.xInches) * direction.x +
    (pointInches.yInches - supportPointInches.yInches) * direction.y +
    (pointInches.zInches - supportPointInches.zInches) * direction.z
  );
}

function createCanonicalUnitVector(x: number, y: number, z: number): UnitVector3D {
  const length = Math.hypot(x, y, z);

  if (length <= FRONT_OUTLINE_MERGE_TOLERANCE_INCHES) {
    return { x: 1, y: 0, z: 0 };
  }

  const unitVector = {
    x: x / length,
    y: y / length,
    z: z / length,
  };

  if (
    unitVector.x < -FRONT_OUTLINE_MERGE_TOLERANCE_INCHES ||
    (Math.abs(unitVector.x) <= FRONT_OUTLINE_MERGE_TOLERANCE_INCHES &&
      unitVector.y < -FRONT_OUTLINE_MERGE_TOLERANCE_INCHES) ||
    (Math.abs(unitVector.x) <= FRONT_OUTLINE_MERGE_TOLERANCE_INCHES &&
      Math.abs(unitVector.y) <= FRONT_OUTLINE_MERGE_TOLERANCE_INCHES &&
      unitVector.z < -FRONT_OUTLINE_MERGE_TOLERANCE_INCHES)
  ) {
    return {
      x: -unitVector.x,
      y: -unitVector.y,
      z: -unitVector.z,
    };
  }

  return unitVector;
}

function isVerticalLine(line: AssemblyFrontOutlineLineCandidate): boolean {
  return (
    Math.abs(line.startPointInches.xInches - line.endPointInches.xInches) <= FRONT_OUTLINE_MERGE_TOLERANCE_INCHES &&
    Math.abs(line.startPointInches.yInches - line.endPointInches.yInches) <= FRONT_OUTLINE_MERGE_TOLERANCE_INCHES
  );
}

function createDirectionKey(direction: UnitVector3D): string {
  return [
    createQuantizedKey(direction.x),
    createQuantizedKey(direction.y),
    createQuantizedKey(direction.z),
  ].join("/");
}

function createQuantizedKey(value: number): string {
  return String(Math.round(value / FRONT_OUTLINE_KEY_TOLERANCE_INCHES));
}
