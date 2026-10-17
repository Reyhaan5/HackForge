import { useNavigate } from "react-router-dom";
import AnimatedLogo from "./AnimatedLogo";
import logo from "../assets/logo.png";
import styles from "./BrandLogos.module.css";

export default function BrandLogos({ className = "" }) {
  const navigate = useNavigate();

  const handleMascotClick = (e) => {
    e.stopPropagation();
    navigate("/dashboard");
  };

  return (
    <div className={`${styles.logos} ${className}`.trim()}>
      <button
        type="button"
        className={styles.mascotBtn}
        onClick={handleMascotClick}
        title="Chat with Mitra AI Counselor"
        aria-label="Mitra AI Counselor"
      >
        <AnimatedLogo />
      </button>

      <span className={styles.divider} aria-hidden="true" />

      <a
        href="http://sbmp.ac.in/"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sbmpLink}
        title="Visit SVKM's SBMP Official Website"
        aria-label="SBMP Official Website"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={logo} alt="SBMP Logo" className={styles.sbmpLogo} />
      </a>
    </div>
  );
}

