import { useState, useEffect, useRef } from 'react';
import { useStopwatch } from '../hooks/useStopwatch';
import { useAuth } from '../contexts/AuthContext';
import { getCharacterImage, type CharacterEmotion } from '../utils/characterAvatar';
import type { Quiz } from './QuizModal';
import './GamifiedQuiz.css';

interface GamifiedQuizProps {
  quiz: Quiz;
  onClose: () => void;
  onComplete: (score: {
    correct: number;
    total: number;
    accuracy: number;
    totalResponseTimeMs?: number;
    avgResponseTimeMs?: number;
  }) => void;
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  participantId?: string;
  onHeartsUpdate?: (hearts: number) => void;
}

export function GamifiedQuiz({
  quiz,
  onClose,
  onComplete,
  isVisible,
  onVisibilityChange,
  participantId,
  onHeartsUpdate,
}: GamifiedQuizProps) {
  const { username } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Array<{ questionId: string; correct: boolean; responseTime: number }>>([]);
  // Store selected words and available words for each question to preserve when navigating
  const [savedQuestionStates, setSavedQuestionStates] = useState<Map<string, { selectedWords: string[]; availableWords: string[] }>>(new Map());
  // Store feedback state for each question
  const [savedFeedback, setSavedFeedback] = useState<Map<string, { isCorrect: boolean; checked: boolean }>>(new Map());
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [xpGained, setXpGained] = useState<number>(0);
  const [currentHearts, setCurrentHearts] = useState<number>(20);
  const [characterEmotion, setCharacterEmotion] = useState<CharacterEmotion>('neutral');
  const questionStopwatch = useStopwatch();
  const quizStartTimeRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load initial hearts
  useEffect(() => {
    if (participantId && isVisible) {
      const loadHearts = async () => {
        const { getGamificationData } = await import('../utils/gamification');
        const data = await getGamificationData(participantId);
        if (data) {
          setCurrentHearts(data.hearts);
        }
      };
      loadHearts();
    }
  }, [participantId, isVisible]);

  // Initialize words for current question or restore saved state
  useEffect(() => {
    if (quizStarted && quiz.questions[currentQuestionIndex]) {
      const question = quiz.questions[currentQuestionIndex];
      const savedState = savedQuestionStates.get(question.id);
      const savedFeedbackState = savedFeedback.get(question.id);
      
      if (savedState) {
        // Restore saved state
        setSelectedWords(savedState.selectedWords);
        setAvailableWords(savedState.availableWords);
      } else {
        // Initialize new question
        const correctAnswer = question.choices[question.correctIndex];
        
        // Split correct answer into words, handling punctuation
        const correctWords = correctAnswer
          .split(/\s+/)
          .map(w => w.trim())
          .filter(w => w.length > 0);
        
        // Get words from incorrect choices as potential distractors
        const incorrectChoices = question.choices.filter((_, idx) => idx !== question.correctIndex);
        const distractorWords = incorrectChoices
          .flatMap(choice => 
            choice
              .split(/\s+/)
              .map(w => w.trim())
              .filter(w => w.length > 0)
          )
          .filter(word => !correctWords.includes(word)); // Remove words that are already in correct answer
        
        // Select 2-3 random distractors
        const shuffledDistractors = [...new Set(distractorWords)].sort(() => Math.random() - 0.5);
        const selectedDistractors = shuffledDistractors.slice(0, Math.min(3, shuffledDistractors.length));
        
        // Create word bank with correct words + 2-3 distractors
        const wordBank = [...correctWords, ...selectedDistractors];
        const shuffled = [...wordBank].sort(() => Math.random() - 0.5);
        
        setAvailableWords(shuffled);
        setSelectedWords([]);
      }
      
      if (savedFeedbackState?.checked) {
        setShowFeedback(true);
        setLastAnswerCorrect(savedFeedbackState.isCorrect);
        setCharacterEmotion(savedFeedbackState.isCorrect ? 'happy' : 'sad');
      } else {
        setShowFeedback(false);
        setLastAnswerCorrect(null);
        setCharacterEmotion('neutral');
      }
      
      setXpGained(0);
      questionStopwatch.start();
    }
  }, [currentQuestionIndex, quizStarted, quiz.questions, savedQuestionStates, savedFeedback]);

  useEffect(() => {
    if (isVisible && !quizStarted) {
      quizStartTimeRef.current = Date.now();
    }
  }, [isVisible, quizStarted]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setCharacterEmotion('neutral');
    questionStopwatch.start();
  };

  const handleWordClick = (word: string, index: number) => {
    // Remove word from available and add to selected
    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);
    
    const newSelected = [...selectedWords, word];
    setSelectedWords(newSelected);
    
    // Save state immediately
    const question = quiz.questions[currentQuestionIndex];
    setSavedQuestionStates(prev => new Map(prev).set(question.id, {
      selectedWords: newSelected,
      availableWords: newAvailable
    }));
  };

  const handleRemoveWord = (word: string, index: number) => {
    // Remove word from selected and add back to available
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    
    const newAvailable = [...availableWords, word];
    setAvailableWords(newAvailable);
    
    // Save state immediately
    const question = quiz.questions[currentQuestionIndex];
    setSavedQuestionStates(prev => new Map(prev).set(question.id, {
      selectedWords: newSelected,
      availableWords: newAvailable
    }));
  };

  const handleCheck = () => {
    const question = quiz.questions[currentQuestionIndex];
    const correctAnswer = question.choices[question.correctIndex];
    const correctWords = correctAnswer
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    questionStopwatch.stop();
    const isCorrect = selectedWords.length === correctWords.length &&
      selectedWords.every((word, idx) => word === correctWords[idx]);


    // Calculate XP for this question (for display) - +5 per correct answer
    if (isCorrect) {
      setXpGained(5); // +5 XP per correct answer
      setCharacterEmotion('happy');
    } else {
      setXpGained(0);
      setCharacterEmotion('sad');
      // Deduct heart immediately for wrong answer
      if (participantId) {
        const deductHeart = async () => {
          const { getGamificationData, updateHearts } = await import('../utils/gamification');
          const current = await getGamificationData(participantId);
          if (current) {
            const newHearts = Math.max(0, current.hearts - 1);
            await updateHearts(participantId, newHearts);
            setCurrentHearts(newHearts);
            if (onHeartsUpdate) {
              onHeartsUpdate(newHearts);
            }
          }
        };
        deductHeart();
      }
    }

    // Save feedback state
    setSavedFeedback(prev => new Map(prev).set(question.id, { isCorrect, checked: true }));

    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    const question = quiz.questions[currentQuestionIndex];
    const responseTime = questionStopwatch.getElapsed();
    const correctAnswer = question.choices[question.correctIndex];
    const correctWords = correctAnswer
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    const isCorrect = selectedWords.length === correctWords.length &&
      selectedWords.every((word, idx) => word === correctWords[idx]);

    const answerData = {
      questionId: question.id,
      correct: isCorrect,
      responseTime,
    };

    // Check if this answer was already recorded
    const existingAnswerIndex = answers.findIndex(a => a.questionId === question.id);
    let updatedAnswers;
    if (existingAnswerIndex >= 0) {
      updatedAnswers = [...answers];
      updatedAnswers[existingAnswerIndex] = answerData;
    } else {
      updatedAnswers = [...answers, answerData];
    }
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleComplete(updatedAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // Save current state before navigating
      const question = quiz.questions[currentQuestionIndex];
      setSavedQuestionStates(prev => new Map(prev).set(question.id, {
        selectedWords,
        availableWords
      }));
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      // Save current state before navigating
      const question = quiz.questions[currentQuestionIndex];
      setSavedQuestionStates(prev => new Map(prev).set(question.id, {
        selectedWords,
        availableWords
      }));
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleComplete = (finalAnswers?: typeof answers) => {
    const answersToUse = finalAnswers || answers;
    if (finalAnswers) {
      setAnswers(finalAnswers);
    }
    const correct = answersToUse.filter((a) => a.correct).length;
    const total = quiz.questions.length;
    const accuracy = total > 0 ? correct / total : 0;

    // Calculate timing metrics
    const totalResponseTimeMs = answersToUse.reduce((sum, a) => sum + a.responseTime, 0);
    const avgResponseTimeMs = total > 0 ? totalResponseTimeMs / total : 0;

    setQuizCompleted(true);
    onComplete({ correct, total, accuracy, totalResponseTimeMs, avgResponseTimeMs });
  };

  const handleHide = () => {
    // Save current state before hiding
    if (quizStarted && quiz.questions[currentQuestionIndex]) {
      const question = quiz.questions[currentQuestionIndex];
      setSavedQuestionStates(prev => new Map(prev).set(question.id, {
        selectedWords,
        availableWords
      }));
    }
    onVisibilityChange(false);
  };

  // const handleShow = () => {
  //   onVisibilityChange(true);
  // };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleHide();
    }
  };

  // When hidden, don't render anything - parent will show the "Open Quiz" button
  if (!isVisible) {
    return null;
  }

  if (!quizStarted) {
    return (
      <div className="gamified-quiz-modal" role="dialog" aria-modal="true" ref={modalRef}>
        <div className="gamified-quiz-content">
          <div className="gamified-quiz-header">
            <h2>Word Order Challenge</h2>
            <button 
              className="gamified-quiz-hide-button" 
              onClick={handleHide}
            >
              Hide
            </button>
          </div>
          <div className="gamified-quiz-start">
            <p className="gamified-quiz-instructions">
              {quiz.instructions || 'Click words in order to form the Italian translation!'}
            </p>
            <p className="gamified-quiz-subinstructions">
              You'll see an English sentence. Click Italian words in the correct order to translate it.
            </p>
            <button className="gamified-quiz-start-button" onClick={handleStartQuiz}>
              Begin Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const correct = answers.filter((a) => a.correct).length;
    const total = quiz.questions.length;
    const accuracy = total > 0 ? correct / total : 0;

    return (
      <div className="gamified-quiz-modal" role="dialog" aria-modal="true" ref={modalRef}>
        <div className="gamified-quiz-content">
          <div className="gamified-quiz-completion">
            <h2>Quiz Complete!</h2>
            <div className="gamified-quiz-score">
              <div className="score-value">{correct}/{total}</div>
              <div className="score-label">Correct</div>
              <div className="score-accuracy">{Math.round(accuracy * 100)}%</div>
            </div>
            <button className="gamified-quiz-close-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const correctAnswer = currentQuestion.choices[currentQuestion.correctIndex];
  const correctWords = correctAnswer
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);
  const canSubmit = selectedWords.length === correctWords.length;

  return (
    <div
      className="gamified-quiz-modal"
      role="dialog"
      aria-modal="true"
      ref={modalRef}
      onKeyDown={handleKeyDown}
    >
      <div className="gamified-quiz-content">
        <div className="gamified-quiz-header">
          <h2>
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </h2>
          <div className="gamified-quiz-header-right">
            <div className="gamified-quiz-hearts">
              <span className="heart-icon">♡</span>
              <span className="heart-value">{currentHearts}</span>
            </div>
            <button 
              className="gamified-quiz-hide-button" 
              onClick={handleHide}
            >
              Hide
            </button>
          </div>
        </div>

        {/* Character Display */}
        <div className={`gamified-quiz-character character-emotion-${characterEmotion}`}>
          <img 
            src={getCharacterImage(username, characterEmotion)} 
            alt={`${username}'s character`}
            className="quiz-character-image"
          />
        </div>
        
        <div className="gamified-quiz-question">
          {/* English prompt */}
          <div className="gamified-quiz-prompt">
            <p className="prompt-label">Translate to Italian:</p>
            <p className="prompt-text">{currentQuestion.prompt}</p>
          </div>

          {/* Selected words (sentence being built) */}
          <div className="gamified-quiz-selected">
            <div className="selected-words-container">
              {selectedWords.length === 0 ? (
                <div className="empty-sentence">Tap words below to build your answer</div>
              ) : (
                selectedWords.map((word, index) => (
                  <button
                    key={`selected-${index}`}
                    className="selected-word-tile"
                    onClick={() => !showFeedback && handleRemoveWord(word, index)}
                    disabled={showFeedback}
                  >
                    {word}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Available words to click */}
          {!showFeedback && (
            <div className="gamified-quiz-words">
              <div className="words-container">
                {availableWords.map((word, index) => (
                  <button
                    key={`word-${index}`}
                    className="word-tile"
                    onClick={() => handleWordClick(word, index)}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {showFeedback && (
            <div className={`gamified-quiz-feedback ${lastAnswerCorrect ? 'gamified-feedback-correct' : 'gamified-feedback-incorrect'}`}>
              {lastAnswerCorrect ? (
                <div className="feedback-content">
                  <span className="feedback-icon">✓</span>
                  <span className="feedback-text">Correct!</span>
                  {xpGained > 0 && (
                    <div className="feedback-xp">+{xpGained} XP</div>
                  )}
                </div>
              ) : (
                <div className="feedback-content">
                  <span className="feedback-icon">✗</span>
                  <span className="feedback-text">Incorrect</span>
                  <div className="feedback-correct-answer">
                    Correct answer: <strong>{correctAnswer}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit/Continue button */}
          <div className="gamified-quiz-actions">
            <div className="gamified-quiz-navigation">
              <button
                className="gamified-quiz-nav-button gamified-quiz-prev-button"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                aria-label="Previous question"
              >
                ← Previous
              </button>
              <div className="gamified-quiz-main-action">
                {!showFeedback ? (
                  <button
                    className="gamified-quiz-check-button"
                    onClick={handleCheck}
                    disabled={!canSubmit}
                  >
                    Check
                  </button>
                ) : (
                  <button
                    className="gamified-quiz-check-button"
                    onClick={handleContinue}
                  >
                    {currentQuestionIndex < quiz.questions.length - 1 ? 'Continue' : 'Finish'}
                  </button>
                )}
              </div>
              <button
                className="gamified-quiz-nav-button gamified-quiz-next-nav-button"
                onClick={handleNext}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
                aria-label="Next question"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

