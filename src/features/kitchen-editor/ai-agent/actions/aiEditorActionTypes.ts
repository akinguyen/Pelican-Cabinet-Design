export type AiEditorAction =
  | Readonly<{
      type: "placeAssemblyOnSelectedWallFace";
      definitionId: string;
      widthInches: number;
      uStartInches: number;
      placementDescription?: string;
    }>;

export type AiEditorActionValidationErrorCode =
  | "NO_SELECTED_WALL"
  | "NO_VALID_CABINET_FACE"
  | "UNKNOWN_DEFINITION"
  | "WIDTH_NOT_ALLOWED"
  | "OUTSIDE_WALL_RANGE"
  | "UNSUPPORTED_ACTION";

export type AiEditorActionValidationError = Readonly<{
  code: AiEditorActionValidationErrorCode;
  message: string;
}>;

export type AiEditorActionValidationResult =
  | Readonly<{
      valid: true;
    }>
  | Readonly<{
      valid: false;
      errors: readonly AiEditorActionValidationError[];
    }>;

export type AiEditorActionExecutionResult =
  | Readonly<{
      applied: true;
      message: string;
      placedAssemblyId?: string;
    }>
  | Readonly<{
      applied: false;
      message: string;
      errors: readonly AiEditorActionValidationError[];
    }>;

export type AiEditorActionBatchExecutionResult = Readonly<{
  designSceneChanged: boolean;
  designSceneMessage: string;
  results: readonly AiEditorActionExecutionResult[];
}>;
