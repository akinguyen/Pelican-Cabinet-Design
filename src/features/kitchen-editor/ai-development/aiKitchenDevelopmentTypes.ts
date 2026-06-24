export type AiKitchenCabinetTypeRequirement = {
  id: string;
  inputKind: "type";
  type?: string;
};

export type AiKitchenCabinetCategoryRequirement = {
  id: string;
  inputKind: "category";
  category?: string;
  quantity: number;
};

export type AiKitchenCabinetRequirement = AiKitchenCabinetTypeRequirement | AiKitchenCabinetCategoryRequirement;

export type AiKitchenCategoryRequirement = {
  id: string;
  category?: string;
  quantity: number;
};

export type AiKitchenDesignRequest = {
  cabinets: AiKitchenCabinetRequirement[];
  surfaces: AiKitchenCategoryRequirement[];
  appliances: AiKitchenCategoryRequirement[];
  fixtures: AiKitchenCategoryRequirement[];
  prompt: string;
};

export type AiDesignProgressStepStatus = "pending" | "active" | "complete" | "error";

export type AiDesignProgressStep = {
  id: string;
  label: string;
  status: AiDesignProgressStepStatus;
};

export type AiDesignState = "idle" | "editing-request" | "designing" | "complete" | "error";

export type AiKitchenDesignImage = {
  id: string;
  label: string;
  url: string;
};

export type AiKitchenDevelopmentChatMessage = {
  id: string;
  role: "user" | "assistant";
  body: string;
};
