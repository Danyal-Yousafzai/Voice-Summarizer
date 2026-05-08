'use client';

import { useState } from 'react';
import { Mic, Cloud, Zap, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AppState = 'input' | 'loading' | 'results';

interface SummaryData {
  detected_language: string;
  summary: string[];
  transcript: string;
}

// Mock fallback data for vS preview
const MOCK_DATA: SummaryData = {
  detected_language: 'Urdu',
  summary: [
    'یہ ایک بہترین موقع ہے جو آپ کے کاروبار کو آگے بڑھا سکتا ہے۔',
    'گاہکوں کی ضروریات کو سمجھنا بہت ضروری ہے۔',
    'ہمیں مسلسل بہتری کی کوشش کرنی چاہیے۔',
  ],
  transcript: `السلام علیکم، آج میں آپ کو اپنی نئی پروجیکٹ کے بارے میں بتانا چاہتا ہوں۔ یہ پروجیکٹ ہماری کمپنی کے لیے بہت اہم ہے اور اس سے ہم اپنی خدمات میں بہتری لا سکیں گے۔ ہم نے اپنی ٹیم کو اس کے لیے تیار کر لیا ہے۔ اس مہینے کے آخر تک ہم اپنا پہلا مرحلہ مکمل کریں گے۔ تمام ٹیم ممبرز بہت محنت کر رہے ہیں۔ ہمیں یقین ہے کہ یہ پروجیکٹ ہمارے کاروبار کو نیا رخ دے گی اور ہم اپنے اہداف تک پہنچ سکیں گے۔`,
};

export default function VoiceSummarizer() {
  const [state, setState] = useState<AppState>('input');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData>(MOCK_DATA);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showLinkedInDialog, setShowLinkedInDialog] = useState(false);

  const handleContinueToLinkedIn = () => {
    window.open('https://www.linkedin.com/in/danyal-khan-yousafzai', '_blank');
    setShowLinkedInDialog(false);
  };

  const handleSelectAudio = async () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setState('loading');
      setAlertMessage(null);

      try {
        // Create FormData and append the file
        const formData = new FormData();
        formData.append('file', file);

        // Make fetch POST request to the backend
        // Make fetch POST request to the live backend
        const response = await fetch('https://voice-summarizer-n4gd.onrender.com/summarize/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response
        const result = await response.json();

        if (result.status === 'success' && result.data) {
          // Map real data to the UI state
          setSummaryData({
            detected_language: result.data.detected_language,
            summary: Array.isArray(result.data.summary)
              ? result.data.summary
              : [result.data.summary],
            transcript: result.data.transcript,
          });
          setState('results');
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        // CRUCIAL FALLBACK: Handle CORS/Mixed Content errors in v0 preview
        console.error('[v0] Backend connection error:', error);
        setAlertMessage(
          'Cannot connect to localhost from cloud preview. Exporting code to test locally!'
        );

        // Fall back to mock data for preview
        setSummaryData(MOCK_DATA);
        setState('results');
      }
    };
    input.click();
  };

  const handleProcessAnother = () => {
    setState('input');
    setIsTranscriptOpen(false);
    setAlertMessage(null);
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* STATE 1: INPUT SCREEN */}
        {state === 'input' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header with Subtitle */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <Mic className="w-8 h-8 text-blue-600" strokeWidth={2} />
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                  Voice Summarizer
                </h1>
              </div>
              <p className="text-center text-slate-600 text-lg">
                Instantly get accurate summaries and full transcriptions of your audio files.
              </p>
            </div>

            {/* Dropzone with Glassmorphism */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 md:p-12 text-center hover:border-blue-400 transition-all duration-200 bg-white/40 backdrop-blur-sm shadow-xl hover:shadow-2xl">
              <Cloud className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <p className="text-lg text-slate-700 mb-2">
                Click to upload audio or record voice note
              </p>
              <p className="text-sm text-slate-500 mb-6">
                MP3, WAV, or M4A up to 100MB
              </p>
              <Button
                onClick={handleSelectAudio}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Select Audio File
              </Button>
            </div>
          </div>
        )}

        {/* STATE 2: LOADING SCREEN */}
        {state === 'loading' && (
          <div className="space-y-8 flex flex-col items-center justify-center animate-in fade-in duration-500">
            {/* Pulsing CPU Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-blue-100 rounded-full p-8">
                <Zap className="w-12 h-12 text-blue-600 animate-pulse" />
              </div>
            </div>

            {/* Loading Text */}
            <div className="text-center space-y-2">
              <p className="text-2xl md:text-3xl font-bold text-slate-900">
                AI is analyzing your audio...
              </p>
              <p className="text-lg text-slate-600">
                Transcribing and generating summary
              </p>
            </div>

            {/* Loading Indicator */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                ></div>
              ))}
            </div>
          </div>
        )}

        {/* STATE 3: RESULTS SCREEN */}
        {state === 'results' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Alert for v0 Preview */}
            {alertMessage && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{alertMessage}</p>
              </div>
            )}

            {/* Language Badge */}
            <div className="flex justify-center">
              <Badge className="bg-emerald-100 text-emerald-800 px-4 py-2 text-base border border-emerald-300">
                🗣️ Detected Language: {summaryData.detected_language}
              </Badge>
            </div>

            {/* Summary Card */}
            {(() => {
              // 1. Safely extract the text into a single string
              const rawText = Array.isArray(summaryData?.summary)
                ? summaryData.summary.join(" ")
                : String(summaryData?.summary || "");

              // 2. Force split it at every asterisk or newline
              const parsedSummary = rawText
                .split(/(?:\n|\*)+/)
                .map((point) => point.trim())
                .filter((point) => point.length > 0);

              return (
                <Card className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-lg">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Summary
                  </h2>
                  <ul
                    dir="auto"
                    className="list-disc pl-5 space-y-2 text-start"
                  >
                    {parsedSummary.map((point, idx) => (
                      <li key={idx} className="text-slate-700 text-lg">
                        {point}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })()}

            {/* Transcript Toggle */}
            <div className="space-y-3">
              <button
                onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all duration-200"
              >
                <span className="font-semibold text-slate-900">
                  View Full Transcript
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-600 transition-transform duration-300 ${
                    isTranscriptOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Transcript Card - Expandable */}
              {isTranscriptOpen && (
                <Card className="p-6 md:p-8 bg-white border-slate-200 animate-in slide-in-from-top duration-300">
                  <div
                    dir="auto"
                    className="text-start text-slate-700 leading-relaxed space-y-3 whitespace-pre-wrap"
                  >
                    {summaryData.transcript}
                  </div>
                </Card>
              )}
            </div>

            {/* Reset Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleProcessAnother}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                Process Another File
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* LinkedIn Confirmation Dialog */}
      <AlertDialog open={showLinkedInDialog} onOpenChange={setShowLinkedInDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Leaving Voice Summarizer</AlertDialogTitle>
          <AlertDialogDescription>
            You are now leaving this application to visit Danyal&apos;s LinkedIn profile. Do you wish to continue?
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleContinueToLinkedIn}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 py-4 text-center">
        <p className="text-slate-600">
          Powered by{' '}
          <button
            onClick={() => setShowLinkedInDialog(true)}
            className="text-blue-600 hover:text-blue-700 hover:underline transition-all duration-200 font-semibold"
          >
            Danyal
          </button>
        </p>
      </footer>
    </main>
  );
}
