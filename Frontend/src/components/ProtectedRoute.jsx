import { Navigate } from "react-router-dom";
import { useReceipts } from "../context/ReceiptContext.jsx";

export default function ProtectedRoute({ children, requiredRole }) {
    const { user } = useReceipts();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
        return <Navigate to="/" replace />;
    }
    return children;
}
