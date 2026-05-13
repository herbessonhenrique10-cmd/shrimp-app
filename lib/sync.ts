import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";

const TIMEOUT_MS = 8000;

export async function baixarTudoDaNuvem(): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;
  let count = 0;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
  );
  const snap = await Promise.race([
    getDocs(collection(db, "users", user.uid, "kv")),
    timeoutPromise,
  ]);
  const chavesDaNuvem = new Set<string>();
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as { chave?: string; valor?: string };
    if (data.chave && typeof data.valor === "string") {
      try { await AsyncStorage.setItem(data.chave, data.valor); } catch {}
      chavesDaNuvem.add(data.chave);
      count++;
    }
  }
  try {
    const todasChaves = await AsyncStorage.getAllKeys();
    const chavesParaRemover = todasChaves.filter(
      (k) => k.startsWith("shrimp:") && !chavesDaNuvem.has(k)
    );
    if (chavesParaRemover.length > 0) await AsyncStorage.multiRemove(chavesParaRemover);
  } catch {}
  return count;
}

export async function limparArmazenamentoLocal(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const shrimpKeys = keys.filter((k) => k.startsWith("shrimp:"));
    await AsyncStorage.multiRemove(shrimpKeys);
  } catch {}
}
