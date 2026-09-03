import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Contexts & Services
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { Aluno, useAluno } from '../../context/AlunoContext';
import { GetAlunos, ListagemAlunos } from '../../services/home/HomeService';
import { getMuralAvisos, ListagemAvisos } from '../../services/mural/MuralAvisoService';

// Utils & Constants
import { normalizarNomePessoal } from '../../util/FormatarNome';
import { removerTagsHtml } from '../../util/RemoverTagsHtml';
import { colors } from '../../constants/colors';
import { AppTabParamList } from '../../navigation/AppTabs';

// Components
import { Skeleton } from '../../components/Skeleton';
import { FormSelect } from '../../components/forms/FormSelect';
import { AlunoAnoSelect } from '../../components/AlunoAnoSelect';
import { OcorrenciaPendenteModal } from '../../components/OcorrenciaPendenteModal';
import { NotificacoesBellButton } from '../../components/NotificacoesBellButton';

// --- Interfaces ---
interface MenuCardProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  disabled: boolean;
  onPress: () => void;
}

// --- Main Screen ---
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppTabParamList>>();
  const { user, signOut } = useAuth();
  const { aluno, setAluno, clearAluno, mudarAnoSelecionado } = useAluno();
  const { showToast, showConfirm } = useAlert();

  // States
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

  //const temPendencia = Number(aluno?.ocorrencia_pendente) === 1;

  const handleNavegarParaOcorrencias = () => {
    navigation.navigate('OcorrenciaScreen');
    setExibirAlertaOcorrencia(false);
  };

  // --- Logic / Effects ---
  useEffect(() => { fetchAlunos(); }, []);
  useEffect(() => { if (aluno) fetchAvisos(); }, [aluno]);

  async function fetchAlunos() {
    try {
      setExibirAlertaOcorrencia(true);
      setLoadingData(true);
      setError(null);
      const dados = await GetAlunos();
      setListaAlunos(dados);
      // const registro = dados.find(d => d.pes_cod === aluno?.pes_cod);
      // setTemPendencia(Boolean(Number(registro?.ocorrencia_pendente)));
      if (dados?.length > 0) {
        const alunoAtualizado = dados.find(d => d.pes_cod === aluno?.pes_cod) || dados[0];

        setAluno(alunoAtualizado);
        setTemPendencia(Boolean(Number(alunoAtualizado?.ocorrencia_pendente)));
      }
    } catch (error: any) {
      console.error("Erro alunos", error.response?.data);
      showToast("Erro ao carregar informações.", "error");
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
    } catch (error) {
      console.error("Erro avisos", error);
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
    showConfirm("Atenção!", "Deseja realmente desconectar?", () => signOut());
  };

  // --- Memoized Data ---
  const dadosFrequencia = useMemo(() => {
    const totalAulas = aluno?.total_aulas_anual || 0;
    const totalFaltas = aluno?.total_faltas || 0;

    if (totalAulas === 0) return { percentual: "100", bgClass: "bg-green-100", textClass: "text-green-600", iconColor: "#16a34a", iconName: "check-circle" as const };

    const calculo = ((totalAulas - totalFaltas) / totalAulas) * 100;
    const percentual = calculo.toFixed(1);

    if (calculo < 75) return { percentual, bgClass: "bg-red-100", textClass: "text-red-600", iconColor: "#dc2626", iconName: "alert-circle" as const };
    if (calculo < 80) return { percentual, bgClass: "bg-orange-100", textClass: "text-orange-600", iconColor: "#ea580c", iconName: "alert-triangle" as const };
    return { percentual, bgClass: "bg-green-100", textClass: "text-green-600", iconColor: "#16a34a", iconName: "check-circle" as const };
  }, [aluno]);

  const dadosAtividade = useMemo(() => {
    if (!aluno?.data_prox_atividade) {
      return { titulo: "Em dia!", subtitulo: "Sem atividades", bgIcon: "bg-blue-50", iconColor: "#3b82f6", iconName: "smile" as const, textColor: "text-blue-600" };
    }
    return {
      titulo: aluno.data_prox_atividade,
      subtitulo: `${aluno.descricao_prox_atividade || 'Atividade'} de ${aluno.disciplina_prox_atividade || 'Geral'}`,
      bgIcon: "bg-orange-100",
      iconColor: "#ea580c",
      iconName: "calendar" as const,
      textColor: "text-slate-800"
    };
  }, [aluno]);

  // --- Render ---
  return (
    <View className="flex-1 bg-slate-150">
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <View className="flex-1">


        <HomeHeader userName={user?.responsavel_nome} onLogout={handleLogout} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.edu.dark]} tintColor={colors.edu.dark} />}
        >
          {loadingData ? (
            <HomeSkeleton />
          ) : error ? (
            <ErrorState onRetry={fetchAlunos} />
          ) : (
            <>
              {/* Card do Aluno (Trigger do Modal) */}
              <View className="px-6 mt-6">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(true)}
                  className="flex-row items-center justify-between p-4 rounded-2xl shadow-lg shadow-black/20"
                  style={{ backgroundColor: colors.edu.primary }}
                >
                  <View className="flex-1 mr-4">
                    <View className="flex-row items-start mb-1">
                      <Text
                        className="text-edu-onPrimary font-bold text-lg mr-2 flex-1"
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {normalizarNomePessoal(aluno?.nome) || "Nome não informado"}
                      </Text>
                      <Feather name="chevron-down" size={16} color="rgba(61,44,16,0.7)" style={{ marginTop: 4 }} />
                    </View>
                    <Text className="text-edu-onPrimary opacity-80 text-sm" numberOfLines={1}>
                      {aluno?.serie} • {aluno?.turma} • {aluno?.ano_letivo}
                    </Text>
                    <Text className="text-edu-onPrimary opacity-70 text-xs mt-1" numberOfLines={1}>{aluno?.escola}</Text>
                  </View>
                  {/* Círculo no azul complementar: sobre o dourado é o único
                      tom que aceita ícone branco. */}
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.edu.accent }}
                  >
                    <Feather name="user" size={24} color="white" />
                  </View>
                </TouchableOpacity>
              </View>

              <OcorrenciaPendenteModal
                visible={temPendencia && exibirAlertaOcorrencia}
                onNavigate={handleNavegarParaOcorrencias}
              />

              {/* <OcorrenciaAlert visible={temOcorrenciaPendente} /> */}

              {/* Resumo Escolar */}
              <AcademicSummary dadosFrequencia={dadosFrequencia} dadosAtividade={dadosAtividade} />

              {/* Menu de Acesso Rápido */}
              <QuickAccessMenu navigation={navigation} disabled={!!error || loadingData} />

              {/* Mural de Avisos */}
              <NoticeBoard
                avisos={listaAvisos}
                loading={isLoadingAvisos}
                error={errorAvisos}
                onRetry={fetchAvisos}
              />
            </>
          )}
        </ScrollView>
      </View>

      <StudentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        aluno={aluno}
        listaAlunos={listaAlunos}
        onAlunoChange={(novoAluno) => {
          setAluno(novoAluno);
          setTimeout(() => { setModalVisible(false); showToast("Aluno alterado com sucesso!", "success"); }, 300)
        }}
      />
    </View>
  );
}

