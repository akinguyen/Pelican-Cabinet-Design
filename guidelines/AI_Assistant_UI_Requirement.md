# AI Assistant Chat UI Requirement — Kitchen Design Workflow

## 1. Feature Name

AI Assistant Chat — Guided Kitchen Design Request Flow

## 2. Current Status

The current AI Assistant Chat panel is visible in the left sidebar of the Kitchen Editor, but it is only a UI shell. It does not currently connect to the scene state, backend, AI service, or design generation workflow.

This requirement defines the new UI behavior for turning the AI Assistant Chat panel into a guided kitchen design request interface.

## 3. Goal

Allow users to describe the kitchen they want by filling structured kitchen item requirements, adding a free-text design prompt, sending the request, seeing a visible design-progress state, and then receiving generated kitchen design images in the chat panel.

## 4. Target Area

The feature should be implemented inside the left AI Assistant Chat panel.

Primary related UI areas:

- Left sidebar: AI Assistant Chat
- Center editor canvas: Floor Plan / Perspective / Elevation viewport
- Global workspace overlay: blurred “Designing in progress” state during AI generation

The right Editor Panel and existing catalog behavior should remain unchanged.

## 5. User Flow Summary

### Step 1 — Initial AI Chat Form

When the AI Chat panel loads, it should show:

```txt
Hello! I can help you design kitchen.
```

Below the greeting, the panel should show structured input sections for:

- Cabinets
- Surfaces
- Appliances
- Fixtures

Each section allows the user to specify item requirements using dropdowns and number inputs.

### Step 2 — User Fills Requirements

The user selects kitchen item types/categories and enters quantities.

The user may also type additional design instructions in the message box, for example:

```txt
Design me a kitchen with modern style.
```

### Step 3 — User Sends Request

When the user clicks **Send**, the UI should collect:

- Cabinet requirements
- Surface requirements
- Appliance requirements
- Fixture requirements
- Free-text design prompt

Then it should start the AI design progress state.

### Step 4 — Designing In Progress

While the AI system is working:

- The main editor viewport should be blurred or visually dimmed.
- A centered overlay should show:

```txt
Designing in progress
```

- The AI Chat panel should show a thinking/progress sequence to make the waiting process feel active.

Suggested progress sequence:

```txt
Start design
Analyzing kitchen requirements
Thinking about cabinet arrangement
Cabinet arrangement finished
Planning surface placement
Surface arrangement finished
Arranging appliances
Appliance arrangement finished
Placing fixtures
Fixture placement finished
Checking spacing and layout balance
Preparing kitchen design images
Finished design
```

The progress sequence may be shown as a vertical step list, animated timeline, or chat-style assistant messages.

### Step 5 — Generated Result

After the AI generation finishes, the chat should show:

```txt
This is the kitchen design image for you.
```

Below the message, the panel should display generated kitchen design images.

Images should appear as image cards or thumbnails inside the chat panel.

## 6. Detailed UI Requirements

### 6.1 AI Chat Initial State

The left AI panel should contain:

- Panel title: `AI Assistant Chat`
- Greeting message
- Structured design requirement form
- Free-text message box
- Send button

The existing placeholder text explaining that the AI is not connected should be removed or replaced by the new guided workflow.

### 6.2 Greeting

Display the greeting near the top of the chat content:

```txt
Hello! I can help you design kitchen.
```

Optional improved copy:

```txt
Hello! I can help you design your kitchen. Fill in the items you want, then tell me your preferred style.
```

### 6.3 Cabinets Section

The Cabinets section should allow multiple rows.

Default rows:

#### Row 1

- Dropdown label: `Type`
- Dropdown placeholder: `Select type`
- Number input label: `Number`
- Number input placeholder: `0`

#### Row 2

- Dropdown label: `Category`
- Dropdown placeholder: `Select category`
- Number input label: `Number`
- Number input placeholder: `0`

Action:

```txt
+ Add
```

Clicking `+ Add` should add another cabinet requirement row.

Suggested cabinet dropdown values should be based on existing catalog groups:

