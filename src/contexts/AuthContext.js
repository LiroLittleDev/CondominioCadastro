import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Simular carregamento inicial com delay de 3 segundos
    const initializeApp = async () => {
      // Delay mínimo de 3 segundos para splash
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verificar usuário salvo
      const savedUser = localStorage.getItem('sgc_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      
      setShowSplash(false);
      setLoading(false);
    };
    
    initializeApp();
  }, []);

  const login = (username, password) => {
    const users = {
      'admin': { password: 'admin123', role: 'admin', name: 'Administrador' },
      'user': { password: 'user123', role: 'user', name: 'Usuário' }
    };

    const userData = users[username];
    if (userData && userData.password === password) {
      const userInfo = { username, role: userData.role, name: userData.name };
      setUser(userInfo);
      localStorage.setItem('sgc_user', JSON.stringify(userInfo));
      return { success: true };
    }
    return { success: false, message: 'Credenciais inválidas' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sgc_user');
  };

  const isAdmin = () => user?.role === 'admin';
  const isLoggedIn = () => !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isLoggedIn, loading, showSplash }}>
      {children}
    </AuthContext.Provider>
  );
};