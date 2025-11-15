import { useState, useEffect, useRef } from 'react';
import { useStopwatch } from '../hooks/useStopwatch';
import { useAuth } from '../contexts/AuthContext';
import { getCharacterImage, type CharacterEmotion } from '../utils/characterAvatar';
import type { Quiz, QuizQuestion } from './QuizModal';
import './GamifiedQuiz.css';

interface GamifiedQuizProps {
  quiz: Quiz;
  onClose: () => void;
  onComplete: (score: { correct: number; total: number; accuracy: number }) => void;
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

  // Initialize words for current question
  useEffect(() => {
    if (quizStarted && quiz.questions[currentQuestionIndex]) {
      const question = quiz.questions[currentQuestionIndex];
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
      setShowFeedback(false);
      setLastAnswerCorrect(null);
      setXpGained(0);
      setCharacterEmotion('neutral');
      questionStopwatch.start();
    }
  }, [currentQuestionIndex, quizStarted, quiz.questions]);

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
    
    setSelectedWords([...selectedWords, word]);
  };

  const handleRemoveWord = (word: string, index: number) => {
    // Remove word from selected and add back to available
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    
    setAvailableWords([...availableWords, word]);
  };

  const handleCheck = () => {
    const question = quiz.questions[currentQuestionIndex];
    const correctAnswer = question.choices[question.correctIndex];
    const correctWords = correctAnswer
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    const responseTime = questionStopwatch.stop();
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

    const updatedAnswers = [...answers, answerData];

    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setXpGained(0);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setAnswers(updatedAnswers);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedWords([]);
      questionStopwatch.start();
    } else {
      handleComplete(updatedAnswers);
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

    setQuizCompleted(true);
    onComplete({ correct, total, accuracy });
  };

  const handleHide = () => {
    onVisibilityChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleHide();
    }
  };

  if (!isVisible) return null;

  if (!quizStarted) {
    return (
      <div className="gamified-quiz-modal" role="dialog" aria-modal="true" ref={modalRef}>
        <div className="gamified-quiz-content">
          <div className="gamified-quiz-header">
            <h2>Word Order Challenge</h2>
            <button className="gamified-quiz-hide-button" onClick={handleHide}>
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
            <button className="gamified-quiz-hide-button" onClick={handleHide}>
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
        </div>
      </div>
    </div>
  );
}

