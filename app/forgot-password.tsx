import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);

  const enviar = async () => {
    if (!email) {
      Alert.alert("Atenção", "Informe seu e-mail");
      return;
    }
    setCarregando(true);
    try {
      await resetPassword(email);
      Alert.alert(
        "E-mail enviado",
        "Verifique sua caixa de entrada. Enviamos um link para redefinir sua senha.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || "";
      let msg = "Não foi possível enviar o e-mail.";
      if (code.includes("user-not-found"))
        msg = "Não encontramos uma conta com esse e-mail.";
      else if (code.includes("invalid-email")) msg = "E-mail inválido.";
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
            <View style={styles.iconCircle}>
              <Feather name="key" size={32} color="#1e40af" />
            </View>
            <Text style={styles.titulo}>Esqueceu a senha?</Text>
            <Text style={styles.subtitulo}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
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

          <TouchableOpacity
            style={[styles.botao, carregando && { opacity: 0.6 }]}
            onPress={enviar}
            disabled={carregando}
            activeOpacity={0.8}
          >
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botaoTxt}>Enviar link de recuperação</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkVoltar}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.linkVoltarTxt}>Voltar para o login</Text>
          </TouchableOpacity>
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 16,
  },
  subtitulo: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, color: "#0f172a" },
  botao: {
    backgroundColor: "#1e40af",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTxt: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  linkVoltar: { alignSelf: "center", marginTop: 24, padding: 8 },
  linkVoltarTxt: { color: "#1e40af", fontWeight: "600", fontSize: 14 },
});
