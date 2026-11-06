# Graph Report - .  (2026-11-05)

## Corpus Check
- 159 files · ~129,102 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 702 nodes · 1509 edges · 44 communities (40 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Themes and PDF Export|Themes and PDF Export]]
- [[_COMMUNITY_Resume Data and History|Resume Data and History]]
- [[_COMMUNITY_Resume Evidence Scoring|Resume Evidence Scoring]]
- [[_COMMUNITY_Examples and SEO Pages|Examples and SEO Pages]]
- [[_COMMUNITY_Project Configuration|Project Configuration]]
- [[_COMMUNITY_Data Sanitization|Data Sanitization]]
- [[_COMMUNITY_Tailored Review Workflow|Tailored Review Workflow]]
- [[_COMMUNITY_Resume AI Assistant|Resume AI Assistant]]
- [[_COMMUNITY_Marketing Analytics|Marketing Analytics]]
- [[_COMMUNITY_Profile and API UI|Profile and API UI]]
- [[_COMMUNITY_Application Hooks and Screens|Application Hooks and Screens]]
- [[_COMMUNITY_Why ResumeVibe Pages|Why ResumeVibe Pages]]
- [[_COMMUNITY_Token Ledger Context|Token Ledger Context]]
- [[_COMMUNITY_Resume Tailoring Engine|Resume Tailoring Engine]]
- [[_COMMUNITY_Deployment Scripts|Deployment Scripts]]
- [[_COMMUNITY_Resume Builder and Guest Draft|Resume Builder and Guest Draft]]
- [[_COMMUNITY_Reporting Utilities|Reporting Utilities]]
- [[_COMMUNITY_Theme Context|Theme Context]]
- [[_COMMUNITY_AI Features and Login|AI Features and Login]]
- [[_COMMUNITY_Tailoring API|Tailoring API]]
- [[_COMMUNITY_Web App Manifest|Web App Manifest]]
- [[_COMMUNITY_Brand and Public UI|Brand and Public UI]]
- [[_COMMUNITY_Resume Navigation and List|Resume Navigation and List]]
- [[_COMMUNITY_Admin Token Requests|Admin Token Requests]]
- [[_COMMUNITY_Product Tour|Product Tour]]
- [[_COMMUNITY_Error Boundary|Error Boundary]]
- [[_COMMUNITY_Resume Merge Logic|Resume Merge Logic]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Section Controls|Section Controls]]
- [[_COMMUNITY_Rich Text Controls|Rich Text Controls]]
- [[_COMMUNITY_Example Import|Example Import]]
- [[_COMMUNITY_Resume Optimization API|Resume Optimization API]]
- [[_COMMUNITY_Theme Rendering Tests|Theme Rendering Tests]]
- [[_COMMUNITY_Token Purchase UI|Token Purchase UI]]
- [[_COMMUNITY_Section Type Dialog|Section Type Dialog]]
- [[_COMMUNITY_Safe Text Rewriting|Safe Text Rewriting]]
- [[_COMMUNITY_Deep Audit API|Deep Audit API]]
- [[_COMMUNITY_Text Optimization API|Text Optimization API]]
- [[_COMMUNITY_Assistant Pricing|Assistant Pricing]]

