import { useState, useEffect, useRef } from 'react';
import { useStopwatch } from '../hooks/useStopwatch';
import { useAuth } from '../contexts/AuthContext';

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

export interface Quiz {
  instructions: string;
  questions: QuizQuestion[];
  passingScore: number;
  maxScoreBehavior: string;
}

interface QuizModalProps {
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
}

export function QuizModal({
  quiz,
  onClose,
  onComplete,
  isVisible,
  onVisibilityChange,
}: QuizModalProps) {
  const { participantId, username, condition } = useAuth();
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
  const questionStopwatch = useStopwatch();
  const quizStartTimeRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && !quizStarted) {
      quizStartTimeRef.current = Date.now();
    }
    // Don't reset quiz state when visibility changes - preserve progress
  }, [isVisible, quizStarted]);

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
      } else {
        setShowFeedback(false);
        setLastAnswerCorrect(null);
      }
      
      questionStopwatch.start();
    }
  }, [currentQuestionIndex, quizStarted, quiz.questions, savedQuestionStates, savedFeedback]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
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

  const handleSubmit = () => {
    const question = quiz.questions[currentQuestionIndex];
    questionStopwatch.stop();
    const isCorrect = selectedAnswer === question.correctIndex;

    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    const question = quiz.questions[currentQuestionIndex];
    const responseTime = questionStopwatch.getElapsed();
    const isCorrect = selectedAnswer === question.correctIndex;

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

  const handleShow = () => {
    onVisibilityChange(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) {
      if (quizCompleted) {
        onClose();
      } else {
        handleHide();
      }
    }
  };

  // When hidden, don't render anything - parent will show the "Open Quiz" button
  if (!isVisible) {
    return null;
  }

  if (quizCompleted) {
    const correct = answers.filter((a) => a.correct).length;
    const total = quiz.questions.length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return (
      <div
        className="quiz-modal quiz-complete"
        role="dialog"
        aria-labelledby="quiz-complete-title"
        aria-modal="true"
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <div className="quiz-modal-content">
          <h2 id="quiz-complete-title">Quiz Complete!</h2>
          <div className="quiz-score">
            <p>
              You scored {correct} out of {total} ({accuracy.toFixed(1)}%)
            </p>
          </div>
          <button
            className="quiz-return-button"
            onClick={onClose}
            aria-label="Return home"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div
        className="quiz-modal"
        role="dialog"
        aria-labelledby="quiz-instructions-title"
        aria-modal="true"
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <div className="quiz-modal-content">
          <div className="quiz-modal-header">
            <h2 id="quiz-instructions-title">Quiz</h2>
            <button
              className="quiz-hide-button"
              onClick={handleHide}
              aria-label="Hide quiz"
            >
              Hide
            </button>
          </div>
          <div className="quiz-instructions">
            <p>{quiz.instructions || 'Click words in order to form the Italian translation!'}</p>
            <p>You'll see an English sentence. Click Italian words in the correct order to translate it.</p>
            <p>This quiz has {quiz.questions.length} questions.</p>
          </div>
          <button
            className="quiz-start-button"
            onClick={handleStartQuiz}
            aria-label="Start quiz"
          >
            Start Quiz
          </button>
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
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  return (
    <div
      className="quiz-modal"
      role="dialog"
      aria-labelledby="quiz-question-title"
      aria-modal="true"
      ref={modalRef}
      onKeyDown={handleKeyDown}
    >
      <div className="quiz-modal-content">
        <div className="quiz-modal-header">
          <h2 id="quiz-question-title">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </h2>
          <button
            className="quiz-hide-button"
            onClick={handleHide}
            aria-label="Hide quiz"
          >
            Hide
          </button>
        </div>
        <div className="quiz-question">
          {/* English prompt */}
          <div className="quiz-prompt-container">
            <p className="prompt-label">Translate to Italian:</p>
            <p className="quiz-prompt">{currentQuestion.prompt}</p>
          </div>

          {/* Selected words (sentence being built) */}
          <div className="quiz-selected-words">
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
            <div className="quiz-available-words">
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
            <div className={`quiz-feedback ${lastAnswerCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-incorrect'}`}>
              {lastAnswerCorrect ? (
                <div className="feedback-content">
                  <span className="feedback-icon">✓</span>
                  <span className="feedback-text">Correct!</span>
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
          <div className="quiz-actions">
            <div className="quiz-navigation">
              <button
                className="quiz-nav-button quiz-prev-button"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                aria-label="Previous question"
              >
                ← Previous
              </button>
              <div className="quiz-main-action">
                {!showFeedback ? (
                  <button
                    className="quiz-next-button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    aria-label="Submit answer"
                  >
                    Check
                  </button>
                ) : (
                  <button
                    className="quiz-next-button"
                    onClick={handleContinue}
                    aria-label={isLastQuestion ? 'Submit quiz' : 'Next question'}
                  >
                    {isLastQuestion ? 'Finish' : 'Continue'}
                  </button>
                )}
              </div>
              <button
                className="quiz-nav-button quiz-next-nav-button"
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

