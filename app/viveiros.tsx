import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth-context";
import {
  CHAVE_VIVEIROS,
  carregar,
  chaveDadosViveiro,
  remover,
  salvar,
  testarConexaoNuvem,
} from "../lib/storage";

type Viveiro = { id: string; nome: string };

const VIVEIROS_PADRAO: Viveiro[] = [{ id: "1", nome: "Viveiro 1" }];

export default function ViveirosScreen() {
  const { user, logout, syncVersion, sincronizando, sincronizarAgora, erroSync, semInternet } = useAuth();
  const [viveiros, setViveiros] = useState<Viveiro[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [diagnostico, setDiagnostico] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);
  const primeiraRender = useRef(true);
  const fromSyncRef = useRef(false);

  const confirmarAcao = (titulo: string, mensagem: string, textoBotao: string, onConfirmar: () => void) => {
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`${titulo}\n\n${mensagem}`)) onConfirmar();
    } else {
      Alert.alert(titulo, mensagem, [
        { text: 'Cancelar', style: 'cancel' },
        { text: textoBotao, style: 'destructive', onPress: onConfirmar },
      ]);
    }
  };

  const sair = () => {
    confirmarAcao(
      "Sair",
      "Deseja sair da sua conta? Seus dados ficam salvos na nuvem.",
      "Sair",
      async () => { await logout(); }
    );
  };

  const testarNuvem = async () => {
    setTestando(true);
    setDiagnostico(null);
    const erro = await testarConexaoNuvem();
    if (erro) {
      setDiagnostico("ERRO: " + erro);
    } else {
      setDiagnostico("Conexão com a nuvem OK! Gravação e leitura funcionando.");
    }
    setTestando(false);
  };

  useEffect(() => {
    fromSyncRef.current = true;
    (async () => {
      const lista = await carregar<Viveiro[]>(CHAVE_VIVEIROS, VIVEIROS_PADRAO);
      setViveiros(lista);
      setCarregado(true);
    })();
  }, [syncVersion]);

  useEffect(() => {
    if (!carregado) return;
    if (primeiraRender.current) {
      primeiraRender.current = false;
      return;
    }
    if (fromSyncRef.current) {
      fromSyncRef.current = false;
      return;
    }
    salvar(CHAVE_VIVEIROS, viveiros);
  }, [viveiros, carregado]);

  const adicionar = () => {
    const nome = novoNome.trim();
    if (!nome) {
      if (typeof window !== 'undefined') window.alert("Digite um nome para o viveiro.");
      else Alert.alert("Atenção", "Digite um nome para o viveiro.");
      return;
    }
    const id = Date.now().toString();
    setViveiros((v) => [...v, { id, nome }]);
    setNovoNome("");
    setModalVisivel(false);
  };

  const remover_ = (id: string) => {
    confirmarAcao(
      "Remover viveiro",
      "Tem certeza? Os dados desse viveiro serão apagados.",
      "Remover",
      async () => {
        setViveiros((v) => v.filter((x) => x.id !== id));
        await remover(chaveDadosViveiro(id));
      }
    );
  };

  const abrir = (v: Viveiro) => {
    router.push({ pathname: "/(tabs)", params: { viveiroId: v.id, viveiroNome: v.nome } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLinha}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>Meus viveiros</Text>
            <Text style={styles.subtitulo} numberOfLines={1}>
              {user?.email ?? "Selecione um viveiro"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnSync}
            onPress={sincronizarAgora}
            disabled={sincronizando}
          >
            {sincronizando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="refresh-cw" size={15} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnHistorico}
            onPress={() => router.push("/historico")}
          >
            <Text style={styles.btnHistoricoTxt}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSair} onPress={sair}>
            <Feather name="log-out" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Faixa de sem internet — discreta, não bloqueia o uso */}
      {semInternet && (
        <View style={styles.faixaOffline}>
          <Feather name="wifi-off" size={13} color="#92400e" style={{ marginRight: 5 }} />
          <Text style={styles.txtOffline}>Sem internet — dados locais sendo exibidos</Text>
        </View>
      )}

      {/* Faixa de erro de sincronização (só para erros que não são de rede) */}
      {erroSync && (
        <View style={styles.faixaErro}>
          <Feather name="alert-triangle" size={14} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.txtErro} numberOfLines={3}>{erroSync}</Text>
        </View>
      )}

      {/* Resultado do diagnóstico */}
      {diagnostico && (
        <View style={[styles.faixaErro, diagnostico.startsWith("ERRO") ? styles.faixaErroRed : styles.faixaErroGreen]}>
          <Text style={styles.txtErro}>{diagnostico}</Text>
          <TouchableOpacity onPress={() => setDiagnostico(null)} style={{ marginLeft: 8 }}>
            <Feather name="x" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.lista}>
        {viveiros.map((v) => (
          <TouchableOpacity key={v.id} style={styles.cardViveiro} onPress={() => abrir(v)} onLongPress={() => remover_(v.id)}>
            <View style={styles.iconeViveiro}>
              <Text style={styles.iconeTxt}>🦐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nomeViveiro}>{v.nome}</Text>
              <Text style={styles.dicaViveiro}>Toque para abrir · Segure para remover</Text>
            </View>
            <Text style={styles.seta}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.botaoAdd} onPress={() => setModalVisivel(true)}>
          <Text style={styles.botaoAddTxt}>+ Adicionar viveiro</Text>
        </TouchableOpacity>

        {/* Botão de diagnóstico da nuvem */}
        <TouchableOpacity
          style={styles.botaoDiagnostico}
          onPress={testarNuvem}
          disabled={testando}
        >
          {testando ? (
            <ActivityIndicator size="small" color="#64748b" />
          ) : (
            <Text style={styles.botaoDiagnosticoTxt}>Testar conexão com a nuvem</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <Pressable style={styles.modalFundo} onPress={() => setModalVisivel(false)}>
          <Pressable style={styles.modalCaixa} onPress={() => {}}>
            <Text style={styles.modalTitulo}>Novo viveiro</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Viveiro 2"
              placeholderTextColor="#94a3b8"
              value={novoNome}
              onChangeText={setNovoNome}
              autoFocus
            />
            <View style={styles.modalBotoes}>
              <TouchableOpacity style={[styles.modalBotao, styles.modalBotaoCancel]} onPress={() => setModalVisivel(false)}>
                <Text style={styles.modalBotaoTxtCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBotao, styles.modalBotaoOk]} onPress={adicionar}>
                <Text style={styles.modalBotaoTxtOk}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, backgroundColor: "#1e3a8a" },
  headerLinha: { flexDirection: "row", alignItems: "center" },
  titulo: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  subtitulo: { fontSize: 13, color: "#bfdbfe", marginTop: 4 },
  btnSync: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  btnHistorico: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", marginRight: 8,
  },
  btnHistoricoTxt: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  btnSair: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  faixaOffline: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1, borderBottomColor: "#fde68a",
    paddingHorizontal: 14, paddingVertical: 6,
  },
  txtOffline: { color: "#92400e", fontSize: 12, flex: 1 },
  faixaErro: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#dc2626", paddingHorizontal: 14, paddingVertical: 8,
  },
  faixaErroRed: { backgroundColor: "#dc2626" },
  faixaErroGreen: { backgroundColor: "#16a34a" },
  txtErro: { color: "#fff", fontSize: 12, flex: 1, flexWrap: "wrap" },
  lista: { padding: 16 },
  cardViveiro: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  iconeViveiro: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  iconeTxt: { fontSize: 22 },
  nomeViveiro: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  dicaViveiro: { fontSize: 11, color: "#64748b", marginTop: 2 },
  seta: { fontSize: 28, color: "#94a3b8" },
  botaoAdd: {
    marginTop: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#2563eb", alignItems: "center",
  },
  botaoAddTxt: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  botaoDiagnostico: {
    marginTop: 12, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  botaoDiagnosticoTxt: { color: "#64748b", fontSize: 13 },
  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCaixa: { width: "100%", backgroundColor: "#fff", borderRadius: 14, padding: 18 },
  modalTitulo: { fontSize: 17, fontWeight: "bold", color: "#1e293b", marginBottom: 12 },
  modalInput: {
    borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: "#1e293b", marginBottom: 14,
  },
  modalBotoes: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  modalBotao: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalBotaoCancel: { backgroundColor: "#e2e8f0" },
  modalBotaoOk: { backgroundColor: "#2563eb" },
  modalBotaoTxtCancel: { color: "#475569", fontWeight: "bold" },
  modalBotaoTxtOk: { color: "#fff", fontWeight: "bold" },
});