// --- Sub-Components ---

function HomeHeader({ userName, onLogout }: { userName?: string, onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="rounded-b-[32px] shadow-lg z-10 overflow-hidden" style={{
      backgroundColor: colors.edu.primary,
      paddingTop: insets.top + 10,
      paddingBottom: 10,
      elevation: 6
    }}>
      <View className="flex-row items-center justify-between px-6 mb-2">
        <View className="flex-1 mr-4">
          <View className="flex-row items-center mb-1">
            <Text className="text-edu-onPrimary opacity-75 text-xs font-medium uppercase tracking-wider mr-1">Bem-vindo(a),</Text>
            <Feather name="smile" size={12} color={colors.edu.onPrimary} />
          </View>
          <Text className="text-edu-onPrimary text-xl font-bold" numberOfLines={1}>{normalizarNomePessoal(userName)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <NotificacoesBellButton />
          <TouchableOpacity
            onPress={onLogout}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.10)',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.10)',
            }}
          >
            <Feather name="log-out" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function AcademicSummary({ dadosFrequencia, dadosAtividade }: { dadosFrequencia: any, dadosAtividade: any }) {
  return (
    <View className="px-6 mt-6">
      <Text className="text-slate-800 font-bold text-lg mb-3">Resumo Escolar</Text>
      <View className="flex-row gap-4">

        <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
          <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 overflow-hidden ${dadosFrequencia.bgClass}`}>
            <Feather name={dadosFrequencia.iconName} size={24} color={dadosFrequencia.iconColor} />
          </View>
          <Text className={`text-xl font-bold mt-1 ${dadosFrequencia.textClass}`}>
            {dadosFrequencia.percentual}%
          </Text>
          <Text className="text-slate-500 text-xs text-center">Frequência Acumulada</Text>
        </View>

        <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
          <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 overflow-hidden ${dadosAtividade.bgIcon}`}>
            <Feather name={dadosAtividade.iconName} size={24} color={dadosAtividade.iconColor} />
          </View>
          <Text className={`text-xl font-bold mt-1 ${dadosAtividade.textColor}`} numberOfLines={1}>
            {dadosAtividade.titulo}
          </Text>
          <Text className="text-slate-500 text-xs text-center mt-1 leading-tight" numberOfLines={2}>
            {dadosAtividade.subtitulo}
          </Text>
        </View>
      </View>
    </View>
  );
}

