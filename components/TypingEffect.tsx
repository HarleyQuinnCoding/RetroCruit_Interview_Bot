import React, { useState, useEffect } from 'react';

interface TypingEffectProps {
  text: string;
  speed?: number; // milliseconds per character
  className?: string;
  cursorClassName?: string;
  onTypingComplete?: () => void;
  startDelay?: number; // delay before typing starts
  blinkCursor?: boolean; // whether the cursor should blink at the end
}

const TypingEffect: React.FC<TypingEffectProps> = ({
  text,
  speed = 50,
  className = '',
  cursorClassName = '',
  onTypingComplete,
  startDelay = 0,
  blinkCursor = true,
}) => {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(false);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);

  useEffect(() => {
    setDisplayedText(''); // Reset on text change
    setIsTypingComplete(false);
    setCursorVisible(true);

    let charIndex = 0;
    let timer: number;
    let delayTimer: number;

    const startTyping = () => {
      timer = window.setInterval(() => {
        if (charIndex < text.length) {
          setDisplayedText((prev) => prev + text.charAt(charIndex));
          charIndex++;
        } else {
          window.clearInterval(timer);
          setIsTypingComplete(true);
          if (onTypingComplete) {
            onTypingComplete();
          }
        }
      }, speed);
    };

    delayTimer = window.setTimeout(startTyping, startDelay);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(delayTimer);
    };
  }, [text, speed, onTypingComplete, startDelay]);


  useEffect(() => {
    let blinkTimer: number;
    if (isTypingComplete && blinkCursor) {
      blinkTimer = window.setInterval(() => {
        setCursorVisible((prev) => !prev);
      }, 700); // Blink speed
    } else {
      setCursorVisible(true); // Ensure cursor is visible while typing or if no blink
    }

    return () => {
      window.clearInterval(blinkTimer);
    };
  }, [isTypingComplete, blinkCursor]);

  return (
    <span className={className}>
      {displayedText}
      <span
        className={`${cursorClassName} ${
          isTypingComplete && blinkCursor && !cursorVisible ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-75`}
      >
        |
      </span>
    </span>
  );
};

export default TypingEffect;