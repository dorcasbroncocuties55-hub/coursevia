# Fixing All Pages - Batch Process

## Pages to Fix (25+ pages)

### Profile Pages
- [x] CoachProfile.tsx
- [x] TherapistProfile.tsx
- [ ] ProfessionalProfileSettings.tsx
- [ ] ProfileSettings.tsx

### Services Pages
- [ ] CoachServices.tsx
- [ ] TherapistServices.tsx

### Content Pages
- [ ] CreatorContent.tsx
- [ ] UploadVideo.tsx
- [ ] LearnerCourses.tsx
- [ ] LearnerVideos.tsx

### Booking Pages
- [ ] LearnerBookings.tsx
- [ ] CoachReviews.tsx

### Payment/Wallet Pages
- [ ] LearnerPayments.tsx
- [ ] LearnerPaymentMethods.tsx
- [ ] PaymentMethods.tsx
- [ ] WithdrawalsPage.tsx
- [ ] AdminWithdrawals.tsx

### Communication Pages
- [ ] Messages.tsx
- [ ] LearnerNotifications.tsx

### Other Pages
- [ ] LearnerWishlist.tsx
- [ ] LearnerSubscription.tsx
- [ ] CartPage.tsx
- [ ] Onboarding.tsx

## Fix Pattern

For each page:
1. Add `loading: authLoading` to useAuth destructuring
2. Add PageLoading import
3. Add loading check before component renders
4. Add user check with Navigate
5. Remove `if (!user) return;` from useEffect