- Base cabinets
- Wall cabinets
- Pantry cabinets
- Built-in cabinets

Suggested cabinet category values may include:

- Standard base cabinets
- Drawer base cabinets
- Sink base cabinets
- Corner base cabinets
- Pullout rack base cabinets
- Standard wall cabinets
- Blind wall cabinets
- Base pantry cabinets
- Wall pantry cabinets
- Oven cabinets
- Microwave cabinets

### 6.4 Surfaces Section

The Surfaces section should allow multiple rows.

Default row:

- Dropdown label: `Category`
- Dropdown placeholder: `Select category`
- Number input label: `Number`
- Number input placeholder: `0`

Action:

```txt
+ Add
```

Suggested dropdown values:

- Countertops

### 6.5 Appliances Section

The Appliances section should allow multiple rows.

Default row:

- Dropdown label: `Category`
- Dropdown placeholder: `Select category`
- Number input label: `Number`
- Number input placeholder: `0`

Action:

```txt
+ Add
```

Suggested dropdown values:

- Cooking
- Cooktops
- Dishwashers
- Refrigeration
- Ventilation

### 6.6 Fixtures Section

The Fixtures section should allow multiple rows.

Default row:

- Dropdown label: `Category`
- Dropdown placeholder: `Select category`
- Number input label: `Number`
- Number input placeholder: `0`

Action:

```txt
+ Add
```

Suggested dropdown values:

- Sinks
- Faucets

### 6.7 Free-Text Message Box

At the bottom of the AI panel, keep the message composer.

Placeholder text:

```txt
Tell me your preferred style, layout, or extra requirements.
```

Example user input:

```txt
Design me a kitchen with modern style.
```

The message box should support multiline text.

### 6.8 Send Button

The Send button should be enabled when at least one of the following is true:

- The user entered at least one valid item quantity
- The user entered free-text instructions

When clicked, Send should:

1. Collect all form data
2. Collect the free-text prompt
3. Add the user request to the chat history
4. Start the designing state
5. Disable editing while generation is in progress

## 7. Designing State UI

### 7.1 Main Editor Blur Overlay

When generation starts, the center editor area should show a temporary overlay.

Required behavior:

- Blur the main canvas/editor viewport
- Optionally dim the viewport using a translucent white or dark overlay
- Show centered text:

```txt
Designing in progress
```

Optional subtext:

```txt
AI is arranging cabinets, surfaces, appliances, and fixtures.
```

The top toolbar, right panel, and left panel may remain visible, but the center design area should clearly indicate that generation is active.

### 7.2 Chat Thinking Sequence

During generation, the AI chat should show progress steps.

Recommended visual style:

- A vertical timeline
- Each step has an icon or status dot
- Active step shows spinner or pulsing dot
- Completed steps show check mark
- Pending steps are muted

Suggested sequence:

1. Start design
2. Analyzing kitchen requirements
3. Thinking about cabinet arrangement
4. Cabinet arrangement finished
5. Planning surface placement
6. Surface arrangement finished
7. Arranging appliances
8. Appliance arrangement finished
9. Placing fixtures
10. Fixture placement finished
11. Checking spacing and layout balance
12. Preparing kitchen design images
13. Finished design

### 7.3 Disabled Controls During Generation

During generation:

- Disable Send button
- Disable form editing
- Disable Add buttons
- Disable dropdowns and number inputs
- Message box should be read-only or disabled
- Show a loading label on the Send button, for example:

```txt
Designing...
```

## 8. Result State UI

After the AI system finishes:

The chat should show an assistant message:

```txt
This is the kitchen design image for you.
```

Below the message, display generated images.

Image display requirements:

- Show one or more generated kitchen images
- Use image cards or thumbnails
- Images should fit inside the AI panel width
- If multiple images are returned, show them in a vertical list or 2-column thumbnail grid
- Each image card may include a small label, for example:
  - `Design Image 1`
  - `Design Image 2`
  - `Perspective View`
  - `Floor Plan View`

Optional actions below images:

- `Use this design`
- `Generate again`
- `Refine request`

