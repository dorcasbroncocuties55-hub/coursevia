# 🔍 Algolia Course Search Integration

## Overview
This guide will help you integrate Algolia search for your courses, providing fast, typo-tolerant search with filters and facets.

---

## 📋 Prerequisites

1. **Algolia Account**
   - Sign up at [algolia.com](https://www.algolia.com/)
   - Create a new application
   - Get your credentials:
     - Application ID
     - Search-Only API Key (for frontend)
     - Admin API Key (for indexing)

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
npm install algoliasearch react-instantsearch
# or
yarn add algoliasearch react-instantsearch
```

### Step 2: Add Environment Variables

**Frontend (`.env`):**
```env
VITE_ALGOLIA_APP_ID=your_app_id_here
VITE_ALGOLIA_SEARCH_KEY=your_search_only_key_here
VITE_ALGOLIA_INDEX_NAME=courses
```

**Backend (`backend/.env`):**
```env
ALGOLIA_APP_ID=your_app_id_here
ALGOLIA_ADMIN_KEY=your_admin_api_key_here
ALGOLIA_INDEX_NAME=courses
```

### Step 3: Configure Algolia Index

In Algolia Dashboard:
1. Go to **Indices** → Create Index → Name it `courses`
2. Go to **Configuration** → **Searchable Attributes**:
   ```
   title
   description
   short_description
   category
   tags
   ```
3. Go to **Facets**:
   ```
   category
   price_range
   level
   rating
   ```
4. Go to **Ranking**:
   - Add custom ranking: `desc(rating)`
   - Add custom ranking: `desc(total_students)`

---

## 📁 Files to Create

### 1. Algolia Client Configuration
**File:** `src/lib/algolia.ts`

### 2. Algolia Search Component
**File:** `src/components/search/AlgoliaSearch.tsx`

### 3. Updated Courses Page
**File:** `src/pages/public/Courses.tsx` (updated)

### 4. Backend Sync Script
**File:** `backend/algolia-sync.js`

---

## 🎯 Features

### Frontend Features
- ✅ Instant search as you type
- ✅ Typo tolerance
- ✅ Category filters
- ✅ Price range filters
- ✅ Rating filters
- ✅ Pagination
- ✅ Search highlighting
- ✅ Mobile responsive

### Backend Features
- ✅ Automatic indexing on course create/update
- ✅ Bulk sync script
- ✅ Delete from index when course deleted

---

## 🔄 Data Sync Options

### Option 1: Manual Sync (Quick Start)
Run the sync script whenever you add/update courses:
```bash
cd backend
node algolia-sync.js
```

### Option 2: Automatic Sync (Recommended)
Add Algolia indexing to your backend API endpoints:
- When course is created → Add to Algolia
- When course is updated → Update in Algolia
- When course is deleted → Remove from Algolia

### Option 3: Supabase Triggers (Advanced)
Set up database triggers to sync automatically.

---

## 📊 Index Structure

Each course document in Algolia:
```json
{
  "objectID": "course-uuid",
  "title": "Course Title",
  "description": "Full description",
  "short_description": "Short description",
  "category": "Technology",
  "tags": ["javascript", "react", "web"],
  "price": 49.99,
  "price_range": "paid", // "free" or "paid"
  "level": "beginner", // "beginner", "intermediate", "advanced"
  "rating": 4.5,
  "total_students": 1234,
  "thumbnail_url": "https://...",
  "slug": "course-slug",
  "is_published": true,
  "created_at": 1234567890
}
```

---

## 🎨 UI Components

### Search Box
- Instant search with debouncing
- Clear button
- Search icon
- Loading state

### Filters
- Category chips
- Price range (Free/Paid)
- Rating filter
- Level filter

### Results
- Course cards with highlighting
- Pagination
- Results count
- Empty state

---

## 🔧 Customization

### Adjust Search Relevance
In Algolia Dashboard → Configuration → Ranking:
- Adjust attribute weights
- Add custom ranking criteria
- Configure typo tolerance

### Add More Filters
1. Add field to index structure
2. Configure as facet in Algolia
3. Add filter UI component

### Styling
All components use Tailwind CSS and match your existing design.

---

## 📈 Performance

### Algolia Benefits
- ⚡ Sub-50ms search response
- 🌍 Global CDN
- 🔍 Typo tolerance
- 📱 Mobile optimized
- 🎯 Relevant results

### Best Practices
- Use search-only API key in frontend
- Index only published courses
- Update index on course changes
- Monitor search analytics

---

## 🧪 Testing

### Test Search
1. Go to `/courses`
2. Type in search box
3. Should see instant results
4. Try typos (e.g., "javascrpt" → "javascript")

### Test Filters
1. Click category chips
2. Toggle price filters
3. Results should update instantly

### Test Pagination
1. Scroll to bottom
2. Click "Load More" or page numbers
3. Should load next page

---

## 📊 Analytics

Algolia provides built-in analytics:
- Top searches
- No results searches
- Click-through rate
- Conversion tracking

Access in Algolia Dashboard → Analytics

---

## 🆘 Troubleshooting

### Issue: No results showing
**Fix:**
1. Check API keys in `.env`
2. Run sync script: `node backend/algolia-sync.js`
3. Check index name matches

### Issue: Search not working
**Fix:**
1. Check browser console for errors
2. Verify Algolia credentials
3. Check network tab for API calls

### Issue: Results not updating
**Fix:**
1. Re-run sync script
2. Check course is published
3. Verify index configuration

---

## 💰 Pricing

Algolia offers:
- **Free Tier**: 10,000 searches/month, 10,000 records
- **Growth**: $1/1,000 searches
- **Premium**: Custom pricing

For most small-medium platforms, free tier is sufficient.

---

## 🔐 Security

### API Keys
- ✅ Use Search-Only key in frontend
- ✅ Keep Admin key in backend only
- ✅ Never commit keys to git
- ✅ Use environment variables

### Index Security
- Configure API key restrictions
- Set rate limits
- Enable HTTPS only

---

## 🚀 Next Steps

1. **Install dependencies**
2. **Get Algolia credentials**
3. **Add environment variables**
4. **Create the files** (see below)
5. **Run sync script**
6. **Test search**

---

## 📚 Resources

- [Algolia Documentation](https://www.algolia.com/doc/)
- [React InstantSearch](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/react/)
- [Algolia Dashboard](https://www.algolia.com/dashboard)

---

**Ready to implement? I'll create all the necessary files for you!**
