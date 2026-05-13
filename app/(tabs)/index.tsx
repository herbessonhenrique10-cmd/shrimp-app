import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CHAVE_HISTORICO,
  CicloArquivado,
  carregar,
  chaveDadosViveiro,
  remover,
  removerESincronizar,
  salvar,
  salvarESincronizar,
} from '../../lib/storage';
import { useAuth } from '../../lib/auth-context';

type BiometriaItem = { data: string; peso: string };

type Dados = {
  area: string;
  dataPovoamento: string;
  laboratorio: string;
  qtdInicial: string;
  gramatura: string;
  tratoDia: string;
  racaoAcumulada: string;
  historicoBiometria: BiometriaItem[];
  desbaste1: string;
  desbaste2: string;
  desbaste3: string;
  pesca: string;
};

export default function AcompanhamentoScreen() {
  const params = useLocalSearchParams<{ viveiroId?: string; viveiroNome?: string }>();
  const viveiroId = (params.viveiroId as string) || '1';
  const viveiroNome = (params.viveiroNome as string) || 'Viveiro 1';

  const { syncVersion } = useAuth();
  const fromSyncRef = useRef(false);

  const [abaAtiva, setAbaAtiva] = useState<'Acompanhamento' | 'Ração' | 'Gastos' | 'Calculadora'>('Acompanhamento');

  const [calcPrecoBase, setCalcPrecoBase] = useState('');
  const [calcQtdInicial, setCalcQtdInicial] = useState('');
  const [calcSobrevivencia, setCalcSobrevivencia] = useState('');
  const [calcPeso, setCalcPeso] = useState('');
  const [calcGastos, setCalcGastos] = useState('');
  const [calcDias, setCalcDias] = useState('');
  const [novoPeso, setNovoPeso] = useState('');
  const [novaData, setNovaData] = useState('');
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [dataInicioRacao, setDataInicioRacao] = useState('24/04');

  const [racao1, setRacao1] = useState('');
  const [racao2, setRacao2] = useState('');
  const [valoresColunas, setValoresColunas] = useState<{ [key: string]: string }>({});

  const [gastosDescricoes, setGastosDescricoes] = useState<string[]>(Array(45).fill(''));
  const [gastosValores, setGastosValores] = useState<string[]>(Array(45).fill(''));

  const [carregadoViveiro, setCarregadoViveiro] = useState(false);

  const isLinhaFixa = (desc: string) => {
    const d = desc.toLowerCase();
    return d.includes('net mês') || d.includes('água mês') || d.includes('energia mês');
  };

  const isLinhaRacao = (desc: string) => {
    const d = desc.toLowerCase();
    return d.includes('ração 1') || d.includes('ração 2') || d.includes('ração j');
  };

  const isLinhaEngorda = (desc: string) => {
    const d = desc.toLowerCase();
    return d.includes('ração engorda') || d.includes('sacos engorda');
  };

  const atualizarGastoDescricao = (i: number, v: string) => {
    setGastosDescricoes((prev) => {
      const novo = [...prev];
      novo[i] = v;
      return novo;
    });
  };
  const atualizarGastoValor = (i: number, v: string) => {
    setGastosValores((prev) => {
      const novo = [...prev];
      novo[i] = v;
      return novo;
    });
  };

  const formatBRL = (n: number) =>
    'R$ ' + Math.round(n).toLocaleString('pt-BR');

  const mascararMoeda = (v: string) => {
    const digits = v.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10);
    return (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calcAumentoSemanal = (originalIndex: number): string => {
    if (originalIndex === 0) return '';
    const curr = dados.historicoBiometria[originalIndex];
    const prev = dados.historicoBiometria[originalIndex - 1];
    const parsePeso = (v: string) => parseFloat((v?.replace('g', '') || '0').replace(',', '.'));
    const pesoAtual = parsePeso(curr.peso);
    const pesoPrev = parsePeso(prev.peso);
    const diff = pesoAtual - pesoPrev;
    const s = parseFloat(diff.toFixed(1)).toFixed(1).replace('.', ',');
    return `cresc: ${diff >= 0 ? '' : '-'}${s}g`;
  };

  const [dados, setDados] = useState<Dados>({
    area: '',
    dataPovoamento: '',
    laboratorio: '',
    qtdInicial: '',
    gramatura: '',
    tratoDia: '',
    racaoAcumulada: '',
    historicoBiometria: [],
    desbaste1: '',
    desbaste2: '',
    desbaste3: '',
    pesca: ''
  });

  type DadosSalvos = {
    dados: Dados;
    racao1: string;
    racao2: string;
    valoresColunas: { [k: string]: string };
    dataInicioRacao: string;
    gastosDescricoes: string[];
    gastosValores: string[];
    calcPrecoBase?: string;
    calcQtdInicial?: string;
    calcSobrevivencia?: string;
    calcPeso?: string;
    calcGastos?: string;
    calcDias?: string;
  };

  const teveDataRef = useRef(false);

  useEffect(() => {
    let cancelado = false;
    fromSyncRef.current = true;
    setCarregadoViveiro(false);
    (async () => {
      const salvos = await carregar<DadosSalvos | null>(chaveDadosViveiro(viveiroId), null);
      if (cancelado) return;
      if (salvos) {
        teveDataRef.current = true;
        setDados(salvos.dados);
        setRacao1(salvos.racao1 || '');
        setRacao2(salvos.racao2 || '');
        setValoresColunas(salvos.valoresColunas || {});
        setDataInicioRacao(salvos.dataInicioRacao || '24/04');
        const gd = salvos.gastosDescricoes || [];
        const gv = salvos.gastosValores || [];
        setGastosDescricoes([...gd, ...Array(Math.max(0, 45 - gd.length)).fill('')].slice(0, 45));
        setGastosValores([...gv, ...Array(Math.max(0, 45 - gv.length)).fill('')].slice(0, 45));
        if (salvos.calcPrecoBase !== undefined) setCalcPrecoBase(salvos.calcPrecoBase);
        if (salvos.calcQtdInicial !== undefined) setCalcQtdInicial(salvos.calcQtdInicial);
        if (salvos.calcSobrevivencia !== undefined) setCalcSobrevivencia(salvos.calcSobrevivencia);
        if (salvos.calcPeso !== undefined) setCalcPeso(salvos.calcPeso);
        if (salvos.calcGastos !== undefined) setCalcGastos(salvos.calcGastos);
        if (salvos.calcDias !== undefined) setCalcDias(salvos.calcDias);
      } else {
        // If this viveiro previously had data and now it's gone, cycle was closed
        // on another device — navigate back to viveiros automatically
        if (teveDataRef.current) {
          router.replace('/viveiros');
          return;
        }
        setDados({
          area: '', dataPovoamento: '', laboratorio: '', qtdInicial: '',
          gramatura: '', tratoDia: '', racaoAcumulada: '', historicoBiometria: [],
          desbaste1: '', desbaste2: '', desbaste3: '', pesca: ''
        });
        setRacao1(''); setRacao2(''); setValoresColunas({});
        setDataInicioRacao('24/04');
        setGastosDescricoes(Array(45).fill(''));
        setGastosValores(Array(45).fill(''));
      }
      setCarregadoViveiro(true);
    })();
    return () => { cancelado = true; };
  }, [viveiroId, syncVersion]);

  useEffect(() => {
    if (!carregadoViveiro) return;
    if (fromSyncRef.current) { fromSyncRef.current = false; return; }
    const t = setTimeout(() => {
      salvar<DadosSalvos>(chaveDadosViveiro(viveiroId), {
        dados, racao1, racao2, valoresColunas, dataInicioRacao, gastosDescricoes, gastosValores,
        calcPrecoBase, calcQtdInicial, calcSobrevivencia, calcPeso, calcGastos, calcDias
      });
    }, 400);
    return () => clearTimeout(t);
  }, [carregadoViveiro, viveiroId, dados, racao1, racao2, valoresColunas, dataInicioRacao, gastosDescricoes, gastosValores, calcPrecoBase, calcQtdInicial, calcSobrevivencia, calcPeso, calcGastos, calcDias]);

  const atualizar = (campo: string, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  };

  const limpar = (v: string | number | undefined | null): number => {
    if (v === undefined || v === null || v === '') return 0;
    const num = parseFloat(String(v).replace('R$ ', '').replace(' kg', '').replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  // Para campos decimais (área, gramatura) — aceita ponto OU vírgula como separador decimal
  const limparDecimal = (v: string | number | undefined | null): number => {
    if (v === undefined || v === null || v === '') return 0;
    let s = String(v).trim();
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const formatarArea = (v: string): string => {
    const n = limparDecimal(v);
    if (isNaN(n) || n === 0) return v;
    return (n % 1 === 0 ? n.toFixed(1) : String(n)).replace('.', ',');
  };

  const aplicarMascaras = (campo: string, valor: string) => {
    let v = valor;
    if (campo === 'dataHistorico' || campo === 'dataInicioRacao') {
      v = v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").substring(0, 5);
      if (campo === 'dataHistorico') { setNovaData(v); return; }
      if (campo === 'dataInicioRacao') { setDataInicioRacao(v); return; }
    }
    if (campo === 'dataPovoamento') {
      const digits = v.replace(/\D/g, '');
      let formatted = digits;
      if (digits.length > 4) formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
      else if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
      v = formatted;
    }
    if (campo === 'qtdInicial') {
      v = v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    if (campo === 'tratoDia' || campo === 'racaoAcumulada' || campo === 'racao1' || campo === 'racao2') {
      v = v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      if (v && !v.includes(' kg')) v = v + " kg";
      if (campo === 'racao1') { setRacao1(v); return; }
      if (campo === 'racao2') { setRacao2(v); return; }
    }
    atualizar(campo, v);
  };

  const totalColunas = useMemo(() => {
    return Object.values(valoresColunas).reduce((acc, curr) => acc + limpar(curr), 0);
  }, [valoresColunas]);

  const totalRacao = useMemo(() => {
    const r1 = limpar(racao1);
    const r2 = limpar(racao2);
    return r1 + r2 + totalColunas;
  }, [racao1, racao2, totalColunas]);

  const valorGasto = useMemo(
    () => gastosValores.reduce((acc, v) => acc + limpar(v), 0),
    [gastosValores]
  );
  const valorApurado = useMemo(
    () => limpar(dados.desbaste1) + limpar(dados.desbaste2) + limpar(dados.desbaste3) + limpar(dados.pesca),
    [dados.desbaste1, dados.desbaste2, dados.desbaste3, dados.pesca]
  );
  const lucroLiquido = valorApurado - valorGasto;

  const nArea = limparDecimal(dados.area);
  const nQtdIni = limpar(dados.qtdInicial);
  const nGram = limpar(dados.gramatura);
  const nTrato = limpar(dados.tratoDia);
  const nRacaoAcum = limpar(dados.racaoAcumulada);

  const calcularDias = () => {
    if (!dados.dataPovoamento || dados.dataPovoamento.length < 5) return 0;
    const partes = dados.dataPovoamento.split('/');
    const ano = partes[2] ? parseInt(partes[2]) : new Date().getFullYear();
    const pov = new Date(ano, parseInt(partes[1]) - 1, parseInt(partes[0]));
    const diff = Math.floor((new Date().getTime() - pov.getTime()) / 86400000);
    return diff >= 0 ? diff : 0;
  };

  const taxa =
    nGram < 2 ? 0.07 :
    nGram < 3 ? 0.06 :
    nGram < 4 ? 0.05 :
    nGram < 5 ? 0.045 :
    nGram < 6 ? 0.04 :
    nGram < 9.5 ? 0.035 :
    nGram < 17 ? 0.03 :
    nGram < 27 ? 0.028 : 0.025;
  const biomassa = taxa > 0 ? nTrato / taxa : 0;
  const sobrevCalc = (nGram > 0 && nQtdIni > 0) ? ((biomassa / (nGram / 1000)) / nQtdIni) * 100 : 0;
  const animaisVivos = Math.round(nQtdIni * (sobrevCalc / 100));
  const densidade = nArea > 0 ? Math.round(nQtdIni / (nArea * 10000)) : 0;
  const fca = biomassa > 0 ? nRacaoAcum / biomassa : 0;

  const salvarBiometria = () => {
    if (!novoPeso) return;
    const pesoNormalizado = novoPeso.replace('.', ',');
    const novoHistorico = [...(dados.historicoBiometria || [])];
    const dataFinal = novaData || `${new Date().getDate()}/${new Date().getMonth() + 1}`;
    if (editandoIndex !== null) {
      novoHistorico[editandoIndex] = { data: dataFinal, peso: pesoNormalizado + 'g' };
      setEditandoIndex(null);
    } else {
      novoHistorico.push({ data: dataFinal, peso: pesoNormalizado + 'g' });
    }
    setDados({ ...dados, historicoBiometria: novoHistorico, gramatura: pesoNormalizado });
    setNovoPeso(''); setNovaData('');
  };

  const editarBiometria = (index: number) => {
    const item = dados.historicoBiometria[index];
    setNovoPeso(item.peso ? item.peso.replace('g', '').replace('.', ',') : '');
    setNovaData(item.data);
    setEditandoIndex(index);
  };

  const removerBiometria = (index: number) => {
    confirmarAcao("Remover biometria", "Deseja excluir esta biometria?", "Excluir", () => {
      const novoHistorico = [...dados.historicoBiometria];
      novoHistorico.splice(index, 1);
      const ultimaGramatura = novoHistorico.length > 0
        ? novoHistorico[novoHistorico.length - 1].peso.replace('g', '')
        : '0';
      setDados({ ...dados, historicoBiometria: novoHistorico, gramatura: ultimaGramatura });
    });
  };

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

  const encerrarCiclo = () => {
    confirmarAcao(
      "Encerrar cultivo",
      `Tem certeza que deseja encerrar o cultivo do ${viveiroNome}? O ciclo será movido para o histórico e o viveiro ficará pronto para um novo cultivo.`,
      "Encerrar",
      async () => {
        const hoje = new Date();
        const dd = String(hoje.getDate()).padStart(2, '0');
        const mm = String(hoje.getMonth() + 1).padStart(2, '0');
        const yyyy = hoje.getFullYear();
        const ciclo: CicloArquivado = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          viveiroId,
          viveiroNome,
          dataEncerramento: `${dd}/${mm}/${yyyy}`,
          dataPovoamento: dados.dataPovoamento || '',
          snapshot: {
            dados, racao1, racao2, valoresColunas, dataInicioRacao,
            gastosDescricoes, gastosValores,
            calcPrecoBase, calcQtdInicial, calcSobrevivencia, calcPeso, calcGastos, calcDias
          },
          metricas: {
            dias: calcularDias(),
            biomassa,
            fca,
            sobrevivencia: sobrevCalc,
            densidade,
            animaisVivos,
            valorGasto,
            valorApurado,
            lucroLiquido,
          },
        };
        const lista = await carregar<CicloArquivado[]>(CHAVE_HISTORICO, []);
        await salvarESincronizar(CHAVE_HISTORICO, [...lista, ciclo]);
        await removerESincronizar(chaveDadosViveiro(viveiroId));
        router.replace('/viveiros');
      },
    );
  };

  const infoData = (dataBase: string, diasSomados: number) => {
    if (!dataBase || dataBase.length < 5) return { data: '--/--', isDomingo: false, isSegunda: false };
    const [dia, mes] = dataBase.split('/').map(Number);
    const date = new Date(new Date().getFullYear(), mes - 1, dia);
    date.setDate(date.getDate() + diasSomados);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const diaSemana = date.getDay();
    return { data: `${d}/${m}`, isDomingo: diaSemana === 0, isSegunda: diaSemana === 1 };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/viveiros')}><Text style={styles.btnVoltar}>← Voltar</Text></TouchableOpacity>
          <Text style={styles.tituloHeader} numberOfLines={1}>{viveiroNome}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.tabBar}>
          {(['Acompanhamento', 'Ração', 'Gastos', 'Calculadora'] as const).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabItem, abaAtiva === tab && styles.tabAtivo]} onPress={() => setAbaAtiva(tab)}>
              <Text style={[styles.tabText, abaAtiva === tab && styles.tabTextAtivo]} numberOfLines={1}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {abaAtiva === 'Ração' && (
          <View style={styles.parteFixaRacao}>
            <View style={styles.cardInputRacaoSlim}>
              <Text style={styles.labelRacaoSlim}>DATA INÍCIO DA RAÇÃO (DD/MM)</Text>
              <TextInput style={styles.inputRacaoSlim} value={dataInicioRacao} placeholder="00/00" placeholderTextColor="#cbd5e1" onChangeText={v => aplicarMascaras('dataInicioRacao', v)} keyboardType="numeric" maxLength={5} />
            </View>
            <View style={styles.rowLimparRacao}>
              <TouchableOpacity
                style={styles.btnLimparRacao}
                onPress={() => confirmarAcao('Limpar ração', 'Deseja apagar toda a ração preenchida?', 'Limpar', () => { setRacao1(''); setRacao2(''); setValoresColunas({}); })}
              >
                <Text style={styles.btnLimparRacaoTxt}>🗑 Limpar ração preenchida</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowResumo}>
              <View style={[styles.boxResumoSlim, { borderLeftColor: '#f59e0b', backgroundColor: '#fef3c7' }]}>
                <Text style={styles.labelBox}>RAÇÃO 1</Text>
                <TextInput style={styles.valBoxInput} value={racao1} onChangeText={setRacao1} onBlur={() => aplicarMascaras('racao1', racao1)} keyboardType="numeric" selectTextOnFocus placeholder="0 kg" />
              </View>
              <View style={[styles.boxResumoSlim, { borderLeftColor: '#10b981', backgroundColor: '#ecfdf5' }]}>
                <Text style={styles.labelBox}>RAÇÃO 2</Text>
                <TextInput style={styles.valBoxInput} value={racao2} onChangeText={setRacao2} onBlur={() => aplicarMascaras('racao2', racao2)} keyboardType="numeric" selectTextOnFocus placeholder="0 kg" />
              </View>
              <View style={[styles.boxResumoSlim, { borderLeftColor: '#6366f1', backgroundColor: '#eef2ff' }]}>
                <Text style={styles.labelBox}>RAÇÃO ENGORDA</Text>
                <Text style={styles.valBoxSlim}>{totalColunas.toLocaleString()} kg</Text>
              </View>
              <View style={[styles.boxResumoSlim, { backgroundColor: '#1e293b', borderLeftWidth: 0 }]}>
                <Text style={[styles.labelBox, { color: '#fff' }]}>TOTAL</Text>
                <Text style={[styles.valBoxSlim, { color: '#fff' }]}>{totalRacao.toLocaleString()} kg</Text>
              </View>
            </View>
          </View>
        )}

        {abaAtiva === 'Gastos' && (
          <View style={styles.abaGastosFixaTotal}>
            <View style={styles.caixaResumoGastos}>
              <View style={styles.rowGastosTop}>
                <View style={styles.cardResumoGasto}>
                  <Text style={styles.labelGastoTop}>valor gasto</Text>
                  <View style={styles.boxGastoVal}><Text style={styles.txtGastoVal}>{formatBRL(valorGasto)}</Text></View>
                </View>
                <View style={styles.cardResumoApurado}>
                  <Text style={styles.labelGastoTop}>valor apurado</Text>
                  <View style={styles.boxApuradoVal}><Text style={styles.txtGastoVal}>{formatBRL(valorApurado)}</Text></View>
                </View>
              </View>
              <View style={styles.cardLucro}>
                <Text style={styles.labelGastoTop}>lucro liquido</Text>
                <View style={styles.boxLucroVal}><Text style={[styles.txtLucroVal, { color: lucroLiquido < 0 ? '#dc2626' : '#166534' }]}>{formatBRL(lucroLiquido)}</Text></View>
              </View>
            </View>

            <View style={styles.rowTabelas}>
              <View style={styles.colunaGastosLeft}>
                <View style={styles.headerTabelaGasto}><Text style={[styles.txtHeadTab, { flex: 1.6 }]}>Descrição</Text><Text style={[styles.txtHeadTab, { flex: 1 }]}>Valor (R$)</Text></View>
                <ScrollView style={{ flex: 1 }} nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {gastosDescricoes.map((_, i) => {
                    const fixo = isLinhaFixa(gastosDescricoes[i]);
                    const racao = !fixo && isLinhaRacao(gastosDescricoes[i]);
                    const engorda = !fixo && !racao && isLinhaEngorda(gastosDescricoes[i]);
                    const bgColor = fixo ? '#dbeafe' : racao ? '#fce7f3' : engorda ? '#dcfce7' : undefined;
                    const txtColor = fixo ? '#1e40af' : racao ? '#9d174d' : engorda ? '#166534' : undefined;
                    const borderColor = fixo ? '#93c5fd' : racao ? '#f9a8d4' : engorda ? '#86efac' : '#000';
                    return (
                    <View key={i} style={[styles.linhaGasto, bgColor ? { backgroundColor: bgColor } : undefined]}>
                      <TextInput
                        style={[styles.inputDescricaoGasto, txtColor ? { color: txtColor, fontWeight: 'bold' } : undefined]}
                        placeholder={`Gasto ${i + 1}`}
                        placeholderTextColor="#94a3b8"
                        value={gastosDescricoes[i]}
                        onChangeText={(v) => atualizarGastoDescricao(i, v)}
                      />
                      <View style={[styles.inputGastoContainer, { borderLeftColor: borderColor }]}>
                        <Text style={[styles.txtCifraoGasto, txtColor ? { color: txtColor } : undefined]}>R$</Text>
                        <TextInput
                          style={[styles.inputValGasto, txtColor ? { color: txtColor, fontWeight: 'bold' } : undefined]}
                          placeholder="0,00"
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          selectTextOnFocus
                          value={gastosValores[i]}
                          onChangeText={(v) => atualizarGastoValor(i, mascararMoeda(v))}
                        />
                      </View>
                    </View>
                    );
                  })}
                </ScrollView>
              </View>

              <ScrollView
                style={styles.colunaReceitasRight}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.headerTabelaReceita}><Text style={styles.txtHeadTabReceita}>Receitas</Text></View>
                {[
                  { id: 'desbaste1', label: 'Desbaste 1' },
                  { id: 'desbaste2', label: 'Desbaste 2' },
                  { id: 'desbaste3', label: 'Desbaste 3' },
                  { id: 'pesca', label: 'Pesca' }
                ].map((item) => (
                  <View key={item.id} style={styles.boxReceitaItem}>
                    <Text style={styles.labelReceitaItem}>{item.label}</Text>
                    <View style={styles.inputReceitaWrapper}>
                      <Text style={styles.txtCifraoReceita}>R$</Text>
                      <TextInput
                        style={styles.inputReceitaItem}
                        placeholder="0,00"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        selectTextOnFocus
                        value={(dados[item.id as keyof Dados] as string) || ''}
                        onChangeText={(v) => atualizar(item.id, mascararMoeda(v))}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {abaAtiva === 'Calculadora' && (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 80 }}>
            {(() => {
              const pBase = parseFloat(calcPrecoBase) || 0;
              const qtd = parseFloat(calcQtdInicial.replace(/\./g, '').replace(',', '.')) || 0;
              const sobrev = parseFloat(calcSobrevivencia.replace(',', '.')) || 0;
              const pesoG = parseFloat(calcPeso.replace(',', '.')) || 0;
              const gastos = parseFloat(calcGastos.replace(/\./g, '').replace(',', '.')) || 0;
              const dias = parseFloat(calcDias) || 0;

              const animaisVivos = Math.round(qtd * (sobrev / 100));
              const pesoTotalKg = (animaisVivos * pesoG) / 1000;
              const precoKg = pesoG >= 10 ? pBase + (pesoG - 10) : pBase - (10 - pesoG);
              const receitaBruta = pesoTotalKg * precoKg;
              const lucroLiquido = receitaBruta - gastos;
              const lucroDiario = dias > 0 ? lucroLiquido / dias : 0;

              const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              const fmtN = (v: number) => v.toLocaleString('pt-BR');
              const corLucro = lucroLiquido >= 0 ? '#166534' : '#dc2626';
              const bgLucro = lucroLiquido >= 0 ? '#dcfce7' : '#fee2e2';
              const corDiario = lucroDiario >= 0 ? '#166534' : '#dc2626';

              return (
                <>
                  <Text style={styles.secTitlePreto}>💰 TABELA DE PREÇOS</Text>
                  <View style={[styles.sectionCard, { marginTop: 8 }]}>
                    <Text style={[styles.label, { marginBottom: 4 }]}>PREÇO BASE DO CAMARÃO DE 10g (R$/kg)</Text>
                    <Text style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>A cada 1g a mais, o preço sobe R$ 1,00</Text>
                    <View style={styles.calcInputRow}>
                      <Text style={styles.calcCifrao}>R$</Text>
                      <TextInput
                        style={styles.calcInput}
                        value={calcPrecoBase}
                        onChangeText={setCalcPrecoBase}
                        keyboardType="numeric"
                        selectTextOnFocus
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                      />
                      <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>/kg</Text>
                    </View>
                    {pesoG > 0 && (
                      <View style={styles.calcPreviewTabela}>
                        <Text style={styles.calcPreviewTxt}>
                          Camarão de {calcPeso}g → R$ {fmt(precoKg)}/kg
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.secTitlePreto, { marginTop: 10 }]}>🦐 DADOS DO CULTIVO</Text>
                  <View style={[styles.sectionCard, { marginTop: 8 }]}>
                    <View style={styles.calcFieldRow}>
                      <View style={styles.calcFieldHalf}>
                        <Text style={styles.label}>QUANTIDADE INICIAL</Text>
                        <TextInput
                          style={styles.calcFieldInput}
                          value={calcQtdInicial}
                          onChangeText={v => {
                            const digits = v.replace(/\D/g, '');
                            const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                            setCalcQtdInicial(formatted);
                          }}
                          keyboardType="numeric"
                          selectTextOnFocus
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <View style={styles.calcFieldHalf}>
                        <Text style={styles.label}>SOBREVIVÊNCIA (%)</Text>
                        <TextInput
                          style={styles.calcFieldInput}
                          value={calcSobrevivencia}
                          onChangeText={setCalcSobrevivencia}
                          keyboardType="numeric"
                          selectTextOnFocus
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                    </View>
                    <View style={styles.calcFieldRow}>
                      <View style={styles.calcFieldHalf}>
                        <Text style={styles.label}>PESO DO CAMARÃO (g)</Text>
                        <TextInput
                          style={styles.calcFieldInput}
                          value={calcPeso}
                          onChangeText={setCalcPeso}
                          keyboardType="numeric"
                          selectTextOnFocus
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <View style={styles.calcFieldHalf}>
                        <Text style={styles.label}>DIAS DE CULTIVO</Text>
                        <TextInput
                          style={styles.calcFieldInput}
                          value={calcDias}
                          onChangeText={setCalcDias}
                          keyboardType="numeric"
                          selectTextOnFocus
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                    </View>
                    <View style={[styles.calcFieldRow, { marginBottom: 0 }]}>
                      <View style={[styles.calcFieldHalf, { flex: 1 }]}>
                        <Text style={styles.label}>GASTOS TOTAIS (R$)</Text>
                        <View style={styles.calcInputRow}>
                          <Text style={styles.calcCifrao}>R$</Text>
                          <TextInput
                            style={[styles.calcFieldInput, { flex: 1, borderWidth: 0 }]}
                            value={calcGastos}
                            onChangeText={v => setCalcGastos(mascararMoeda(v))}
                            keyboardType="numeric"
                            selectTextOnFocus
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.secTitlePreto, { marginTop: 10 }]}>📊 RESULTADOS</Text>
                  <View style={[styles.sectionCard, { marginTop: 8 }]}>
                    <View style={styles.calcResultRow}>
                      <View style={styles.calcResultCard}>
                        <Text style={styles.calcResultLabel}>Animais Vivos</Text>
                        <Text style={styles.calcResultVal}>{animaisVivos > 0 ? fmtN(animaisVivos) : '—'}</Text>
                      </View>
                      <View style={styles.calcResultCard}>
                        <Text style={styles.calcResultLabel}>Peso Total</Text>
                        <Text style={styles.calcResultVal}>{pesoTotalKg > 0 ? `${fmt(pesoTotalKg)} kg` : '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.calcResultRow}>
                      <View style={styles.calcResultCard}>
                        <Text style={styles.calcResultLabel}>Preço por kg</Text>
                        <Text style={styles.calcResultVal}>{precoKg > 0 ? `R$ ${fmt(precoKg)}` : '—'}</Text>
                      </View>
                      <View style={styles.calcResultCard}>
                        <Text style={styles.calcResultLabel}>Receita Bruta</Text>
                        <Text style={styles.calcResultVal}>{receitaBruta > 0 ? `R$ ${fmt(receitaBruta)}` : '—'}</Text>
                      </View>
                    </View>
                    <View style={[styles.calcResultDestaque, { backgroundColor: bgLucro, borderColor: lucroLiquido >= 0 ? '#86efac' : '#fca5a5' }]}>
                      <Text style={[styles.calcResultDestaqueLabel, { color: corLucro }]}>LUCRO LÍQUIDO</Text>
                      <Text style={[styles.calcResultDestaqueVal, { color: corLucro }]}>
                        {receitaBruta > 0 || gastos > 0 ? `R$ ${fmt(lucroLiquido)}` : '—'}
                      </Text>
                    </View>
                    <View style={[styles.calcResultDestaque, { backgroundColor: '#fef9c3', borderColor: '#fde047', marginTop: 6 }]}>
                      <Text style={[styles.calcResultDestaqueLabel, { color: '#92400e' }]}>LUCRO POR DIA</Text>
                      <Text style={[styles.calcResultDestaqueVal, { color: corDiario }]}>
                        {dias > 0 && (receitaBruta > 0 || gastos > 0) ? `R$ ${fmt(lucroDiario)}/dia` : '—'}
                      </Text>
                    </View>
                  </View>
                </>
              );
            })()}
          </ScrollView>
        )}

        {abaAtiva !== 'Gastos' && abaAtiva !== 'Calculadora' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {abaAtiva === 'Acompanhamento' && (
            <>
              <View style={styles.secTitleRow}>
                <Text style={styles.secTitlePreto}>📝 DADOS TÉCNICOS</Text>
                <TouchableOpacity
                  style={styles.btnLimparDados}
                  onPress={() => confirmarAcao('Limpar dados técnicos', 'Deseja apagar todos os campos de dados técnicos?', 'Limpar', () => setDados(prev => ({ ...prev, area: '', dataPovoamento: '', laboratorio: '', qtdInicial: '', gramatura: '', tratoDia: '', racaoAcumulada: '' })))}
                >
                  <Text style={styles.btnLimparDadosTxt}>Limpar</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sectionCard}>
                <View style={styles.row}>
                  <View style={styles.cardSlim}><Text style={styles.label}>ÁREA (HA)</Text><TextInput style={styles.input} value={dados.area} placeholder="0,00" placeholderTextColor="#94a3b8" keyboardType="numeric" selectTextOnFocus onChangeText={v => { const d = v.replace(/\D/g, ''); if (!d) { atualizar('area', ''); return; } const n = parseInt(d, 10); atualizar('area', (n / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }} /></View>
                  <View style={styles.cardSlim}><Text style={styles.label}>POVOAMENTO</Text><TextInput style={styles.input} value={dados.dataPovoamento} placeholder="00/00/0000" placeholderTextColor="#94a3b8" onChangeText={v => aplicarMascaras('dataPovoamento', v)} keyboardType="numeric" maxLength={10} /></View>
                  <View style={styles.cardSlim}><Text style={styles.label}>LABORATÓRIO</Text><TextInput style={[styles.input, { color: '#2e7d32' }]} value={dados.laboratorio} placeholder="Nome" placeholderTextColor="#94a3b8" onChangeText={v => atualizar('laboratorio', v)} /></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.cardSlim}><Text style={styles.label}>QTD INICIAL</Text><TextInput style={styles.input} value={dados.qtdInicial} placeholder="000.000" placeholderTextColor="#94a3b8" onChangeText={v => aplicarMascaras('qtdInicial', v)} keyboardType="numeric" selectTextOnFocus /></View>
                  <View style={[styles.cardSlim, { backgroundColor: '#e3f2fd' }]}><Text style={styles.label}>GRAMATURA</Text><TextInput style={styles.input} value={dados.gramatura} placeholder="0,0" placeholderTextColor="#94a3b8" onChangeText={v => atualizar('gramatura', v)} keyboardType="numeric" selectTextOnFocus /></View>
                  <View style={[styles.cardSlim, { backgroundColor: '#fffde7' }]}><Text style={styles.label}>TRATO DIA</Text><TextInput style={styles.input} value={dados.tratoDia} placeholder="0 kg" placeholderTextColor="#94a3b8" onBlur={() => aplicarMascaras('tratoDia', dados.tratoDia)} onChangeText={v => atualizar('tratoDia', v)} keyboardType="numeric" selectTextOnFocus /></View>
                </View>
                <View style={[styles.cardSlim, { backgroundColor: '#ffe4d6', height: 56, paddingVertical: 6, marginTop: 6 }]}>
                  <Text style={styles.labelLaranja}>RAÇÃO TOTAL</Text>
                  <TextInput style={styles.valLaranja} value={dados.racaoAcumulada} placeholder="0 kg" placeholderTextColor="#94a3b8" onBlur={() => aplicarMascaras('racaoAcumulada', dados.racaoAcumulada)} onChangeText={v => atualizar('racaoAcumulada', v)} keyboardType="numeric" selectTextOnFocus />
                </View>
              </View>

              <Text style={styles.secTitlePreto}>📊 RESULTADOS OPERACIONAIS</Text>
              <View style={styles.sectionCard}>
                <View style={styles.row}>
                  <View style={styles.cardSlim}><Text style={styles.label}>DIAS</Text><Text style={styles.valRes}>{calcularDias()}</Text></View>
                  <View style={styles.cardSlim}><Text style={styles.label}>SOBREV %</Text><Text style={[styles.valRes, { color: '#2e7d32' }]}>{sobrevCalc.toFixed(1)}%</Text></View>
                  <View style={styles.cardSlim}><Text style={styles.label}>DENS/M²</Text><Text style={styles.valRes}>{densidade}</Text></View>
                </View>
                <View style={styles.row}>
                  <View style={styles.cardSlim}><Text style={styles.label}>BIOMASSA</Text><Text style={styles.valRes}>{biomassa.toFixed(0)} kg</Text></View>
                  <View style={styles.cardSlim}><Text style={styles.label}>FCA</Text><Text style={[styles.valRes, { color: fca > 1.5 ? '#ef4444' : '#1e293b' }]}>{fca.toFixed(2)}</Text></View>
                  <View style={styles.cardSlim}><Text style={styles.label}>ANIMAIS</Text><Text style={styles.valRes}>{animaisVivos.toLocaleString()}</Text></View>
                </View>
                <View style={[styles.cardSlim, { backgroundColor: '#e8f5e9', marginTop: 5, height: 40 }]}>
                  <Text style={styles.label}>TAXA TRATO</Text>
                  <Text style={[styles.valRes, { color: '#2e7d32' }]}>{taxa.toFixed(3)}</Text>
                </View>
              </View>

              <Text style={styles.secTitlePreto}>📈 HISTÓRICO DE BIOMETRIA</Text>
              <View style={styles.sectionCard}>
                <View style={styles.row}>
                  <TextInput style={[styles.inputDestacado, { flex: 1.5, marginRight: 5 }]} placeholder="DD/MM" value={novaData} placeholderTextColor="#94a3b8" onChangeText={v => aplicarMascaras('dataHistorico', v)} keyboardType="numeric" />
                  <TextInput style={[styles.inputDestacado, { flex: 1, marginRight: 10 }]} placeholder="Peso" value={novoPeso} placeholderTextColor="#94a3b8" onChangeText={setNovoPeso} keyboardType="numeric" selectTextOnFocus />
                  <TouchableOpacity style={styles.btnAdicionar} onPress={salvarBiometria}><Text style={styles.txtBtnAdicionar}>{editandoIndex !== null ? "✓" : "+"}</Text></TouchableOpacity>
                </View>
                {[...dados.historicoBiometria].reverse().map((item, index, array) => {
                  const originalIndex = array.length - 1 - index;
                  const aumento = calcAumentoSemanal(originalIndex);
                  return (
                    <View key={originalIndex} style={styles.itemHistorico}>
                      <Text style={styles.txtHistoricoData}>{item.data}</Text>
                      <Text style={styles.txtHistoricoPeso}>{item.peso}</Text>
                      {aumento ? (
                        <Text style={{
                          fontSize: 11,
                          fontWeight: 'bold',
                          color: parseFloat(aumento.replace('cresc: ', '').replace('g', '').replace(',', '.')) >= 1 ? '#16a34a' : '#dc2626',
                          backgroundColor: parseFloat(aumento.replace('cresc: ', '').replace('g', '').replace(',', '.')) >= 1 ? '#dcfce7' : '#fee2e2',
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          borderRadius: 5,
                          overflow: 'hidden',
                        }}>{aumento}</Text>
                      ) : <View style={{ width: 48 }} />}
                      <View style={{ flexDirection: 'row', gap: 15 }}>
                        <TouchableOpacity onPress={() => editarBiometria(originalIndex)}><Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>✎</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => removerBiometria(originalIndex)}><Text style={{ color: '#ef4444', fontWeight: 'bold' }}>🗑</Text></TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity style={styles.btnEncerrar} onPress={encerrarCiclo}>
                <Text style={styles.btnEncerrarTxt}>Encerrar cultivo</Text>
              </TouchableOpacity>
              <Text style={styles.btnEncerrarHint}>
                O ciclo será arquivado no histórico e o viveiro ficará pronto para um novo cultivo.
              </Text>
            </>
          )}

          {abaAtiva === 'Ração' && (
            <View style={styles.viewRacao}>
              <View style={styles.containerColunasSeparadas}>
                {[0, 35, 70].map((offset, c) => (
                  <View key={c} style={styles.colunaIndividual}>
                    <View style={styles.headerIndividual}>
                      <Text style={[styles.headerTxt, { flex: 0.9 }]}>Data</Text>
                      <View style={styles.headerSeparador} />
                      <Text style={[styles.headerTxt, { flex: 1.4 }]}>kg</Text>
                    </View>
                    {Array.from({ length: 35 }).map((_, r) => {
                      const id = `col-${c}-row-${r}`;
                      const resData = infoData(dataInicioRacao, r + offset);
                      return (
                        <View key={r} style={[styles.celulaRacao, resData.isDomingo && { backgroundColor: '#fef2f2' }, resData.isSegunda && { backgroundColor: '#e2e8f0' }]}>
                          <Text style={[styles.txtDataRacao, { flex: 0.9 }, resData.isDomingo && { color: '#ef4444', fontWeight: '900' }]}>{resData.data}</Text>
                          <View style={styles.separadorCelula} />
                          <TextInput style={[styles.inputKgRacao, { flex: 1.4 }]} keyboardType="numeric" placeholder="—" editable={!resData.isDomingo} placeholderTextColor="#cbd5e1" selectTextOnFocus value={resData.isDomingo ? "" : (valoresColunas[id] || '')} onChangeText={(v) => setValoresColunas({ ...valoresColunas, [id]: v })} />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, backgroundColor: '#fff', paddingBottom: 15, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  btnVoltar: { color: '#2563eb', fontSize: 14, fontWeight: 'bold' },
  tituloHeader: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  tabBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', marginHorizontal: 15, marginTop: 15, borderRadius: 10, padding: 4 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabAtivo: { backgroundColor: '#fff', elevation: 2 },
  tabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 10 },
  tabTextAtivo: { color: '#1e293b' },
  content: { paddingHorizontal: 15 },
  secTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  secTitlePreto: { fontSize: 11, fontWeight: '900', color: '#000000', letterSpacing: 0.5 },
  btnLimparDados: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fee2e2', borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
  btnLimparDadosTxt: { fontSize: 11, fontWeight: 'bold', color: '#dc2626' },
  rowLimparRacao: { marginBottom: 8 },
  btnLimparRacao: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#fca5a5', alignSelf: 'flex-start' },
  btnLimparRacaoTxt: { fontSize: 12, fontWeight: 'bold', color: '#dc2626' },
  headerSeparador: { width: 2, backgroundColor: '#94a3b8', height: '100%' },
  separadorCelula: { width: 2, backgroundColor: '#94a3b8', height: '80%', marginHorizontal: 1 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardSlim: { flex: 1, height: 48, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginHorizontal: 3, paddingHorizontal: 8, justifyContent: 'center' },
  input: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', padding: 0 },
  label: { fontSize: 7, color: '#64748b', fontWeight: 'bold' },
  valRes: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  labelLaranja: { color: '#ea580c', fontSize: 8, fontWeight: '900' },
  valLaranja: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  inputDestacado: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingLeft: 10, height: 38, backgroundColor: '#fff', fontSize: 13 },
  btnAdicionar: { backgroundColor: '#2563eb', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  txtBtnAdicionar: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  itemHistorico: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  txtHistoricoData: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  txtHistoricoPeso: { color: '#1e293b', fontSize: 13, fontWeight: 'bold' },
  parteFixaRacao: { paddingHorizontal: 15, paddingTop: 15, backgroundColor: '#f8fafc', zIndex: 10 },
  cardInputRacaoSlim: { backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, width: '60%' },
  labelRacaoSlim: { fontSize: 8, color: '#2563eb', fontWeight: 'bold' },
  inputRacaoSlim: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', padding: 0 },
  rowResumo: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  boxResumoSlim: { flex: 1, height: 50, borderRadius: 8, borderLeftWidth: 3, alignItems: 'center', justifyContent: 'center' },
  labelBox: { fontSize: 8, fontWeight: 'bold', color: '#64748b' },
  valBoxSlim: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  valBoxInput: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', width: '100%', padding: 0 },
  viewRacao: { flex: 1, marginTop: 5 },
  containerColunasSeparadas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  colunaIndividual: { flex: 1, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#64748b', marginHorizontal: 2, overflow: 'hidden' },
  headerIndividual: { flexDirection: 'row', backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#64748b', paddingVertical: 5 },
  headerTxt: { flex: 1, fontSize: 8, fontWeight: '900', color: '#fff', textAlign: 'center' },
  celulaRacao: { flexDirection: 'row', height: 30, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  txtDataRacao: { flex: 1.2, fontSize: 9, color: '#475569', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f1f5f9', height: '100%', textAlignVertical: 'center' },
  inputKgRacao: { flex: 1, fontSize: 11, color: '#0f172a', textAlign: 'center', padding: 0, fontWeight: 'bold' },
  abaGastosHeaderFixo: { paddingHorizontal: 15, paddingTop: 15, backgroundColor: '#f8fafc', zIndex: 10 },
  abaGastosFixaTotal: { flex: 1, paddingHorizontal: 15, paddingTop: 15, paddingBottom: 15, backgroundColor: '#f8fafc' },
  abaGastosContainer: { paddingBottom: 50 },
  caixaResumoGastos: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 8, marginBottom: 12 },
  rowGastosTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardResumoGasto: { width: '48%', alignItems: 'center' },
  cardResumoApurado: { width: '48%', alignItems: 'center' },
  labelGastoTop: { fontSize: 10, fontWeight: 'bold', color: '#475569', marginBottom: 2 },
  boxGastoVal: { width: '100%', height: 28, backgroundColor: '#ebf4ff', borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  boxApuradoVal: { width: '100%', height: 28, backgroundColor: '#fffbeb', borderRadius: 6, borderWidth: 1, borderColor: '#fde68a', justifyContent: 'center', alignItems: 'center' },
  txtGastoVal: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  cardLucro: { width: '100%', alignItems: 'center' },
  boxLucroVal: { width: '100%', height: 30, backgroundColor: '#ffedd5', borderRadius: 6, borderWidth: 1, borderColor: '#fed7aa', justifyContent: 'center', alignItems: 'center' },
  txtLucroVal: { fontSize: 15, fontWeight: 'bold', color: '#166534' },
  rowTabelas: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  colunaGastosLeft: { width: '66%', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, backgroundColor: '#fff', overflow: 'hidden' },
  headerTabelaGasto: { flexDirection: 'row', backgroundColor: '#e2e8f0', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#cbd5e1' },
  txtHeadTab: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#475569' },
  linhaGasto: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', height: 35, alignItems: 'center' },
  txtNomeGasto: { flex: 1, paddingLeft: 8, fontSize: 12, color: '#64748b' },
  inputDescricaoGasto: { flex: 1.6, paddingLeft: 8, fontSize: 12, color: '#1e293b', height: '100%', padding: 0 },
  inputGastoContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#000', paddingLeft: 4 },
  txtCifraoGasto: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginRight: 2 },
  inputValGasto: { flex: 1, fontSize: 12, color: '#64748b', textAlign: 'right', paddingRight: 4 },
  colunaReceitasRight: { width: '30%' },
  headerTabelaReceita: { backgroundColor: '#e2e8f0', paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 5 },
  txtHeadTabReceita: { textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#475569' },
  boxReceitaItem: { marginBottom: 12 },
  labelReceitaItem: { fontSize: 11, color: '#475569', fontWeight: 'bold', marginBottom: 4 },
  inputReceitaWrapper: { flexDirection: 'row', alignItems: 'center', height: 40, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 3 },
  txtCifraoReceita: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginRight: 2 },
  inputReceitaItem: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: 'bold', color: '#1e293b', padding: 0 },
  btnEncerrar: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  btnEncerrarTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  btnEncerrarHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  calcInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 44, backgroundColor: '#f8fafc' },
  calcCifrao: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginRight: 4 },
  calcInput: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#1e293b', padding: 0 },
  calcPreviewTabela: { marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#86efac' },
  calcPreviewTxt: { fontSize: 13, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  calcFieldRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  calcFieldHalf: { flex: 1 },
  calcFieldInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, height: 44, backgroundColor: '#f8fafc', fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },
  calcResultRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  calcResultCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 7, paddingHorizontal: 8, alignItems: 'center' },
  calcResultLabel: { fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 },
  calcResultVal: { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  calcResultDestaque: { borderRadius: 10, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', marginBottom: 0 },
  calcResultDestaqueLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 2 },
  calcResultDestaqueVal: { fontSize: 20, fontWeight: 'bold' },
});
