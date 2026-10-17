import { useState } from "react";
import styles from "../styles/Modal.module.css";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function ProfileModal({ isOpen, onClose }){
    const navigate=useNavigate();
    const [user]=useState(() => {
        const storedUser = localStorage.getItem("user");
        if(storedUser){
            try{
                return JSON.parse(storedUser);
            }
            catch{
                return null;
            }
        }
        return null;
    });

    const handleLogout=async()=>{
        try{
            await api.post("/auth/logout", {}, { withCredentials: true });
        } 
        catch(err){
            console.log("Logout Error Occured: ", err);
        } 
        finally{
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            onClose();
            navigate("/login", { replace: true });
        }
    };
    if(!isOpen) return null;

    return(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.modalTitle}>Profile</h2>
                <p className={styles.modalDescription}>Current Log In: {user?.username}</p>
                <p className={styles.modalDescription}>Current Role: {user?.role}</p>
                <div className={styles.buttonGroup}>
                    <button onClick={onClose} className={styles.primaryButton}>
                        Close
                    </button>
                    <button onClick={handleLogout} className={styles.dangerButton}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}