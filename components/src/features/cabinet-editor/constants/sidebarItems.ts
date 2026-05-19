import { Boxes, BrickWall, DoorOpen, PencilLine, Sofa, Square, Type } from "lucide-react";
import type { SidebarItem } from "../types/editorTypes";

export const sidebarItems: SidebarItem[] = [
  { id: "walls", label: "Walls", icon: BrickWall },
  { id: "structures", label: "Structures", icon: DoorOpen },
  { id: "products", label: "Products", icon: Sofa },
  { id: "cabinets", label: "Cabinets", icon: Boxes },
  { id: "objects", label: "Accessories", icon: Square },
  { id: "text", label: "Text", icon: Type },
  { id: "lines", label: "Lines", icon: PencilLine },
];
