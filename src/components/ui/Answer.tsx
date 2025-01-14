import React, { useEffect, useState, useRef } from "react";
import styles from "./answer.module.css";

interface AnswerProps {
  text: string;
  isNew?: boolean;
}

export const Answer: React.FC<AnswerProps> = ({ text, isNew = false }) => {
  const [words, setWords] = useState<string[]>([]);
  const [visibleWords, setVisibleWords] = useState<number>(0);
  const lastWordRef = useRef<HTMLSpanElement>(null);
  const WORD_DELAY = 50; // 50ms between each word

  useEffect(() => {
    const words = text.split(" ");
    setWords(words);
    
    if (isNew) {
      // Reset visible words and animate only for new messages
      setVisibleWords(0);
      words.forEach((_, index) => {
        setTimeout(() => {
          setVisibleWords(prev => prev + 1);
        }, index * WORD_DELAY);
      });
    } else {
      // Show all words immediately for existing messages
      setVisibleWords(words.length);
    }
  }, [text, isNew]);

  useEffect(() => {
    if (lastWordRef.current && visibleWords > 0 && isNew) {
      lastWordRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end" 
      });
    }
  }, [visibleWords, isNew]);

  return (
    <div>
      {words.slice(0, visibleWords).map((word, index) => (
        <span
          key={index}
          ref={index === visibleWords - 1 ? lastWordRef : undefined}
          className={isNew ? styles.fadeIn : undefined}
        >
          {word}{" "}
        </span>
      ))}
    </div>
  );
}; 