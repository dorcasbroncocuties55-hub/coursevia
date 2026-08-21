# Add New Service Page - Testing Guide

## What Was Built
A standalone page for adding new therapy services with:
- **Figma-exact UI** - Live preview panel, icon picker, form fields
- **Direct Supabase integration** - Saves to `therapist_services` table
- **NOT in sidebar** - Accessible only via route `/therapist/services/new`
- **Full validation** - Required fields, min/max checks, error handling

## Files Created/Modified

### Created:
- `src/pages/therapist/AddNewService.tsx` - Full form + live preview

### Modified:
- `src/App.tsx` - Added route + lazy import
- `src/pages/therapist/TherapistServicesManager.tsx` - Updated buttons to navigate

## Routes Added
```
/therapist/services/new  →  AddNewService page
```

## Navigation Flow
```
Services page (/therapist/services)
  ↓
Click "Add New Service" (3 buttons total)
  ↓
Navigate to /therapist/services/new
  ↓
Fill form + see live preview
  ↓
Click "Save Service"
  ↓
Insert to therapist_services table
  ↓
Navigate back to /therapist/services
  ↓
New service appears in grid
```

## How to Test

### 1. Start Backend + Frontend
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

### 2. Login as Therapist
- Go to http://localhost:5173/login
- Login with therapist credentials

### 3. Navigate to Services
- Go to `/therapist/services`
- You should see the services grid page

### 4. Add New Service
Click any of the 3 "Add New Service" buttons:
- Header button (top right)
- Empty state button (if no services)
- Bottom banner button

### 5. Fill the Form
**Required:**
- Service Name: e.g. "Cognitive Behavioral Therapy"
- Duration: e.g. 50
- Price: e.g. 120

**Optional:**
- Category: Individual / Couples / Family / Group
- Description: Brief description of service
- Icon & Color: Choose from 7 preset options
- Initial Status: Active (toggle on) or Inactive (toggle off)

### 6. Watch Live Preview
- Right side shows card preview
- Updates in real-time as you type
- Matches Figma design

### 7. Save Service
- Click "Save Service" button
- Wait for success toast
- Redirects to `/therapist/services`
- New service appears in grid

### 8. Verify in Supabase
Check `therapist_services` table:
```sql
SELECT * FROM therapist_services ORDER BY created_at DESC LIMIT 1;
```

Should see:
- `therapist_id` - linked to your therapist_profile
- `title` - service name
- `description` - description text
- `duration_minutes` - duration value
- `price` - price value
- `is_active` - true/false
- `category` - selected category
- `icon_index` - 0-6 (icon choice)

## Form Validation

### Service Name
- **Required** - Shows error if empty
- Auto-trims whitespace

### Duration
- **Required** - Must be > 0
- Type: number (minutes)

### Price
- **Required** - Must be ≥ 0
- Type: number (USD)
- Supports decimals (e.g. 99.50)

### Description
- Optional
- 4 rows textarea
- Auto-trims whitespace

### Category
- Dropdown: Individual, Couples, Family, Group
- Default: Individual

### Icon Picker
- 7 preset icon/color combos
- Click to select
- Selected shows blue border
- Default: first icon (User)

### Status Toggle
- On = Active (green)
- Off = Inactive (gray)
- Default: Active

## Button Behavior

### "Cancel" Button
- Navigates back to `/therapist/services`
- Does NOT save
- No confirmation dialog

### "Save Service" Button
- Validates all fields
- Shows error toast if validation fails
- Disables during save
- Shows "Saving..." text
- On success:
  - Shows success toast
  - Navigates to `/therapist/services`
- On error:
  - Shows error toast
  - Stays on page
  - User can retry

### "Back" Button (arrow)
- Same as Cancel
- Top left of page

## Icon Options
1. **User** - Teal (`#0B4F60` on `#EBF5F6`)
2. **Users** - Purple (`#7F56D9` on `#F2ECFE`)
3. **Activity** - Orange (`#D97706` on `#FFF1E6`)
4. **Smile** - Green (`#10B981` on `#EAF7EE`)
5. **Sun** - Orange (`#D97706` on `#FFF1E6`)
6. **Moon** - Pink (`#D53F8C` on `#FFEBF5`)
7. **Heart** - Purple (`#7F56D9` on `#F2ECFE`)

## Expected Errors

### Missing Therapist Profile
**Error:** "Therapist profile not found"
**Cause:** User doesn't have row in `therapist_profiles`
**Fix:** Create therapist profile via onboarding

### Supabase Connection Error
**Error:** "Failed to create service"
**Cause:** Backend/Supabase down
**Fix:** Check backend server, Supabase credentials

### Invalid Token
**Error:** "You must be logged in"
**Cause:** Auth token expired
**Fix:** Re-login

## Database Schema
```sql
CREATE TABLE therapist_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES therapist_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  icon_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

## Design Notes
- **Color:** Coursevia brand teal (`#0B4F60`)
- **Font:** Inter (weights: 400, 500, 600, 700, 800)
- **Spacing:** 40px page padding, 32px section gaps
- **Border radius:** 16px cards, 8px inputs/buttons
- **Border:** 1px solid `#E2E8F0`
- **Background:** `#F8FAFC` page, `#FFFFFF` cards

## Success Criteria
✅ Page renders without errors  
✅ Form fields accept input  
✅ Live preview updates in real-time  
✅ Validation shows error toasts  
✅ Save inserts to Supabase  
✅ Redirects to services page  
✅ New service appears in grid  
✅ TypeScript: 0 errors  

## Next Steps
1. **Edit service** - Add edit modal/page
2. **Delete service** - Add delete confirmation
3. **Upload service images** - Add image field
4. **Service categories** - Add custom categories
5. **Booking integration** - Link to booking flow

---

**Status:** ✅ Complete  
**TypeScript Errors:** 0  
**Route:** `/therapist/services/new`  
**Not in sidebar:** Correct (per user request)