function QuickAccessMenu({ navigation, disabled }: { navigation: any, disabled: boolean }) {
  return (
    <View className="px-6 mt-6">
      <Text className="text-slate-800 font-bold text-lg">Acesso Rápido</Text>
      <View className="flex-row flex-wrap justify-between gap-y-4 mt-4">
        {/* Paleta restrita: quente da marca + azul complementar, e as duas
            cores de estado só onde o significado pede (falta / ocorrência).
            Antes eram 9 matizes arbitrários, que brigavam com o dourado. */}
        <MenuCard disabled={disabled} title="Avisos" icon="bell" color={colors.edu.dark} onPress={() => navigation.navigate("MuralAvisosScreen")} />
        <MenuCard disabled={disabled} title="Boletim" icon="bar-chart-2" color={colors.edu.accent} onPress={() => navigation.navigate("BoletimEscolarScreen")} />
        <MenuCard disabled={disabled} title="Horários" icon="clock" color={colors.secondaryDarker} onPress={() => navigation.navigate("HorariosScreen")} />
        <MenuCard disabled={disabled} title="Calendário" icon="calendar" color={colors.primaryDarker} onPress={() => navigation.navigate("CalendarioEscolarScreen")} />
        <MenuCard disabled={disabled} title="Solicitações" icon="file-text" color={colors.edu.accent} onPress={() => navigation.navigate("SolicitacoesScreen")} />
        <MenuCard disabled={disabled} title="Conteúdo" icon="book" color={colors.secondaryDarker} onPress={() => navigation.navigate("ConteudoScreen")} />
        <MenuCard disabled={disabled} title="Frequencia" icon="check-circle" color={colors.success} onPress={() => navigation.navigate("FrequenciaScreen")} />
        <MenuCard disabled={disabled} title="Ocorrências" icon="alert-circle" color={colors.error} onPress={() => navigation.navigate("OcorrenciaScreen")} />
        <MenuCard disabled={disabled} title="Autorizações" icon="key" color={colors.edu.dark} onPress={() => navigation.navigate("AutorizacoesScreen")} />

      </View>
    </View>
  );
}

