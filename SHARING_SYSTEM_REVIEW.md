# Sharing System Comprehensive Review & Fix Plan

## Executive Summary

The sharing system has several critical issues:
1. **Inconsistent permission link management** - Permission links aren't always created/updated/removed correctly
2. **Atomicity issues** - Multiple transactions where one should be used
3. **Data access problems** - User ID retrieval relies on fallback logic instead of reliable link access
4. **Permission rule bugs** - Using `in` for single-valued links, incorrect CEL expressions
5. **Missing cleanup** - Revoking invitations doesn't clean up associated shares and permission links
6. **Query gaps** - Not loading permission links when needed

## Critical Issues Found

### 1. **Permission Rules - Link Reference Operators**

**IMPORTANT**: InstantDB's `data.ref()` for link references **always requires the `in` operator**, even for single-valued links (`has: 'one'`). This is because `data.ref()` returns an array-like structure even for single-valued links.

**Correct Pattern**: Always use `auth.id in data.ref("link.id")` for link references, regardless of whether the link is `has: 'one'` or `has: 'many'`.

**Incorrect Pattern**: Using `auth.id == data.ref("link.id")` will fail even for single-valued links.

**Locations**: All link reference checks use `in`:
- `maps.isOwner`: `auth.id in data.ref("creator.id")` ✓
- `shares.mapOwnerOnly`: `auth.id in data.ref("map.creator.id")` ✓
- `shares.shareRecipient`: `auth.id in data.ref("user.id")` ✓
- `concepts/perspectives/relationships.mapIsOwned`: `auth.id in data.ref("map.creator.id")` ✓

### 2. **Revoke Invitation Doesn't Clean Up**

**Issue**: When revoking an invitation, we don't:
- Revoke associated share (if it exists)
- Remove permission links
- Check if share was already accepted

**Impact**: Users can still access maps after invitation is revoked if they already accepted.

**Fix**: `revokeInvitation` should:
1. Find associated share by invitation ID or user email
2. Revoke the share if found
3. Remove permission links
4. Update invitation status

### 3. **Accept Invitation Uses Two Transactions**

**Issue**: `acceptInvitation` in `useSharing.ts` uses two separate transactions (lines 146-153 and 155-172), breaking atomicity.

**Impact**: If second transaction fails, invitation is marked accepted but share/permission links aren't created.

**Fix**: Combine into single atomic transaction.

### 4. **Update Share Permission Has Complex Fallback Logic**

**Issue**: `updateSharePermission` tries multiple fallback methods to get userId (lines 243-254), suggesting unreliable data access.

**Root Cause**: Query may not be loading `user` link reliably, or there's a timing issue.

**Fix**: 
- Ensure query includes `user: {}` link (already done)
- Add validation that `shareRecord.user?.id` exists
- If missing, fetch share directly in transaction context
- Simplify logic to rely on link data

### 5. **Revoke Share Missing Permission Link Cleanup**

**Issue**: `revokeShare` correctly removes permission links BUT only if it can find userId through fallback logic. If fallback fails, permission links remain.

**Fix**: Ensure we always get userId from the share's user link. If missing, query share directly.

### 6. **Query Doesn't Load Permission Links**

**Issue**: `useSharing` query doesn't include `writePermissions` and `readPermissions` for maps. While not strictly needed for the hook, it would help with debugging and ensure data consistency.

**Fix**: Add permission links to query:
```typescript
maps: {
  $: { where: { id: mapId } },
  shares: { user: {} },
  shareInvitations: { creator: {} },
  writePermissions: {},
  readPermissions: {},
}
```

### 7. **InvitationPage Duplicates Logic**

**Issue**: `InvitationPage` has its own implementation of accepting invitations (lines 115-138) that duplicates `useSharing.acceptInvitation` logic.

**Impact**: Two code paths doing the same thing increases maintenance burden and risk of inconsistency.

**Fix**: Use `useSharing.acceptInvitation` hook instead of duplicating logic.

### 8. **Share Status Not Validated Before Update**

**Issue**: `updateSharePermission` and `revokeShare` don't check if share is already revoked before processing.

**Impact**: Might try to update revoked shares or remove permission links that don't exist.

**Fix**: Add early return if share is already revoked.

### 9. **Permission Links Not Cleaned Up on Share Update**

**Issue**: When updating share permission from `edit` to `view`, we correctly unlink `writePermissions` and link `readPermissions`. However, there's no validation that the user was actually in `writePermissions` before, or in `readPermissions` for reverse direction.

**Impact**: If permission links are out of sync with share permissions, updates might fail or leave stale links.

**Fix**: Always unlink from both permission links before linking to the correct one (idempotent operation).

