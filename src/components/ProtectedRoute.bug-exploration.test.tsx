/**
 * Bug Condition Exploration Test - Onboarding Loop
 * 
 * **Validates: Requirements 2.1, 2.2**
 * 
 * **Property 1: Bug Condition** - Completed User Premature Onboarding Redirects
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * This test encodes the EXPECTED BEHAVIOR - it will validate the fix when it passes.
 * 
 * GOAL: Surface counterexamples that demonstrate completed users are incorrectly 
 * redirected to /onboarding or shown infinite loading spinners.
 * 
 * Test Strategy: Scoped property-based testing focused on the deterministic bug condition:
 * - Authenticated users with onboarding_completed=true in metadata
 * - Profile is null or still loading (race condition scenario)
 * - Should NOT redirect to /onboarding
 * - Should NOT show infinite spinner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fc } from 'fast-check';
import ProtectedRoute from './ProtectedRoute';
import { AuthContext } from '@/contexts/AuthContext';
import type { User } from '@supabase/supabase-js';

// Mock AuthContext types
type MockAuthContext = {
  user: User | null;
  session: any;
  profile: any;
  roles: string[];
  primaryRole: string | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshAll: () => Promise<void>;
  logout: () => Promise<void>;
};

describe('ProtectedRoute - Bug #1: Onboarding Loop Exploration', () => {
  const mockRefreshProfile = vi.fn();
  const mockRefreshRoles = vi.fn();
  const mockRefreshAll = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test Case 1: User navigates back after completion
   * 
   * Scenario: User completes onboarding, goes to dashboard, clicks browser back button
   * Bug: System redirects them back to /onboarding
   * Expected: System should NOT redirect to /onboarding
   */
  it('should NOT redirect completed users to /onboarding when navigating back (EXPECTED TO FAIL)', () => {
    const TestComponent = () => <div data-testid="protected-content">Dashboard Content</div>;
    const OnboardingPage = () => <div data-testid="onboarding-page">Onboarding</div>;

    // User has completed onboarding (confirmed in metadata)
    const completedUser: Partial<User> = {
      id: 'test-user-123',
      email: 'user@example.com',
      user_metadata: {
        onboarding_completed: true, // KEY: This confirms onboarding is complete
        requested_role: 'learner',
        role: 'learner'
      },
      is_anonymous: false,
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    };

    // Profile is loaded and shows completion
    const completedProfile = {
      user_id: 'test-user-123',
      full_name: 'Test User',
      avatar_url: null,
      onboarding_completed: true,
      role: 'learner'
    };

    const mockAuthValue: MockAuthContext = {
      user: completedUser as User,
      session: { user: completedUser },
      profile: completedProfile,
      roles: ['learner'],
      primaryRole: 'learner',
      loading: false,
      refreshProfile: mockRefreshProfile,
      refreshRoles: mockRefreshRoles,
      refreshAll: mockRefreshAll,
      logout: mockLogout
    };

    const { container } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/dashboard/home']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route 
              path="/dashboard/home" 
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // EXPECTED: Should see the protected content (dashboard)
    // BUG: May be redirected to /onboarding instead
    const protectedContent = screen.queryByTestId('protected-content');
    const onboardingPage = screen.queryByTestId('onboarding-page');
    
    expect(protectedContent).toBeInTheDocument();
    expect(onboardingPage).not.toBeInTheDocument();
  });

  /**
   * Test Case 2: Profile hasn't loaded yet but metadata shows completion
   * 
   * Scenario: User with completed onboarding refreshes page, profile fetch is slow
   * Bug: System shows infinite spinner or redirects to /onboarding before profile loads
   * Expected: System should use metadata to determine completion and allow access
   */
  it('should NOT redirect or show infinite spinner when profile is null but metadata shows completion (EXPECTED TO FAIL)', () => {
    const TestComponent = () => <div data-testid="protected-content">Dashboard Content</div>;
    const OnboardingPage = () => <div data-testid="onboarding-page">Onboarding</div>;

    // User has completed onboarding (confirmed in metadata)
    const completedUser: Partial<User> = {
      id: 'test-user-456',
      email: 'user2@example.com',
      user_metadata: {
        onboarding_completed: true, // KEY: Metadata confirms completion
        requested_role: 'coach',
        role: 'coach'
      },
      is_anonymous: false,
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    };

    // Profile hasn't loaded yet (race condition)
    const mockAuthValue: MockAuthContext = {
      user: completedUser as User,
      session: { user: completedUser },
      profile: null, // KEY: Profile is null (still loading)
      roles: [], // Roles may not be loaded yet either
      primaryRole: 'coach', // But we have metadata role
      loading: false, // Auth loading is complete
      refreshProfile: mockRefreshProfile,
      refreshRoles: mockRefreshRoles,
      refreshAll: mockRefreshAll,
      logout: mockLogout
    };

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/dashboard/coach']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route 
              path="/dashboard/coach" 
              element={
                <ProtectedRoute requiredRole="coach">
                  <TestComponent />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // EXPECTED: Should see the protected content (not redirected, not infinite spinner)
    // BUG: May show spinner indefinitely or redirect to /onboarding
    const protectedContent = screen.queryByTestId('protected-content');
    const spinner = screen.queryByRole('status') || document.querySelector('.animate-spin');
    const onboardingPage = screen.queryByTestId('onboarding-page');
    
    expect(protectedContent).toBeInTheDocument();
    expect(spinner).not.toBeInTheDocument();
    expect(onboardingPage).not.toBeInTheDocument();
  });

  /**
   * Test Case 3: Page refresh before profile loads
   * 
   * Scenario: User refreshes dashboard page, profile fetch hasn't completed
   * Bug: System redirects to /onboarding during the loading window
   * Expected: System should wait or use cached metadata, NOT redirect
   */
  it('should NOT redirect during profile loading when metadata confirms completion (EXPECTED TO FAIL)', () => {
    const TestComponent = () => <div data-testid="protected-content">Dashboard Content</div>;
    const OnboardingPage = () => <div data-testid="onboarding-page">Onboarding</div>;

    const completedUser: Partial<User> = {
      id: 'test-user-789',
      email: 'therapist@example.com',
      user_metadata: {
        onboarding_completed: true, // KEY: Completion confirmed in metadata
        requested_role: 'therapist',
        role: 'therapist',
        account_type: 'therapist'
      },
      is_anonymous: false,
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    };

    // Simulating the state during profile fetch: user authenticated, profile null, loading false
    const mockAuthValue: MockAuthContext = {
      user: completedUser as User,
      session: { user: completedUser },
      profile: null, // Profile hasn't loaded yet
      roles: [], // Roles haven't loaded yet
      primaryRole: null, // Primary role not resolved yet
      loading: false, // Auth itself is not loading
      refreshProfile: mockRefreshProfile,
      refreshRoles: mockRefreshRoles,
      refreshAll: mockRefreshAll,
      logout: mockLogout
    };

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/dashboard/therapist']}>
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route 
              path="/dashboard/therapist" 
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    // EXPECTED: Should either see protected content or a loading spinner
    // Should NOT redirect to /onboarding
    const onboardingPage = screen.queryByTestId('onboarding-page');
    
    expect(onboardingPage).not.toBeInTheDocument();
  });

  /**
   * Property-Based Test: Completed users with various metadata configurations
   * 
   * Generates many test cases with different:
   * - User IDs
   * - Roles (learner, coach, therapist)
   * - Profile loading states (null, loaded)
   * 
   * Property: For ALL users with onboarding_completed=true in metadata,
   * the system MUST NOT redirect to /onboarding
   */
  it('PROPERTY: No completed user should ever be redirected to /onboarding (EXPECTED TO FAIL)', () => {
    const TestComponent = () => <div data-testid="protected-content">Dashboard</div>;
    const OnboardingPage = () => <div data-testid="onboarding-page">Onboarding</div>;

    // Arbitrary generators for property-based testing
    const userIdArbitrary = fc.uuid();
    const emailArbitrary = fc.emailAddress();
    const roleArbitrary = fc.constantFrom('learner', 'coach', 'therapist');
    const profileLoadedArbitrary = fc.boolean();

    fc.assert(
      fc.property(
        userIdArbitrary,
        emailArbitrary,
        roleArbitrary,
        profileLoadedArbitrary,
        (userId, email, role, profileLoaded) => {
          // Create user with onboarding_completed=true in metadata
          const completedUser: Partial<User> = {
            id: userId,
            email: email,
            user_metadata: {
              onboarding_completed: true, // KEY: Always true for this property
              requested_role: role,
              role: role,
              account_type: role
            },
            is_anonymous: false,
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
          };

          // Profile may or may not be loaded (testing the race condition)
          const profile = profileLoaded
            ? {
                user_id: userId,
                full_name: 'Test User',
                avatar_url: null,
                onboarding_completed: true,
                role: role
              }
            : null;

          const mockAuthValue: MockAuthContext = {
            user: completedUser as User,
            session: { user: completedUser },
            profile: profile,
            roles: profileLoaded ? [role] : [],
            primaryRole: role,
            loading: false,
            refreshProfile: mockRefreshProfile,
            refreshRoles: mockRefreshRoles,
            refreshAll: mockRefreshAll,
            logout: mockLogout
          };

          const { unmount } = render(
            <AuthContext.Provider value={mockAuthValue}>
              <MemoryRouter initialEntries={[`/dashboard/${role}`]}>
                <Routes>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route 
                    path="/dashboard/:role" 
                    element={
                      <ProtectedRoute>
                        <TestComponent />
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
              </MemoryRouter>
            </AuthContext.Provider>
          );

          // PROPERTY: Completed users should NEVER be redirected to /onboarding
          const onboardingPage = screen.queryByTestId('onboarding-page');
          const result = onboardingPage === null;

          unmount();
          return result;
        }
      ),
      { 
        numRuns: 50, // Run 50 test cases with different combinations
        verbose: true // Show counterexamples when test fails
      }
    );
  });
});
