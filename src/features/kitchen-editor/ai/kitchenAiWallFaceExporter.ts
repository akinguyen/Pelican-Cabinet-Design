import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { PlacedWallSegment } from "@/engine/walls/placedWallSegmentTypes";
import { buildWallElevationViewZone } from "@/engine/walls/wallElevationViewZone";
import type { KitchenAiWallFace } from "./kitchenAiTypes";

export function buildKitchenAiWallFaces(
  placedWallGraphs: readonly PlacedWallGraph[],
): readonly KitchenAiWallFace[] {
  return placedWallGraphs.flatMap((wallGraph) => {
    const topology = buildConnectedWallGeometry(wallGraph);

    return topology.faces.flatMap((face) => {
      const wallSegment = wallGraph.segments.find((segment) => segment.id === face.wallSegmentId);

      if (wallSegment === undefined) {
        return [];
      }

      const viewZone = buildWallElevationViewZone({
        face,
        segmentBody: topology.segmentBodies.find((body) => body.wallSegmentId === face.wallSegmentId) ?? null,
      });

      return [
        {
          id: face.id,
          wallGraphId: face.wallGraphId,
          wallSegmentId: face.wallSegmentId,
          faceSide: face.side,
          cabinetPlacementRequirement: getCabinetPlacementRequirement(wallSegment, face.side),
          elevationFrame: {
            planeOriginInches: viewZone.faceCenterInches,
            faceDirectionInches: toPoint3D(viewZone.faceDirectionInches),
            outwardDirectionInches: toPoint3D(viewZone.outwardDirectionInches),
            horizontalBoundsInches: {
              leftInches: viewZone.viewFrameLeftInches,
              rightInches: viewZone.viewFrameRightInches,
            },
            verticalBoundsInches: {
              bottomInches: 0,
              topInches: viewZone.wallHeightInches,
            },
          },
        } satisfies KitchenAiWallFace,
      ];
    });
  });
}

function getCabinetPlacementRequirement(
  wallSegment: PlacedWallSegment,
  faceSide: KitchenAiWallFace["faceSide"],
): KitchenAiWallFace["cabinetPlacementRequirement"] {
  return wallSegment.cabinetPlacementFacePolicies[faceSide];
}

function toPoint3D(point: Readonly<{ xInches: number; yInches: number }>): Point3DInches {
  return {
    xInches: point.xInches,
    yInches: point.yInches,
    zInches: 0,
  };
}
