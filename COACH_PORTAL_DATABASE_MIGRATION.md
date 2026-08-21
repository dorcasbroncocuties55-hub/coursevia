# Coach Portal Database Migration - Complete ✅

## Migration Summary
Successfully added missing columns to `coach_services` table in Supabase to support the full coach portal functionality.

## Database Changes

### Table: `coach_services`
Added two new columns:

1. **category** (TEXT)
   - Default: `'individual'`
   - Purpose: Service category for grouping and filtering
   - Values: `'individual'`, `'group'`, `'team'`, `'workshop'`
   - Comment: "Service category: individual, group, team, workshop"

2. **icon_index** (INTEGER)
   - Default: `0`
   - Purpose: Icon index (0-6) for service card display in the coach portal UI
   - Values: 0-6 (maps to predefined icon set)
   - Comment: "Icon index (0-6) for service card display"

## Migration SQL
```sql
-- Add category and icon_index columns to coach_services table
ALTER TABLE coach_services
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS icon_index INTEGER DEFAULT 0;

-- Add comments to explain the columns
COMMENT ON COLUMN coach_services.category IS 'Service category: individual, group, team, workshop';
COMMENT ON COLUMN coach_services.icon_index IS 'Icon index (0-6) for service card display';
```

## Verification
Verified table structure after migration:
```
coach_services columns:
- id (uuid)
- coach_id (uuid)
- title (text)
- description (text)
- price (numeric)
- duration_minutes (integer, default: 60)
- is_active (boolean, default: true)
- created_at (timestamp with time zone, default: now())
- service_delivery_mode (text)
- availability_schedule (jsonb)
- category (text, default: 'individual') ✅ NEW
- icon_index (integer, default: 0) ✅ NEW
```

## Existing Data
- Existing coach services (2 rows) will automatically have:
  - `category = 'individual'` (default)
  - `icon_index = 0` (default)

## Integration with Coach Portal

### CoachServicesManager.tsx
- Uses `category` for filtering services
- Displays service categories in dropdowns
- Groups services by category

### AddNewCoachService.tsx
- Category selector with options:
  - Individual Coaching
  - Group Coaching
  - Team Coaching
  - Workshop
- Icon picker with 7 color-coded icons (index 0-6)
- Service card preview shows selected icon and color

### Icon Mapping
```typescript
const iconOptions = [
  { Icon: User, bg: "#EBF5F6", color: "#0B4F60" },      // index 0
  { Icon: Users, bg: "#F2ECFE", color: "#7F56D9" },     // index 1
  { Icon: Activity, bg: "#FFF1E6", color: "#D97706" },  // index 2
  { Icon: Smile, bg: "#EAF7EE", color: "#10B981" },     // index 3
  { Icon: Sun, bg: "#FFF1E6", color: "#D97706" },       // index 4
  { Icon: Moon, bg: "#FFEBF5", color: "#D53F8C" },      // index 5
  { Icon: Heart, bg: "#F2ECFE", color: "#7F56D9" },     // index 6
];
```

## Related Tables
The coach portal also uses these existing tables:
- `coach_profiles` - Coach profile data (already exists)
- `bookings` - Booking records with coach_id FK (already exists)
- `provider_earnings` - Earnings tracking (already exists)
- `wallets` - Wallet balances (already exists)
- `session_payments` - Payment records (already exists)

## Status
✅ Migration complete
✅ Table structure verified
✅ Coach portal ready for testing
✅ Zero breaking changes to existing data
