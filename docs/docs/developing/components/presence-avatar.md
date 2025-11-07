---
sidebar_position: 11
---

# PresenceAvatar

The `PresenceAvatar` component displays user avatars for presence indicators.

## Overview

`PresenceAvatar` shows:

- User avatar/initials
- Color coding per user
- User name on hover

## Props

```typescript
interface PresenceAvatarProps {
  userId: string
  userName: string
  color: string
}
```

## Usage

```tsx
import { PresenceAvatar } from '@/components/presence/PresenceAvatar'

<PresenceAvatar userId={user.id} userName={user.name} color={user.color} />
```
