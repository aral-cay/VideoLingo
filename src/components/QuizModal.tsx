import { useState, useEffect, useRef } from 'react';
import { useStopwatch } from '../hooks/useStopwatch';

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: string; answerIndex: number; correct: boolean; responseTime: number }>>([]);
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

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    questionStopwatch.start();
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const question = quiz.questions[currentQuestionIndex];
    const responseTime = questionStopwatch.stop();
    const isCorrect = selectedAnswer === question.correctIndex;

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

    const updatedAnswers = [...answers, answerData];

    setShowFeedback(false);
    setLastAnswerCorrect(null);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setAnswers(updatedAnswers);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
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
              aria-label="Hide quiz"
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
            aria-label="Hide quiz"
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
        </div>
      </div>
    </div>
  );
}

