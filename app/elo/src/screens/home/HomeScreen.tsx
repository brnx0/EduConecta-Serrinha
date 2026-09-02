import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { Aluno, useAluno } from '../../context/AlunoContext';
import { GetAlunos, ListagemAlunos } from '../../services/home/HomeService';
import { getMuralAvisos, ListagemAvisos } from '../../services/mural/MuralAvisoService';
import { normalizarNomePessoal } from '../../util/FormatarNome';
import { removerTagsHtml } from '../../util/RemoverTagsHtml';
import { colors } from '../../constants/colors';
import { AppTabParamList } from '../../navigation/AppTabs';
import { Skeleton } from '../../components/Skeleton';
import { OcorrenciaPendenteModal } from '../../components/OcorrenciaPendenteModal';
import { NotificacoesBellButton } from '../../components/NotificacoesBellButton';
import { AlunoAnoSelect } from '../../components/AlunoAnoSelect';
import { MenuButton } from '../../components/MenuSheet';

type Nav = NativeStackNavigationProp<AppTabParamList>;

/**
 * HomeScreen Élo — bento grid agressivo.
 *
 * Layout:
 *   • Topbar minimal (saudação + sino + sair)
 *   • Hero card aluno (laranja sólido)
 *   • Bento grid 2 col: frequência (tile colorido) + atividade (tile alto)
 *   • Tira "Atalhos" horizontal scroll com chips coloridos
 *   • Mural compact list
 *
 * Filosofia: assimetria + cores sólidas + tipografia display em
 * números grandes.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const { aluno, setAluno } = useAluno();
  const { showToast, showConfirm } = useAlert();

  const [listaAlunos, setListaAlunos] = useState<ListagemAlunos[]>([]);
  const [listaAvisos, setListaAvisos] = useState<ListagemAvisos[]>([]);
  const [isLoadingAvisos, setLoadingAvisos] = useState(false);
  const [loadingData, setLoadingData] = useState(!aluno);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAvisos, setErrorAvisos] = useState<string | null>(null);
  const [exibirAlertaOcorrencia, setExibirAlertaOcorrencia] = useState(true);
  const [temPendencia, setTemPendencia] = useState(false);

  useEffect(() => { fetchAlunos(); }, []);
  useEffect(() => { if (aluno) fetchAvisos(); }, [aluno]);

  async function fetchAlunos() {
    try {
      setExibirAlertaOcorrencia(true);
      setLoadingData(true);
      setError(null);
      const dados = await GetAlunos();
      setListaAlunos(dados);
      if (dados?.length > 0) {
        const alunoAtualizado = dados.find((d) => d.pes_cod === aluno?.pes_cod) || dados[0];
        setAluno(alunoAtualizado);
        setTemPendencia(Boolean(Number(alunoAtualizado?.ocorrencia_pendente)));
      }
    } catch (err: any) {
      console.error('Erro alunos', err.response?.data);
      showToast('Erro ao carregar informações.', 'error');
      setError('Não foi possível carregar as informações.');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }

  const fetchAvisos = async () => {
    if (!aluno?.escola_cod) return;
    try {
      setErrorAvisos(null);
      setListaAvisos([]);
      setLoadingAvisos(true);
      const dados = await getMuralAvisos(aluno.escola_cod, aluno.pes_cod, 5);
      setListaAvisos(dados || []);
    } catch (err) {
      console.error('Erro avisos', err);
      setErrorAvisos('Não foi possível carregar os avisos.');
    } finally {
      setLoadingAvisos(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlunos();
    await fetchAvisos();
    setRefreshing(false);
  };

  const handleLogout = () => {
    showConfirm('Saindo?', 'Deseja realmente desconectar?', () => signOut());
  };

  const dadosFrequencia = useMemo(() => {
    const totalAulas = aluno?.total_aulas_anual || 0;
    const totalFaltas = aluno?.total_faltas || 0;
    if (totalAulas === 0) return { percentual: '100', tom: 'good' as const };
    const calc = ((totalAulas - totalFaltas) / totalAulas) * 100;
    const percentual = calc.toFixed(1);
    if (calc < 75) return { percentual, tom: 'bad' as const };
    if (calc < 80) return { percentual, tom: 'warn' as const };
    return { percentual, tom: 'good' as const };
  }, [aluno]);

  const dadosAtividade = useMemo(() => {
    if (!aluno?.data_prox_atividade) {
      return { titulo: 'Em dia!', subtitulo: 'Sem atividades agendadas', vazio: true };
    }
    return {
      titulo: aluno.data_prox_atividade,
      subtitulo: `${aluno.descricao_prox_atividade || 'Atividade'} de ${aluno.disciplina_prox_atividade || 'Geral'}`,
      vazio: false,
    };
  }, [aluno]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.paper }}>
        <Topbar userName={user?.responsavel_nome} onLogout={handleLogout} />
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140, paddingHorizontal: 18 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand.primary]}
            tintColor={colors.brand.primary}
          />
        }
      >
        {loadingData ? (
          <HomeSkeleton />
        ) : error ? (
          <ErrorState onRetry={fetchAlunos} />
        ) : (
          <>
            {/* Hero card aluno */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setModalVisible(true)}
              style={{
                backgroundColor: colors.brand.primary,
                borderRadius: 28,
                padding: 22,
                marginTop: 8,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 12,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Meu filho(a)
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontFamily: 'Outfit_600SemiBold',
                      fontSize: 11,
                      marginRight: 4,
                    }}
                  >
                    Trocar
                  </Text>
                  <Feather name="chevron-down" size={12} color="#FFFFFF" />
                </View>
              </View>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 26,
                  letterSpacing: -1,
                  lineHeight: 30,
                }}
                numberOfLines={2}
              >
                {normalizarNomePessoal(aluno?.nome) || 'Carregando...'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 12, gap: 8 }}>
                <PillSolid text={`${aluno?.serie ?? ''} • ${aluno?.turma ?? ''}`} />
                <PillSolid text={String(aluno?.ano_letivo ?? '')} />
              </View>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 12,
                  marginTop: 12,
                }}
                numberOfLines={1}
              >
                {aluno?.escola}
              </Text>
            </TouchableOpacity>

            <OcorrenciaPendenteModal
              visible={temPendencia && exibirAlertaOcorrencia}
              onNavigate={() => {
                navigation.navigate('OcorrenciaScreen');
                setExibirAlertaOcorrencia(false);
              }}
            />

            {/* Bento grid: frequência + próx atividade */}
            <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
              <FrequenciaTile data={dadosFrequencia} />
              <AtividadeTile data={dadosAtividade} />
            </View>

            {/* Atalhos horizontais */}
            <View className="mt-6 mb-2 flex-row items-center justify-between">
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 18,
                  color: colors.ink,
                  letterSpacing: -0.5,
                }}
              >
                Atalhos
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <Atalho icon="key" label="Autorizações" tint="#7C3AED" onPress={() => navigation.navigate('AutorizacoesScreen')} />
              <Atalho icon="alert-circle" label="Ocorrências" tint="#DC2626" onPress={() => navigation.navigate('OcorrenciaScreen')} />
              <Atalho icon="check-circle" label="Frequência" tint="#16A34A" onPress={() => navigation.navigate('FrequenciaScreen')} />
              <Atalho icon="book" label="Conteúdo" tint="#0EA5E9" onPress={() => navigation.navigate('ConteudoScreen')} />
              <Atalho icon="clock" label="Horários" tint="#F97316" onPress={() => navigation.navigate('HorariosScreen')} />
              <Atalho icon="file-text" label="Solicitações" tint="#EC4899" onPress={() => navigation.navigate('SolicitacoesScreen')} />
            </ScrollView>

            {/* Mural avisos */}
            <View className="mt-6 mb-3 flex-row items-center justify-between">
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 18,
                  color: colors.ink,
                  letterSpacing: -0.5,
                }}
              >
                Mural
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('MuralAvisosScreen')}>
                <Text
                  style={{
                    fontFamily: 'Outfit_600SemiBold',
                    fontSize: 13,
                    color: colors.brand.primary,
                  }}
                >
                  Ver tudo →
                </Text>
              </TouchableOpacity>
            </View>
            <NoticeList avisos={listaAvisos} loading={isLoadingAvisos} error={errorAvisos} onRetry={fetchAvisos} />
          </>
        )}
      </ScrollView>

      <StudentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        aluno={aluno}
        listaAlunos={listaAlunos}
        onAlunoChange={(novoAluno) => {
          setAluno(novoAluno);
          setTimeout(() => {
            setModalVisible(false);
            showToast('Aluno alterado com sucesso!', 'success');
          }, 300);
        }}
      />
    </View>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────

