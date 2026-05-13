import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const confirmarAcao = (titulo: string, mensagem: string, textoBotao: string, onConfirmar: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n\n${mensagem}`)) onConfirmar();
  } else {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      { text: textoBotao, style: 'destructive', onPress: onConfirmar },
    ]);
  }
};
import {
  CHAVE_HISTORICO,
  CicloArquivado,
  carregar,
  chaveDadosViveiro,
  salvar,
} from "../../lib/storage";

const formatBRL = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

type DadosTecnicos = {
  area?: string;
  dataPovoamento?: string;
  laboratorio?: string;
  qtdInicial?: string;
  gramatura?: string;
  tratoDia?: string;
  racaoAcumulada?: string;
  historicoBiometria?: { data: string; peso: string }[];
  desbaste1?: string;
  desbaste2?: string;
  desbaste3?: string;
  pesca?: string;
};

type Snapshot = {
  dados: DadosTecnicos;
  racao1?: string;
  racao2?: string;
  valoresColunas?: Record<string, string>;
  dataInicioRacao?: string;
  gastosDescricoes?: string[];
  gastosValores?: string[];
  calcPrecoBase?: string;
  calcQtdInicial?: string;
  calcSobrevivencia?: string;
  calcPeso?: string;
  calcGastos?: string;
  calcDias?: string;
};

export default function HistoricoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ciclo, setCiclo] = useState<CicloArquivado | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    (async () => {
      const lista = await carregar<CicloArquivado[]>(CHAVE_HISTORICO, []);
      const c = lista.find((x) => x.id === id) || null;
      setCiclo(c);
      setCarregado(true);
    })();
  }, [id]);

  const restaurar = () => {
    confirmarAcao(
      "Restaurar cultivo",
      "Isso vai restaurar todos os dados deste ciclo como cultivo ativo no viveiro. Deseja continuar?",
      "Restaurar",
      async () => {
        if (!ciclo) return;
        const snap = (ciclo.snapshot as Snapshot) || { dados: {} };
        await salvar(chaveDadosViveiro(ciclo.viveiroId), {
          dados: snap.dados || {},
          racao1: snap.racao1 || '',
          racao2: snap.racao2 || '',
          valoresColunas: snap.valoresColunas || {},
          dataInicioRacao: snap.dataInicioRacao || '',
          gastosDescricoes: snap.gastosDescricoes || [],
          gastosValores: snap.gastosValores || [],
          calcPrecoBase: snap.calcPrecoBase || '',
          calcQtdInicial: snap.calcQtdInicial || '',
          calcSobrevivencia: snap.calcSobrevivencia || '',
          calcPeso: snap.calcPeso || '',
          calcGastos: snap.calcGastos || '',
          calcDias: snap.calcDias || '',
        });
        const lista = await carregar<CicloArquivado[]>(CHAVE_HISTORICO, []);
        await salvar(CHAVE_HISTORICO, lista.filter((x) => x.id !== id));
        router.replace("/viveiros");
      },
    );
  };

  const excluir = () => {
    confirmarAcao(
      "Excluir do histórico",
      "Tem certeza que deseja apagar este ciclo? Esta ação não pode ser desfeita.",
      "Excluir",
      async () => {
        const lista = await carregar<CicloArquivado[]>(CHAVE_HISTORICO, []);
        await salvar(CHAVE_HISTORICO, lista.filter((x) => x.id !== id));
        router.replace("/historico");
      },
    );
  };

  if (!carregado) {
    return <SafeAreaView style={styles.safe} edges={["top", "bottom"]} />;
  }

  if (!ciclo) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace("/historico")}>
            <Text style={styles.btnVoltar}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.titulo}>Ciclo não encontrado</Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>
    );
  }

  const snap = (ciclo.snapshot as Snapshot) || { dados: {} };
  const d = snap.dados || {};
  const biometrias = d.historicoBiometria || [];

  const dataPovoamentoFormatada = (() => {
    const pov = ciclo.dataPovoamento;
    if (!pov) return "—";
    if (pov.length > 5) return pov;
    const parts = ciclo.dataEncerramento.split('/');
    if (parts.length === 3) {
      const enc = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      enc.setDate(enc.getDate() - ciclo.metricas.dias);
      return `${pov}/${enc.getFullYear()}`;
    }
    return pov;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/historico")}>
          <Text style={styles.btnVoltar}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.titulo} numberOfLines={1}>
          {ciclo.viveiroNome}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.cardResumoTopo}>
          <Text style={styles.subtitulo}>Povoamento: {dataPovoamentoFormatada}</Text>
          <Text style={styles.subtitulo}>Encerrado em {ciclo.dataEncerramento}</Text>
        </View>

        <Text style={styles.secTitle}>RESULTADO FINANCEIRO</Text>
        <View style={styles.card}>
          <View style={styles.linhaResumo}>
            <Text style={styles.linhaLabel}>Valor apurado</Text>
            <Text style={styles.linhaVal}>{formatBRL(ciclo.metricas.valorApurado)}</Text>
          </View>
          <View style={styles.linhaResumo}>
            <Text style={styles.linhaLabel}>Valor gasto</Text>
            <Text style={styles.linhaVal}>{formatBRL(ciclo.metricas.valorGasto)}</Text>
          </View>
          <View style={[styles.linhaResumo, styles.linhaLucro]}>
            <Text style={styles.linhaLabelLucro}>Lucro líquido</Text>
            <Text
              style={[
                styles.linhaValLucro,
                { color: ciclo.metricas.lucroLiquido < 0 ? "#dc2626" : "#166534" },
              ]}
            >
              {formatBRL(ciclo.metricas.lucroLiquido)}
            </Text>
          </View>
          {ciclo.metricas.dias > 0 && (
            <View style={styles.linhaResumo}>
              <Text style={styles.linhaLabel}>Lucro por dia</Text>
              <Text
                style={[
                  styles.linhaVal,
                  { color: ciclo.metricas.lucroLiquido < 0 ? "#dc2626" : "#166534" },
                ]}
              >
                {formatBRL(ciclo.metricas.lucroLiquido / ciclo.metricas.dias)}/dia
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.secTitle}>INDICADORES</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Item label="Dias" valor={String(ciclo.metricas.dias)} />
            <Item label="Sobrev." valor={`${ciclo.metricas.sobrevivencia.toFixed(1)}%`} />
            <Item label="Dens/m²" valor={String(ciclo.metricas.densidade)} />
          </View>
          <View style={styles.row}>
            <Item label="Biomassa" valor={`${ciclo.metricas.biomassa.toFixed(0)} kg`} />
            <Item label="FCA" valor={ciclo.metricas.fca.toFixed(2)} />
            <Item label="Animais" valor={ciclo.metricas.animaisVivos.toLocaleString("pt-BR")} />
          </View>
        </View>

        <Text style={styles.secTitle}>DADOS TÉCNICOS</Text>
        <View style={styles.card}>
          <Linha label="Área (ha)" valor={d.area || "—"} />
          <Linha label="Laboratório" valor={d.laboratorio || "—"} />
          <Linha label="Qtd inicial" valor={d.qtdInicial || "—"} />
          <Linha label="Gramatura final" valor={d.gramatura ? `${d.gramatura} g` : "—"} />
          <Linha label="Ração total" valor={d.racaoAcumulada || "—"} />
        </View>

        {(snap.calcPrecoBase || snap.calcQtdInicial || snap.calcPeso) && (() => {
          const pBase = parseFloat(snap.calcPrecoBase || '0') || 0;
          const qtd = parseFloat((snap.calcQtdInicial || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const sobrev = parseFloat((snap.calcSobrevivencia || '0').replace(',', '.')) || 0;
          const pesoG = parseFloat((snap.calcPeso || '0').replace(',', '.')) || 0;
          const gastos = parseFloat((snap.calcGastos || '0').replace(/\./g, '').replace(',', '.')) || 0;
          const dias = parseFloat(snap.calcDias || '0') || 0;
          const animaisVivos = Math.round(qtd * (sobrev / 100));
          const pesoTotalKg = (animaisVivos * pesoG) / 1000;
          const precoKg = pesoG >= 10 ? pBase + (pesoG - 10) : pBase - (10 - pesoG);
          const receitaBruta = pesoTotalKg * precoKg;
          const lucroLiquido = receitaBruta - gastos;
          const fmt2 = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const corLucro = lucroLiquido >= 0 ? '#166534' : '#dc2626';
          return (
            <>
              <Text style={styles.secTitle}>CALCULADORA</Text>
              <View style={styles.card}>
                {snap.calcPrecoBase ? <Linha label="Tabela/Preço base (10g)" valor={`R$ ${snap.calcPrecoBase}/kg`} /> : null}
                {snap.calcQtdInicial ? <Linha label="Qtd inicial" valor={snap.calcQtdInicial} /> : null}
                {snap.calcSobrevivencia ? <Linha label="Sobrevivência" valor={`${snap.calcSobrevivencia}%`} /> : null}
                {snap.calcPeso ? <Linha label="Peso estimado" valor={`${snap.calcPeso} g`} /> : null}
                {snap.calcDias ? <Linha label="Dias de cultivo" valor={snap.calcDias} /> : null}
                {snap.calcGastos ? <Linha label="Gastos totais" valor={`R$ ${snap.calcGastos}`} /> : null}
                {receitaBruta > 0 && <Linha label="Preço por kg" valor={`R$ ${fmt2(precoKg)}`} />}
                {receitaBruta > 0 && <Linha label="Receita bruta" valor={`R$ ${fmt2(receitaBruta)}`} />}
                {(receitaBruta > 0 || gastos > 0) && (
                  <View style={[styles.linhaResumo, styles.linhaLucro]}>
                    <Text style={styles.linhaLabelLucro}>Lucro estimado</Text>
                    <Text style={[styles.linhaValLucro, { color: corLucro }]}>{`R$ ${fmt2(lucroLiquido)}`}</Text>
                  </View>
                )}
              </View>
            </>
          );
        })()}

        {biometrias.length > 0 && (
          <>
            <Text style={styles.secTitle}>BIOMETRIAS</Text>
            <View style={styles.card}>
              {biometrias.map((b, i) => (
                <View key={i} style={styles.linhaBio}>
                  <Text style={styles.bioData}>{b.data}</Text>
                  <Text style={styles.bioPeso}>{b.peso}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.btnRestaurar} onPress={restaurar}>
          <Text style={styles.btnRestaurarTxt}>↩ Restaurar como cultivo ativo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnExcluir} onPress={excluir}>
          <Text style={styles.btnExcluirTxt}>Excluir ciclo do histórico</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Item({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.itemMet}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValor}>{valor}</Text>
    </View>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <View style={styles.linhaItem}>
      <Text style={styles.linhaItemLabel}>{label}</Text>
      <Text style={styles.linhaItemValor}>{valor}</Text>
    </View>
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
  cardResumoTopo: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  subtitulo: { fontSize: 13, color: "#475569", marginBottom: 2 },
  secTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000",
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  linhaResumo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  linhaLabel: { fontSize: 13, color: "#475569" },
  linhaVal: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  linhaLucro: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    marginTop: 4,
    paddingTop: 12,
  },
  linhaLabelLucro: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  linhaValLucro: { fontSize: 16, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  itemMet: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 3,
    alignItems: "center",
  },
  itemLabel: { fontSize: 9, color: "#64748b", fontWeight: "bold", marginBottom: 4 },
  itemValor: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  linhaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  linhaItemLabel: { fontSize: 13, color: "#64748b" },
  linhaItemValor: { fontSize: 13, fontWeight: "bold", color: "#1e293b" },
  linhaBio: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  bioData: { fontSize: 13, color: "#64748b", fontWeight: "bold" },
  bioPeso: { fontSize: 13, color: "#1e293b", fontWeight: "bold" },
  btnRestaurar: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  btnRestaurarTxt: { color: "#1d4ed8", fontWeight: "bold", fontSize: 14 },
  btnExcluir: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  btnExcluirTxt: { color: "#b91c1c", fontWeight: "bold", fontSize: 14 },
});
