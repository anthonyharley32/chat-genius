import React, { useEffect, useState } from "react";
import styles from "./answer.module.css";

interface AnswerProps {
  text: string;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
}

export const Answer: React.FC<AnswerProps> = ({ text, messagesEndRef }) => {
  const [words, setWords] = useState<string[]>([]);
  const [visibleWords, setVisibleWords] = useState<number>(0);
  const WORD_DELAY = 50; // 50ms between each word

  useEffect(() => {
    const words = text.split(" ");
    setWords(words);
    
    // Reset visible words
    setVisibleWords(0);
    
    // Gradually show words
    words.forEach((_, index) => {
      setTimeout(() => {
        setVisibleWords(prev => prev + 1);
        if (messagesEndRef?.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: "smooth", 
            block: "end" 
          });
        }
      }, index * WORD_DELAY);
    });
  }, [text, messagesEndRef]);

  return (
    <div>
      {words.slice(0, visibleWords).map((word, index) => (
        <span
          key={index}
          className={styles.fadeIn}
        >
          {word}{" "}
        </span>
      ))}
    </div>
  );
}; 