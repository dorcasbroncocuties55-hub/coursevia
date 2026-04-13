import algoliasearch from 'algoliasearch/lite';

// Algolia configuration
const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID || '';
const ALGOLIA_SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY || '';
const ALGOLIA_INDEX_NAME = import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'courses';

// Create Algolia client
export const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Get the courses index
export const coursesIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);

// Check if Algolia is configured
export const isAlgoliaConfigured = () => {
  return Boolean(ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY);
};

// Search courses
export const searchCourses = async (query: string, filters?: any) => {
  if (!isAlgoliaConfigured()) {
    console.warn('Algolia is not configured');
    return { hits: [], nbHits: 0 };
  }

  try {
    const result = await coursesIndex.search(query, {
      filters: filters?.filters || '',
      facets: ['category', 'price_range', 'level', 'rating'],
      hitsPerPage: filters?.hitsPerPage || 20,
      page: filters?.page || 0,
    });

    return result;
  } catch (error) {
    console.error('Algolia search error:', error);
    return { hits: [], nbHits: 0 };
  }
};

// Helper to build filter string
export const buildFilters = (options: {
  category?: string;
  priceRange?: 'free' | 'paid';
  minRating?: number;
  level?: string;
}) => {
  const filters: string[] = [];

  if (options.category && options.category !== 'All') {
    filters.push(`category:"${options.category}"`);
  }

  if (options.priceRange) {
    filters.push(`price_range:"${options.priceRange}"`);
  }

  if (options.minRating) {
    filters.push(`rating >= ${options.minRating}`);
  }

  if (options.level) {
    filters.push(`level:"${options.level}"`);
  }

  return filters.join(' AND ');
};
