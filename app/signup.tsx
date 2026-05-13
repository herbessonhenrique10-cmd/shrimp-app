import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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

export default function SignupScreen() {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [carregando, setCarregando] = useState(false);

  const criar = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha e-mail e senha");
      return;
    }
    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      Alert.alert("Atenção", "As senhas não conferem.");
      return;
    }
    setCarregando(true);
    try {
      await signup(email, senha);
      router.replace("/viveiros");
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || "";
      let msg = "Não foi possível criar a conta.";
      if (code.includes("email-already-in-use"))
        msg = "Este e-mail já está em uso.";
      else if (code.includes("invalid-email")) msg = "E-mail inválido.";
      else if (code.includes("weak-password")) msg = "Senha muito fraca.";
      else if (code.includes("network")) msg = "Sem conexão com a internet.";
      Alert.alert("Erro", msg);
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
          <TouchableOpacity onPress={() => router.back()} style={styles.voltar}>
            <Feather name="arrow-left" size={22} color="#1e40af" />
          </TouchableOpacity>

          <View style={styles.logoBox}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.titulo}>Criar conta</Text>
            <Text style={styles.subtitulo}>
              Seus dados ficam salvos na nuvem
            </Text>
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
              placeholder="Senha (mín. 6 caracteres)"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          <View style={styles.campo}>
            <Feather name="lock" size={18} color="#64748b" />
            <TextInput
              style={styles.input}
              placeholder="Confirmar senha"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={confirmar}
              onChangeText={setConfirmar}
            />
          </View>

          <TouchableOpacity
            style={[styles.botao, carregando && { opacity: 0.6 }]}
            onPress={criar}
            disabled={carregando}
            activeOpacity={0.8}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botaoTxt}>Criar conta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.rodape}>
            <Text style={styles.rodapeTxt}>Já tem conta?</Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.rodapeLink}> Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 24, flexGrow: 1, justifyContent: "center" },
  voltar: { position: "absolute", top: 12, left: 16, padding: 8 },
  logoBox: { alignItems: "center", marginBottom: 32 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  titulo: {
    fontSize: 24,
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
  botao: {
    backgroundColor: "#1e40af",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
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
