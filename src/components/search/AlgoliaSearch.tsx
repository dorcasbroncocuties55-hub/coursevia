import { useState } from 'react';
import { InstantSearch, SearchBox, Hits, Pagination, RefinementList, Configure, Stats } from 'react-instantsearch';
import { searchClient, isAlgoliaConfigured } from '@/lib/algolia';
import { Link } from 'react-router-dom';
import { BookOpen, PlayCircle, Star, Search as SearchIcon } from 'lucide-react';

// Course Hit Component
const CourseHit = ({ hit }: { hit: any }) => {
  return (
    <Link
      to={`/courses/${hit.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {hit.thumbnail_url ? (
          <img
            src={hit.thumbnail_url}
            alt={hit.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <BookOpen size={32} className="text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-primary shadow">
            <PlayCircle size={22} />
          </div>
        </div>
        {hit.category && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {hit.category}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-primary transition">
          {hit.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
          {hit.short_description || hit.description}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <Star size={13} className="fill-amber-400 text-amber-400" />
          <span className="font-medium text-slate-800">{Number(hit.rating || 5).toFixed(1)}</span>
          <span className="text-slate-400">· {hit.total_students || 0} students</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-lg font-bold text-slate-950">
            {Number(hit.price || 0) === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              `$${Number(hit.price).toFixed(2)}`
            )}
          </span>
          <span className="text-xs font-medium text-primary">View course →</span>
        </div>
      </div>
    </Link>
  );
};

// Custom SearchBox Component
const CustomSearchBox = () => {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <SearchIcon size={16} className="shrink-0 text-slate-400" />
      <SearchBox
        placeholder="Search by title, topic, or skill…"
        classNames={{
          root: 'w-full',
          form: 'w-full',
          input: 'w-full bg-transparent text-sm outline-none',
          submit: 'hidden',
          reset: 'hidden',
        }}
      />
    </div>
  );
};

// Category Filter Component
const CategoryFilter = () => {
  return (
    <div className="mt-4">
      <RefinementList
        attribute="category"
        classNames={{
          root: 'flex flex-wrap gap-2',
          list: 'flex flex-wrap gap-2',
          item: '',
          label: 'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition cursor-pointer border-slate-200 bg-white text-slate-600 hover:border-primary/50',
          selectedItem: 'border-primary bg-primary text-white',
          checkbox: 'hidden',
          count: 'ml-1 text-xs opacity-60',
        }}
      />
    </div>
  );
};

// Main Algolia Search Component
interface AlgoliaSearchProps {
  indexName?: string;
}

export const AlgoliaSearch = ({ indexName = 'courses' }: AlgoliaSearchProps) => {
  if (!isAlgoliaConfigured()) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-sm text-amber-800">
          Algolia search is not configured. Please add your Algolia credentials to the environment variables.
        </p>
      </div>
    );
  }

  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <Configure hitsPerPage={12} />
      
      {/* Search Box */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Find your next course</label>
        <CustomSearchBox />
        <CategoryFilter />
      </div>

      {/* Results */}
      <div className="mt-12">
        <div className="mb-6 flex items-center justify-between">
          <Stats
            classNames={{
              root: 'text-xl font-bold text-slate-900',
              text: 'text-xl font-bold text-slate-900',
            }}
            translations={{
              rootElementText({ nbHits }) {
                return (
                  <>
                    All Courses <span className="ml-1 text-base font-normal text-slate-400">({nbHits})</span>
                  </>
                );
              },
            }}
          />
        </div>

        <Hits
          hitComponent={CourseHit}
          classNames={{
            root: '',
            list: 'grid gap-6 sm:grid-cols-2 xl:grid-cols-4',
            item: '',
          }}
        />

        {/* Pagination */}
        <div className="mt-12 flex justify-center">
          <Pagination
            classNames={{
              root: 'flex items-center gap-2',
              list: 'flex items-center gap-2',
              item: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary hover:text-primary transition cursor-pointer',
              selectedItem: 'border-primary bg-primary text-white hover:text-white',
              disabledItem: 'opacity-50 cursor-not-allowed hover:border-slate-200 hover:text-slate-700',
              link: 'block',
            }}
          />
        </div>
      </div>
    </InstantSearch>
  );
};

export default AlgoliaSearch;
