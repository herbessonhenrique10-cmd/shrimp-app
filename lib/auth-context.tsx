import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { auth, db } from "./firebase";
import { baixarTudoDaNuvem } from "./sync";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  syncVersion: number;
  sincronizando: boolean;
  erroSync: string | null;
  semInternet: boolean;
  login: (email: string, senha: string) => Promise<void>;
  signup: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sincronizarAgora: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncVersion, setSyncVersion] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [erroSync, setErroSync] = useState<string | null>(null);
  const [semInternet, setSemInternet] = useState(false);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  const classificarErro = (e: unknown): { msg: string; semInternet: boolean } => {
    const raw = e instanceof Error ? e.message : String(e);
    if (
      raw.includes("timeout") ||
      raw.includes("Failed to fetch") ||
      raw.includes("network") ||
      raw.includes("offline") ||
      raw.includes("unavailable") ||
      raw.includes("UNAVAILABLE")
    ) {
      return { msg: "Sem internet — exibindo dados locais.", semInternet: true };
    }
    if (raw.includes("Missing or insufficient permissions")) {
      return { msg: "Sem permissão no banco de dados. Verifique as Regras do Firestore.", semInternet: false };
    }
    return { msg: "Erro ao sincronizar: " + raw, semInternet: false };
  };

  const sincronizarAgora = useCallback(async () => {
    setSincronizando(true);
    try {
      await baixarTudoDaNuvem();
      setErroSync(null);
      setSemInternet(false);
    } catch (e: unknown) {
      const { msg, semInternet: offline } = classificarErro(e);
      setSemInternet(offline);
      setErroSync(offline ? null : msg);
    } finally {
      setSyncVersion((v) => v + 1);
      setSincronizando(false);
    }
  }, []);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
      if (u) {
        // 1. Mostra dados locais IMEDIATAMENTE sem esperar rede
        setSyncVersion((v) => v + 1);
        // 2. Sincroniza com nuvem em segundo plano
        setSincronizando(true);
        baixarTudoDaNuvem()
          .then(() => {
            setErroSync(null);
            setSemInternet(false);
            setSyncVersion((v) => v + 1);
          })
          .catch((e: unknown) => {
            const { msg, semInternet: offline } = classificarErro(e);
            setSemInternet(offline);
            setErroSync(offline ? null : msg);
          })
          .finally(() => setSincronizando(false));
        // 3. Listener em tempo real
        firestoreUnsubRef.current = onSnapshot(
          collection(db, "users", u.uid, "kv"),
          (snap) => {
            const promises: Promise<void>[] = [];
            snap.docChanges().forEach((change) => {
              const data = change.doc.data() as { chave?: string; valor?: string };
              if (change.type === "added" || change.type === "modified") {
                if (data.chave && typeof data.valor === "string") {
                  promises.push(AsyncStorage.setItem(data.chave, data.valor).catch(() => {}));
                }
              } else if (change.type === "removed") {
                if (data.chave) {
                  promises.push(AsyncStorage.removeItem(data.chave).catch(() => {}));
                }
              }
            });
            Promise.all(promises).then(() => {
              setErroSync(null);
              setSemInternet(false);
              setSyncVersion((v) => v + 1);
            });
          },
          (err) => {
            const { msg, semInternet: offline } = classificarErro(err);
            setSemInternet(offline);
            setErroSync(offline ? null : msg);
          }
        );
      }
    });
    return () => {
      authUnsub();
      if (firestoreUnsubRef.current) firestoreUnsubRef.current();
    };
  }, []);

  // Sincroniza quando app volta ao foco
  useEffect(() => {
    if (!user) return;
    if (Platform.OS === "web") {
      const handleVisibility = () => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") sincronizarAgora();
      };
      const handleFocus = () => sincronizarAgora();
      const handleOnline = () => { setSemInternet(false); sincronizarAgora(); };
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", handleVisibility);
      if (typeof window !== "undefined") {
        window.addEventListener("focus", handleFocus);
        window.addEventListener("online", handleOnline);
      }
      return () => {
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", handleVisibility);
        if (typeof window !== "undefined") {
          window.removeEventListener("focus", handleFocus);
          window.removeEventListener("online", handleOnline);
        }
      };
    } else {
      const sub = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") sincronizarAgora();
      });
      return () => sub.remove();
    }
  }, [user, sincronizarAgora]);

  const value = useMemo<AuthContextType>(
    () => ({
      user, loading, syncVersion, sincronizando, erroSync, semInternet, sincronizarAgora,
      login: async (email, senha) => { await signInWithEmailAndPassword(auth, email.trim(), senha); },
      signup: async (email, senha) => { await createUserWithEmailAndPassword(auth, email.trim(), senha); },
      logout: async () => { await signOut(auth); },
      resetPassword: async (email) => { await sendPasswordResetEmail(auth, email.trim()); },
    }),
    [user, loading, syncVersion, sincronizando, erroSync, semInternet, sincronizarAgora]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