### 10. **Revoke Invitation Missing Share Cleanup**

**Issue**: `revokeInvitation` doesn't find and revoke associated shares. Shares created from invitations need to be tracked and revoked together.

**Root Cause**: No direct link from `shares` to `shareInvitations` to track relationship.

**Fix Option A**: Add link `shareInvitation` to `shares` entity (requires schema change)
**Fix Option B**: Find share by matching `invitedUserId`/`invitedEmail` with share's `user` link (current approach but needs implementation)

## Implementation Plan

### Phase 1: Fix Permission Rules (Critical)

1. **Fix `maps.isOwner`** - Change `in` to `==` for single-valued link
2. **Verify all other permission rules** - Ensure `==` for single-valued, `in` for multi-valued

### Phase 2: Fix Atomicity Issues

1. **Combine `acceptInvitation` transactions** - Single atomic transaction
2. **Ensure `updateSharePermission` is atomic** - All operations in one transaction (already done)

### Phase 3: Fix Data Access & Cleanup

1. **Simplify userId retrieval** - Always get from `shareRecord.user?.id`, add direct query if missing
2. **Fix `revokeInvitation`** - Add logic to find and revoke associated shares + remove permission links
3. **Add validation** - Check share status before updates
4. **Idempotent permission link updates** - Always unlink from both before linking to correct one

### Phase 4: Consolidate & Improve

1. **Use `useSharing` hook in `InvitationPage`** - Remove duplicate logic
2. **Add permission links to queries** - For debugging and consistency
3. **Add comprehensive error handling** - Better error messages and recovery

### Phase 5: Testing & Validation

1. **Test all flows**:
   - Create invitation → Accept → Update permission → Revoke share
   - Create invitation → Revoke invitation (before acceptance)
   - Create invitation → Accept → Revoke invitation (after acceptance)
   - Update permission: view → edit
   - Update permission: edit → view
2. **Verify permission links** - Check database after each operation
3. **Test edge cases** - Missing user links, revoked shares, etc.

## Detailed Fixes

### Fix 1: Permission Rules

**Note**: After testing, we discovered that InstantDB's `data.ref()` **always requires `in` operator**, even for single-valued links. The correct pattern is:

```typescript
// src/instant.perms.ts
maps: {
  bind: [
    'isOwner',
    'auth.id != null && auth.id in data.ref("creator.id")', // Always use 'in' for link refs
    // ... rest unchanged
  ],
}
```

All link reference checks should use `in`, regardless of whether the link is `has: 'one'` or `has: 'many'`.

### Fix 2: Revoke Invitation with Cleanup

```typescript
const revokeInvitation = useCallback(
  async (invitationId: string) => {
    if (!currentUser?.id) throw new Error('Authentication required')
    
    const invitation = invitations.find(inv => inv.id === invitationId)
    if (!invitation) throw new Error('Invitation not found')
    
    // Find associated share by invitation ID (both use same ID) or by user
    const sharesData = data?.maps?.[0]?.shares || []
    const associatedShare = sharesData.find((s: any) => 
      s.id === invitationId || // Share ID matches invitation ID
      (s.user?.id === invitation.invitedUserId && s.status === 'active')
    )
    
    const operations: any[] = [
      tx.shareInvitations[invitationId].update({
        status: 'revoked',
        revokedAt: Date.now(),
      }),
    ]
    
    // Revoke associated share if it exists
    if (associatedShare) {
      operations.push(
        tx.shares[associatedShare.id].update({
          status: 'revoked',
          revokedAt: Date.now(),
        })
      )
      
      // Remove permission links
      const userId = associatedShare.user?.id
      if (userId) {
        operations.push(
          ...(invitation.permission === 'edit'
            ? [tx.maps[invitation.mapId].unlink({ writePermissions: userId })]
            : [tx.maps[invitation.mapId].unlink({ readPermissions: userId })])
        )
      }
    }
    
    await db.transact(operations)
  },
  [invitations, data, currentUser?.id]
)
```

### Fix 3: Accept Invitation - Single Transaction

```typescript
const acceptInvitation = useCallback(
  async (invitationId: string) => {
    if (!userId) throw new Error('Authentication required')
    
    const invitation = invitations.find(inv => inv.id === invitationId)
    if (!invitation) throw new Error('Invitation not found')
    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be accepted')
    }
    
    // Single atomic transaction
    await db.transact([
      tx.shareInvitations[invitationId].update({
        status: 'accepted',
        invitedUserId: userId,
        respondedAt: Date.now(),
        revokedAt: null,
      }),
      tx.shares[invitation.id]
        .update({
          permission: invitation.permission,
          createdAt: Date.now(),
          acceptedAt: Date.now(),
          status: 'active',
          revokedAt: null,
        })
        .link({
          user: userId,
          map: invitation.mapId,
        }),
      // Create permission links based on the invitation permission
      ...(invitation.permission === 'edit'
        ? [tx.maps[invitation.mapId].link({ writePermissions: userId })]
        : [tx.maps[invitation.mapId].link({ readPermissions: userId })]),
    ])
  },
  [invitations, userId]
)
```

