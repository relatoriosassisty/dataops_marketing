/**
 * components/ui/ProtectedRoute.jsx
 * Redireciona para /login se não houver sessão ativa.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner mensagem="Verificando sessão..." />
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
