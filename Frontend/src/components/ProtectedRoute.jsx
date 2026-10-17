import { Navigate } from "react-router-dom";
import { useReceipts } from "../context/ReceiptContext.jsx";

export default function ProtectedRoute({ children, requiredRole }) {
    const { user } = useReceipts();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    const allowedRoles = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : null;
    if (allowedRoles && !allowedRoles.some(role => user.role?.toLowerCase() === role.toLowerCase())) {
        return <Navigate to="/" replace />;
    }
    return children;
}
