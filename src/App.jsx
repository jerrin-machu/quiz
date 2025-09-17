import { useState } from "react";
import "./App.css";
import questions from "./constants/questions.json";
import Questions from "./components/Questions";
import Result from "./components/Result";

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState([]);

  const handleNextQuestion = (isCorrect) => {
    setCurrentQuestion(currentQuestion + 1);
    setUserAnswer([...userAnswer, isCorrect]);
  };

  function resetQuiz() {
    setCurrentQuestion(0);
    setUserAnswer([]);
  }
  console.log(userAnswer);
  return (
    <div className="app">
      <h1>World Quiz</h1>
      {/* Questions component */}

      {currentQuestion < questions.length && (
        <Questions
          question={questions[currentQuestion]}
          onAnswerClick={handleNextQuestion}
        />
      )}

      {/* Result Component */}

      {currentQuestion === questions.length && (
        <Result
          userAnswer={userAnswer}
          resetQuiz={resetQuiz}
          questions={questions}
        />
      )}
    </div>
  );
}

export default App;