function NoticeBoard({ avisos, loading, error, onRetry }: { avisos: ListagemAvisos[], loading: boolean, error: string | null, onRetry: () => void }) {
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View className="px-6 mt-2">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-slate-800 font-bold text-lg">Mural de Avisos</Text>
      </View>

      {loading ? (
        <View className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-3">
          <Skeleton width="40%" height={16} borderRadius={4} />
          <View className="my-2"><Skeleton width="60%" height={20} borderRadius={4} /></View>
          <Skeleton width="100%" height={16} borderRadius={4} />
        </View>
      ) : error ? (
        <ErrorState onRetry={onRetry} message={error} />
      ) : (
        <>
          {avisos.map((item) => {
            const dataSegura = item.data_cadastro ? item.data_cadastro.replace(' ', 'T') : new Date().toISOString();
            const ehNovo = (new Date().getTime() - new Date(dataSegura).getTime()) / (1000 * 60 * 60) <= 48;

            return (
              <View key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-3">
                <View className="flex-row items-center mb-2">
                  {ehNovo && (
                    <View className="bg-yellow-100 px-2 py-1 rounded-md mr-2">
                      <Text className="text-yellow-700 text-[10px] font-bold">NOVO</Text>
                    </View>
                  )}
                  <Text className="text-slate-400 text-xs">{formatarData(item.data_cadastro)}</Text>
                </View>
                <Text className="text-slate-800 font-bold mb-1 text-base">{item.titulo}</Text>
                <Text className="text-slate-500 text-sm leading-5">{removerTagsHtml(item.descricao)}</Text>
              </View>
            );
          })}
          {avisos.length === 0 && (
            <Text className="text-slate-400 text-center py-4 text-xs">Nenhum aviso publicado.</Text>
          )}
        </>
      )}
    </View>
  );
}

function MenuCard({ title, icon, color, onPress, disabled }: MenuCardProps) {
  return (
    <TouchableOpacity
      className={`w-[31%] py-4 bg-white rounded-2xl border border-slate-100 shadow-sm items-center justify-center mb-4 ${disabled ? 'opacity-40' : 'opacity-100'}`}
      onPress={onPress} activeOpacity={0.7} disabled={disabled}
    >
      <View style={{ backgroundColor: `${color}20` }} className="w-12 h-12 rounded-full flex items-center justify-center mb-2">
        <Feather name={icon} size={24} color={color} style={{ textAlign: 'center' }} />
      </View>
      <Text className="text-slate-600 font-medium text-xs text-center" numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value, icon }: { label: string, value: string, icon: keyof typeof Feather.glyphMap }) {
  return (
    <View className="flex-row items-center mb-3">
      <View className="w-8 items-center"><Feather name={icon} size={16} color="#64748b" /></View>
      <View className="ml-2 flex-1">
        <Text className="text-slate-400 text-xs uppercase">{label}</Text>
        <Text className="text-slate-700 font-medium text-sm">{value}</Text>
      </View>
    </View>
  );
}

