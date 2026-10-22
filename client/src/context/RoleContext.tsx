import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
  officerName: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('fmr_user_role');
    return (saved === 'officer' ? 'officer' : 'citizen') as UserRole;
  });

  const officerName = 'Eng. K. Rajesh (Ward 14 Operations)';

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('fmr_user_role', newRole);
  };

  const toggleRole = () => {
    setRole(role === 'citizen' ? 'officer' : 'citizen');
  };

  useEffect(() => {
    localStorage.setItem('fmr_user_role', role);
  }, [role]);

  return (
    <RoleContext.Provider value={{ role, setRole, toggleRole, officerName }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
};
