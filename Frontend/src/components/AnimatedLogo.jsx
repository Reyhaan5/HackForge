import { useRef } from 'react';
import logoAnimation from '../assets/chatbot.mp4';
import styles from "./AnimatedLogo.module.css";

export default function AnimatedLogo({ onClick, className, title }) {
  const videoRef = useRef(null);
  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0; 
      videoRef.current.play().catch(()=>{});
    }
  };

  const handleClick=(e) =>{
    if(videoRef.current){
      videoRef.current.currentTime = 0; 
      videoRef.current.play().catch(() => {});
    }
    onClick?.(e);
  };

  return(
    <div 
      className={`${styles.animatedLogo} ${className || ''}`} 
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      title={title}>
      <video
        ref={videoRef}
        src={logoAnimation}
        muted
        playsInline
        disablePictureInPicture
      />
    </div>
  );
}