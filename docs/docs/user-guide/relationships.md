---
sidebar_position: 5
---

# Relationships

Relationships connect concepts and describe how they relate to each other.

## Creating Relationships

### In Graph View

1. Click and drag from one concept node to another
2. Enter the relationship label
3. Optionally enter a reverse label (how the relationship reads in the opposite direction)
4. Press Enter to confirm

### In Text View

Type relationships in the format:
```
Concept1 --[relationship label]--> Concept2
```

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
