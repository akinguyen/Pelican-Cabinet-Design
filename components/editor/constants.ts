import { Boxes, BrickWall, DoorOpen, PencilLine, Sofa, Square, Type } from "lucide-react";
import type { SidebarItem } from "./types";

export const MIN_ZOOM = 0.18;
export const MAX_ZOOM = 3;
export const ZOOM_INTENSITY = 0.0045;
export const ZOOM_BUTTON_STEP = 1.18;
export const MOVE_STEP = 48;

export const sidebarItems: SidebarItem[] = [
  { id: "walls", label: "Walls", icon: BrickWall },
  { id: "structures", label: "Structures", icon: DoorOpen },
  { id: "products", label: "Products", icon: Sofa },
  { id: "cabinets", label: "Cabinets", icon: Boxes },
  { id: "objects", label: "Accessories", icon: Square },
  { id: "text", label: "Text", icon: Type },
  { id: "lines", label: "Lines", icon: PencilLine },
];

export const WORKSPACE_WIDTH = 2400;
export const WORKSPACE_HEIGHT = 1600;
export const GRID_SIZE = 28;
export const FLOOR_SUPPORTED_PANTRY_MIN_HEIGHT_INCHES = 54;
export const CABINET_TOE_KICK_HEIGHT_INCHES = 4.5;
export const OVEN_CABINET_DEFAULT_FILLER_HEIGHT_INCHES = 3;
export const OVEN_CABINET_DEFAULT_BOTTOM_DRAWER_HEIGHT_INCHES = 11.6875;
export const SNAP_THRESHOLD = 9;
export const WALL_ATTACH_THRESHOLD = 22;
export const WALL_STROKE_WIDTH = 16;
export const WALL_THICKNESS = WALL_STROKE_WIDTH;
export const PENIN_WALL_THICKNESS = WALL_THICKNESS * 2;
export const PENIN_WALL_ELEVATION_HEIGHT_INCHES = 36;
export const PENIN_WALL_ELEVATION_FACE_WIDTH_INCHES = 24;
export const THIN_WALL_STROKE_WIDTH = 2;
export const DEFAULT_WINDOW_WIDTH = (39.25 / 12) * GRID_SIZE;
export const DEFAULT_DOOR_WIDTH = (36 / 12) * GRID_SIZE;
export const DEFAULT_ELEVATION_WALL_HEIGHT_INCHES = 96;

export const ELEVATION_VIEWBOX_WIDTH = 1200;
export const ELEVATION_VIEWBOX_HEIGHT = 860;
export const JOINT_DOT_RADIUS = 5;
export const JOINT_TICK_LENGTH = 16;

export const AI_WALL_MATCH_TOLERANCE = 0.75;

export const CABINET_ROTATION_SNAP_STEP_DEGREES = 45;
export const CABINET_ROTATION_SNAP_ENTER_DEGREES = 4;
