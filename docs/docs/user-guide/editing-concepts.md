---
sidebar_position: 4
---

# Editing Concepts

Concepts are the fundamental building blocks of concept maps. They represent ideas, objects, or entities.

## Creating Concepts

### In Graph View

- **Double-click** anywhere on the canvas to create a new concept
- Or use the keyboard shortcut: `Ctrl/Cmd + D`

### In Text View

- Type a new concept name in the structured text format
- Concepts are automatically created when you define relationships

## Editing Concept Labels

- **Double-click** on a concept node to edit its label inline
- Or select the concept and use the concept editor panel
- When selected, a **floating toolbar** appears with quick editing options

### Triple Entry Mode (Fast Keyboard Creation)

When editing a concept label, you can use **triple entry mode** to quickly create relationships and new concepts:

1. **Double-click** on a concept node to edit its label
2. Type a triple in the format: `"Noun verb phrase Noun"` (e.g., `"Diagrams explain Architecture"`)
3. Press **Enter** or click outside the input

The system will automatically:
- Update the current concept label to the first noun ("Diagrams")
- Create a new relationship with the verb phrase ("explain")
- Create a new concept with the second noun ("Architecture")
- **Automatically enter edit mode** on the new concept so you can continue typing more triples

**Example workflow:**
1. Double-click a concept and type: `"Diagrams explain Architecture"`
2. Press Enter → Creates relationship and new concept
3. The new "Architecture" concept is automatically in edit mode
4. Type: `"Architecture describes Structure"`
5. Press Enter → Creates another relationship and concept
6. Continue chaining triples for rapid diagram creation!

This makes it much faster to create complex diagrams using just the keyboard, without needing to use the mouse to drag connections.

## Concept Properties

Each concept can have:

- **Label**: The display name
- **Position**: X and Y coordinates (in graph view)
- **Notes**: Markdown-formatted notes
- **Metadata**: Custom key-value pairs
- **Visual Styling**: Custom colors (fill, border, text) and line styles

## Visual Customization

When a concept is selected, a **floating toolbar** appears above or below the node with options to customize its appearance:

### Color Customization
- **Fill Color**: Background color of the concept node
- **Border Color**: Color of the node border
- **Text Color**: Color of the concept label text

### Line Style Settings
- **Border Style**: Choose from solid, dashed, dotted, or long-dash styles
- **Border Thickness**: Adjust from 1px to 8px

All changes are applied instantly and saved automatically.

## Editing Notes

1. Select a concept
2. Click "Edit Notes" in the concept editor panel
3. Write your notes in Markdown
4. Save changes

## Editing Metadata

1. Select a concept
2. Click "Edit Metadata" in the concept editor panel
3. Add key-value pairs
4. Save changes

## Deleting Concepts

- Select a concept and press `Delete` or `Backspace`
- Or right-click and select "Delete"

Deleting a concept will also delete all relationships connected to it.
