import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../lib/auth-context";
import { CHAVE_HISTORICO, CicloArquivado, carregar } from "../../lib/storage";

const formatBRL = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

export default function HistoricoScreen() {
  const { syncVersion } = useAuth();
  const [ciclos, setCiclos] = useState<CicloArquivado[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    (async () => {
      const lista = await carregar<CicloArquivado[]>(CHAVE_HISTORICO, []);
      lista.sort((a, b) => (a.dataEncerramento < b.dataEncerramento ? 1 : -1));
      setCiclos(lista);
      setCarregado(true);
    })();
  }, [syncVersion]);

  // Group by year, then by viveiro name
  const gruposPorAno = ciclos.reduce<Record<string, Record<string, CicloArquivado[]>>>((acc, c) => {
    const partes = c.dataEncerramento.split('/');
    const ano = partes[2] || 'Sem data';
    const viveiro = c.viveiroNome || 'Viveiro';
    if (!acc[ano]) acc[ano] = {};
    if (!acc[ano][viveiro]) acc[ano][viveiro] = [];
    acc[ano][viveiro].push(c);
    return acc;
  }, {});

  const anos = Object.keys(gruposPorAno).sort((a, b) => b.localeCompare(a));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/viveiros")}>
          <Text style={styles.btnVoltar}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Histórico de ciclos</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.lista}>
        {carregado && ciclos.length === 0 && (
          <View style={styles.vazio}>
            <Text style={styles.vazioTitulo}>Nenhum ciclo encerrado ainda</Text>
            <Text style={styles.vazioTexto}>
              Quando você encerrar um cultivo, ele aparecerá aqui com todas as
              informações do ciclo.
            </Text>
          </View>
        )}

        {anos.map((ano) => (
          <View key={ano} style={styles.anoContainer}>
            <View style={styles.anoHeader}>
              <Text style={styles.anoTitulo}>📅 {ano}</Text>
            </View>

            {Object.keys(gruposPorAno[ano]).sort().map((viveiroNome) => (
              <View key={viveiroNome} style={styles.viveiroContainer}>
                <Text style={styles.grupoTitulo}>🦐 {viveiroNome}</Text>

                {gruposPorAno[ano][viveiroNome].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.cardCiclo}
                    onPress={() =>
                      router.push({ pathname: "/historico/[id]", params: { id: c.id } })
                    }
                  >
                    <View style={styles.cardLinhaTopo}>
                      <Text style={styles.cardData}>
                        Encerrado em {c.dataEncerramento}
                      </Text>
                      <Text
                        style={[
                          styles.cardLucro,
                          { color: c.metricas.lucroLiquido < 0 ? "#dc2626" : "#166534" },
                        ]}
                      >
                        {formatBRL(c.metricas.lucroLiquido)}
                      </Text>
                    </View>
                    <View style={styles.cardLinhaInfo}>
                      <Text style={styles.cardInfoTxt}>
                        {c.metricas.dias} dias · {c.metricas.biomassa.toFixed(0)} kg
                        biomassa · FCA {c.metricas.fca.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={styles.cardSeta}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    backgroundColor: "#1e3a8a",
    paddingTop: 10,
    paddingBottom: 14,
  },
  btnVoltar: { color: "#fff", fontSize: 14, fontWeight: "bold", width: 60 },
  titulo: { fontSize: 18, fontWeight: "bold", color: "#fff", flex: 1, textAlign: "center" },
  lista: { padding: 16 },
  vazio: { paddingTop: 60, alignItems: "center", paddingHorizontal: 30 },
  vazioTitulo: { fontSize: 16, fontWeight: "bold", color: "#1e293b", marginBottom: 8 },
  vazioTexto: { fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 18 },
  anoContainer: { marginBottom: 28 },
  anoHeader: {
    backgroundColor: "#1e3a8a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  anoTitulo: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  viveiroContainer: { marginBottom: 16, paddingLeft: 4 },
  grupoTitulo: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1e3a8a",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    paddingTop: 2,
    paddingBottom: 2,
  },
  cardCiclo: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  cardLinhaTopo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  cardData: { fontSize: 13, fontWeight: "bold", color: "#1e293b" },
  cardLucro: { fontSize: 14, fontWeight: "bold" },
  cardLinhaInfo: { paddingRight: 18 },
  cardInfoTxt: { fontSize: 11, color: "#64748b" },
  cardSeta: { position: "absolute", right: 12, top: "50%", fontSize: 24, color: "#94a3b8" },
});
