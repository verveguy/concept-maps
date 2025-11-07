# Concept Map Comparison Plans

## Status: 📋 FUTURE FEATURE

This document consolidates implementation plans for the concept map comparison feature from multiple AI model analyses. **This feature has NOT been implemented yet** - it is a planned future enhancement.

## Overview

The comparison feature will enable team members to compare their individual concept maps for a shared Domain, visualize differences and similarities, and collaboratively reconcile differences to create a shared, agreed-upon concept map.

## Plans Available

Three detailed implementation plans have been created by different AI models:

1. **Composer Plan** (`CONCEPT_MAP_COMPARISON_PLAN_COMPOSER.md`) - Comprehensive plan with detailed entity definitions and implementation phases
2. **GPT-5 Plan** (`CONCEPT_MAP_COMPARISON_PLAN_GPT5.md`) - Alternative approach with different architectural decisions
3. **Sonnet Plan** (`CONCEPT_MAP_COMPARISON_PLAN_SONNET.md`) - Third perspective on the implementation

## Core Requirements

1. **Team Management**: Multiple users organized into Teams
2. **Domain Organization**: Concept maps grouped by Domain (e.g., "Microservices Architecture", "Customer Journey")
3. **Individual Map Creation**: Each team member creates their own concept map for a Domain
4. **Comparison Visualization**: Visualize similarities and differences between maps
5. **Interactive Exploration**: Multi-user interactive comparison sessions
6. **Reconciliation**: Help team members merge differences into a shared map

## Key Entities

### Domain Entity
A Domain represents a topic/subject area that team members will create concept maps for.

### Team Entity
A Team represents a group of users who collaborate on domains and concept maps.

### TeamMember Entity
Represents membership of a user in a team, with role information.

### ComparisonSession Entity
Represents an active comparison session where team members are comparing maps.

## Implementation Considerations

When implementing this feature, consider:

1. **Schema Changes**: New entities (Domain, Team, TeamMember, ComparisonSession) need to be added to InstantDB schema
2. **UI Components**: New components needed for comparison visualization
3. **Real-time Collaboration**: Comparison sessions should support multiple users viewing simultaneously
4. **Performance**: Comparison algorithms need to be efficient for large maps
5. **Conflict Resolution**: How to handle concurrent edits during reconciliation

## Current Status

**Not Implemented**: This feature requires significant schema changes and new UI components. The current system supports:
- ✅ Individual concept maps
- ✅ Sharing and permissions
- ✅ Perspectives (filtered views of maps)
- ✅ Real-time collaboration

**Missing for Comparison Feature**:
- ❌ Team/Domain entities
- ❌ Comparison session management
- ❌ Comparison visualization UI
- ❌ Reconciliation workflow

## Next Steps (When Implementing)

1. Review all three plans to identify common patterns and best approaches
2. Design the schema additions based on the plans
3. Create UI mockups for the comparison interface
4. Implement in phases, starting with basic comparison and building up to reconciliation

## References

- See the individual plan files in the project root for detailed implementation details:
  - `CONCEPT_MAP_COMPARISON_PLAN_COMPOSER.md`
  - `CONCEPT_MAP_COMPARISON_PLAN_GPT5.md`
  - `CONCEPT_MAP_COMPARISON_PLAN_SONNET.md`

