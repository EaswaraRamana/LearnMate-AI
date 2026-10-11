import { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ToastProvider, useToast } from './context/ToastContext.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { LibraryPage } from './pages/LibraryPage.tsx';
import { TutorPage } from './pages/TutorPage.tsx';
import { QuizPage } from './pages/QuizPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { PlannerPage } from './pages/PlannerPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { StudyMaterialsPage } from './pages/StudyMaterialsPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { api } from './services/api.ts';
import { UserProfile, DocumentItem, AnalyticsOverview, QuizAttempt, StudyProgress, SavedStudyResource, StudyMaterialContext } from './types/index.ts';

function AppContent() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadRetryDoc, setUploadRetryDoc] = useState<DocumentItem | null>(null);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  // App data state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [studyProgress, setStudyProgress] = useState<StudyProgress[]>([]);
  const [studyResources, setStudyResources] = useState<SavedStudyResource[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // For navigating from Library into Tutor with preselected document
  const [tutorDocId, setTutorDocId] = useState<string | undefined>(undefined);
  const [quizPresetTopic, setQuizPresetTopic] = useState('');
  const [quizPresetDocId, setQuizPresetDocId] = useState('');
  const [tutorStudyMaterial, setTutorStudyMaterial] = useState<StudyMaterialContext>();
  const [quizStudyMaterial, setQuizStudyMaterial] = useState<StudyMaterialContext>();
  const [initialStudyMaterialId, setInitialStudyMaterialId] = useState<string>();

  const handleNavigate = (tab: NavTab, topic?: string, documentId?: string) => {
    if (tab === 'quizzes') {
      setQuizPresetTopic(topic || '');
      setQuizPresetDocId(documentId || '');
      setQuizStudyMaterial(undefined);
    }
    if (tab === 'tutor') {
      setTutorDocId(documentId);
      setTutorStudyMaterial(undefined);
    }
    if (tab === 'materials') setInitialStudyMaterialId(documentId);
    setActiveTab(tab);
    if (tab !== 'tutor') setTutorDocId(undefined);
  };

  const handleAskAboutMaterial = (material: StudyMaterialContext) => {
    setTutorDocId(material.documentId);
    setTutorStudyMaterial(material);
    setActiveTab('tutor');
  };

  const handlePracticeMaterial = (material: StudyMaterialContext) => {
    setQuizPresetTopic(material.topic);
    setQuizPresetDocId(material.documentId || '');
    setQuizStudyMaterial(material);
    setActiveTab('quizzes');
  };

  const handleOpenUpload = (retryDoc?: DocumentItem | null) => {
    setUploadRetryDoc(retryDoc || null);
    setIsUploadModalOpen(true);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [coreResult, studyResult] = await Promise.allSettled([
        Promise.all([
          api.getProfile(),
          api.getDocuments(),
          api.getAnalytics(),
          api.getQuizAttempts()
        ]),
        api.getStudyData()
      ]);

      if (coreResult.status === 'fulfilled') {
        const [profileRes, docsRes, analyticsRes, attemptsRes] = coreResult.value;
        setUser(profileRes.user);
        setHasGeminiKey(profileRes.hasGeminiKey);
        setDocuments(docsRes.documents);
        setAnalytics(analyticsRes.analytics);
        setRecentAttempts(attemptsRes.attempts);
      } else {
        console.error('Failed to load core application data:', coreResult.reason);
        showToast('error', 'Dashboard data unavailable', 'Some application data could not be loaded. Please refresh and try again.');
      }

      if (studyResult.status === 'fulfilled') {
        setStudyProgress(studyResult.value.progress);
        setStudyResources(studyResult.value.resources);
      } else {
        console.error('Failed to load study materials data:', studyResult.reason);
        showToast('error', 'Study Materials unavailable', 'Your study progress and saved resources could not be loaded. Please refresh and try again.');
      }
    } finally {
      setIsLoadingDocs(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleResetDemo = async () => {
    setIsResettingDemo(true);
    try {
      await api.resetDemoData();
      await loadAllData();
      showToast('success', 'Demo Reset', 'Sample documents, quizzes, and activity restored to pristine state.');
    } catch {
      showToast('error', 'Reset Failed', 'Could not reset demonstration state.');
    } finally {
      setIsResettingDemo(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await api.logout();
      window.location.assign('/');
    } catch {
      showToast('error', 'Sign Out Failed', 'Could not sign out. Please try again.');
    }
  };

  const handleSelectDocForTutor = (docId: string) => {
    setTutorDocId(docId);
    setTutorStudyMaterial(undefined);
    setActiveTab('tutor');
  };

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Dashboard Overview',
      subtitle: 'Your source-grounded academic workspace & daily progress'
    },
    materials: {
      title: 'Study Materials',
      subtitle: 'Browse lessons, study your notes, and keep your learning progress'
    },
    library: {
      title: 'Study Materials Library',
      subtitle: 'PDF notes, chapters, and lecture transcripts with verified page citations'
    },
    tutor: {
      title: 'AI Personal Tutor',
      subtitle: 'Ask questions grounded strictly in your uploaded materials'
    },
    quizzes: {
      title: 'Adaptive Practice & Quizzes',
      subtitle: 'Server-scored assessments with difficulty scaling and detailed explanations'
    },
    analytics: {
      title: 'Learning Analytics',
      subtitle: 'Mastery progression, study velocity, and topic breakdown'
    },
    planner: {
      title: 'Personalized Study Planner',
      subtitle: 'Milestones and automated revision recommendations for weak topics'
    },
    settings: {
      title: 'Settings & Architecture',
      subtitle: 'Profile goals, system diagnostics, and database specifications'
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5FF] flex flex-col text-[#242338]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenUpload={() => handleOpenUpload(null)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        documentsCount={documents.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header
          title={tabTitles[activeTab].title}
          subtitle={tabTitles[activeTab].subtitle}
          activeTab={activeTab}
          user={user}
          recentActivity={analytics?.recentActivity ?? []}
          hasGeminiKey={hasGeminiKey}
          onNavigate={handleNavigate}
          onSignOut={handleSignOut}
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          onOpenUpload={() => handleOpenUpload(null)}
          onResetDemo={handleResetDemo}
          isResetting={isResettingDemo}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewPage
              user={user}
              analytics={analytics}
              documents={documents}
              recentAttempts={recentAttempts}
              studyProgress={studyProgress}
              onNavigate={handleNavigate}
              onOpenUpload={() => handleOpenUpload(null)}
              onRefreshData={loadAllData}
            />
          )}

          {activeTab === 'library' && (
            <LibraryPage
              documents={documents}
              isLoading={isLoadingDocs}
              onOpenUpload={(doc) => handleOpenUpload(doc || null)}
              onRefresh={loadAllData}
              onSelectForTutor={handleSelectDocForTutor}
            />
          )}

          {activeTab === 'materials' && (
            <StudyMaterialsPage
              documents={documents}
              progressRecords={studyProgress}
              savedResources={studyResources}
              onProgressUpdated={(progress) => setStudyProgress((current) => [
                progress,
                ...current.filter((item) => item.materialId !== progress.materialId)
              ])}
              onResourceAdded={(resource) => setStudyResources((current) => [resource, ...current])}
              onRefreshData={loadAllData}
              onAskTutor={handleAskAboutMaterial}
              onPracticeMaterial={handlePracticeMaterial}
              onOpenUpload={() => handleOpenUpload(null)}
              initialMaterialId={initialStudyMaterialId}
              onInitialMaterialOpened={() => setInitialStudyMaterialId(undefined)}
            />
          )}

          {activeTab === 'tutor' && (
            <TutorPage
              documents={documents}
              preselectedDocId={tutorDocId}
              initialQuestion={tutorStudyMaterial
                ? `I am studying "${tutorStudyMaterial.title}" (${tutorStudyMaterial.topic}). Please help me understand the key ideas and answer my questions based on this selected material.`
                : undefined}
              studyMaterial={tutorStudyMaterial?.content
                ? { title: tutorStudyMaterial.title, content: tutorStudyMaterial.content }
                : undefined}
            />
          )}

          {activeTab === 'quizzes' && (
            <QuizPage
              documents={documents}
              onQuizCompleted={loadAllData}
              preselectedTopic={quizPresetTopic}
              preselectedDocId={quizPresetDocId}
              preselectedStudyMaterial={quizStudyMaterial?.content
                ? { title: quizStudyMaterial.title, content: quizStudyMaterial.content }
                : undefined}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage
              analytics={analytics}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'planner' && (
            <PlannerPage
              documents={documents}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              user={user}
              hasGeminiKey={hasGeminiKey}
              onRefreshData={loadAllData}
              onResetDemo={handleResetDemo}
              isResetting={isResettingDemo}
            />
          )}
        </main>
      </div>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadRetryDoc(null);
        }}
        onUploaded={loadAllData}
        retryDoc={uploadRetryDoc}
      />
    </div>
  );
}

export default function App() {
  const route = window.location.pathname.replace(/\/+$/, '') || '/';
  if (route === '/signup/student') return <AuthPage mode="signup" />;
  if (route === '/login') return <AuthPage mode="login" />;

  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
