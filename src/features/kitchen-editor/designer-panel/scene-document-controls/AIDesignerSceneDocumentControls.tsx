"use client";

import { useCallback, useRef, type ChangeEvent, type ReactNode } from "react";
import { createDesignSceneDocument, createWallOnlyDesignSceneDocument } from "@/engine/scene/document/createDesignSceneDocument";
import { parseDesignSceneDocument } from "@/engine/scene/document/parseDesignSceneDocument";
import type { DesignSceneDocument } from "@/engine/scene/document/designSceneDocumentTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import { downloadJsonFile, readJsonFile } from "./sceneDocumentFileActions";

export function AIDesignerSceneDocumentControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportWallOnlyDocument = useCallback(() => {
    const { designScene } = useDesignSceneStore.getState();
    const document = createWallOnlyDesignSceneDocument(designScene);

    downloadJsonFile({
      data: document,
      fileName: "kitchen-walls-for-ai.json",
    });
  }, []);

  const exportFullSceneDocument = useCallback(() => {
    const { designScene } = useDesignSceneStore.getState();
    const document = createDesignSceneDocument(designScene);

    downloadJsonFile({
      data: document,
      fileName: "kitchen-scene.json",
    });
  }, []);

  const openImportFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const importSceneDocument = useCallback(async (file: File) => {
    try {
      const jsonData = await readJsonFile(file);
      const parseResult = parseDesignSceneDocument(jsonData);

      if (parseResult.ok === false) {
        alert(`Import failed:\n${parseResult.errors.join("\n")}`);
        return;
      }

      const missingDefinitionIds = getMissingDefinitionIds(parseResult.document);

      if (missingDefinitionIds.length > 0) {
        alert(`Import failed. Missing catalog definitions:\n${missingDefinitionIds.join("\n")}`);
        return;
      }

      useDesignSceneStore.getState().replaceDesignSceneFromDocument(parseResult.document);
    } catch (error) {
      alert(`Import failed. ${getErrorMessage(error)}`);
    }
  }, []);

  const handleImportFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (file === null) {
      return;
    }

    void importSceneDocument(file);
  }, [importSceneDocument]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Scene JSON</p>
        <h2 className="mt-1 text-sm font-semibold text-slate-950">AI design exchange</h2>
      </div>
      <div className="grid gap-2">
        <SceneDocumentButton onClick={exportWallOnlyDocument}>Export walls for AI</SceneDocumentButton>
        <SceneDocumentButton onClick={openImportFilePicker}>Import AI design</SceneDocumentButton>
        <SceneDocumentButton onClick={exportFullSceneDocument}>Export full scene</SceneDocumentButton>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFileChange}
      />
    </section>
  );
}

function SceneDocumentButton({
  children,
  onClick,
}: Readonly<{
  children: ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      {children}
    </button>
  );
}

function getMissingDefinitionIds(document: DesignSceneDocument): readonly string[] {
  const usedDefinitionIds = new Set(document.scene.placedAssemblies.map((placedAssembly) => placedAssembly.definitionId));
  const referencedDefinitionIds = new Set(document.catalog.requiredDefinitionIds);
  const definitionIds = new Set([...usedDefinitionIds, ...referencedDefinitionIds]);

  return [...definitionIds]
    .filter((definitionId) => !kitchenEditorCatalogRegistry.has(definitionId))
    .sort();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The selected file could not be imported.";
}
