import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { baixarTudoDaNuvem } from "@/lib/sync";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha e-mail e senha");
      return;
    }
    setCarregando(true);
    try {
      await login(email, senha);
      await baixarTudoDaNuvem();
      router.replace("/viveiros");
    } catch (e: unknown) {
      const msg = mensagemErro(e);
      Alert.alert("Erro ao entrar", msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.titulo}>Gestão Camarão</Text>
            <Text style={styles.subtitulo}>Entre com sua conta</Text>
          </View>

          <View style={styles.campo}>
            <Feather name="mail" size={18} color="#64748b" />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.campo}>
            <Feather name="lock" size={18} color="#64748b" />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!mostrarSenha}
              value={senha}
              onChangeText={setSenha}
            />
            <TouchableOpacity onPress={() => setMostrarSenha((v) => !v)}>
              <Feather
                name={mostrarSenha ? "eye-off" : "eye"}
                size={18}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>

          <Link href="/forgot-password" asChild>
            <TouchableOpacity style={styles.linkEsqueci}>
              <Text style={styles.linkEsqueciTxt}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={[styles.botao, carregando && { opacity: 0.6 }]}
            onPress={entrar}
            disabled={carregando}
            activeOpacity={0.8}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botaoTxt}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.rodape}>
            <Text style={styles.rodapeTxt}>Ainda não tem conta?</Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.rodapeLink}> Criar conta</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mensagemErro(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "E-mail ou senha incorretos.";
  if (code.includes("user-not-found")) return "Usuário não encontrado.";
  if (code.includes("invalid-email")) return "E-mail inválido.";
  if (code.includes("too-many-requests"))
    return "Muitas tentativas. Tente novamente mais tarde.";
  if (code.includes("network")) return "Sem conexão com a internet.";
  return "Não foi possível entrar. Verifique seus dados.";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 24, flexGrow: 1, justifyContent: "center" },
  logoBox: { alignItems: "center", marginBottom: 32 },
  logo: { width: 96, height: 96, borderRadius: 24 },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 12,
  },
  subtitulo: { fontSize: 14, color: "#64748b", marginTop: 4 },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#0f172a" },
  linkEsqueci: { alignSelf: "flex-end", marginBottom: 20, marginTop: 4 },
  linkEsqueciTxt: { color: "#1e40af", fontWeight: "600", fontSize: 13 },
  botao: {
    backgroundColor: "#1e40af",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTxt: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  rodape: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  rodapeTxt: { color: "#64748b", fontSize: 14 },
  rodapeLink: { color: "#1e40af", fontWeight: "bold", fontSize: 14 },
});
