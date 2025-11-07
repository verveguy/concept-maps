---
sidebar_position: 5
---

# Relationships

Relationships connect concepts and describe how they relate to each other.

## Creating Relationships

### In Graph View

#### Method 1: Drag and Drop
1. Click and drag from one concept node to another
2. Enter the relationship label
3. Optionally enter a reverse label (how the relationship reads in the opposite direction)
4. Press Enter to confirm

#### Method 2: Triple Entry Mode (Fast Keyboard Creation)
1. **Double-click** on a concept node to edit its label
2. Type a triple in the format: `"Noun verb phrase Noun"` (e.g., `"Diagrams explain Architecture"`)
3. Press **Enter** or click outside the input

The system will automatically:
- Update the current concept label to the first noun
- Create a new relationship with the verb phrase
- Create a new concept with the second noun
- Automatically enter edit mode on the new concept for continued typing

**Example:** Type `"React is used for UI"` → Creates concept "React", relationship "is used for", and concept "UI"

This method is ideal for rapid keyboard-based diagram creation, allowing you to chain multiple relationships quickly without using the mouse.

### In Text View

Type relationships in the format:
```
Noun verb phrase Noun
```

For example:
```
Diagrams explain Architecture
React is used for UI
Components contain Props
```

The parser automatically:
- Creates concepts if they don't exist
- Creates the relationship
- Positions new concepts at default coordinates

## Relationship Properties

Each relationship can have:

- **Primary Label**: The label reading from source to target
- **Reverse Label**: The label reading from target to source (optional)
- **Notes**: Markdown-formatted notes
- **Metadata**: Custom key-value pairs

## Editing Relationships

1. Click on a relationship edge
2. Use the relationship editor panel to modify:
   - Labels
   - Notes
   - Metadata

## Relationship Types

While the tool doesn't enforce specific relationship types, common patterns include:

- **"is a"**: Hierarchical relationships (e.g., "Dog is a Mammal")
- **"has"**: Composition/possession (e.g., "Car has Engine")
- **"causes"**: Causal relationships (e.g., "Rain causes Flood")
- **"relates to"**: General associations

## Deleting Relationships

- Click on a relationship edge and press `Delete`
- Or right-click and select "Delete"
