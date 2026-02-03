/**
 * Configuração de colunas da Agenda Forms (vw_filtro_controle).
 * key = campo no banco (ou 'endereco' / 'whatsapp' computados)
 * label = título na tabela
 */
export const AGENDA_FORMS_COLUMNS: { key: string; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome_pessoa', label: 'Nome' },
  { key: 'cpf_sanit', label: 'CPF' },
  { key: 'data_nascimento', label: 'Nascimento' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'telefone_contato', label: 'Contato' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'referencia_localizacao', label: 'Referência Localização' },
  { key: 'tipo_atendimento', label: 'Tipo Atendimento' },
  { key: 'local_atendimento', label: 'Local Atendimento' },
  { key: 'atendente', label: 'Atendente' },
  { key: 'periodos_preferidos_visita', label: 'Períodos Preferidos Visita' },
  { key: 'num_pessoas_familia', label: 'Nº Pessoas Família' },
  { key: 'area_dificil_acesso', label: 'Área Difícil Acesso' },
  { key: 'visita1_data', label: 'Visita 1 Data' },
  { key: 'visita1_entrevistadores', label: 'Visita 1 Entrevistadores' },
  { key: 'visita1_familia_localizada', label: 'Visita 1 Família Localizada' },
  { key: 'visita1_cadastro_atualizado', label: 'Visita 1 Cadastro Atualizado' },
  { key: 'visita1_observacao', label: 'Visita 1 Observação' },
  { key: 'visita2_data', label: 'Visita 2 Data' },
  { key: 'visita2_entrevistadores', label: 'Visita 2 Entrevistadores' },
  { key: 'visita2_familia_localizada', label: 'Visita 2 Família Localizada' },
  { key: 'visita2_cadastro_atualizado', label: 'Visita 2 Cadastro Atualizado' },
  { key: 'visita2_observacao', label: 'Visita 2 Observação' },
  { key: 'visita3_data', label: 'Visita 3 Data' },
  { key: 'visita3_entrevistadores', label: 'Visita 3 Entrevistadores' },
  { key: 'visita3_familia_localizada', label: 'Visita 3 Família Localizada' },
  { key: 'visita3_cadastro_atualizado', label: 'Visita 3 Cadastro Atualizado' },
  { key: 'visita3_observacao', label: 'Visita 3 Observação' },
  { key: 'ja_teve_visita', label: 'Já Teve Visita' },
  { key: 'teve_visita1', label: 'Teve Visita 1' },
  { key: 'teve_visita2', label: 'Teve Visita 2' },
  { key: 'teve_visita3', label: 'Teve Visita 3' },
  { key: 'ainda_precisa_visita', label: 'Ainda Precisa Visita' },
  { key: 'cancelado_em', label: 'Cancelado Em' },
  { key: 'tempo_desde_ultima_atualizacao', label: 'Tempo Desde Última Atualização' },
  { key: 'situacao_familia', label: 'Situação Família' },
  { key: 'motivo_bloqueio', label: 'Motivo Bloqueio' },
  { key: 'motivo_cancelamento', label: 'Motivo Cancelamento' },
];

/** Filtros disponíveis para a página */
export const AGENDA_FORMS_FILTERS = [
  { key: 'bairro', label: 'Bairro', placeholder: 'Ex.: Centro' },
  { key: 'situacao_familia', label: 'Situação Família', placeholder: 'LIBERADO, BLOQUEADO ou CANCELADO' },
  { key: 'ja_teve_visita', label: 'Já Teve Visita', placeholder: 'Sim/Não' },
  { key: 'ainda_precisa_visita', label: 'Ainda Precisa Visita', placeholder: 'Sim/Não' },
  { key: 'tipo_atendimento', label: 'Tipo Atendimento', placeholder: 'Texto' },
  { key: 'local_atendimento', label: 'Local Atendimento', placeholder: 'Texto' },
  { key: 'atendente', label: 'Atendente', placeholder: 'Nome' },
];
