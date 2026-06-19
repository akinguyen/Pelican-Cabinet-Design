"use client";

import { useMemo, useState } from "react";
import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createAiEditorActionsFromLocalCommand } from "../ai-agent/actions/createAiEditorActionFromLocalCommand";
import { buildSelectedWallAiContext } from "../ai-agent/context/buildSelectedWallAiContext";
import { executeAiEditorActions } from "../ai-agent/actions/executeAiEditorAction";
import type { AiEditorAction, AiEditorActionBatchExecutionResult } from "../ai-agent/actions/aiEditorActionTypes";
import { skill001PlaceAssemblyOnSelectedWallFace } from "../ai-agent/skills/skill001PlaceAssemblyOnSelectedWallFace";
import { skill002PlaceAssemblyAtWallPosition } from "../ai-agent/skills/skill002PlaceAssemblyAtWallPosition";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import {
  getSelectedDesignReservationZoneFromScene,
  getSelectedPlacedAssemblyFromScene,
  getSelectedWallGraphNodesFromScene,
  getSelectedWallSegmentFromScene,
} from "../selection/sceneSelectionLookups";
import { AiChatPanel, type AiChatMessage } from "./AiChatPanel";
import { SelectedAssemblySummary } from "./SelectedAssemblySummary";
import { SelectedWallSummary } from "./SelectedWallSummary";
import { SelectedDesignReservationZoneSummary } from "./SelectedDesignReservationZoneSummary";

const initialAiMessages: readonly AiChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content: `Phase 2 is active. I can test ${skill001PlaceAssemblyOnSelectedWallFace.name} and ${skill002PlaceAssemblyAtWallPosition.name}: select a wall segment, then ask me to place a base cabinet elevation-left start, center, elevation-right end, or at a wall-face offset. Example: "Place a 30 inch base cabinet centered on this wall."`,
  },
];

export function KitchenAiPanel() {
  const selectedAssembly = useDesignSceneStore((state) => getSelectedPlacedAssemblyFromScene(state.designScene));
  const selectedWallSegment = useDesignSceneStore((state) => getSelectedWallSegmentFromScene(state.designScene));
  const selectedDesignReservationZone = useDesignSceneStore((state) => getSelectedDesignReservationZoneFromScene(state.designScene));
  const selectedWallGraphNodes = useDesignSceneStore((state) => getSelectedWallGraphNodesFromScene(state.designScene));
  const [messages, setMessages] = useState<readonly AiChatMessage[]>(initialAiMessages);
  const [inputValue, setInputValue] = useState("");
  const selectedDefinition = useMemo(
    () => selectedAssembly === null
      ? null
      : getAssemblyDefinition(kitchenEditorCatalogRegistry, selectedAssembly.definitionId),
    [selectedAssembly],
  );

  const contextSummary = selectedDesignReservationZone !== null ? (
    <SelectedDesignReservationZoneSummary zone={selectedDesignReservationZone} />
  ) : selectedAssembly !== null && selectedDefinition !== null ? (
    <SelectedAssemblySummary placedAssembly={selectedAssembly} definition={selectedDefinition} />
  ) : selectedWallSegment !== null && selectedWallGraphNodes !== null ? (
    <SelectedWallSummary wallSegment={selectedWallSegment} wallGraphNodes={selectedWallGraphNodes} />
  ) : (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Context</p>
      <h2 className="mt-1 text-sm font-semibold text-slate-950">No assembly or wall selected</h2>
      <p className="mt-1 text-xs text-slate-500">
        Click a wall segment first. Phase 2 can place one base cabinet on the selected wall at the elevation-left start, center, elevation-right end, or a wall-face offset.
      </p>
    </section>
  );

  const handleSendMessage = () => {
    const trimmedMessage = inputValue.trim();

    if (trimmedMessage.length === 0) {
      return;
    }

    const timestamp = Date.now();
    const selectedWallContextResult = buildSelectedWallAiContext(useDesignSceneStore.getState().designScene);
    const actions = createAiEditorActionsFromLocalCommand(trimmedMessage, selectedWallContextResult);
    const assistantContent = actions.length === 0
      ? "For Phase 2, I can place one base cabinet on a selected wall at the elevation-left start, center, elevation-right end, or a wall-face offset. Try: Place a 30 inch base cabinet centered on this wall."
      : applyLocalAiEditorActions(actions);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${timestamp}`,
        role: "user",
        content: trimmedMessage,
      },
      {
        id: `assistant-phase2-${timestamp}`,
        role: "assistant",
        content: assistantContent,
      },
    ]);
    setInputValue("");
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50 p-3">
      <AiChatPanel
        contextSummary={contextSummary}
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

function applyLocalAiEditorActions(
  actions: readonly AiEditorAction[],
): string {
  const storeState = useDesignSceneStore.getState();
  const execution = executeAiEditorActions({
    actions,
    designScene: storeState.designScene,
    registry: kitchenEditorCatalogRegistry,
  });

  if (execution.result.designSceneChanged) {
    useDesignSceneStore.setState({
      designScene: execution.designScene,
      activeDrag: null,
      assemblyPlacementFeedback: null,
      activeObjectAlignmentGuides: [],
    });
  }

  return formatAiEditorActionBatchResult(execution.result);
}

function formatAiEditorActionBatchResult(
  result: AiEditorActionBatchExecutionResult,
): string {
  const resultMessages = result.results.map((executionResult) => executionResult.message).filter((message) => message.length > 0);

  if (resultMessages.length === 0) {
    return result.designSceneMessage;
  }

  return resultMessages.join("\n");
}
