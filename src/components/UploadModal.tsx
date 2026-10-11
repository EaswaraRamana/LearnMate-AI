import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { DocumentItem } from '../types/index.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  retryDoc?: DocumentItem | null;
}

export type WorkflowStep = 'select' | 'validate' | 'upload' | 'extract' | 'save' | 'index' | 'ready' | 'failed';
export type DisplayDocumentStatus = 'Uploading' | 'Processing' | 'Ready' | 'Failed';

export function UploadModal({ isOpen, onClose, onUploaded, retryDoc }: UploadModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4 Explicit Document Statuses
  const getDocumentStatus = (): DisplayDocumentStatus => {
    if (currentStep === 'failed') return 'Failed';
    if (currentStep === 'upload') return 'Uploading';
    if (currentStep === 'extract' || currentStep === 'save' || currentStep === 'index') return 'Processing';
    return 'Ready';
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setErrorMessage(retryDoc?.errorMessage || null);
      setCurrentStep('select');
      setUploadProgress(0);
      setIsUploading(false);
    }
  }, [isOpen, retryDoc]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    setCurrentStep('validate');

    if (!file || file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes). Please select a valid document with readable content.');
      setCurrentStep('failed');
      return;
    }

    const validExtensions = ['.pdf', '.txt', '.md', '.markdown'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    const isPdf = ext === '.pdf' || file.type === 'application/pdf';
    const isText = validExtensions.includes(ext) || file.type.startsWith('text/');

    if (!isPdf && !isText) {
      setErrorMessage('Unsupported file format. Please upload a standard text PDF, TXT, or Markdown (.md) note file.');
      setCurrentStep('failed');
      return;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      setErrorMessage('File size exceeds the 25 MB limit. Please select a smaller chapter or document.');
      setCurrentStep('failed');
      return;
    }

    setSelectedFile(file);
    setCurrentStep('select');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setCurrentStep('upload');
    setUploadProgress(20);

    // Progression through the 7-stage workflow
    const timerExtract = setTimeout(() => {
      setCurrentStep('extract');
      setUploadProgress(45);
    }, 350);

    const timerSave = setTimeout(() => {
      setCurrentStep('save');
      setUploadProgress(70);
    }, 700);

    const timerIndex = setTimeout(() => {
      setCurrentStep('index');
      setUploadProgress(90);
    }, 1050);

    try {
      const res = await api.uploadDocument(selectedFile, retryDoc?.id);
      clearTimeout(timerExtract);
      clearTimeout(timerSave);
      clearTimeout(timerIndex);

      setUploadProgress(100);
      setCurrentStep('ready');

      showToast(
        'success',
        retryDoc ? 'Document Re-processed' : 'Document Ready',
        `Extracted ${res.document.pageCount} page(s) and generated ${res.document.chunkCount} indexed semantic chunks.`
      );

      setTimeout(() => {
        setIsUploading(false);
        setSelectedFile(null);
        onUploaded();
        onClose();
      }, 700);
    } catch (err: any) {
      clearTimeout(timerExtract);
      clearTimeout(timerSave);
      clearTimeout(timerIndex);
      setIsUploading(false);
      setCurrentStep('failed');
      setErrorMessage(err.message || 'Failed to process document');
      showToast('error', 'Processing Failed', err.message || 'Failed to process document');
    }
  };

  // Instant Sample Upload for exploration
  const handleLoadSampleFile = (type: 'quantum' | 'distributed') => {
    const sampleText = type === 'quantum'
      ? `# Principles of Quantum Computation and Qubits
Chapter 1: Superposition and Quantum States
A classical bit is strictly binary, holding either 0 or 1. A quantum bit (qubit) is a two-state quantum-mechanical system described by a state vector |ψ⟩ = α|0⟩ + β|1⟩ in a two-dimensional Hilbert space. The complex coefficients α and β represent probability amplitudes satisfying the normalization constraint |α|² + |β|² = 1. Upon measurement in the computational basis, the state irreversibly collapses into |0⟩ with probability |α|² or |1⟩ with probability |β|².

Chapter 2: Quantum Entanglement and Bell States
Entanglement is a physical phenomenon where pairs or groups of particles cannot be described independently of each other. The canonical Bell state |Φ⁺⟩ = (|00⟩ + |11⟩) / √2 exhibits maximal entanglement. Measuring the first qubit instantly correlates the state of the second qubit across arbitrary spatial distances, a property foundational to Quantum Key Distribution (QKD) and superdense coding.

Chapter 3: Quantum Gates and Decoherence
Quantum algorithms manipulate state vectors through unitary transformations (e.g., Hadamard gate H, Pauli-X, CNOT). A primary barrier to fault-tolerant quantum computing is quantum decoherence—the loss of quantum coherence caused by unwanted environmental interactions and thermal fluctuations.`
      : `# Neural Network Architectures and Backpropagation
Chapter 1: Feedforward Networks and Loss Landscapes
Multi-layer perceptrons (MLPs) approximate complex non-linear functions by composing affine transformations with non-linear activation functions such as ReLU, GELU, and Swish. In empirical risk minimization, weights are updated via gradient descent across high-dimensional non-convex loss surfaces.

Chapter 2: The Backpropagation Algorithm
Backpropagation calculates the analytical gradient of the scalar loss function with respect to every learnable parameter using the mathematical chain rule of calculus. By propagating error tensors backward through the computational graph, intermediate Jacobian products are accumulated efficiently in O(N) operations.

Chapter 3: Regularization and Overfitting
To prevent memorization of noise in training samples, deep models employ L2 weight decay, Dropout (random neuron masking during forward pass), and Batch Normalization to smooth internal covariate shifts.`;

    const filename = type === 'quantum'
      ? 'Quantum_Computation_Foundations.txt'
      : 'Neural_Networks_Lecture_Guide.txt';

    const blob = new Blob([sampleText], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    validateAndSetFile(file);
  };

  // The 7 Required Workflow Stages: SELECT FILE → VALIDATE → UPLOAD → EXTRACT TEXT → SAVE CONTENT → INDEX CONTENT → MARK READY
  const workflowStages: { key: WorkflowStep; label: string; stageNum: number }[] = [
    { key: 'select', label: '1. Select File', stageNum: 1 },
    { key: 'validate', label: '2. Validate', stageNum: 2 },
    { key: 'upload', label: '3. Upload', stageNum: 3 },
    { key: 'extract', label: '4. Extract Text', stageNum: 4 },
    { key: 'save', label: '5. Save Content', stageNum: 5 },
    { key: 'index', label: '6. Index Content', stageNum: 6 },
    { key: 'ready', label: '7. Mark Ready', stageNum: 7 }
  ];

  const currentStatus = getDocumentStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFFFFF] border border-[#E8E5F0] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E5F0] flex items-center justify-between bg-[#EEE9FF]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#6D4AFF]/10 text-[#6D4AFF]">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#6D4AFF]">
                  {retryDoc ? `Retry Processing: ${retryDoc.title}` : 'Upload Learning Material'}
                </h3>
                {isUploading && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEE9FF] text-[#6D4AFF] border border-[#D1DCD6]">
                    Status: {currentStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#77758A]">
                {retryDoc ? 'Re-processes document in place without creating duplicate records' : 'PDF lecture notes, textbook chapters, or study transcripts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-[#77758A] hover:text-[#242338] hover:bg-[#EEE9FF] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7-Stage Workflow Progress Indicator */}
        <div className="px-6 py-2.5 bg-[#F7F5FF] border-b border-[#E8E5F0] overflow-x-auto">
          <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-[#77758A] min-w-[500px]">
            {workflowStages.map((step, idx) => {
              const isActive = currentStep === step.key;
              const isPast =
                (currentStep === 'validate' && idx < 1) ||
                (currentStep === 'upload' && idx < 2) ||
                (currentStep === 'extract' && idx < 3) ||
                (currentStep === 'save' && idx < 4) ||
                (currentStep === 'index' && idx < 5) ||
                (currentStep === 'ready');

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-1 shrink-0 ${
                    isActive
                      ? 'text-[#6D4AFF] font-bold'
                      : isPast
                      ? 'text-[#1B6A43]'
                      : 'text-[#77758A]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#6D4AFF] animate-ping' : isPast ? 'bg-[#1B6A43]' : 'bg-[#E8E5F0]'}`} />
                  <span>{step.label}</span>
                  {idx < workflowStages.length - 1 && (
                    <span className="text-[#E8E5F0] mx-0.5">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#6D4AFF] bg-[#EEE9FF]'
                : selectedFile
                ? 'border-[#1B6A43] bg-[#E8F5EE]/50'
                : 'border-[#E8E5F0] hover:border-[#9254DE] bg-[#F7F5FF]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,text/plain,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-[#E8F5EE] text-[#6D4AFF] flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="font-semibold text-[#242338] text-sm">{selectedFile.name}</p>
                <p className="text-xs text-[#77758A] mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for text extraction & semantic indexing
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setCurrentStep('select');
                  }}
                  className="mt-3 text-xs text-[#B91C1C] hover:underline cursor-pointer"
                  disabled={isUploading}
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-[#EEE9FF] text-[#6D4AFF] flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-semibold text-[#242338] text-sm">
                  {retryDoc ? `Select corrected file for "${retryDoc.fileName}"` : 'Click to select or drag & drop files here'}
                </p>
                <p className="text-xs text-[#77758A] mt-1">
                  Supports digital text PDF, TXT, and Markdown (Max 25 MB)
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7F5FF] border border-[#E8E5F0] font-mono text-[#77758A]">PDF</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7F5FF] border border-[#E8E5F0] font-mono text-[#77758A]">TXT</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7F5FF] border border-[#E8E5F0] font-mono text-[#77758A]">MD</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FEE2E2] border border-[#B91C1C]/30 text-[#B91C1C] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C] mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Processing Notice (Status: Failed)</p>
                </div>
                <p className="mt-0.5 leading-relaxed text-[#242338]">{errorMessage}</p>
                {errorMessage.includes('OCR') && (
                  <p className="mt-1 text-[11px] text-[#77758A]">
                    Tip: Digital text PDFs have selectable text. If this is a photo or scanned page, convert it with OCR before uploading.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress Bar & Real-time Stage Status */}
          {isUploading && (
            <div className="space-y-2.5 p-3.5 rounded-xl bg-[#EEE9FF] border border-[#E8E5F0]">
              <div className="flex justify-between items-center text-xs font-medium text-[#242338]">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6D4AFF]" />
                  {currentStep === 'upload' && 'Uploading document to server (Status: Uploading)...'}
                  {currentStep === 'extract' && 'Extracting page-aware text (Status: Processing)...'}
                  {currentStep === 'save' && 'Saving document content & metadata (Status: Processing)...'}
                  {currentStep === 'index' && 'Generating semantic chunks (Status: Processing)...'}
                  {currentStep === 'ready' && 'Indexing complete (Status: Ready)!'}
                </span>
                <span className="font-mono text-[#77758A] font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E8E5F0] overflow-hidden">
                <div
                  className="h-full bg-[#6D4AFF] rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Instant Sample Materials for Testing */}
          {!retryDoc && (
            <div className="pt-2 border-t border-[#E8E5F0]">
              <div className="flex items-center justify-between text-xs text-[#77758A] mb-2">
                <span className="flex items-center gap-1 font-semibold text-[#242338]">
                  <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
                  No PDF on hand? Try a prepared study guide:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSampleFile('quantum')}
                  disabled={isUploading}
                  className="px-3 py-2 text-left rounded-xl bg-[#F7F5FF] border border-[#E8E5F0] hover:border-[#6D4AFF] hover:bg-[#EEE9FF] text-xs text-[#242338] transition-all cursor-pointer"
                >
                  <p className="font-semibold truncate">⚛️ Quantum Computation</p>
                  <p className="text-[10px] text-[#77758A]">Qubits, Bell states, gates</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSampleFile('distributed')}
                  disabled={isUploading}
                  className="px-3 py-2 text-left rounded-xl bg-[#F7F5FF] border border-[#E8E5F0] hover:border-[#6D4AFF] hover:bg-[#EEE9FF] text-xs text-[#242338] transition-all cursor-pointer"
                >
                  <p className="font-semibold truncate">🧠 Deep Learning & Backprop</p>
                  <p className="text-[10px] text-[#77758A]">Loss landscapes, chain rule</p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#EEE9FF] border-t border-[#E8E5F0] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#77758A]">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Preserves exact page numbers for citation</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-[#77758A] hover:text-[#242338] rounded-xl hover:bg-[#E8E5F0] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#6D4AFF] hover:bg-[#5638D5] text-white shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : retryDoc ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-[#EEE9FF]" />
                  <span>Retry Processing</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#EEE9FF]" />
                  <span>Process & Index</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
