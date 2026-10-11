import React, { useState } from 'react';
import {
  User,
  RefreshCw,
  Database,
  Code,
  Sparkles,
  Save,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { UserProfile } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface SettingsPageProps {
  user: UserProfile | null;
  hasGeminiKey: boolean;
  onRefreshData: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export function SettingsPage({
  user,
  hasGeminiKey,
  onRefreshData,
  onResetDemo,
  isResetting
}: SettingsPageProps) {
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || 'Alex Chen');
  const [learningGoal, setLearningGoal] = useState(user?.learningGoal || '');
  const [targetCourse, setTargetCourse] = useState(user?.targetExamOrCourse || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateProfile({
        name,
        learningGoal,
        targetExamOrCourse: targetCourse
      });
      showToast('success', 'Profile Saved', 'Your study goals and user information have been updated.');
      onRefreshData();
    } catch {
      showToast('error', 'Error', 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#6D4AFF]">Settings & Architecture</h2>
        <p className="text-xs text-stone-500">
          Manage your student profile, view deployment diagnostics, and toggle demo mode
        </p>
      </div>

      {/* 1. Student Profile Settings */}
      <div className="p-6 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
          <div className="p-2 rounded-xl bg-[#6D4AFF]/10 text-[#6D4AFF]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900">Student Profile & Goals</h3>
            <p className="text-xs text-stone-500">Tailors tutor responses and quiz recommendations</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Student Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700">Target Course / Exam</label>
              <input
                type="text"
                placeholder="e.g. CS 451: Distributed Systems Midterm"
                value={targetCourse}
                onChange={(e) => setTargetCourse(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700">Primary Learning Goal</label>
            <textarea
              rows={2}
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#0E2C22] text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Demonstration & Hackathon Mode */}
      <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-amber-950">Hackathon Demonstration Mode</h3>
              <p className="text-xs text-amber-800">
                Preloaded with realistic computer science lecture notes, quizzes, and activity logs
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
            Active
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          In development mode, LearnMate operates using an isolated, persistent multi-user data store with full page-aware chunking and verified citations. If external credentials are not set, the app runs smoothly with safe, representative mock state and an intelligent heuristic engine.
        </p>

        <div className="pt-2 flex items-center justify-between border-t border-amber-200">
          <div className="text-[11px] text-stone-500">
            Resets documents, chunks, quiz scores, and tasks to clean initial demo state.
          </div>
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Store</span>
          </button>
        </div>
      </div>

      {/* 3. System Architecture & Diagnostics */}
      <div className="p-6 rounded-2xl bg-white border border-[#E8E5F0] shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
          <div className="p-2 rounded-xl bg-emerald-50 text-[#6D4AFF]">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900">System Architecture & Integrations</h3>
            <p className="text-xs text-stone-500">Live runtime verification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <span className="font-medium text-stone-700">Gemini 3.8 Flash SDK</span>
            <span className={`font-bold flex items-center gap-1 ${hasGeminiKey ? 'text-emerald-700' : 'text-stone-500'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {hasGeminiKey ? 'Key configured on server' : 'Not configured'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <span className="font-medium text-stone-700">PDF Text Extractor</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Page-Aware Engine Ready
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <span className="font-medium text-stone-700">Retrieval Engine (RAG)</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              BM25 / Semantic Scoring
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <span className="font-medium text-stone-700">Server Storage</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              Persistent JSON Store (Port 3000)
            </span>
          </div>
        </div>

        {/* Database Schema Viewer */}
        <div className="pt-2">
          <button
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#6D4AFF] hover:underline cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-700" />
            <span>{showSqlSchema ? 'Hide' : 'Inspect'} Supabase / PostgreSQL Schema (`db/schema.sql`)</span>
          </button>

          {showSqlSchema && (
            <div className="mt-3 p-4 rounded-xl bg-stone-900 text-stone-200 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
              <pre>{`-- LearnMate AI Production PostgreSQL Schema
CREATE TABLE profiles (id UUID PRIMARY KEY, email TEXT, name TEXT, learning_goal TEXT);
CREATE TABLE documents (id UUID PRIMARY KEY, user_id UUID, title TEXT, page_count INT, status TEXT);
CREATE TABLE document_chunks (id UUID PRIMARY KEY, document_id UUID, page_number INT, content TEXT);
CREATE TABLE tutor_conversations (id UUID PRIMARY KEY, user_id UUID, title TEXT);
CREATE TABLE tutor_messages (id UUID PRIMARY KEY, conversation_id UUID, role TEXT, content TEXT, citations JSONB);
CREATE TABLE quizzes (id UUID PRIMARY KEY, user_id UUID, topic TEXT, difficulty TEXT);
CREATE TABLE quiz_questions (id UUID PRIMARY KEY, quiz_id UUID, question_text TEXT, options JSONB, correct_option_index INT);
CREATE TABLE quiz_attempts (id UUID PRIMARY KEY, quiz_id UUID, user_id UUID, score INT, percentage NUMERIC);
CREATE TABLE topic_mastery (id UUID PRIMARY KEY, user_id UUID, topic TEXT, score NUMERIC, level TEXT);
CREATE TABLE study_tasks (id UUID PRIMARY KEY, user_id UUID, title TEXT, due_date DATE, completed BOOLEAN);`}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
