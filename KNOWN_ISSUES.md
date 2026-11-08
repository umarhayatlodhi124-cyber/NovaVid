# NovaVid AI YouTube Studio — Known Issues & Operational Considerations
**Project:** NovaVid AI YouTube Studio  
**Primary Brand:** LODHI TECHX  
**Version:** 0.1.0 Commercial Release  
**Date:** November 2026

---

## 1. External Platform Dependencies & Operational Notes

In accordance with the **Zero Fabrication Contract**, the following items represent external platform prerequisites and known operational characteristics:

### 1. Google Cloud OAuth Consent Screen Verification
- **Status:** In "Testing" mode on Google Cloud Console, only pre-configured Test User emails (e.g. the owner's LODHI TECHX Gmail) can complete YouTube OAuth authorization.
- **Action Required:** When ready to onboard unlisted external subscribers to the desktop YouTube upload feature, submit the OAuth Consent Screen for standard Google verification in Google Cloud Console.

### 2. YouTube Data API Default Quota Ceiling
- **Status:** New Google Cloud projects are granted a default quota of 10,000 units per day. A video upload (`videos.insert`) consumes 1,600 units (allowing ~6 video uploads daily).
- **Mitigation:** Creators can submit a free Quota Increase request directly in Google Cloud Console to expand quota to 100,000+ units/day.

### 3. Windows SmartScreen "Unknown Publisher" Notice
- **Status:** Unsigned Windows binaries or binaries signed with self-signed developer certificates trigger Windows SmartScreen filter ("Windows protected your PC > More info > Run anyway").
- **Mitigation:** Normal operation is unaffected. To eliminate the prompt for commercial subscribers, purchase an EV (Extended Validation) or OV Code Signing Certificate.

### 4. Direct Stripe in Pakistan
- **Status:** Direct Stripe accounts cannot be registered with Pakistani sole proprietorship bank accounts without foreign legal entities.
- **Solution:** NovaVid uses Lemon Squeezy and Paddle as legal Merchants of Record (MoR) to process international payments and remit USD earnings directly to Payoneer.