### Fix 4: Simplify Update Share Permission

```typescript
const updateSharePermission = useCallback(
  async (shareId: string, permission: 'view' | 'edit') => {
    const sharesData = data?.maps?.[0]?.shares || []
    const shareRecord = sharesData.find((s: any) => s.id === shareId)
    
    if (!shareRecord) throw new Error('Share not found')
    if (shareRecord.status !== 'active') {
      throw new Error('Can only update permissions for active shares')
    }
    
    const share = shares.find((s) => s.id === shareId)
    if (!share) throw new Error('Share not found')
    if (!share.mapId) throw new Error('Share map ID is required')
    
    // Get userId from link - should always exist for active shares
    const userId = shareRecord.user?.id
    if (!userId) {
      throw new Error('Share is missing user link. This should not happen for active shares.')
    }
    
    if (share.permission === permission) return // No change needed
    
    // Always unlink from both permission links first (idempotent)
    // Then link to the correct one
    await db.transact([
      tx.shares[shareId].update({
        permission,
      }),
      // Unlink from old permission type
      ...(share.permission === 'edit'
        ? [tx.maps[share.mapId].unlink({ writePermissions: userId })]
        : [tx.maps[share.mapId].unlink({ readPermissions: userId })]),
      // Link to new permission type
      ...(permission === 'edit'
        ? [tx.maps[share.mapId].link({ writePermissions: userId })]
        : [tx.maps[share.mapId].link({ readPermissions: userId })]),
    ])
  },
  [shares, data]
)
```

### Fix 5: Simplify Revoke Share

```typescript
const revokeShare = useCallback(
  async (shareId: string) => {
    const sharesData = data?.maps?.[0]?.shares || []
    const shareRecord = sharesData.find((s: any) => s.id === shareId)
    
    if (!shareRecord) throw new Error('Share not found')
    if (shareRecord.status === 'revoked') {
      return // Already revoked
    }
    
    const share = shares.find((s) => s.id === shareId)
    if (!share) throw new Error('Share not found')
    if (!share.mapId) throw new Error('Share map ID is required')
    
    // Get userId from link - should always exist
    const userId = shareRecord.user?.id
    if (!userId) {
      throw new Error('Share is missing user link. Cannot revoke.')
    }
    
    const operations: any[] = [
      tx.shares[shareId].update({
        status: 'revoked',
        revokedAt: Date.now(),
      }),
    ]
    
    // Remove permission links based on current permission
    operations.push(
      ...(share.permission === 'edit'
        ? [tx.maps[share.mapId].unlink({ writePermissions: userId })]
        : [tx.maps[share.mapId].unlink({ readPermissions: userId })])
    )
    
    await db.transact(operations)
  },
  [shares, data]
)
```

### Fix 6: Use Hook in InvitationPage

```typescript
// src/pages/InvitationPage.tsx
export function InvitationPage({ inviteToken }: InvitationPageProps) {
  const auth = db.useAuth()
  const { setCurrentMapId } = useMapStore()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Get invitation data
  const invitationQuery = db.useQuery(...)
  const invitationRecord = invitationQuery?.data?.shareInvitations?.[0] ?? null
  
  // Use sharing hook if we have an invitation
  const { acceptInvitation: acceptInvitationHook } = useSharing(
    invitationRecord?.map?.id || null
  )
  
  const handleAccept = async () => {
    if (!invitationRecord) return
    setIsProcessing(true)
    try {
      await acceptInvitationHook(invitationRecord.id)
      setCurrentMapId(invitationRecord.map?.id || '')
    } catch (error) {
      setErrorMessage('Failed to accept invitation')
    } finally {
      setIsProcessing(false)
    }
  }
  
  // ... rest of component
}
```

## Summary

The main issues are:
1. **Permission rules** - Fix single-valued link operators
2. **Atomicity** - Combine related operations into single transactions
3. **Cleanup** - Properly revoke shares and remove permission links when revoking invitations
4. **Data access** - Simplify userId retrieval, rely on link data
5. **Idempotency** - Make permission link updates idempotent
6. **Consolidation** - Remove duplicate logic between InvitationPage and useSharing

The fixes prioritize data integrity and consistency while simplifying the codebase.

