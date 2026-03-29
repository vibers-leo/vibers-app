import { useState, useEffect, useCallback } from "react";

// Firebase Auth 연동 (추후 구현)
interface User {
  uid: string;
  email: string;
  displayName: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Firebase Auth onAuthStateChanged 연결
    // 현재는 mock으로 바로 로딩 완료
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    // TODO: Firebase signOut
    setUser(null);
  }, []);

  return { user, loading, signOut };
}