function ErrorState({ onRetry, message }: { onRetry: () => void, message?: string }) {
  return (
    <View className="mx-4 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
      <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-3">
        <Feather name="alert-triangle" size={22} color="#F59E0B" />
      </View>
      <Text className="text-amber-800 font-bold text-base text-center mb-1">Ops! Algo deu errado</Text>
      <Text className="text-amber-700 text-sm text-center mb-4">{message || "Não foi possível carregar as informações."}</Text>
      <TouchableOpacity onPress={onRetry} className="px-6 py-2.5 rounded-xl bg-edu-dark active:opacity-80">
        <Text className="text-white font-bold">Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeSkeleton() {
  return (
    <View>
      <View className="px-6 mt-6">
        <View className="flex-row items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <View className="flex-1 mr-4 space-y-2">
            <Skeleton width="70%" height={24} borderRadius={6} />
            <Skeleton width="40%" height={16} borderRadius={4} />
            <Skeleton width="50%" height={12} borderRadius={4} />
          </View>
          <Skeleton width={48} height={48} borderRadius={24} />
        </View>
      </View>
      <View className="px-6 mt-6">
        <Text className="text-slate-800 font-bold text-lg mb-3">Resumo Escolar</Text>
        <View className="flex-row gap-4">
          <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
            <View className="w-12 h-12 rounded-full items-center justify-center mb-2">
              <Skeleton width="40%" height={16} borderRadius={4} />
            </View>
            <Skeleton width="40%" height={22} borderRadius={4} />
            <Skeleton width="70%" height={22} borderRadius={4} />
          </View>
          <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center">
            <View className="w-12 h-12 rounded-full items-center justify-center mb-2">
              <Skeleton width="40%" height={16} borderRadius={4} />
            </View>
            <Skeleton width="40%" height={22} borderRadius={4} />
            <Skeleton width="70%" height={22} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
}

function StudentModal({ visible, onClose, aluno, listaAlunos, onAlunoChange }: {
  visible: boolean,
  onClose: () => void,
  aluno: Aluno | null,
  listaAlunos: ListagemAlunos[],
  onAlunoChange: (aluno: ListagemAlunos) => void
}) {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white w-full rounded-3xl p-6 shadow-2xl pt-6 pb-6" style={{ maxHeight: '90%' }}>
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-slate-100 rounded-full active:bg-slate-200"
          >
            <Feather name="x" size={20} color="#64748b" />
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-slate-800">Dados do Aluno</Text>
            </View>

            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-3">
                <Text className="text-3xl font-bold text-blue-600">{aluno?.nome?.charAt(0) || '?'}</Text>
              </View>
              <Text className="text-lg font-bold text-slate-800 text-center">{aluno?.nome}</Text>
              <Text className="text-slate-500 text-sm">Matrícula: {aluno?.matricula}</Text>
            </View>

            <View className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4">
              <DetailRow label="Escola" value={aluno?.escola || ''} icon="map-pin" />
              <DetailRow label="Curso" value={aluno?.curso || ''} icon="book-open" />
              <DetailRow label="Série / Turma" value={`${aluno?.serie || ''} - ${aluno?.turma || ''}`} icon="users" />
              <DetailRow label="CPF" value={aluno?.cpf || ''} icon="credit-card" />
              <DetailRow label="Situação" value={aluno?.situacao || ''} icon="activity" />
            </View>

            <View className="mb-2 pt-2 border-t border-slate-100">
              <Text className="text-slate-500 text-xs font-bold uppercase mb-2">Ano Letivo</Text>
              <AlunoAnoSelect
                value={aluno}
                alunos={listaAlunos}
                onSelect={(novoAluno) => { onAlunoChange(novoAluno); }}
              />

            </View>

            {listaAlunos.length > 1 && (
              <View className="mt-4 pt-4 border-t border-slate-100">
                <Text className="text-slate-500 text-xs font-bold uppercase mb-3">Trocar Aluno</Text>
                {listaAlunos.filter((aluno, index, self) => index === self.findIndex((t) => t.pes_cod === aluno.pes_cod))
                  .map((itemAluno, index) => {
                    const nomeSafe = itemAluno.nome || "Aluno";
                    return (
                      <TouchableOpacity
                        key={itemAluno.pes_cod || index}
                        onPress={() => { onAlunoChange(itemAluno); }}
                        className={`p-3 rounded-xl mb-2 flex-row items-center ${itemAluno.pes_cod === aluno?.pes_cod ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-slate-100'}`}
                      >
                        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                          <Text className="text-blue-600 font-bold text-xs">{nomeSafe.charAt(0)}</Text>
                        </View>
                        <Text className={`font-semibold ${itemAluno.pes_cod === aluno?.pes_cod ? 'text-blue-700' : 'text-slate-600'}`}>{nomeSafe.split(' ')[0]}</Text>
                        {itemAluno.pes_cod === aluno?.pes_cod && <View className="ml-auto"><Feather name="check" size={16} color={colors.edu.dark} /></View>}
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