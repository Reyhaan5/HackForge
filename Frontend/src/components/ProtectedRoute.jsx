import React from "react";
import { Navigate } from "react-router-dom";
import { useReceipts } from "../context/ReceiptContext.jsx";

export default function ProtectedRoute({ children }) {
    const { user } = useReceipts();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
}