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
  onComplete: (score: { correct: number; total: number; accuracy: number }) => void;
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
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: string; answerIndex: number; correct: boolean; responseTime: number }>>([]);
  // Store selected answers for each question to preserve when navigating
  const [savedAnswers, setSavedAnswers] = useState<Map<string, number>>(new Map());
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
  }, [isVisible, quizStarted]);

  useEffect(() => {
    if (isVisible && modalRef.current) {
      const firstInput = modalRef.current.querySelector('input[type="radio"]') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [isVisible, currentQuestionIndex]);

  // Restore saved answer when navigating to a question
  useEffect(() => {
    if (quizStarted && quiz.questions[currentQuestionIndex]) {
      const question = quiz.questions[currentQuestionIndex];
      const savedAnswer = savedAnswers.get(question.id);
      const savedFeedbackState = savedFeedback.get(question.id);
      
      if (savedAnswer !== undefined) {
        setSelectedAnswer(savedAnswer);
      } else {
        setSelectedAnswer(null);
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
  }, [currentQuestionIndex, quizStarted, quiz.questions, savedAnswers, savedFeedback]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    questionStopwatch.start();
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
    // Save the answer immediately so it persists when navigating
    const question = quiz.questions[currentQuestionIndex];
    setSavedAnswers(prev => new Map(prev).set(question.id, index));
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const question = quiz.questions[currentQuestionIndex];
    const responseTime = questionStopwatch.stop();
    const isCorrect = selectedAnswer === question.correctIndex;

    // Save the answer and feedback state
    setSavedAnswers(prev => new Map(prev).set(question.id, selectedAnswer));
    setSavedFeedback(prev => new Map(prev).set(question.id, { isCorrect, checked: true }));

    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    if (selectedAnswer === null) return;

    const question = quiz.questions[currentQuestionIndex];
    const responseTime = questionStopwatch.elapsed;
    const isCorrect = selectedAnswer === question.correctIndex;

    const answerData = {
      questionId: question.id,
      answerIndex: selectedAnswer,
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
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      // Save current answer before navigating
      if (selectedAnswer !== null) {
        const question = quiz.questions[currentQuestionIndex];
        setSavedAnswers(prev => new Map(prev).set(question.id, selectedAnswer));
      }
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

    setQuizCompleted(true);
    onComplete({ correct, total, accuracy });
  };

  const handleHide = () => {
    onVisibilityChange(false);
  };

  const handleShow = () => {
    onVisibilityChange(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible) {
      if (quizCompleted) {
        onClose();
      }
      // Hide button is disabled, so don't allow Escape to hide during quiz
    }
  };

  if (!isVisible && !quizCompleted) {
    return (
      <button
        className="quiz-show-button"
        onClick={handleShow}
        aria-label="Show quiz"
      >
        Show Quiz
      </button>
    );
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
              disabled
              aria-label="Hide quiz"
              title="Hiding is disabled, will erase quiz progress."
            >
              Hide
            </button>
          </div>
          <div className="quiz-instructions">
            <p>{quiz.instructions}</p>
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
            disabled
            aria-label="Hide quiz"
            title="Hiding is disabled, will erase quiz progress."
          >
            Hide
          </button>
        </div>
        <div className="quiz-question">
          <p className="quiz-prompt">{currentQuestion.prompt}</p>
          <fieldset className="quiz-choices" disabled={showFeedback}>
            <legend className="sr-only">Select an answer</legend>
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctIndex;
              const showAsCorrect = showFeedback && isCorrect;
              const showAsIncorrect = showFeedback && isSelected && !isCorrect;
              
              return (
                <label 
                  key={index} 
                  className={`quiz-choice ${showAsCorrect ? 'quiz-choice-correct' : ''} ${showAsIncorrect ? 'quiz-choice-incorrect' : ''}`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={index}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    aria-label={`Option ${index + 1}: ${choice}`}
                  />
                  <span>{choice}</span>
                </label>
              );
            })}
          </fieldset>
          
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
                    Correct answer: <strong>{currentQuestion.choices[currentQuestion.correctIndex]}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
          
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
                    disabled={selectedAnswer === null}
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

