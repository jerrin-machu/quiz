import React from "react";

const Result = ({ questions, resetQuiz, userAnswer }) => {
  const correctAnswers = userAnswer.filter((answer) => {
    return answer;
  }).length;
  console.log(userAnswer);
  return (
    <div className="results">
      <h2>Results</h2>
      <p>
        {" "}
        You answered {correctAnswers} out of {questions.length} questions
        <span onClick={resetQuiz}> click here to Retry</span>
      </p>
      <ul>
        {questions.map((question, index) => {
          return (
            <li key={index} data-correct={userAnswer[index]}>
              {" "}
              Q{index + 1} {question.question}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Result;