## God Nodes (most connected - your core abstractions)
1. `ResumeSchema` - 67 edges
2. `useAuth()` - 31 edges
3. `useToken()` - 29 edges
4. `../layouts/Layout.astro` - 25 edges
5. `normalizeResumeData()` - 24 edges
6. `useResume()` - 16 edges
7. `api` - 15 edges
8. `Footer()` - 14 edges
9. `sanitizeInlineHtml()` - 14 edges
10. `EditableField()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `OptimizeResumeModal()` --calls--> `useResume()`  [EXTRACTED]
  src/components/OptimizeResumeModal.tsx → src/hooks/useResume.ts
- `RecruiterPanelProps` --references--> `ResumeSchema`  [EXTRACTED]
  src/components/RecruiterPanel.tsx → src/types/resume.ts
- `RecruiterPanel()` --calls--> `useToken()`  [EXTRACTED]
  src/components/RecruiterPanel.tsx → src/context/TokenContext.tsx
- `Props` --references--> `ResumeSchema`  [EXTRACTED]
  src/components/editor/AssistantPanel.tsx → src/types/resume.ts
- `Props` --references--> `ResumeSchema`  [EXTRACTED]
  src/components/resume/Achievements.tsx → src/types/resume.ts

## Import Cycles
- None detected.

## Communities (44 total, 4 thin omitted)

### Community 0 - "Themes and PDF Export"
Cohesion: 0.06
Nodes (63): PublicResumeContent(), PublicResumeContentProps, RecruiterPanel(), RecruiterPanelProps, Achievements(), BulletItem, Props, CertificationItem (+55 more)

### Community 1 - "Resume Data and History"
Cohesion: 0.05
Nodes (43): CoverLetterModalProps, AchievementsEditor(), Props, CareerGuidanceModal(), CareerGuidanceModalProps, evidenceChecks, CertificationsEditor(), Props (+35 more)

### Community 2 - "Resume Evidence Scoring"
Cohesion: 0.07
Nodes (33): ApplicationCopilotContent(), decisionCopy, statusIcon, statusStyle, WorkspaceStep, decisionContent, JobFitLandingContent(), ResumeSource (+25 more)

### Community 3 - "Examples and SEO Pages"
Cohesion: 0.07
Nodes (30): ../components/Analytics.astro, gaId, googleAdsId, ../components/home/HomeLanding.astro, ../../../components/pages/ResumeExampleEditor.astro, ../../components/pages/ResumeExamplePage.astro, ResumeBuilder(), ../components/SEO.astro (+22 more)

### Community 4 - "Project Configuration"
Cohesion: 0.05
Nodes (39): dependencies, astro, @astrojs/node, @astrojs/react, @astrojs/sitemap, clsx, dotenv, lucide-react (+31 more)

### Community 5 - "Data Sanitization"
Cohesion: 0.13
Nodes (30): array(), booleanRecord(), bullet(), bullets(), certifications(), CUSTOM_TYPES, customSections(), education() (+22 more)

### Community 6 - "Tailored Review Workflow"
Cohesion: 0.08
Nodes (20): APPLICATION_GENERATION_STAGES, ApplicationGenerationError, AppliedApplicationPackage, ChargeStatus, EntryGroup, ReviewTab, ReviewView, SectionGroup (+12 more)

### Community 7 - "Resume AI Assistant"
Cohesion: 0.10
Nodes (21): ACTIVITY_STAGES, AssistantActivity, AssistantMessage, AssistantPanel(), AssistantQuestion, AssistantSuggestion, EVIDENCE_PRESENTATION, MEMORY_CATEGORY_LABELS (+13 more)

### Community 8 - "Marketing Analytics"
Cohesion: 0.19
Nodes (18): FeedbackSentiment, FeedbackWidget(), FeedbackWidgetProps, NEGATIVE_CATEGORIES, analyticsEventParameters(), EVENT_FIELDS, isAnalyticsPage(), PUBLIC_PATHS (+10 more)

### Community 9 - "Profile and API UI"
Cohesion: 0.15
Nodes (10): GrantUser, PilotTokenAdmin(), ProfileDashboard(), Tab, Job, RecommendedJobs(), ShareModal(), ShareModalProps (+2 more)

### Community 10 - "Application Hooks and Screens"
Cohesion: 0.20
Nodes (15): Job, SuccessJobsScreen(), SuccessJobsScreenProps, ApplicationCopilotWorkspace(), BuyTokensInner(), JobFitLanding(), ProfileDashboardInner(), ResumeBuilderContent() (+7 more)

### Community 11 - "Why ResumeVibe Pages"
Cohesion: 0.15
Nodes (11): foundations, reviewChecks, helpfulLinks, NotFoundContent(), WhyResumeVibeContent(), AuthOnlyProviders(), Navbar(), NavbarProps (+3 more)

### Community 12 - "Token Ledger Context"
Cohesion: 0.13
Nodes (12): Providers(), ProvidersProps, AuthContext, AuthContextType, AuthProvider(), ResumeContext, ResumeContextType, ResumeProvider() (+4 more)

### Community 13 - "Resume Tailoring Engine"
Cohesion: 0.15
Nodes (14): BulletProposal, bulletRewriteSchema, FEEDBACK_SECTIONS, FeedbackSection, filterTechStack(), GuardTally, normalizeKey(), OrderProposal (+6 more)

### Community 14 - "Deployment Scripts"
Cohesion: 0.27
Nodes (16): build(), BUN_INSTALL, clean(), deploy(), detect_pm(), error(), install_deps(), log() (+8 more)

### Community 15 - "Resume Builder and Guest Draft"
Cohesion: 0.17
Nodes (7): CareerInsights(), SuccessModal(), SuccessModalProps, ImportResumeModal(), Props, RESUME_PRODUCT_TOUR_STEPS, guestDraftEditorUrl()

### Community 16 - "Reporting Utilities"
Cohesion: 0.16
Nodes (12): BulkTokenGrant(), GrantRow, PanelClasses, Spinner(), Summary, CampaignInsights(), Filters, InsightUser (+4 more)

### Community 17 - "Theme Context"
Cohesion: 0.20
Nodes (10): CustomSelect(), Option, Props, EditorToolbar(), ThemeToggle(), ThemeToggleProps, ThemeContext, ThemeContextType (+2 more)

### Community 18 - "AI Features and Login"
Cohesion: 0.24
Nodes (7): GoogleLogin(), Window, aiFeatures, AIFeaturesContent(), workflow, LoginModal(), ../components/pages/AIFeaturesContent

### Community 19 - "Tailoring API"
Cohesion: 0.36
Nodes (9): buildTailoringPayload(), normalizeChangeReviews(), normalizeMissingSkills(), normalizeRequirements(), normalizeSectionFeedback(), TAILORED_RESUME_RESPONSE_FORMAT, failureResponse(), generationFailureMessage() (+1 more)

### Community 20 - "Web App Manifest"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 21 - "Brand and Public UI"
Cohesion: 0.31
Nodes (4): BrandSwitcher(), BrandSwitcherProps, LoadingScreenProps, Logo()

### Community 22 - "Resume Navigation and List"
Cohesion: 0.25
Nodes (7): Resume, UserResumes(), Version, LoadingScreen(), fetchLatestResume(), resumeEditorUrl(), ResumeNavigationTarget

### Community 23 - "Admin Token Requests"
Cohesion: 0.36
Nodes (5): Fetcher, PilotRequest, requestResult(), TokenRequestQueue(), TokenRequests()

### Community 24 - "Product Tour"
Cohesion: 0.25
Nodes (5): ProductTour(), ProductTourProps, ProductTourStep, replayProductTour(), TourRect

### Community 25 - "Error Boundary"
Cohesion: 0.29
Nodes (3): Props, ResumeErrorBoundary, State

### Community 26 - "Resume Merge Logic"
Cohesion: 0.33
Nodes (7): asRecordsById(), bulletText(), createTally(), identityOrder(), mergeTailoredResume(), rewriteBullets(), tailorSkills()

### Community 27 - "TypeScript Configuration"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, jsxImportSource, exclude, extends, include

### Community 28 - "Section Controls"
Cohesion: 0.40
Nodes (4): ConfirmDialog(), Props, Props, SectionControls()

### Community 29 - "Rich Text Controls"
Cohesion: 0.40
Nodes (3): PromptDialog(), Props, Props

### Community 30 - "Example Import"
Cohesion: 0.40
Nodes (4): AccountContact, prepareExampleForProfile(), account, example

### Community 31 - "Resume Optimization API"
Cohesion: 0.40
Nodes (3): BulletItemSchema, PersonalInfoSchema, ResumeSchemaZod

### Community 32 - "Theme Rendering Tests"
Cohesion: 0.50
Nodes (3): layout, renderHomepage(), renderTheme()

### Community 34 - "Section Type Dialog"
Cohesion: 0.50
Nodes (3): Props, SectionTypeDialog(), User

### Community 35 - "Safe Text Rewriting"
Cohesion: 0.67
Nodes (4): introducesUnsupportedNumbers(), numericTokens(), plainText(), rewriteFreeText()

## Knowledge Gaps
- **210 isolated node(s):** `NVM_DIR`, `BUN_INSTALL`, `PATH`, `name`, `type` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ResumeSchema` connect `Resume Data and History` to `Themes and PDF Export`, `Resume Evidence Scoring`, `Examples and SEO Pages`, `Data Sanitization`, `Tailored Review Workflow`, `Resume AI Assistant`, `Token Ledger Context`, `Resume Tailoring Engine`, `Resume Builder and Guest Draft`, `Example Import`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Why does `../layouts/Layout.astro` connect `Examples and SEO Pages` to `Themes and PDF Export`, `Resume Evidence Scoring`, `Profile and API UI`, `Why ResumeVibe Pages`, `Token Ledger Context`, `AI Features and Login`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `useToken()` connect `Application Hooks and Screens` to `Themes and PDF Export`, `Token Purchase UI`, `Resume Evidence Scoring`, `Tailored Review Workflow`, `Resume AI Assistant`, `Profile and API UI`, `Why ResumeVibe Pages`, `Token Ledger Context`, `Resume Builder and Guest Draft`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `NVM_DIR`, `BUN_INSTALL`, `PATH` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Themes and PDF Export` be split into smaller, more focused modules?**
  _Cohesion score 0.05616509926854754 - nodes in this community are weakly interconnected._
- **Should `Resume Data and History` be split into smaller, more focused modules?**
  _Cohesion score 0.05432595573440644 - nodes in this community are weakly interconnected._
- **Should `Resume Evidence Scoring` be split into smaller, more focused modules?**
  _Cohesion score 0.0653061224489796 - nodes in this community are weakly interconnected._