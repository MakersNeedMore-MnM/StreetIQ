import { useState, useEffect, useCallback, useRef } from 'react';

export function useVoiceAssistant(onIntentDetected) {
  const [isListening, setIsListening] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const recognitionRef = useRef(null);
  const isAwakeRef = useRef(false);

  // We need to keep onIntentDetected up-to-date without recreating recognition
  const callbackRef = useRef(onIntentDetected);
  useEffect(() => {
    callbackRef.current = onIntentDetected;
  }, [onIntentDetected]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    const handleIntent = (intent) => {
      if (callbackRef.current) {
        callbackRef.current(intent);
      }
      isAwakeRef.current = false;
      setIsAwake(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        const text = finalTranscript.toLowerCase().trim();
        console.log('[VoiceAssistant] Recognized:', text);
        
        if (!isAwakeRef.current) {
          // Look for wake word using regex to handle misinterpretations
          const wakeMatch = text.match(/hello (street|straight|streat|strid)/i);
          if (wakeMatch) {
            isAwakeRef.current = true;
            setIsAwake(true);
            const afterWake = text.slice(wakeMatch.index + wakeMatch[0].length).trim();
            // If they said intent immediately after, handle it
            if (afterWake.length > 3) {
              handleIntent(afterWake);
            }
          }
        } else {
          // Already awake, treat this as the intent
          if (text.length > 3) {
            handleIntent(text);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('[VoiceAssistant] Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      if (isListening) {
        // Automatically restart if it stops while toggled on
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent restart loop on unmount
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) {}
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      isAwakeRef.current = false;
      setIsAwake(false);
    }
  }, [isListening]);

  const speak = useCallback((text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    isListening,
    toggleListening: () => setIsListening(prev => !prev),
    isAwake,
    speak
  };
}