function Topbar({ userName }: { userName?: string; onLogout: () => void }) {
  return (
    <View className="flex-row items-center px-5 pt-2 pb-3">
      <View className="flex-1">
        <Text
          style={{
            fontFamily: 'Outfit_500Medium',
            fontSize: 11,
            color: colors.inkSoft,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Olá,
        </Text>
        <Text
          style={{
            fontFamily: 'Outfit_700Bold',
            fontSize: 22,
            color: colors.ink,
            letterSpacing: -0.6,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {normalizarNomePessoal(userName) || 'Responsável'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NotificacoesBellButton />
        <MenuButton />
      </View>
    </View>
  );
}

function PillSolid({ text }: { text: string }) {
  if (!text || text.trim() === '•') return null;
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.22)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontFamily: 'Outfit_600SemiBold',
          fontSize: 11,
          letterSpacing: 0.4,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function FrequenciaTile({ data }: { data: { percentual: string; tom: 'good' | 'warn' | 'bad' } }) {
  const tomColors = {
    good: { bg: '#DCFCE7', fg: '#15803D', accent: '#16A34A' },
    warn: { bg: '#FEF3C7', fg: '#A16207', accent: '#F59E0B' },
    bad: { bg: '#FEE2E2', fg: '#B91C1C', accent: '#DC2626' },
  }[data.tom];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tomColors.bg,
        borderRadius: 24,
        padding: 18,
        minHeight: 130,
        justifyContent: 'space-between',
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          style={{
            fontFamily: 'Outfit_500Medium',
            fontSize: 11,
            color: tomColors.fg,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Frequência
        </Text>
        <Feather name="check-circle" size={14} color={tomColors.accent} />
      </View>
      <View>
        <Text
          style={{
            fontFamily: 'Outfit_700Bold',
            fontSize: 38,
            color: tomColors.fg,
            letterSpacing: -2,
            lineHeight: 42,
          }}
        >
          {data.percentual}
          <Text style={{ fontSize: 22 }}>%</Text>
        </Text>
        <Text style={{ fontFamily: 'Outfit_400Regular', fontSize: 11, color: tomColors.fg, marginTop: 2 }}>
          Acumulada no ano
        </Text>
      </View>
    </View>
  );
}

function AtividadeTile({ data }: { data: { titulo: string; subtitulo: string; vazio: boolean } }) {
  const bg = data.vazio ? colors.brand.secondaryLight : '#FFF5C8';
  const fg = data.vazio ? colors.brand.secondaryDark : colors.brand.accentDark;

  return (
    <View
      style={{
        flex: 1.4,
        backgroundColor: bg,
        borderRadius: 24,
        padding: 18,
        minHeight: 130,
        justifyContent: 'space-between',
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text
          style={{
            fontFamily: 'Outfit_500Medium',
            fontSize: 11,
            color: fg,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Próx. atividade
        </Text>
        <Feather name={data.vazio ? 'smile' : 'calendar'} size={14} color={fg} />
      </View>
      <View>
        <Text
          style={{
            fontFamily: 'Outfit_700Bold',
            fontSize: 22,
            color: fg,
            letterSpacing: -0.8,
            lineHeight: 26,
          }}
          numberOfLines={2}
        >
          {data.titulo}
        </Text>
        <Text
          style={{
            fontFamily: 'Outfit_400Regular',
            fontSize: 12,
            color: fg,
            marginTop: 4,
            opacity: 0.85,
          }}
          numberOfLines={2}
        >
          {data.subtitulo}
        </Text>
      </View>
    </View>
  );
}

function Atalho({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        marginRight: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 14,
        width: 110,
        borderWidth: 1,
        borderColor: colors.hairline,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          backgroundColor: `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        }}
      >
        <Feather name={icon} size={20} color={tint} />
      </View>
      <Text
        style={{
          fontFamily: 'Outfit_600SemiBold',
          fontSize: 13,
          color: colors.ink,
          letterSpacing: -0.2,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function NoticeList({
  avisos,
  loading,
  error,
  onRetry,
}: {
  avisos: ListagemAvisos[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <View>
        <Skeleton width="100%" height={70} borderRadius={20} />
        <View style={{ height: 12 }} />
        <Skeleton width="100%" height={70} borderRadius={20} />
      </View>
    );
  }
  if (error) {
    return <ErrorState onRetry={onRetry} message={error} />;
  }
  if (avisos.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.paperWarm,
          borderRadius: 20,
          padding: 20,
          alignItems: 'center',
        }}
      >
        <Feather name="inbox" size={20} color={colors.inkSoft} />
        <Text
          style={{
            fontFamily: 'Outfit_500Medium',
            color: colors.inkSoft,
            fontSize: 13,
            marginTop: 8,
          }}
        >
          Nenhum aviso publicado.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {avisos.map((item) => {
        const dataSegura = item.data_cadastro ? item.data_cadastro.replace(' ', 'T') : new Date().toISOString();
        const ehNovo = (new Date().getTime() - new Date(dataSegura).getTime()) / (1000 * 60 * 60) <= 48;
        return (
          <View
            key={item.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.hairline,
            }}
          >
            <View className="flex-row items-center mb-1.5">
              {ehNovo && (
                <View
                  style={{
                    backgroundColor: colors.brand.accent,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: colors.ink,
                      fontFamily: 'Outfit_700Bold',
                      fontSize: 9,
                      letterSpacing: 0.5,
                    }}
                  >
                    NOVO
                  </Text>
                </View>
              )}
              <Text
                style={{
                  fontFamily: 'Outfit_400Regular',
                  fontSize: 11,
                  color: colors.inkSoft,
                }}
              >
                {formatarData(item.data_cadastro)}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 14,
                color: colors.ink,
                marginBottom: 4,
                letterSpacing: -0.2,
              }}
            >
              {item.titulo}
            </Text>
            <Text
              style={{
                fontFamily: 'Outfit_400Regular',
                fontSize: 12,
                color: colors.inkSoft,
                lineHeight: 17,
              }}
              numberOfLines={2}
            >
              {removerTagsHtml(item.descricao)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function formatarData(dataString: string) {
  const d = new Date(dataString);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} • ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <View
      style={{
        marginTop: 24,
        backgroundColor: '#FEE2E2',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
      }}
    >
      <Feather name="alert-triangle" size={24} color="#B91C1C" />
      <Text
        style={{
          fontFamily: 'Outfit_700Bold',
          color: '#B91C1C',
          fontSize: 15,
          marginTop: 8,
          textAlign: 'center',
        }}
      >
        Ops! Algo deu errado
      </Text>
      <Text
        style={{
          fontFamily: 'Outfit_400Regular',
          color: '#B91C1C',
          fontSize: 13,
          marginTop: 4,
          marginBottom: 12,
          textAlign: 'center',
          opacity: 0.85,
        }}
      >
        {message || 'Não foi possível carregar.'}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: '#B91C1C',
          paddingHorizontal: 22,
          paddingVertical: 10,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontFamily: 'Outfit_700Bold', fontSize: 13 }}>
          Tentar novamente
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View>
      <Skeleton width="100%" height={170} borderRadius={28} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
        <Skeleton width="42%" height={130} borderRadius={24} />
        <Skeleton width="55%" height={130} borderRadius={24} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: 22, gap: 12 }}>
        <Skeleton width={110} height={90} borderRadius={22} />
        <Skeleton width={110} height={90} borderRadius={22} />
        <Skeleton width={110} height={90} borderRadius={22} />
      </View>
    </View>
  );
}

function StudentModal({
  visible,
  onClose,
  aluno,
  listaAlunos,
  onAlunoChange,
}: {
  visible: boolean;
  onClose: () => void;
  aluno: Aluno | null;
  listaAlunos: ListagemAlunos[];
  onAlunoChange: (a: ListagemAlunos) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View
          style={{
            backgroundColor: colors.paper,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: 24,
            maxHeight: '85%',
          }}
        >
          <View className="flex-row justify-between items-center mb-5">
            <Text
              style={{
                fontFamily: 'Outfit_700Bold',
                fontSize: 22,
                color: colors.ink,
                letterSpacing: -0.6,
              }}
            >
              Dados do aluno
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.paperWarm,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="x" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                alignItems: 'center',
                marginBottom: 20,
                padding: 20,
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.hairline,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  backgroundColor: colors.brand.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 32, color: '#FFFFFF' }}>
                  {aluno?.nome?.charAt(0) || '?'}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'Outfit_700Bold',
                  fontSize: 18,
                  color: colors.ink,
                  textAlign: 'center',
                  letterSpacing: -0.4,
                }}
              >
                {aluno?.nome}
              </Text>
              <Text
                style={{
                  fontFamily: 'Outfit_500Medium',
                  fontSize: 12,
                  color: colors.inkSoft,
                  marginTop: 2,
                }}
              >
                Matrícula: {aluno?.matricula}
              </Text>
            </View>

            <DataRow icon="map-pin" label="Escola" value={aluno?.escola || ''} />
            <DataRow icon="book-open" label="Curso" value={aluno?.curso || ''} />
            <DataRow icon="users" label="Série / Turma" value={`${aluno?.serie || ''} - ${aluno?.turma || ''}`} />
            <DataRow icon="credit-card" label="CPF" value={aluno?.cpf || ''} />
            <DataRow icon="activity" label="Situação" value={aluno?.situacao || ''} />

            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  fontFamily: 'Outfit_500Medium',
                  fontSize: 11,
                  color: colors.inkSoft,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Ano letivo
              </Text>
              <AlunoAnoSelect value={aluno} alunos={listaAlunos} onSelect={onAlunoChange} />
            </View>

            {listaAlunos.length > 1 && (
              <View style={{ marginTop: 20 }}>
                <Text
                  style={{
                    fontFamily: 'Outfit_500Medium',
                    fontSize: 11,
                    color: colors.inkSoft,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Trocar aluno
                </Text>
                {listaAlunos
                  .filter((a, i, self) => i === self.findIndex((t) => t.pes_cod === a.pes_cod))
                  .map((item, idx) => {
                    const ativo = item.pes_cod === aluno?.pes_cod;
                    return (
                      <TouchableOpacity
                        key={item.pes_cod || idx}
                        onPress={() => onAlunoChange(item)}
                        style={{
                          padding: 14,
                          borderRadius: 16,
                          marginBottom: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: ativo ? colors.brand.primaryLight : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: ativo ? colors.brand.primary : colors.hairline,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 12,
                            backgroundColor: ativo ? colors.brand.primary : colors.paperWarm,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: ativo ? '#FFFFFF' : colors.ink,
                              fontFamily: 'Outfit_700Bold',
                              fontSize: 13,
                            }}
                          >
                            {(item.nome || '?').charAt(0)}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontFamily: 'Outfit_600SemiBold',
                            fontSize: 14,
                            color: ativo ? colors.brand.primaryDark : colors.ink,
                          }}
                        >
                          {(item.nome || 'Aluno').split(' ')[0]}
                        </Text>
                        {ativo && (
                          <View style={{ marginLeft: 'auto' }}>
                            <Feather name="check" size={16} color={colors.brand.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DataRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: colors.paperWarm,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name={icon} size={16} color={colors.ink} />
      </View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text
          style={{
            fontFamily: 'Outfit_500Medium',
            fontSize: 10,
            color: colors.inkSoft,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: 'Outfit_600SemiBold',
            fontSize: 13,
            color: colors.ink,
            marginTop: 2,
          }}
        >
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}