These optional actions can be implemented later if they are outside the current phase.

## 9. Empty, Error, and Retry States

### 9.1 Empty Input

If the user clicks Send without entering structured requirements or a text prompt, show a validation message:

```txt
Please add at least one requirement or describe the kitchen you want.
```

### 9.2 Generation Error

If the AI generation fails, show:

```txt
Something went wrong while designing your kitchen.
```

Optional retry button:

```txt
Try again
```

The main editor blur overlay should be removed when an error occurs.

### 9.3 No Images Returned

If generation finishes but no image is returned, show:

```txt
The design finished, but no image was generated.
```

Optional action:

```txt
Generate image again
```

## 10. Data Model Requirement

The UI should collect the request in a structured object.

Example shape:

```ts
type AiKitchenDesignRequest = {
  cabinets: {
    type?: string;
    category?: string;
    quantity: number;
  }[];
  surfaces: {
    category?: string;
    quantity: number;
  }[];
  appliances: {
    category?: string;
    quantity: number;
  }[];
  fixtures: {
    category?: string;
    quantity: number;
  }[];
  prompt: string;
};
```

The UI should also track design progress state.

Example shape:

```ts
type AiDesignProgressStepStatus = "pending" | "active" | "complete" | "error";

type AiDesignProgressStep = {
  id: string;
  label: string;
  status: AiDesignProgressStepStatus;
};

type AiDesignState =
  | "idle"
  | "editing-request"
  | "designing"
  | "complete"
  | "error";
```

Generated image result example:

```ts
type AiKitchenDesignImage = {
  id: string;
  label: string;
  url: string;
};
```

## 11. Suggested Component Structure

Suggested new or updated components:

```txt
src/features/kitchen-editor/ai-panel/
├── KitchenAiPanel.tsx
├── AiChatPanel.tsx
├── AiKitchenDesignForm.tsx
├── AiKitchenRequirementSection.tsx
├── AiKitchenRequirementRow.tsx
├── AiDesignProgressTimeline.tsx
├── AiGeneratedDesignImages.tsx
└── aiKitchenDesignTypes.ts
```

Suggested overlay component:

```txt
src/features/kitchen-editor/workspace/
└── AiDesignInProgressOverlay.tsx
```

Alternative location:

```txt
src/features/kitchen-editor/ai-panel/
└── AiDesignInProgressOverlay.tsx
```

## 12. Styling Requirements

The new UI should match the current Kitchen Editor design language:

- Light background
- Rounded cards
- Thin borders
- Soft gray labels
- Compact spacing
- Clear section titles
- Small form inputs suitable for the narrow AI sidebar
- Primary action button for Send
- Muted disabled states during generation

The form should remain usable within the existing left sidebar width.

## 13. Acceptance Criteria

The implementation is complete when:

1. The AI panel no longer only shows the placeholder “not connected” message
2. The AI panel displays the greeting and structured kitchen design form
3. Users can add multiple rows for Cabinets, Surfaces, Appliances, and Fixtures
4. Users can select dropdown values and enter quantities
5. Users can type additional instructions in the message box
6. Clicking Send creates a user request in the chat
7. Clicking Send starts a visible designing state
8. The center editor viewport is blurred or dimmed with “Designing in progress”
9. The AI panel shows a progress/thinking sequence while waiting
10. Form controls are disabled during generation
11. After completion, the chat displays “This is the kitchen design image for you.”
12. Generated kitchen images are displayed inside the AI chat panel
13. Error and empty-input states are handled gracefully
14. The existing Perspective, Floor Plan, and Elevation views continue to work
15. The right Editor Panel and catalog behavior remain unchanged

## 14. Implementation Scope Notes

This requirement focuses on the UI behavior and interaction flow.

The first implementation may use mocked AI generation and mocked generated images if the backend or real AI service is not ready yet.

A later implementation phase can connect this UI to:

- Real AI service
- Scene generation commands
- Automatic placement of cabinets, surfaces, appliances, and fixtures
- Generated layout mutation inside `DesignScene`
- Saved design history
