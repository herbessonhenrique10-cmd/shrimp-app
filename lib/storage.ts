import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function carregar<T>(chave: string, padrao: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(chave);
    if (raw == null) return padrao;
    return JSON.parse(raw) as T;
  } catch {
    return padrao;
  }
}

export async function salvar<T>(chave: string, valor: T): Promise<void> {
  try {
    await AsyncStorage.setItem(chave, JSON.stringify(valor));
  } catch {}
  syncToCloud(chave, valor).catch(() => {});
}

export async function remover(chave: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(chave);
  } catch {}
  removeFromCloud(chave).catch(() => {});
}

export async function salvarESincronizar<T>(chave: string, valor: T): Promise<void> {
  try {
    await AsyncStorage.setItem(chave, JSON.stringify(valor));
  } catch {}
  await syncToCloud(chave, valor);
}

export async function removerESincronizar(chave: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(chave);
  } catch {}
  await removeFromCloud(chave);
}

export async function testarConexaoNuvem(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return "Usuário não autenticado.";
  const chave = "shrimp:__diagnostico__";
  const docId = encodeKey(chave);
  try {
    await setDoc(doc(db, "users", user.uid, "kv", docId), {
      chave,
      valor: JSON.stringify("ok"),
      atualizadoEm: Date.now(),
    });
    await deleteDoc(doc(db, "users", user.uid, "kv", docId));
    return null;
  } catch (e: unknown) {
    if (e instanceof Error) return e.message;
    return "Erro desconhecido ao conectar com a nuvem.";
  }
}

async function aguardarAuth(tentativas = 10): Promise<boolean> {
  for (let i = 0; i < tentativas; i++) {
    if (auth.currentUser) return true;
    await new Promise<void>((r) => setTimeout(r, 500));
  }
  return false;
}

async function syncToCloud<T>(chave: string, valor: T, retry = true): Promise<void> {
  let user = auth.currentUser;
  if (!user) {
    const ok = await aguardarAuth(10);
    if (!ok) return;
    user = auth.currentUser;
    if (!user) return;
  }
  const docId = encodeKey(chave);
  await setDoc(doc(db, "users", user.uid, "kv", docId), {
    chave,
    valor: JSON.stringify(valor),
    atualizadoEm: Date.now(),
  }).catch(async (err) => {
    if (retry) {
      await new Promise<void>((r) => setTimeout(r, 3000));
      return syncToCloud(chave, valor, false);
    }
    throw err;
  });
}

async function removeFromCloud(chave: string, retry = true): Promise<void> {
  let user = auth.currentUser;
  if (!user) {
    const ok = await aguardarAuth(10);
    if (!ok) return;
    user = auth.currentUser;
    if (!user) return;
  }
  const docId = encodeKey(chave);
  await deleteDoc(doc(db, "users", user.uid, "kv", docId)).catch(async (err) => {
    if (retry) {
      await new Promise<void>((r) => setTimeout(r, 3000));
      return removeFromCloud(chave, false);
    }
    throw err;
  });
}

export async function carregarDaNuvem<T>(chave: string, padrao: T): Promise<T> {
  const user = auth.currentUser;
  if (!user) return padrao;
  try {
    const docId = encodeKey(chave);
    const snap = await getDoc(doc(db, "users", user.uid, "kv", docId));
    if (!snap.exists()) return padrao;
    const data = snap.data() as { valor?: string };
    if (!data.valor) return padrao;
    return JSON.parse(data.valor) as T;
  } catch {
    return padrao;
  }
}

function encodeKey(chave: string): string {
  return chave.replace(/[/.#$[\]]/g, "_");
}

export const CHAVE_VIVEIROS = "shrimp:viveiros";
export const chaveDadosViveiro = (id: string) => `shrimp:viveiro:${id}`;
export const CHAVE_HISTORICO = "shrimp:historico";

export type CicloArquivado = {
  id: string;
  viveiroId: string;
  viveiroNome: string;
  dataEncerramento: string;
  dataPovoamento: string;
  snapshot: unknown;
  metricas: {
    dias: number;
    biomassa: number;
    fca: number;
    sobrevivencia: number;
    densidade: number;
    animaisVivos: number;
    valorGasto: number;
    valorApurado: number;
    lucroLiquido: number;
  };
};
