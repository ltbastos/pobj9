// BEGIN script.js
/* =========================================================
   POBJ • script.js  —  cards, tabela em árvore, ranking e visão executiva
   (com fixes: svh/topbar, z-index, listeners únicos, a11y)
   ========================================================= */

/* ===== Aqui eu organizo as configurações base do painel ===== */
// --- Dimensões por cenário (globais) ---
// Essas referências são reutilizadas por módulos legados; por isso mantemos "var".
// eslint-disable-next-line no-var
var segMap;
// eslint-disable-next-line no-var
var dirMap;
// eslint-disable-next-line no-var
var regMap;
// eslint-disable-next-line no-var
var ageMap;
// eslint-disable-next-line no-var
var agMap;
// eslint-disable-next-line no-var
var ggMap;
// eslint-disable-next-line no-var
var gerMap;
// eslint-disable-next-line no-var
var gaMap;

if (typeof window !== "undefined") {
  window.segMap = window.segMap || new Map();
  window.dirMap = window.dirMap || new Map();
  window.regMap = window.regMap || new Map();
  const sharedAgencyMap = (window.agMap instanceof Map && window.agMap)
    || (window.ageMap instanceof Map && window.ageMap)
    || new Map();
  window.ageMap = sharedAgencyMap;
  window.agMap = sharedAgencyMap;
  window.ggMap = window.ggMap || new Map();
  window.gerMap = window.gerMap || new Map();
  window.gaMap = window.gaMap || new Map();
  segMap = window.segMap;
  dirMap = window.dirMap;
  regMap = window.regMap;
  ageMap = window.ageMap;
  agMap = window.agMap;
  ggMap = window.ggMap;
  gerMap = window.gerMap;
  gaMap = window.gaMap;
} else {
  segMap = new Map();
  dirMap = new Map();
  regMap = new Map();
  ageMap = new Map();
  agMap = ageMap;
  ggMap = new Map();
  gerMap = new Map();
  gaMap = new Map();
  if (typeof globalThis !== "undefined") {
    if (!globalThis.ageMap) globalThis.ageMap = ageMap;
    if (!globalThis.agMap) globalThis.agMap = agMap;
    if (!globalThis.ggMap) globalThis.ggMap = ggMap;
    if (!globalThis.gerMap) globalThis.gerMap = gerMap;
    if (!globalThis.gaMap) globalThis.gaMap = gaMap;
  }
}

const DATA_SOURCE = "sql";
const API_PATH = typeof window !== "undefined" && window.API_URL
  ? String(window.API_URL)
  : "config/api/index.php";
const API_BASE = 'config/api/index.php';
const DEFAULT_HTTP_BASE = "http://localhost/POBJ%20SQL%20php71/";
const API_HTTP_BASE = typeof window !== "undefined" && window.API_HTTP_BASE
  ? String(window.API_HTTP_BASE)
  : DEFAULT_HTTP_BASE;
const API_ENDPOINT_PARAM = "endpoint";
const TICKET_URL = "omega.html";

function ensureHttpContext(){
  if (typeof window === "undefined") return;
  if (window.location.protocol !== "file:") return;

  const targetBase = (typeof API_HTTP_BASE === "string" && API_HTTP_BASE.startsWith("http"))
    ? API_HTTP_BASE
    : DEFAULT_HTTP_BASE;

  try {
    const candidate = new URL(targetBase, "http://localhost/");
    if (candidate.protocol === "http:" || candidate.protocol === "https:") {
      const candidateHref = candidate.href;
      const alreadyThere = candidateHref.replace(/\/?$/, "/") === window.location.href.replace(/\/?$/, "/");
      if (!alreadyThere) {
        window.location.href = candidateHref;
      }
    }
  } catch (error) {
    console.warn("Não foi possível redirecionar automaticamente para o Apache", error);
  }
}

ensureHttpContext();

function uniqById(arr) {
  const seen = new Set();
  const result = [];
  arr.forEach(item => {
    if (!item) return;
    const id = item.id != null ? String(item.id).trim() : '';
    if (!id || seen.has(id)) return;
    seen.add(id);
    const label = item.label != null ? String(item.label).trim() : '';
    result.push({ id, label });
  });
  return result;
}

function normOpt(x) {
  if (!x) return { id: '', label: '' };
  const id = x.id != null ? String(x.id) : '';
  const rawLabel = x.label != null ? x.label : '';
  const label = String(rawLabel).trim();
  return { id, label };
}

function getMapEntry(mapRef, id) {
  if (!mapRef || typeof mapRef.get !== "function") return null;
  const key = limparTexto(id);
  if (!key) return null;
  return mapRef.get(key) || null;
}

function resolveMapLabel(mapRef, id, fallbackName = '', fallbackId = '') {
  const entry = getMapEntry(mapRef, id);
  const baseId = limparTexto(id) || limparTexto(fallbackId);
  const baseName = limparTexto(fallbackName);
  if (entry) {
    const entryId = limparTexto(entry.id) || baseId;
    const entryName = limparTexto(entry.nome) || baseName || entryId;
    const entryLabel = limparTexto(entry.label);
    return entryLabel || buildHierarchyLabel(entryId, entryName);
  }
  if (baseId || baseName) {
    return buildHierarchyLabel(baseId, baseName || baseId);
  }
  return '';
}

function extractNameFromLabel(label) {
  if (label == null) return '';
  const text = String(label);
  const parts = text.split(' - ');
  if (parts.length <= 1) return text.trim();
  return parts.slice(1).join(' - ').trim();
}

function extractIdFromLabel(label) {
  const text = limparTexto(label);
  if (!text) return '';
  const sepIndex = text.indexOf(' - ');
  if (sepIndex > 0) {
    return text.slice(0, sepIndex).trim();
  }
  return text;
}

function normalizeFuncionalPair(rawId, rawLabel, fallbackLabel = '') {
  const idCandidate = limparTexto(rawId);
  const labelCandidate = limparTexto(rawLabel) || limparTexto(fallbackLabel);
  const idFromLabel = extractIdFromLabel(labelCandidate);
  const id = limparTexto(idCandidate || idFromLabel);
  const nomeFromLabel = extractNameFromLabel(labelCandidate);
  const nome = limparTexto(nomeFromLabel) || (labelCandidate && labelCandidate !== id ? labelCandidate : '');
  const label = id ? buildHierarchyLabel(id, nome || id) : (labelCandidate || nome || id || '');
  return {
    id: id || '',
    nome: nome || '',
    label,
  };
}

/* ===== Aqui eu deixo separado tudo que envolve o chat embutido ===== */
// MODO 1 (recomendado): "iframe" — cole a URL do seu agente (Copilot Studio / SharePoint)
// MODO 2 (alternativo): "http"  — envia para um endpoint seu que responde { answer }
const CHAT_MODE = "http";  // "iframe" | "http"
const CHAT_IFRAME_URL = "";  // cole aqui a URL do canal "Website" do seu agente (se usar iframe)

function resolveApiBaseUrl(){
  const normalizedPath = typeof API_PATH === "string" ? API_PATH.trim() : "";
  const fallbackBase = typeof API_HTTP_BASE === "string" && API_HTTP_BASE
    ? API_HTTP_BASE
    : DEFAULT_HTTP_BASE;

  const attempts = [];

  if (normalizedPath) {
    attempts.push(() => new URL(normalizedPath, window.location.href));
  } else {
    attempts.push(() => new URL("config/api/index.php", window.location.href));
  }

  if (fallbackBase) {
    attempts.push(() => new URL(normalizedPath || "config/api/index.php", fallbackBase));
  }

  let lastError;
  for (const build of attempts){
    try {
      const url = build();
      if (url.protocol === "file:") {
        continue;
      }
      return url;
    } catch (err) {
      lastError = err;
    }
  }

  const error = new Error("Não foi possível resolver o endereço da API PHP.");
  if (lastError) {
    error.cause = lastError;
  }
  throw error;
}

const AGENT_ENDPOINT = (() => {
  try {
    const url = resolveApiBaseUrl();
    url.searchParams.set(API_ENDPOINT_PARAM, "agent");
    return url.toString();
  } catch (err) {
    console.warn("Não foi possível montar o endpoint do agente", err);
    return null;
  }
})(); // seu endpoint (se usar http)

// Aqui eu criei atalhos para querySelector e querySelectorAll porque uso isso o tempo todo.
const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
// Aqui eu preparo alguns formatadores (moeda, inteiro, número com 1 casa) para reaproveitar sem recalcular.
const fmtBRL = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" });
const fmtINT = new Intl.NumberFormat("pt-BR");
const fmtONE = new Intl.NumberFormat("pt-BR", { minimumFractionDigits:1, maximumFractionDigits:1 });
// Aqui eu defino as cores padrão da visão executiva para manter identidade visual.
const EXEC_BAR_FILL = "#93c5fd";
const EXEC_BAR_STROKE = "#60a5fa";
const EXEC_META_COLOR = "#fca5a5";
const EXEC_SERIES_PALETTE = [
  "#2563eb", "#9333ea", "#0ea5e9", "#16a34a", "#f97316",
  "#ef4444", "#14b8a6", "#d946ef", "#f59e0b", "#22d3ee"
];
// Aqui eu deixo claro para mim que essa função só serve para trocar a aba visível e manter o botão certo destacado.
const definirAbaAtiva = (viewId = "cards") => {
  const tabs = Array.from($$(".tab"));
  const target = tabs.some(tab => (tab.dataset.view || "") === viewId) ? viewId : "cards";
  tabs.forEach(tab => {
    const expected = tab.dataset.view || "";
    tab.classList.toggle("is-active", expected === target);
  });
};
// Aqui eu extraio o símbolo da moeda para usar em componentes customizados.
const fmtBRLParts = fmtBRL.formatToParts(1);
const CURRENCY_SYMBOL = fmtBRLParts.find(p => p.type === "currency")?.value || "R$";
const CURRENCY_LITERAL = fmtBRLParts.find(p => p.type === "literal")?.value || " ";
const CURRENT_CALENDAR_YEAR = new Date().getFullYear();
// Aqui eu defino as regras de sufixo (mil, milhão...) para simplificar valores grandes.
const SUFFIX_RULES = [
  { value: 1_000_000_000_000, singular: "trilhão", plural: "trilhões" },
  { value: 1_000_000_000,     singular: "bilhão",  plural: "bilhões" },
  { value: 1_000_000,         singular: "milhão",  plural: "milhões" },
  { value: 1_000,             singular: "mil",     plural: "mil" }
];
const MONTH_ABBREVIATIONS_PT_BR = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];
const MONTH_ABBREVIATION_ALIASES = [
  ["jan", "janeiro"],
  ["fev", "fevereiro"],
  ["mar", "marco", "março"],
  ["abr", "abril"],
  ["mai", "maio"],
  ["jun", "junho"],
  ["jul", "julho"],
  ["ago", "agosto"],
  ["set", "setembro"],
  ["out", "outubro"],
  ["nov", "novembro"],
  ["dez", "dezembro"]
];
const RESUMO_MODE_STORAGE_KEY = "pobj.resumoMode";
// Aqui eu deixo uma lista padrão de motivos para simulação de cancelamento quando a base não traz o detalhe.
const MOTIVOS_CANCELAMENTO = [
  "Solicitação do cliente",
  "Inadimplência",
  "Renovação antecipada",
  "Ajuste comercial",
  "Migração de produto"
];

let MESU_DATA = [];
let PRODUTOS_DATA = [];
let DIM_SEGMENTOS_LOOKUP = new Map();
let DIM_DIRETORIAS_LOOKUP = new Map();
let DIM_REGIONAIS_LOOKUP = new Map();
let DIM_AGENCIAS_LOOKUP = new Map();
let DIM_GGESTAO_LOOKUP = new Map();
let DIM_GERENTES_LOOKUP = new Map();
const DIMENSION_FILTER_OPTIONS = {
  segmento: [],
  diretoria: [],
  gerencia: [],
  agencia: [],
  gerenteGestao: [],
  gerente: [],
};
// Aqui eu mapeio as chaves de status para nomes amigáveis que vão aparecer nos filtros e cards.
const STATUS_LABELS = {
  todos: "Todos",
  atingidos: "Atingidos",
  nao: "Não atingidos",
};
// Aqui eu defino uma ordem padrão de status caso o CSV não traga essa informação.
const DEFAULT_STATUS_ORDER = ["todos", "atingidos", "nao"];
const DEFAULT_STATUS_INDICADORES = DEFAULT_STATUS_ORDER.map((key, idx) => ({
  id: key,
  codigo: key,
  nome: STATUS_LABELS[key] || key,
  key,
  ordem: idx,
}));
let STATUS_INDICADORES_DATA = DEFAULT_STATUS_INDICADORES.map(item => ({ ...item }));
// Aqui eu mantenho um Map para buscar status pelo código sem precisar ficar percorrendo arrays.
let STATUS_BY_KEY = new Map(DEFAULT_STATUS_INDICADORES.map(entry => [entry.key, { ...entry }]));

const FATAL_ERROR_ID = "__fatal_error";
let FATAL_ERROR_VISIBLE = false;

// Aqui eu preparo vários mapas auxiliares para navegar na hierarquia (diretoria → gerente) sem sofrimento.
let MESU_BY_AGENCIA = new Map();
let MESU_AGENCIA_LOOKUP = new Map();
let MESU_FALLBACK_ROWS = [];
let DIRETORIA_INDEX = new Map();
let GERENCIA_INDEX = new Map();
let AGENCIA_INDEX = new Map();
let GGESTAO_INDEX = new Map();
let GERENTE_INDEX = new Map();
let GERENCIAS_BY_DIRETORIA = new Map();
let AGENCIAS_BY_GERENCIA = new Map();
let GGESTAO_BY_AGENCIA = new Map();
let GERENTES_BY_AGENCIA = new Map();
let DIRETORIA_LABEL_INDEX = new Map();
let GERENCIA_LABEL_INDEX = new Map();
let AGENCIA_LABEL_INDEX = new Map();
let GGESTAO_LABEL_INDEX = new Map();
let GERENTE_LABEL_INDEX = new Map();
let SEGMENTO_INDEX = new Map();
let SEGMENTO_LABEL_INDEX = new Map();

function normalizeHasChildrenFlag(value) {
  if (value === 1 || value === true) return 1;
  if (value === 0 || value === false) return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 0 ? 1 : 0;
  }
  return 0;
}

function ensureHierarchyHasChildren(node) {
  if (!node || typeof node !== "object") return 0;
  const children = Array.isArray(node.children) ? node.children.filter(Boolean) : [];
  let hasChildren = children.length > 0;
  children.forEach(child => {
    if (!child || typeof child !== "object") return;
    const childFlag = ensureHierarchyHasChildren(child);
    if (childFlag) hasChildren = true;
  });
  const normalized = hasChildren ? 1 : normalizeHasChildrenFlag(node.hasChildren);
  node.hasChildren = hasChildren || normalized ? 1 : 0;
  return node.hasChildren;
}

function nodeHasChildren(node) {
  if (!node || typeof node !== "object") return false;
  const flag = normalizeHasChildrenFlag(node.hasChildren);
  if (flag) return true;
  const children = Array.isArray(node.children) ? node.children.filter(Boolean) : [];
  return children.length > 0;
}

const SELECT_SEARCH_DATA = new WeakMap();
const SELECT_SEARCH_REGISTRY = new Set();
let SELECT_SEARCH_GLOBAL_LISTENERS = false;

// Aqui eu guardo os dados calculados de ranking para não refazer o trabalho sempre que a tela muda.
let RANKING_DIRECTORIAS = [];
let RANKING_GERENCIAS = [];
let RANKING_AGENCIAS = [];
let RANKING_GERENTES = [];
let GERENTES_GESTAO = [];
let SEGMENTOS_DATA = [];

// Aqui eu tenho mapas auxiliares para ligar produto, família e seção.
let PRODUTOS_BY_FAMILIA = new Map();
let FAMILIA_DATA = [];
let FAMILIA_BY_ID = new Map();
let PRODUTO_TO_FAMILIA = new Map();
let RESUMO_HIERARCHY = [];
let SUBINDICADORES_BY_INDICADOR = new Map();
let FORCED_EMPTY_SUBINDICADORES = new Set();
let SUB_INDICADOR_FLAT_CACHE = new Map();

// Aqui eu deixo caches das bases fact/dim para usar em várias telas.
let fDados = [];
let fCampanhas = [];
let fVariavel = [];
let FACT_REALIZADOS = [];
let FACT_METAS = [];
let FACT_VARIAVEL = [];
let FACT_CAMPANHAS = [];
let DIM_CALENDARIO = [];
let FACT_HISTORICO_RANKING_POBJ = [];
let FACT_DETALHES = [];
let DIM_PRODUTOS = [];
let DETAIL_BY_REGISTRO = new Map();
let DETAIL_CONTRACT_IDS = new Set();
let AVAILABLE_DATE_MAX = "";
let AVAILABLE_DATE_MIN = "";

// Aqui eu guardo qual recorte o usuário escolheu para conseguir lembrar quando mudar de aba.
let CURRENT_USER_CONTEXT = {
  diretoria: "",
  gerencia: "",
  agencia: "",
  gerenteGestao: "",
  gerente: ""
};

function getCurrentUserDisplayName(){
  const name = document.querySelector('.userbox__name')?.textContent?.trim();
  return name || 'Equipe Comercial';
}

// Aqui eu aponto onde normalmente ficam os CSVs e guardo a Promise de carregamento para evitar múltiplos downloads.
const BASE_CSV_PATH = "Base";
let baseDataPromise = null;

// Aqui eu limpo qualquer valor que vem das bases porque sei que sempre chega com espaços e formatos diferentes.
function limparTexto(value){
  if (value == null) return "";
  return String(value).trim();
}

function simplificarTexto(value){
  const texto = limparTexto(value);
  if (!texto) return "";
  const semAcento = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const comConectivo = semAcento.replace(/&/g, " e ");
  return comConectivo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseAliasList(source){
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map(limparTexto).filter(Boolean);
  }
  const texto = limparTexto(source);
  if (!texto) return [];
  return texto
    .split(/[;,|]/)
    .map(segment => limparTexto(segment))
    .filter(Boolean);
}

function formatTitleCase(text){
  const raw = limparTexto(text);
  if (!raw) return "";
  const lower = raw.toLocaleLowerCase("pt-BR");
  return lower.replace(/(^|[\s\-_/()\[\]{}])(\p{L})/gu, (_, sep, chr) => `${sep}${chr.toLocaleUpperCase("pt-BR")}`);
}

function resolverMesAbreviado(mes, mesNome){
  const mesLimpo = limparTexto(mes);
  const numero = Number.parseInt(mesLimpo, 10);
  if (Number.isFinite(numero) && numero >= 1 && numero <= 12) {
    return MONTH_ABBREVIATIONS_PT_BR[numero - 1] || "";
  }

  const candidatos = [mesNome, mesLimpo];
  for (const candidato of candidatos){
    const simplificado = simplificarTexto(candidato);
    if (!simplificado) continue;
    for (let idx = 0; idx < MONTH_ABBREVIATION_ALIASES.length; idx += 1){
      const aliases = MONTH_ABBREVIATION_ALIASES[idx];
      if (aliases.some(alias => alias === simplificado)) {
        return MONTH_ABBREVIATIONS_PT_BR[idx];
      }
    }
  }
  return "";
}

function construirEtiquetaMesAno(ano, mes, mesNome){
  const anoLimpo = limparTexto(ano);
  const mesAbreviado = resolverMesAbreviado(mes, mesNome);
  if (mesAbreviado && anoLimpo) return `${mesAbreviado}-${anoLimpo}`;
  if (mesAbreviado) return mesAbreviado;
  if (anoLimpo && limparTexto(mes)) return `${limparTexto(mes)}-${anoLimpo}`;
  if (anoLimpo && limparTexto(mesNome)) return `${limparTexto(mesNome)}-${anoLimpo}`;
  return "";
}

const DEFAULT_SELECTION_MARKERS = new Set(["", "todos", "todas", "todes", "all"]);

// Aqui eu vou manter um catálogo de aliases dos indicadores para conseguir resolver filtros por nome, código ou subproduto.
const CARD_ALIAS_INDEX = new Map(); // cardId -> Set(alias)
const CARD_SLUG_TO_ID = new Map();  // slug -> cardId
const CARD_ID_SET = new Set();      // conjunto rápido dos ids oficiais
const SUBPRODUTO_TO_INDICADOR = new Map(); // slug do subproduto -> cardId
const GLOBAL_INDICATOR_ALIAS_INDEX = new Map(); // slug -> [{ indicadorId, indicadorNome, familiaId, familiaNome, key }]
const GLOBAL_INDICATOR_META = new Map(); // indicadorId -> meta
const GLOBAL_SUB_ALIAS_INDEX = new Map(); // slug -> [{ indicadorId, subId, subNome, familiaId, familiaNome, indicadorKey }]
const GLOBAL_SUB_BY_INDICATOR = new Map(); // indicadorId -> Map(subId -> meta)

function registrarAliasIndicador(cardId, alias){
  const seguroId = limparTexto(cardId);
  if (!seguroId) return;
  CARD_ID_SET.add(seguroId);
  const slug = simplificarTexto(alias);
  if (!slug) return;
  let aliases = CARD_ALIAS_INDEX.get(seguroId);
  if (!aliases){
    aliases = new Set();
    CARD_ALIAS_INDEX.set(seguroId, aliases);
  }
  if (!aliases.has(slug)) aliases.add(slug);
  CARD_SLUG_TO_ID.set(slug, seguroId);
}

function resetIndicatorAliasIndex(){
  CARD_ALIAS_INDEX.clear();
  CARD_SLUG_TO_ID.clear();
  CARD_ID_SET.clear();
}

function resolverIndicadorPorAlias(valor){
  const texto = limparTexto(valor);
  if (!texto) return "";
  if (CARD_ID_SET.has(texto)) return texto;
  const slug = simplificarTexto(texto);
  if (CARD_SLUG_TO_ID.has(slug)) return CARD_SLUG_TO_ID.get(slug);
  return "";
}

function selecaoPadrao(value){
  return DEFAULT_SELECTION_MARKERS.has(simplificarTexto(value));
}

function matchesSelection(filterValue, ...candidates){
  const esperado = limparTexto(filterValue);
  if (!esperado) return false;
  const esperadoSimple = simplificarTexto(esperado);
  const lista = [];
  candidates.forEach(item => {
    if (Array.isArray(item)) lista.push(...item);
    else lista.push(item);
  });
  return lista.some(candidate => {
    const valor = limparTexto(candidate);
    if (!valor) return false;
    if (valor === esperado) return true;
    return simplificarTexto(valor) === esperadoSimple;
  });
}

function resolveSelectLabel(selector, value){
  if (!selector || value == null || selecaoPadrao(value)) return "";
  const select = document.querySelector(selector);
  if (!select) return "";
  const text = limparTexto(value);
  if (!text) return "";
  const simple = simplificarTexto(text);
  const options = Array.from(select.options || []);
  for (const option of options) {
    const optionValue = option?.value ?? "";
    const optionText = option?.textContent?.trim() || "";
    if (matchesSelection(text, optionValue, optionText)) return optionText;
    if (simple && simplificarTexto(optionText) === simple) return optionText;
  }
  return "";
}

const FILTER_LEVEL_CONFIG = [
  { key: "diretoria", selector: "#f-diretoria", levelKey: "diretoria" },
  { key: "gerencia", selector: "#f-gerencia", levelKey: "gerencia" },
  { key: "agencia", selector: "#f-agencia", levelKey: "agencia" },
  { key: "ggestao", selector: "#f-ggestao", levelKey: "gGestao" },
  { key: "gerente", selector: "#f-gerente", levelKey: "gerente" },
];

function buildLineageFromFilters(filters = {}){
  const lineage = [];
  FILTER_LEVEL_CONFIG.forEach(({ key, selector, levelKey }) => {
    const value = filters?.[key];
    if (!value || selecaoPadrao(value)) return;
    const label = resolveSelectLabel(selector, value) || limparTexto(value);
    lineage.push({ levelKey, value, label });
  });
  return lineage;
}

function buildHierarchyLabel(id, nome){
  const codigo = limparTexto(id);
  const label = limparTexto(nome);
  if (codigo && label){
    if (label.startsWith(`${codigo} `) || label.startsWith(`${codigo}-`)) return label;
    if (label.includes(`${codigo} -`) || label.includes(`${codigo}-`)) return label;
    if (/^\d/.test(codigo)) return `${codigo} - ${label}`;
  }
  if (label) return label;
  if (codigo) return codigo;
  return "";
}

function matchesSegmentFilter(filterValue, ...candidates){
  const esperado = limparTexto(filterValue);
  if (!esperado) return false;
  if (matchesSelection(filterValue, ...candidates)) return true;
  const lista = [];
  candidates.forEach(item => {
    if (Array.isArray(item)) lista.push(...item);
    else lista.push(item);
  });
  return lista.some(candidate => limparTexto(candidate) === esperado);
}

function resetSubIndicatorOptionCache(){
  SUB_INDICADOR_FLAT_CACHE = new Map();
}

function getFlatSubIndicatorOptions(indicadorId){
  const key = limparTexto(indicadorId);
  if (!key) return [];
  if (SUB_INDICADOR_FLAT_CACHE.has(key)) return SUB_INDICADOR_FLAT_CACHE.get(key);
  const defs = SUBINDICADORES_BY_INDICADOR.get(key) || [];
  const list = [];
  const stack = Array.isArray(defs) ? defs.map(entry => ({ entry, parents: [] })) : [];
  const seen = new Set();
  while (stack.length){
    const { entry, parents } = stack.shift();
    if (!entry) continue;
    const rawId = limparTexto(entry.id);
    const rawNome = limparTexto(entry.nome) || rawId || "";
    const slug = simplificarTexto(rawId || rawNome);
    const value = rawId || (slug ? `${key}__${slug.replace(/\s+/g, "_")}` : "");
    if (!value) continue;
    const path = parents.filter(Boolean);
    const label = path.length ? `${path.concat(rawNome || value).join(" › ")}` : (rawNome || value);
    const aliasSet = new Set([rawId, rawNome, slug, value]);
    if (Array.isArray(entry.aliases)) entry.aliases.forEach(alias => aliasSet.add(limparTexto(alias)));
    path.forEach(part => aliasSet.add(part));
    const valueKey = value.toLowerCase();
    if (!seen.has(valueKey)) {
      list.push({ value, label, aliases: Array.from(aliasSet).filter(Boolean) });
      seen.add(valueKey);
    }
    if (Array.isArray(entry.children) && entry.children.length) {
      entry.children.forEach(child => stack.push({ entry: child, parents: path.concat(rawNome || value) }));
    }
  }
  list.sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "pt-BR", { sensitivity: "base" }));
  SUB_INDICADOR_FLAT_CACHE.set(key, list);
  return list;
}

function resolveSubIndicatorLabel(indicadorId, subId){
  const indicatorKey = limparTexto(indicadorId);
  const subKey = limparTexto(subId);
  if (!indicatorKey || !subKey || selecaoPadrao(subKey)) return "";
  const options = getFlatSubIndicatorOptions(indicatorKey);
  const normalized = simplificarTexto(subKey);
  for (const opt of options){
    if (opt.value === subKey || limparTexto(opt.label) === subKey) return opt.label;
    if (Array.isArray(opt.aliases)) {
      if (opt.aliases.some(alias => limparTexto(alias) === subKey)) return opt.label;
      if (normalized && opt.aliases.some(alias => simplificarTexto(alias) === normalized)) return opt.label;
    }
    if (normalized && simplificarTexto(opt.value) === normalized) return opt.label;
  }
  return "";
}

function formatResumoSectionLabel(raw = "") {
  const slug = simplificarTexto(raw);
  switch (slug) {
    case "negocios captacao":
      return "NEGÓCIOS CAPTAÇÃO";
    case "negocios credito":
      return "NEGÓCIOS CRÉDITO";
    case "negocios ligadas":
      return "NEGÓCIOS LIGADAS";
    case "produtividade da equipe":
      return "PRODUTIVIDADE DA EQUIPE";
    case "clientes":
      return "CLIENTES";
    case "financeiro":
      return "FINANCEIRO";
    default:
      return raw ? raw.toUpperCase() : "";
  }
}

function buildResumoHierarchyDefault(rows = []) {
  const sectionMap = new Map();
  const sectionOrder = [];

  rows.forEach(row => {
    if (!row) return;
    const secRaw = row.secaoId || row.secao || row.secaoNome || "";
    const secSlug = simplificarTexto(secRaw) || simplificarTexto(row.secaoNome) || "secao";
    if (!sectionMap.has(secSlug)) {
      sectionMap.set(secSlug, {
        id: secSlug,
        label: formatResumoSectionLabel(row.secaoNome || row.secao || secRaw || secSlug),
        familias: [],
        familiaIndex: new Map()
      });
      sectionOrder.push(secSlug);
    }
    const section = sectionMap.get(secSlug);
    const famRaw = row.familiaId || row.familiaNome || row.familia || "";
    if (!famRaw) return;
    const famSlugBase = simplificarTexto(famRaw) || limparTexto(famRaw) || `familia-${section.familias.length + 1}`;
    const famSlug = `${secSlug}__${famSlugBase}`;
    if (!section.familiaIndex.has(famSlug)) {
      section.familiaIndex.set(famSlug, {
        id: famSlug,
        nome: row.familiaNome || row.familia || famRaw || famSlugBase,
        indicadores: [],
        indicadorSet: new Set()
      });
      section.familias.push(section.familiaIndex.get(famSlug));
    }
    const familia = section.familiaIndex.get(famSlug);
    const indicadorRaw = row.produtoId || row.indicadorId || row.id_indicador || row.produto || row.ds_indicador || "";
    const indicadorNome = row.produtoNome || row.ds_indicador || indicadorRaw;
    const indicadorSlug = simplificarTexto(indicadorRaw) || simplificarTexto(indicadorNome);
    const uniqueKey = indicadorSlug || simplificarTexto(`${indicadorRaw}`) || `ind-${familia.indicadores.length + 1}`;
    if (familia.indicadorSet.has(uniqueKey)) return;
    familia.indicadorSet.add(uniqueKey);

    const aliasSet = new Set();
    [indicadorRaw, indicadorNome, row.id_indicador, row.ds_indicador].forEach(val => {
      const texto = limparTexto(val);
      if (texto) aliasSet.add(texto);
    });

    const indicatorCandidates = [
      row.produtoId,
      row.id_indicador,
      indicadorRaw,
      indicadorNome,
      row.produto,
      row.ds_indicador
    ];
    let indicatorCardId = "";
    for (const candidate of indicatorCandidates) {
      const resolved = resolverIndicadorPorAlias(candidate);
      if (resolved) { indicatorCardId = resolved; break; }
    }
    if (!indicatorCardId) indicatorCardId = limparTexto(row.produtoId || indicadorRaw || uniqueKey) || uniqueKey;
    const subDefs = SUBINDICADORES_BY_INDICADOR.get(indicatorCardId) || [];
    const subindicadores = subDefs.map(sub => ({
      id: sub.id,
      nome: sub.nome,
      metric: sub.metric,
      peso: sub.peso,
      children: Array.isArray(sub.children)
        ? sub.children.map(child => ({
            id: child.id,
            nome: child.nome,
            metric: child.metric,
            peso: child.peso,
            children: Array.isArray(child.children)
              ? child.children.map(grand => ({
                  id: grand.id,
                  nome: grand.nome,
                  metric: grand.metric,
                  peso: grand.peso,
                  children: []
                }))
              : []
          }))
        : []
    }));

    familia.indicadores.push({
      id: indicadorRaw || uniqueKey,
      slug: uniqueKey,
      nome: indicadorNome || indicadorRaw || uniqueKey,
      cardId: indicatorCardId,
      aliases: Array.from(aliasSet),
      subindicadores
    });
  });

  DIM_SEGMENTOS_LOOKUP.forEach(dim => {
    if (!dim || typeof dim !== "object") return;
    const id = limparTexto(dim.id);
    if (!id) return;
    const nome = limparTexto(dim.nome) || id;
    const label = buildHierarchyLabel(id, nome);
    if (!segMap.has(id)) {
      segMap.set(id, { id, nome, label });
    } else {
      const entry = segMap.get(id);
      if (entry) {
        if (!entry.nome) entry.nome = nome;
        if (!entry.label) entry.label = label;
      }
    }
  });

  DIM_DIRETORIAS_LOOKUP.forEach(dim => {
    if (!dim || typeof dim !== "object") return;
    const id = limparTexto(dim.id);
    if (!id) return;
    const nome = limparTexto(dim.nome) || id;
    const label = buildHierarchyLabel(id, nome);
    const segmento = limparTexto(dim.id_segmento || dim.segmento_id || dim.segmento);
    const entry = dirMap.get(id) || { id, nome, label, segmento };
    if (!entry.nome) entry.nome = nome;
    if (!entry.label) entry.label = label;
    if (!entry.segmento && segmento) entry.segmento = segmento;
    dirMap.set(id, entry);
  });

  DIM_REGIONAIS_LOOKUP.forEach(dim => {
    if (!dim || typeof dim !== "object") return;
    const id = limparTexto(dim.id);
    if (!id) return;
    const nome = limparTexto(dim.nome) || id;
    const label = buildHierarchyLabel(id, nome);
    const diretoria = limparTexto(dim.id_diretoria || dim.diretoria_id || dim.diretoria);
    const segmento = limparTexto(dim.id_segmento || dim.segmento_id || dim.segmento);
    const entry = regMap.get(id) || { id, nome, label, diretoria, segmentoId: segmento, aliases: [] };
    if (!entry.nome) entry.nome = nome;
    if (!entry.label) entry.label = label;
    if (!entry.diretoria && diretoria) entry.diretoria = diretoria;
    if (!entry.segmentoId && segmento) entry.segmentoId = segmento;
    regMap.set(id, entry);
    if (diretoria) {
      if (!GERENCIAS_BY_DIRETORIA.has(diretoria)) GERENCIAS_BY_DIRETORIA.set(diretoria, new Set());
      GERENCIAS_BY_DIRETORIA.get(diretoria).add(id);
    }
  });

  DIM_AGENCIAS_LOOKUP.forEach(dim => {
    if (!dim || typeof dim !== "object") return;
    const id = limparTexto(dim.id);
    if (!id) return;
    const nome = limparTexto(dim.nome) || id;
    const label = buildHierarchyLabel(id, nome);
    const regional = limparTexto(dim.id_regional || dim.regional_id || dim.gerencia_regional_id || dim.gerencia);
    const diretoria = limparTexto(dim.id_diretoria || dim.diretoria_id || dim.diretoria);
    const segmento = limparTexto(dim.id_segmento || dim.segmento_id || dim.segmento);
    const entry = agMap.get(id) || {
      id,
      nome,
      label,
      gerencia: regional,
      diretoria,
      segmento,
      codigo: limparTexto(dim.codigo || dim.agencia_codigo || id),
      aliases: [],
    };
    if (!entry.nome) entry.nome = nome;
    if (!entry.label) entry.label = label;
    if (!entry.gerencia && regional) entry.gerencia = regional;
    if (!entry.diretoria && diretoria) entry.diretoria = diretoria;
    if (!entry.segmento && segmento) entry.segmento = segmento;
    if (!entry.codigo) entry.codigo = limparTexto(dim.codigo || dim.agencia_codigo || id);
    agMap.set(id, entry);
    if (regional) {
      if (!AGENCIAS_BY_GERENCIA.has(regional)) AGENCIAS_BY_GERENCIA.set(regional, new Set());
      AGENCIAS_BY_GERENCIA.get(regional).add(id);
    }
  });

  DIM_GGESTAO_LOOKUP.forEach(dim => {
    if (!dim || typeof dim !== "object") return;
    const id = limparTexto(dim.id || dim.funcional);
    if (!id) return;
    const nome = limparTexto(dim.nome) || extractNameFromLabel(dim.label) || id;
    const label = buildHierarchyLabel(id, nome);
    const agencia = limparTexto(dim.id_agencia || dim.agencia);
    const regional = limparTexto(dim.id_regional || dim.regional || dim.gerencia);
    const diretoria = limparTexto(dim.id_diretoria || dim.diretoria);
    const segmento = limparTexto(dim.id_segmento || dim.segmento);
    const entry = ggMap.get(id) || {
      id,
      nome,
      label,
      agencia: agencia || '',
      gerencia: regional || '',
      diretoria: diretoria || '',
      segmento: segmento || '',
    };
    if (!entry.nome) entry.nome = nome;
    entry.label = label;
    entry.gerenteGestaoId = entry.gerenteGestaoId || id;
    entry.gerenteGestaoNome = entry.gerenteGestaoNome || nome;
    entry.gerenteGestaoLabel = entry.gerenteGestaoLabel || label;
    if (agencia && !entry.agencia) entry.agencia = agencia;
    if (regional && !entry.gerencia) entry.gerencia = regional;
    if (diretoria && !entry.diretoria) entry.diretoria = diretoria;
    if (segmento && !entry.segmento) entry.segmento = segmento;
    ggMap.set(id, entry);

    if (agencia) {
      if (!GGESTAO_BY_AGENCIA.has(agencia)) GGESTAO_BY_AGENCIA.set(agencia, new Set());
      GGESTAO_BY_AGENCIA.get(agencia).add(id);
    }
  });

  DIM_GERENTES_LOOKUP.forEach(dim => {
    if (!dim || typeof dim !== "object") return;
    const id = limparTexto(dim.id || dim.funcional);
    if (!id) return;
    const nome = limparTexto(dim.nome) || extractNameFromLabel(dim.label) || id;
    const label = buildHierarchyLabel(id, nome);
    const agencia = limparTexto(dim.id_agencia || dim.agencia);
    const regional = limparTexto(dim.id_regional || dim.regional || dim.gerencia);
    const diretoria = limparTexto(dim.id_diretoria || dim.diretoria);
    const segmento = limparTexto(dim.id_segmento || dim.segmento);
    const entry = gerMap.get(id) || {
      id,
      nome,
      label,
      agencia: agencia || '',
      gerencia: regional || '',
      diretoria: diretoria || '',
      segmento: segmento || '',
    };
    if (!entry.nome) entry.nome = nome;
    entry.label = label;
    entry.gerenteId = entry.gerenteId || id;
    entry.gerenteNome = entry.gerenteNome || nome;
    entry.gerenteLabel = entry.gerenteLabel || label;
    if (agencia && !entry.agencia) entry.agencia = agencia;
    if (regional && !entry.gerencia) entry.gerencia = regional;
    if (diretoria && !entry.diretoria) entry.diretoria = diretoria;
    if (segmento && !entry.segmento) entry.segmento = segmento;
    gerMap.set(id, entry);

    if (agencia) {
      if (!GERENTES_BY_AGENCIA.has(agencia)) GERENTES_BY_AGENCIA.set(agencia, new Set());
      GERENTES_BY_AGENCIA.get(agencia).add(id);
    }
  });

  return sectionOrder.map(secId => {
    const section = sectionMap.get(secId);
    if (!section) return null;
    const familias = section.familias
      .map(fam => ({
        id: fam.id,
        nome: fam.nome,
        indicadores: fam.indicadores.slice()
      }))
      .filter(f => f.indicadores.length);
    if (!familias.length) return null;
    return { id: section.id, label: section.label, familias };
  }).filter(Boolean);
}

function buildResumoHierarchyFromProducts(rows = []) {
  const fallback = buildResumoHierarchyDefault(rows);
  const cardSections = Array.isArray(CARD_SECTIONS_DEF) ? CARD_SECTIONS_DEF : [];
  if (!cardSections.length) return fallback;

  const dimensionRows = Array.isArray(DIM_PRODUTOS) ? DIM_PRODUTOS : [];
  const familiaLabelMap = new Map();
  const indicatorAliasMap = new Map();

  dimensionRows.forEach(row => {
    if (!row) return;
    const familiaId = limparTexto(row.familiaId);
    const familiaNome = limparTexto(row.familiaNome);
    if (familiaId && familiaNome && !familiaLabelMap.has(familiaId)) {
      familiaLabelMap.set(familiaId, familiaNome);
    }

    const indicadorId = limparTexto(row.indicadorId);
    if (!indicadorId) return;
    let aliasSet = indicatorAliasMap.get(indicadorId);
    if (!aliasSet) {
      aliasSet = new Set();
      indicatorAliasMap.set(indicadorId, aliasSet);
    }
    const indicadorNome = limparTexto(row.indicadorNome);
    const indicadorCodigo = limparTexto(row.indicadorCodigo);
    if (indicadorNome) aliasSet.add(indicadorNome);
    if (indicadorCodigo) aliasSet.add(indicadorCodigo);
    aliasSet.add(indicadorId);
  });

  const cloneSubIndicatorTree = (list = [], parentMetric = "valor") => {
    if (!Array.isArray(list) || !list.length) return [];
    return list.map(entry => ({
      id: entry.id,
      nome: entry.nome,
      metric: entry.metric || parentMetric,
      peso: Number(entry.peso) || 1,
      children: cloneSubIndicatorTree(entry.children, entry.metric || parentMetric),
    }));
  };

  const resolveFamiliaNome = (sectionId, fallbackLabel) => {
    const familiaNome = familiaLabelMap.get(sectionId);
    if (familiaNome) return familiaNome;
    const catalogLabel = getSectionLabel(sectionId);
    if (catalogLabel) return catalogLabel;
    return fallbackLabel || sectionId;
  };

  const hierarchy = [];

  cardSections.forEach(section => {
    if (!section || !section.id) return;
    const sectionId = section.id;
    const sectionLabel = section.label || getSectionLabel(sectionId) || sectionId;
    const familiaId = sectionId;
    const familiaNome = resolveFamiliaNome(sectionId, sectionLabel);

    const indicadores = (Array.isArray(section.items) ? section.items : [])
      .filter(item => item && item.id && !item.hiddenInCards)
      .map(item => {
        const cardId = limparTexto(item.id);
        if (!cardId) return null;
        const indicadorMeta = INDICATOR_CARD_INDEX.get(cardId) || {};
        const nome = item.nome || indicadorMeta.nome || cardId;
        const metric = item.metric || indicadorMeta.metric || "valor";

        const aliases = new Set();
        const addAlias = (value) => {
          const text = limparTexto(value);
          if (text) aliases.add(text);
        };

        addAlias(cardId);
        addAlias(nome);
        if (Array.isArray(item.aliases)) item.aliases.forEach(addAlias);
        if (Array.isArray(indicadorMeta.aliases)) indicadorMeta.aliases.forEach(addAlias);
        const dimAliases = indicatorAliasMap.get(cardId);
        if (dimAliases) dimAliases.forEach(addAlias);

        const slug = simplificarTexto(cardId) || simplificarTexto(nome) || cardId;
        const forcedEmpty = FORCED_EMPTY_SUBINDICADORES.has(cardId)
          || FORCED_EMPTY_SUBINDICADORES.has(slug);
        const subDefs = forcedEmpty ? [] : (SUBINDICADORES_BY_INDICADOR.get(cardId) || []);
        const subindicadores = cloneSubIndicatorTree(subDefs, metric);

        const pesoBase = Number(item.peso);
        const peso = Number.isFinite(pesoBase) ? pesoBase : Number(indicadorMeta.peso) || 0;

        return {
          id: cardId,
          slug,
          nome,
          cardId,
          metric,
          peso,
          aliases: Array.from(aliases),
          subindicadores,
        };
      })
      .filter(Boolean);

    if (!indicadores.length) return;

    hierarchy.push({
      id: sectionId,
      label: sectionLabel,
      familias: [
        {
          id: familiaId,
          nome: familiaNome,
          indicadores,
        }
      ]
    });
  });

  return hierarchy.length ? hierarchy : fallback;
}

function getResumoHierarchy() {
  if (Array.isArray(RESUMO_HIERARCHY) && RESUMO_HIERARCHY.length) {
    return RESUMO_HIERARCHY;
  }
  return [];
}

function optionMatchesValue(option, desired){
  const alvo = limparTexto(desired);
  if (!alvo) return false;
  const candidatos = [option.value];
  if (Array.isArray(option.aliases)) candidatos.push(...option.aliases);
  return candidatos.some(candidate => {
    const valor = limparTexto(candidate);
    if (!valor) return false;
    if (valor === alvo) return true;
    return simplificarTexto(valor) === simplificarTexto(alvo);
  });
}

function registerLabelIndexEntry(map, entry, ...values){
  values.forEach(value => {
    const normal = simplificarTexto(value);
    if (!normal) return;
    if (!map.has(normal)) map.set(normal, entry);
  });
}

function findEntryInIndexes(idMap, labelMap, value){
  const direto = limparTexto(value);
  if (direto && idMap?.has(direto)) return idMap.get(direto);
  const simples = simplificarTexto(value);
  if (simples && labelMap?.has(simples)) return labelMap.get(simples);
  return null;
}

function findSegmentoMeta(value){
  return findEntryInIndexes(SEGMENTO_INDEX, SEGMENTO_LABEL_INDEX, value);
}

function findDiretoriaMeta(value){
  return findEntryInIndexes(DIRETORIA_INDEX, DIRETORIA_LABEL_INDEX, value);
}

function findGerenciaMeta(value){
  return findEntryInIndexes(GERENCIA_INDEX, GERENCIA_LABEL_INDEX, value);
}

function findGerenteGestaoMeta(value){
  return findEntryInIndexes(GGESTAO_INDEX, GGESTAO_LABEL_INDEX, value);
}

function findGerenteMeta(value){
  return findEntryInIndexes(GERENTE_INDEX, GERENTE_LABEL_INDEX, value);
}

function registerMesuAgencyLookup(meta, ...values){
  if (!meta) return;
  values.forEach(val => {
    if (!val) return;
    const simple = simplificarTexto(val);
    if (!simple) return;
    if (!MESU_AGENCIA_LOOKUP.has(simple)) {
      MESU_AGENCIA_LOOKUP.set(simple, meta);
    }
  });
}

function findAgenciaMeta(value){
  const direto = findEntryInIndexes(AGENCIA_INDEX, AGENCIA_LABEL_INDEX, value);
  if (direto) return direto;
  const chave = limparTexto(value);
  if (chave && MESU_BY_AGENCIA.has(chave)) return MESU_BY_AGENCIA.get(chave);
  const simples = simplificarTexto(value);
  if (simples && MESU_AGENCIA_LOOKUP.has(simples)) {
    return MESU_AGENCIA_LOOKUP.get(simples);
  }
  return null;
}

function resolveAgencyHierarchyMeta(row){
  if (!row || typeof row !== "object") return null;
  const seen = new Set();
  const candidates = [
    row.agenciaId,
    row.agencia,
    row.agenciaCodigo,
    row.agencia_nome,
    row.agenciaNome,
  ];
  for (const value of candidates){
    const clean = limparTexto(value);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    if (MESU_BY_AGENCIA.has(clean)) return MESU_BY_AGENCIA.get(clean);
    const simple = simplificarTexto(clean);
    if (simple && MESU_AGENCIA_LOOKUP.has(simple)) return MESU_AGENCIA_LOOKUP.get(simple);
  }
  return null;
}

function applyHierarchyFallbackToRow(row){
  if (!row || typeof row !== "object") return row;
  const meta = resolveAgencyHierarchyMeta(row);
  if (!meta) return row;

  const ggMetaId = limparTexto(meta.gerenteGestaoId);
  const ggMetaNome = limparTexto(meta.gerenteGestaoNome);
  const gerMetaId = limparTexto(meta.gerenteId);
  const gerMetaNome = limparTexto(meta.gerenteNome);

  const ggRowId = limparTexto(row.gerenteGestao || row.gerenteGestaoId);
  const ggRowNome = limparTexto(row.gerenteGestaoNome);
  const gerRowId = limparTexto(row.gerente || row.gerenteId);
  const gerRowNome = limparTexto(row.gerenteNome);

  const idsCoincidem = ggRowId && gerRowId && simplificarTexto(ggRowId) === simplificarTexto(gerRowId);
  const nomesCoincidem = ggRowNome && gerRowNome && simplificarTexto(ggRowNome) === simplificarTexto(gerRowNome);

  if (ggMetaId && (!ggRowId || idsCoincidem)) {
    row.gerenteGestao = meta.gerenteGestaoId;
    row.gerenteGestaoId = meta.gerenteGestaoId;
  }
  if (ggMetaNome && (!ggRowNome || nomesCoincidem)) {
    row.gerenteGestaoNome = meta.gerenteGestaoNome;
  }
  if (!row.gerenteGestaoLabel && meta.gerenteGestaoLabel) {
    row.gerenteGestaoLabel = meta.gerenteGestaoLabel;
  }
  if (!row.gerenteGestaoLabel && row.gerenteGestaoId) {
    row.gerenteGestaoLabel = labelGerenteGestao(row.gerenteGestaoId, row.gerenteGestaoNome);
  }

  if (gerMetaId && (!gerRowId || idsCoincidem)) {
    row.gerente = meta.gerenteId;
    row.gerenteId = meta.gerenteId;
  }
  if (gerMetaNome && (!gerRowNome || nomesCoincidem)) {
    row.gerenteNome = meta.gerenteNome;
  }
  if (!row.gerenteLabel && meta.gerenteLabel) {
    row.gerenteLabel = meta.gerenteLabel;
  }
  if (!row.gerenteLabel && row.gerenteId) {
    row.gerenteLabel = labelGerente(row.gerenteId, row.gerenteNome);
  }

  if (!row.segmentoId && meta.segmentoId) row.segmentoId = meta.segmentoId;
  if (!row.segmento && meta.segmentoNome) row.segmento = meta.segmentoNome;
  if (!row.segmentoNome && meta.segmentoNome) row.segmentoNome = meta.segmentoNome;
  if (!row.segmentoLabel && meta.segmentoLabel) row.segmentoLabel = meta.segmentoLabel;
  if (!row.diretoria && meta.diretoriaId) row.diretoria = meta.diretoriaId;
  if (!row.diretoriaId && meta.diretoriaId) row.diretoriaId = meta.diretoriaId;
  if (!row.diretoriaNome && meta.diretoriaNome) row.diretoriaNome = meta.diretoriaNome;
  if (!row.diretoriaLabel && meta.diretoriaLabel) row.diretoriaLabel = meta.diretoriaLabel;
  if (!row.gerenciaRegional && meta.regionalId) row.gerenciaRegional = meta.regionalId;
  if (!row.gerenciaId && meta.regionalId) row.gerenciaId = meta.regionalId;
  if (!row.gerenciaNome && meta.regionalNome) row.gerenciaNome = meta.regionalNome;
  if (!row.regionalLabel && meta.regionalLabel) row.regionalLabel = meta.regionalLabel;
  if (!row.regional && meta.regionalNome) row.regional = meta.regionalNome;
  if (!row.agencia && meta.agenciaId) row.agencia = meta.agenciaId;
  if (!row.agenciaId && meta.agenciaId) row.agenciaId = meta.agenciaId;
  if (!row.agenciaCodigo && meta.agenciaCodigo) row.agenciaCodigo = meta.agenciaCodigo;
  if (!row.agenciaNome && meta.agenciaNome) row.agenciaNome = meta.agenciaNome;
  if (!row.agenciaLabel && meta.agenciaLabel) row.agenciaLabel = meta.agenciaLabel;

  return row;
}

function applyHierarchyFallback(rows){
  if (!Array.isArray(rows)) return;
  rows.forEach(applyHierarchyFallbackToRow);
}

// Aqui eu tento ler uma célula usando várias chaves possíveis porque cada base vem com um nome diferente.
const NORMALIZED_KEY_CACHE = new WeakMap();

function normalizeKeyForLookup(key){
  if (key == null) return "";
  return String(key)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getNormalizedKeyEntries(raw){
  if (!raw || typeof raw !== "object") return [];
  if (NORMALIZED_KEY_CACHE.has(raw)) return NORMALIZED_KEY_CACHE.get(raw);
  const entries = Object.keys(raw).map(original => ({
    key: original,
    normalized: normalizeKeyForLookup(original),
  }));
  NORMALIZED_KEY_CACHE.set(raw, entries);
  return entries;
}

function lerCelula(raw, keys){
  if (!raw) return "";
  const normalizedEntries = getNormalizedKeyEntries(raw);
  for (const key of keys){
    if (Object.prototype.hasOwnProperty.call(raw, key)){
      const val = limparTexto(raw[key]);
      if (val !== "") return val;
    }
    const normalizedKey = normalizeKeyForLookup(key);
    if (!normalizedKey) continue;
    let match = null;
    for (const entry of normalizedEntries){
      if (entry.normalized === normalizedKey){
        match = entry.key;
        break;
      }
    }
    if (!match){
      const partial = normalizedEntries.find(entry =>
        entry.normalized.startsWith(normalizedKey) || normalizedKey.startsWith(entry.normalized)
      );
      if (partial) match = partial.key;
    }
    if (!match){
      const fallback = normalizedEntries.find(entry => entry.normalized.includes(normalizedKey));
      if (fallback) match = fallback.key;
    }
    if (match && Object.prototype.hasOwnProperty.call(raw, match)){
      const val = limparTexto(raw[match]);
      if (val !== "") return val;
    }
  }
  return "";
}

// Aqui eu garanto que qualquer data vira formato ISO (aaaa-mm-dd) porque isso evita dor de cabeça com ordenação.
function converterDataISO(value) {
  const text = limparTexto(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/");
    return `${year}-${month}-${day}`;
  }
  return text;
}

// Aqui eu transformo valores variados (1, sim, true...) em booleanos para padronizar as checagens depois.
function converterBooleano(value, fallback = false) {
  const text = limparTexto(value).toLowerCase();
  if (!text) return fallback;
  if (/^(?:1|true|sim|yes|ativo|active|on)$/i.test(text)) return true;
  if (/^(?:0|false|nao|não|inativo|inactive|off)$/i.test(text)) return false;
  return fallback;
}

// Aqui eu pego o primeiro valor que realmente veio preenchido porque as bases mandam duplicado em várias colunas.
function pegarPrimeiroPreenchido(...values) {
  for (const val of values) {
    if (val !== undefined && val !== null && val !== "") {
      return val;
    }
  }
  return "";
}
// Aqui eu garanto que todos os objetos usem o novo padrão id_indicador/ds_indicador e mantenham compatibilidade com produtoId.
function aplicarIndicadorAliases(target = {}, idBruto = "", nomeBruto = "") {
  const idOriginal = limparTexto(idBruto || "");
  const idTexto = INDICADOR_CODE_TO_SLUG.get(idOriginal) || idOriginal;
  const nomeTexto = limparTexto(nomeBruto || "");
  const resolvedCard = resolverIndicadorPorAlias(idTexto) || resolverIndicadorPorAlias(nomeTexto);
  if (resolvedCard) {
    registrarAliasIndicador(resolvedCard, idTexto);
    registrarAliasIndicador(resolvedCard, nomeTexto);
    if (idOriginal && idOriginal !== idTexto) {
      registrarAliasIndicador(resolvedCard, idOriginal);
    }
  }
  const indicadorCodigo = idTexto || resolvedCard || nomeTexto;
  const indicadorNome = nomeTexto || resolvedCard || indicadorCodigo;
  if (resolvedCard && !idTexto) {
    registrarAliasIndicador(resolvedCard, indicadorCodigo);
  }
  target.id_indicador = indicadorCodigo;
  target.ds_indicador = indicadorNome;
  target.indicadorId = indicadorCodigo;
  target.indicadorNome = indicadorNome;
  target.produtoId = resolvedCard || indicadorCodigo;
  target.produtoNome = indicadorNome;
  if (resolvedCard && idOriginal && idOriginal !== resolvedCard) {
    target.indicadorCodigo = idOriginal;
  }
  return target;
}

// Aqui eu converto o texto do status para um formato previsível (sem acento e em minúsculas) para montar os filtros.
function normalizarChaveStatus(value) {
  const text = limparTexto(value);
  if (!text) return "";
  const ascii = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lower = ascii.toLowerCase().replace(/\s+/g, " ").trim();
  if (!lower) return "";
  if (/^(?:1|todos?)$/.test(lower) || lower.includes("todos")) return "todos";
  if (/^(?:2)$/.test(lower)) return "atingidos";
  if (/^(?:3)$/.test(lower)) return "nao";
  if (/(?:^|\b)(?:nao|na|no)\s+atingid/.test(lower)) return "nao";
  if (lower.includes("atingid")) return "atingidos";
  if (lower.includes("nao")) return "nao";
  const slug = lower.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (slug === "no_atingidos") return "nao";
  return slug;
}

// Aqui eu traduzo a chave do status para o rótulo certo exibido na tela, sempre tentando usar as descrições oficiais.
function obterRotuloStatus(key, fallback = "") {
  const normalized = normalizarChaveStatus(key);
  if (normalized && STATUS_BY_KEY.has(normalized)) {
    const entry = STATUS_BY_KEY.get(normalized);
    if (entry?.nome) return entry.nome;
  }
  if (normalized && STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  const fallbackText = limparTexto(fallback);
  if (fallbackText) return fallbackText;
  return normalized || key;
}

// Aqui eu faço uma gambiarra controlada para descobrir qual separador o CSV está usando (vírgula, ponto e vírgula, tab...).
function descobrirDelimitadorCsv(headerLine, sampleLines = []){
  const lines = [headerLine].concat(Array.isArray(sampleLines) ? sampleLines.slice(0, 5) : []).filter(Boolean);
  if (!lines.length) return ",";
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestScore = -1;
  candidates.forEach(delim => {
    let score = 0;
    lines.forEach(line => {
      const pieces = line.split(delim);
      if (pieces.length > 1){
        score += pieces.length - 1;
      }
    });
    if (score > bestScore){
      best = delim;
      bestScore = score;
    }
  });
  if (bestScore <= 0){
    if (headerLine?.includes(";")) return ";";
    if (headerLine?.includes("\t")) return "\t";
    if (headerLine?.includes("|")) return "|";
  }
  return best;
}

// Aqui eu separo uma linha de CSV respeitando aspas duplas porque algumas colunas trazem vírgula dentro do texto.
function dividirLinhaCsv(line, delimiter){
  const cols = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++){
    const ch = line[i];
    if (ch === '"'){
      if (insideQuotes && line[i + 1] === '"'){
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (ch === delimiter && !insideQuotes){
      cols.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current);
  return cols;
}

// Aqui eu transformo o texto cru do CSV em uma lista de objetos bonitinha, sempre limpando a sujeira de BOM e quebras.
function converterCSV(text){
  if (!text) return [];
  const normalized = text.replace(/\uFEFF/g, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n").filter(line => line.trim() !== "");
  if (!lines.length) return [];
  const header = lines.shift();
  if (!header) return [];
  const delimiter = descobrirDelimitadorCsv(header, lines);
  const headers = dividirLinhaCsv(header, delimiter).map(h => limparTexto(h));
  const rows = [];
  for (const line of lines){
    const cols = dividirLinhaCsv(line, delimiter);
    if (!cols.length) continue;
    const obj = {};
    headers.forEach((key, idx) => {
      obj[key] = limparTexto(idx < cols.length ? cols[idx] : "");
    });
    rows.push(obj);
  }
  return rows;
}

const SCRIPT_BASE_URL = (() => {
  const current = document.currentScript;
  if (current?.src) {
    return new URL('.', current.src).href;
  }
  const fallback = Array.from(document.getElementsByTagName('script'))
    .map(el => el.src)
    .filter(Boolean)[0];
  if (fallback) {
    return new URL('.', fallback).href;
  }
  return new URL('.', window.location.href).href;
})();

const PAGE_BASE_URL = new URL('.', window.location.href).href;
const PAGE_PATH_DEPTH = (() => {
  try {
    const path = new URL(PAGE_BASE_URL).pathname || '/';
    return path.split('/').filter(Boolean).length;
  } catch (err) {
    const fallback = (window.location.pathname || '/').replace(/[^/]*$/, '');
    return fallback.split('/').filter(Boolean).length;
  }
})();

// Aqui eu gero uma lista de caminhos alternativos porque cada ambiente hospeda os CSVs em pastas diferentes.
function montarTentativasCsvUrl(path){
  if (!path) return [];
  if (/^(?:https?|data|blob):/i.test(path)) {
    return [path];
  }

  const raw = String(path);
  const clean = raw.replace(/^\.\//, '').replace(/^\/+/, '');
  const baseLess = clean.replace(/^Base\//i, '');
  const filename = clean.split('/').filter(Boolean).pop() || '';

  const variants = new Set([raw, clean]);
  if (clean && !clean.startsWith('./')) variants.add(`./${clean}`);
  if (clean && !clean.startsWith('/')) variants.add(`/${clean}`);
  if (baseLess && baseLess !== clean) {
    variants.add(baseLess);
    variants.add(`./${baseLess}`);
    variants.add(`/${baseLess}`);
  } else if (clean && !/^Base\//i.test(clean)) {
    variants.add(`Base/${clean}`);
  }
  if (filename) variants.add(filename);

  for (let i = 1; i <= Math.min(5, PAGE_PATH_DEPTH); i += 1) {
    const prefix = '../'.repeat(i);
    variants.add(`${prefix}${clean}`);
    if (baseLess && baseLess !== clean) {
      variants.add(`${prefix}${baseLess}`);
    }
  }

  const attempts = new Set();
  const bases = [SCRIPT_BASE_URL, PAGE_BASE_URL];
  const origin = window.location.origin || '';
  if (origin) {
    bases.push(origin.endsWith('/') ? origin : `${origin}/`);
  }

  variants.forEach(candidate => {
    if (!candidate) return;
    const normalized = candidate.startsWith('./') ? candidate.slice(2) : candidate;
    bases.forEach(base => {
      if (!base) return;
      try {
        attempts.add(new URL(normalized, base).href);
      } catch (err) {
        // ignore
      }
    });
    if (!/^(?:https?|data|blob):/i.test(candidate)) {
      attempts.add(candidate);
    }
  });

  return [...attempts];
}

async function loadCsvFile(path){
  const attempts = montarTentativasCsvUrl(path);
  let lastError = null;
  for (const attempt of attempts){
    try {
      const response = await fetch(attempt, { cache: 'no-store' });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      const text = await response.text();
      return converterCSV(text);
    } catch (err) {
      lastError = err;
    }
  }
  const attemptList = attempts.join(', ');
  if (lastError) {
    console.error(`Falha ao carregar CSV em ${path}. Tentativas: ${attemptList}`, lastError);
  } else {
    console.error(`Falha ao carregar CSV em ${path}. Tentativas: ${attemptList}`);
  }
  return [];
}

// Aqui eu pego os dados MESU brutos e padronizo os campos para facilitar os filtros hierárquicos depois.
function normalizarLinhasMesu(rows){
  return rows.map(raw => {
    const segmentoNome = lerCelula(raw, ["Segmento", "segmento"]);
    const segmentoId = lerCelula(raw, ["Id Segmento", "ID Segmento", "id segmento", "Id segmento", "segmento_id", "segmentoId", "segmentoID"]) || segmentoNome;
    const segmentoLabelRaw = lerCelula(raw, ["Segmento Label", "segmento_label", "segmentoLabel"]);
    const diretoriaNome = lerCelula(raw, ["Diretoria", "Diretoria Regional", "diretoria", "Diretoria regional", "diretoria_regional", "Diretoria_regional"]);
    const diretoriaId = lerCelula(raw, ["Id Diretoria", "ID Diretoria", "Diretoria ID", "Id Diretoria Regional", "id diretoria", "diretoria_id", "diretoriaId"]) || diretoriaNome;
    const diretoriaLabelRaw = lerCelula(raw, ["Diretoria Label", "diretoria_label", "diretoriaLabel", "Diretoria Rotulo", "diretoria_rotulo"]);
    const regionalNomeOriginal = lerCelula(raw, ["Regional", "Gerencia Regional", "Gerência Regional", "Gerencia regional", "Regional Nome", "gerencia_regional", "Gerencia_regional"]);
    const regionalId = lerCelula(raw, ["Id Regional", "ID Regional", "Id Gerencia Regional", "Id Gerência Regional", "Gerencia ID", "gerencia_regional_id", "regional_id", "regionalId"]) || regionalNomeOriginal;
    const regionalLabelRaw = lerCelula(raw, ["Gerencia Regional Label", "Gerência Regional Label", "regional_label", "gerencia_regional_label", "gerenciaRegionalLabel"]);
    const regionalNome = (regionalLabelRaw || buildHierarchyLabel(regionalId, regionalNomeOriginal));
    const regionalNomeAliases = [];
    if (regionalNomeOriginal && regionalNomeOriginal !== regionalNome) regionalNomeAliases.push(regionalNomeOriginal);
    const agenciaNomeOriginal = lerCelula(raw, ["Agencia", "Agência", "Agencia Nome", "Agência Nome", "agencia", "agencia_nome"]);
    const agenciaId = lerCelula(raw, ["Id Agencia", "ID Agencia", "Id Agência", "Agencia ID", "Agência ID", "agencia_id", "agenciaId"]) || agenciaNomeOriginal;
    const agenciaCodigo = lerCelula(raw, ["Agencia Codigo", "Agência Codigo", "Codigo Agencia", "Código Agência", "agencia_codigo", "codigo_agencia"]) || agenciaId || agenciaNomeOriginal;
    const agenciaLabelRaw = lerCelula(raw, ["Agencia Label", "Agência Label", "agencia_label", "agenciaLabel"]);
    const agenciaNome = (agenciaLabelRaw || buildHierarchyLabel(agenciaId, agenciaNomeOriginal));
    const agenciaNomeAliases = [];
    if (agenciaNomeOriginal && agenciaNomeOriginal !== agenciaNome) agenciaNomeAliases.push(agenciaNomeOriginal);
    const gerenteGestaoNome = lerCelula(raw, [
      "Gerente Gestao Nome",
      "Gerente de Gestao Nome",
      "Gerente de Gestão Nome",
      "Gerente de Gestao",
      "Gerente de Gestão",
      "Gerente Gestao",
      "gerente_gestao_nome",
      "gerente_gestao"
    ]);
    const gerenteGestaoId = lerCelula(raw, ["Id Gerente de Gestao", "ID Gerente de Gestao", "Id Gerente de Gestão", "Gerente de Gestao Id", "gerenteGestaoId", "gerente_gestao_id"]) || gerenteGestaoNome;
    const gerenteGestaoLabelRaw = lerCelula(raw, ["Gerente Gestao Label", "gerente_gestao_label", "gerenteGestaoLabel"]);
    const gerenteNome = lerCelula(raw, ["Gerente", "Gerente Nome", "Nome Gerente", "Gerente Geral", "Gerente geral", "gerente"]);
    const gerenteId = lerCelula(raw, ["Id Gerente", "ID Gerente", "Gerente Id", "gerente_id", "gerenteId"]) || gerenteNome;
    const gerenteLabelRaw = lerCelula(raw, ["Gerente Label", "gerente_label", "gerenteLabel"]);

    return {
      segmentoNome,
      segmentoId,
      segmentoLabel: segmentoLabelRaw || buildHierarchyLabel(segmentoId, segmentoNome),
      segmentoNomeOriginal: segmentoNome,
      diretoriaNome,
      diretoriaId,
      diretoriaLabel: diretoriaLabelRaw || buildHierarchyLabel(diretoriaId, diretoriaNome),
      diretoriaNomeOriginal: diretoriaNome,
      regionalNome,
      regionalId,
      regionalLabel: regionalLabelRaw || regionalNome,
      regionalNomeOriginal,
      regionalNomeAliases,
      agenciaNome,
      agenciaId,
      agenciaCodigo,
      agenciaLabel: agenciaLabelRaw || agenciaNome,
      agenciaNomeOriginal,
      agenciaNomeAliases,
      gerenteGestaoNome,
      gerenteGestaoId,
      gerenteGestaoLabel: gerenteGestaoLabelRaw || buildHierarchyLabel(gerenteGestaoId, gerenteGestaoNome),
      gerenteNome,
      gerenteId,
      gerenteLabel: gerenteLabelRaw || buildHierarchyLabel(gerenteId, gerenteNome)
    };
  }).filter(row => row.diretoriaId || row.regionalId || row.agenciaId);
}

function buildDimensionLookup(rows){
  const map = new Map();
  const list = Array.isArray(rows) ? rows : [];
  list.forEach(raw => {
    if (!raw || typeof raw !== "object") return;
    const candidates = [
      raw.id,
      raw.codigo,
      raw.id_segmento,
      raw.segmento_id,
      raw.id_diretoria,
      raw.diretoria_id,
      raw.id_regional,
      raw.regional_id,
      raw.gerencia_regional_id,
      raw.id_agencia,
      raw.agencia_id,
    ];
    const key = limparTexto(candidates.find(value => limparTexto(value)));
    if (!key) return;
    const nome = limparTexto(raw.nome || raw.name || raw.descricao || raw.label) || key;
    const labelRaw = limparTexto(raw.label) || nome || key;
    map.set(key, {
      ...raw,
      id: key,
      nome,
      label: labelRaw,
    });
  });
  return map;
}

function registerDimensionLookups({
  segmentos = [],
  diretorias = [],
  regionais = [],
  agencias = [],
  gerentesGestao = [],
  gerentes = [],
} = {}){
  DIM_SEGMENTOS_LOOKUP = buildDimensionLookup(segmentos);
  DIM_DIRETORIAS_LOOKUP = buildDimensionLookup(diretorias);
  DIM_REGIONAIS_LOOKUP = buildDimensionLookup(regionais);
  DIM_AGENCIAS_LOOKUP = buildDimensionLookup(agencias);
  DIM_GGESTAO_LOOKUP = buildDimensionLookup(gerentesGestao);
  DIM_GERENTES_LOOKUP = buildDimensionLookup(gerentes);
}

function getGerenteGestaoEntry(id){
  const key = limparTexto(id);
  if (!key) return null;
  if (DIM_GGESTAO_LOOKUP?.has?.(key)) return DIM_GGESTAO_LOOKUP.get(key);
  if (ggMap instanceof Map && ggMap.has(key)) return ggMap.get(key);
  return null;
}

function getGerenteEntry(id){
  const key = limparTexto(id);
  if (!key) return null;
  if (DIM_GERENTES_LOOKUP?.has?.(key)) return DIM_GERENTES_LOOKUP.get(key);
  if (gerMap instanceof Map && gerMap.has(key)) return gerMap.get(key);
  return null;
}

function labelFromEntry(entry, fallbackId = "", fallbackName = ""){
  if (!entry) {
    const cleanId = limparTexto(fallbackId);
    const cleanName = limparTexto(fallbackName);
    if (cleanName && cleanName.includes(" - ")) return cleanName;
    if (cleanId && cleanName && cleanId !== cleanName) return `${cleanId} - ${cleanName}`;
    return cleanName || cleanId || "";
  }
  const entryId = limparTexto(entry.id) || limparTexto(fallbackId);
  const explicitLabel = limparTexto(entry.label);
  if (explicitLabel) return explicitLabel;
  const entryName = limparTexto(entry.nome) || limparTexto(fallbackName);
  if (entryName && entryName.includes(" - ")) return entryName;
  if (entryId && entryName && entryId !== entryName) return `${entryId} - ${entryName}`;
  return entryName || entryId || limparTexto(fallbackName) || "";
}

function labelGerenteGestao(id, fallbackName = ""){
  return labelFromEntry(getGerenteGestaoEntry(id), id, fallbackName);
}

function labelGerente(id, fallbackName = ""){
  return labelFromEntry(getGerenteEntry(id), id, fallbackName);
}

function deriveGerenteGestaoIdFromAgency(agencia){
  const key = limparTexto(agencia);
  if (!key) return "";
  const candidates = [];

  const dim = DIM_AGENCIAS_LOOKUP?.get?.(key);
  if (dim) {
    candidates.push(dim.gerente_gestao_id, dim.gerenteGestaoId, dim.gerente_gestao, dim.gerenteGestao);
  }

  if (GGESTAO_BY_AGENCIA instanceof Map && GGESTAO_BY_AGENCIA.has(key)) {
    candidates.push(...Array.from(GGESTAO_BY_AGENCIA.get(key) || []));
  }

  if (MESU_BY_AGENCIA instanceof Map && MESU_BY_AGENCIA.has(key)) {
    const meta = MESU_BY_AGENCIA.get(key);
    if (meta) candidates.push(meta.gerenteGestaoId, meta.gerenteGestao);
  }

  const simple = simplificarTexto(key);
  if (simple && MESU_AGENCIA_LOOKUP instanceof Map && MESU_AGENCIA_LOOKUP.has(simple)) {
    const meta = MESU_AGENCIA_LOOKUP.get(simple);
    if (meta) candidates.push(meta.gerenteGestaoId, meta.gerenteGestao);
  }

  if (!candidates.length) {
    const meta = resolveAgencyHierarchyMeta({ agenciaId: key, agencia: key, agenciaCodigo: key });
    if (meta) candidates.push(meta.gerenteGestaoId, meta.gerenteGestao);
  }

  for (const candidate of candidates) {
    const clean = limparTexto(candidate);
    if (clean) return clean;
  }
  return "";
}

// Aqui eu aproveito os dados MESU já limpos para montar índices (diretoria → gerência → agência...) e acelerar os combos.
function montarHierarquiaMesu(rows){
  const dirMap = new Map();
  const regMap = new Map();
  const agMap = new Map();
  const ggMap = new Map();
  const gerMap = new Map();
  const segMap = new Map();

  MESU_DATA = Array.isArray(rows) ? rows.map(row => ({ ...row })) : [];
  MESU_FALLBACK_ROWS = [];
  MESU_BY_AGENCIA = new Map();
  MESU_AGENCIA_LOOKUP = new Map();
  GERENCIAS_BY_DIRETORIA = new Map();
  AGENCIAS_BY_GERENCIA = new Map();
  GGESTAO_BY_AGENCIA = new Map();
  GERENTES_BY_AGENCIA = new Map();

  rows.forEach(row => {
    const segmentoId = limparTexto(row.segmentoId);
    const segmentoDim = DIM_SEGMENTOS_LOOKUP.get(segmentoId) || null;
    const segmentoLabel = limparTexto(segmentoDim?.label) || limparTexto(row.segmentoLabel) || buildHierarchyLabel(segmentoId, row.segmentoNome);
    const segmentoNome = limparTexto(segmentoDim?.nome) || limparTexto(row.segmentoNome) || segmentoLabel || segmentoId;
    const diretoriaId = limparTexto(row.diretoriaId);
    const diretoriaDim = DIM_DIRETORIAS_LOOKUP.get(diretoriaId) || null;
    const diretoriaLabel = limparTexto(diretoriaDim?.label) || limparTexto(row.diretoriaLabel) || buildHierarchyLabel(diretoriaId, row.diretoriaNome);
    const diretoriaNome = limparTexto(diretoriaDim?.nome) || limparTexto(row.diretoriaNome) || diretoriaLabel || diretoriaId;
    const regionalId = limparTexto(row.regionalId);
    const regionalDim = DIM_REGIONAIS_LOOKUP.get(regionalId) || null;
    const regionalLabel = limparTexto(regionalDim?.label)
      || limparTexto(row.regionalLabel)
      || limparTexto(row.regionalNome)
      || buildHierarchyLabel(regionalId, row.regionalNomeOriginal);
    const regionalNome = limparTexto(regionalDim?.nome)
      || limparTexto(row.regionalNomeOriginal)
      || regionalLabel
      || regionalId;
    const regionalNomeAliases = Array.isArray(row.regionalNomeAliases)
      ? row.regionalNomeAliases.map(limparTexto).filter(Boolean)
      : [];
    const agenciaId = limparTexto(row.agenciaId);
    const agenciaDim = DIM_AGENCIAS_LOOKUP.get(agenciaId) || null;
    const agenciaLabel = limparTexto(agenciaDim?.label)
      || limparTexto(row.agenciaLabel)
      || limparTexto(row.agenciaNome)
      || buildHierarchyLabel(agenciaId, row.agenciaNomeOriginal);
    const agenciaNome = limparTexto(agenciaDim?.nome)
      || limparTexto(row.agenciaNomeOriginal)
      || agenciaLabel
      || agenciaId;
    const agenciaCodigo = limparTexto(row.agenciaCodigo || row.agencia);
    const agenciaNomeAliases = Array.isArray(row.agenciaNomeAliases)
      ? row.agenciaNomeAliases.map(limparTexto).filter(Boolean)
      : [];
    const gerenteGestaoId = limparTexto(row.gerenteGestaoId);
    const gerenteGestaoLabel = limparTexto(row.gerenteGestaoLabel) || buildHierarchyLabel(gerenteGestaoId, row.gerenteGestaoNome);
    const gerenteGestaoNome = limparTexto(row.gerenteGestaoNome) || gerenteGestaoLabel || gerenteGestaoId;
    const gerenteId = limparTexto(row.gerenteId);
    const gerenteLabel = limparTexto(row.gerenteLabel) || buildHierarchyLabel(gerenteId, row.gerenteNome);
    const gerenteNome = limparTexto(row.gerenteNome) || gerenteLabel || gerenteId;

    row.segmentoId = segmentoId;
    row.segmentoNome = segmentoNome;
    row.segmentoLabel = segmentoLabel;
    row.segmentoNomeOriginal = limparTexto(row.segmentoNomeOriginal) || segmentoNome;
    row.diretoriaId = diretoriaId;
    row.diretoriaNome = diretoriaNome;
    row.diretoriaLabel = diretoriaLabel;
    row.diretoriaNomeOriginal = limparTexto(row.diretoriaNomeOriginal) || diretoriaNome;
    row.regionalId = regionalId;
    row.regionalNome = regionalLabel;
    row.regionalLabel = regionalLabel;
    row.regionalNomeOriginal = limparTexto(row.regionalNomeOriginal) || regionalNome;
    row.regionalNomeAliases = regionalNomeAliases;
    row.agenciaId = agenciaId;
    row.agenciaNome = agenciaLabel;
    row.agenciaLabel = agenciaLabel;
    row.agenciaCodigo = agenciaCodigo;
    row.agenciaNomeAliases = agenciaNomeAliases;
    row.gerenteGestaoId = gerenteGestaoId;
    row.gerenteGestaoNome = gerenteGestaoNome;
    row.gerenteGestaoLabel = gerenteGestaoLabel;
    row.gerenteId = gerenteId;
    row.gerenteNome = gerenteNome;
    row.gerenteLabel = gerenteLabel;

    if (segmentoId){
      if (!segMap.has(segmentoId)) {
        segMap.set(segmentoId, {
          id: segmentoId,
          nome: segmentoNome || segmentoId || 'Segmento',
          label: segmentoLabel || buildHierarchyLabel(segmentoId, segmentoNome) || segmentoNome || segmentoId || 'Segmento'
        });
      } else {
        const segEntry = segMap.get(segmentoId);
        if (segEntry) {
          if (segmentoLabel && !segEntry.label) segEntry.label = segmentoLabel;
          if (segmentoNome && !segEntry.nome) segEntry.nome = segmentoNome;
        }
      }
    }

    if (diretoriaId){
      const dirEntry = dirMap.get(diretoriaId) || {
        id: diretoriaId,
        nome: diretoriaNome || diretoriaId,
        label: diretoriaLabel || diretoriaNome || diretoriaId,
        segmento: segmentoId || ''
      };
      if (!dirEntry.nome && diretoriaNome) dirEntry.nome = diretoriaNome;
      if (!dirEntry.label && diretoriaLabel) dirEntry.label = diretoriaLabel;
      if (!dirEntry.segmento && segmentoId) dirEntry.segmento = segmentoId;
      dirMap.set(diretoriaId, dirEntry);
    }

    if (regionalId){
      const regEntry = regMap.get(regionalId) || {
        id: regionalId,
        nome: regionalNome || regionalId,
        label: regionalLabel || regionalNome || regionalId,
        diretoria: diretoriaId || '',
        segmentoId: segmentoId || '',
        aliases: []
      };
      if (!regEntry.nome && regionalNome) regEntry.nome = regionalNome;
      if (!regEntry.label && regionalLabel) regEntry.label = regionalLabel;
      if (!regEntry.diretoria && diretoriaId) regEntry.diretoria = diretoriaId;
      if (!regEntry.segmentoId && segmentoId) regEntry.segmentoId = segmentoId;
      if (Array.isArray(regEntry.aliases)) {
        regionalNomeAliases.forEach(alias => {
          if (alias && !regEntry.aliases.includes(alias)) regEntry.aliases.push(alias);
        });
      }
      regMap.set(regionalId, regEntry);
      if (diretoriaId){
        if (!GERENCIAS_BY_DIRETORIA.has(diretoriaId)) GERENCIAS_BY_DIRETORIA.set(diretoriaId, new Set());
        GERENCIAS_BY_DIRETORIA.get(diretoriaId).add(regionalId);
      }
    }

    if (agenciaId){
      const agEntry = agMap.get(agenciaId) || {
        id: agenciaId,
        nome: agenciaNome || agenciaId,
        label: agenciaLabel || agenciaNome || agenciaId,
        gerencia: regionalId || '',
        diretoria: diretoriaId || '',
        segmento: segmentoId || '',
        codigo: agenciaCodigo || agenciaId,
        aliases: []
      };
      if (!agEntry.nome && agenciaNome) agEntry.nome = agenciaNome;
      if (!agEntry.label && agenciaLabel) agEntry.label = agenciaLabel;
      if (!agEntry.gerencia && regionalId) agEntry.gerencia = regionalId;
      if (!agEntry.diretoria && diretoriaId) agEntry.diretoria = diretoriaId;
      if (!agEntry.segmento && segmentoId) agEntry.segmento = segmentoId;
      if (!agEntry.codigo && agenciaCodigo) agEntry.codigo = agenciaCodigo;
      if (Array.isArray(agEntry.aliases)) {
        agenciaNomeAliases.forEach(alias => {
          if (alias && !agEntry.aliases.includes(alias)) agEntry.aliases.push(alias);
        });
      }
      agMap.set(agenciaId, agEntry);

      if (!MESU_BY_AGENCIA.has(agenciaId)){
        MESU_BY_AGENCIA.set(agenciaId, {
          segmentoId,
          segmentoNome,
          diretoriaId,
          diretoriaNome,
          regionalId,
          regionalNome,
          agenciaId,
          agenciaNome,
          agenciaCodigo,
          gerenteGestaoId,
          gerenteGestaoLabel,
          gerenteId,
          gerenteLabel,
          regionalNomeAliases: new Set(regionalNomeAliases),
          agenciaNomeAliases: new Set(agenciaNomeAliases),
          gerenteGestaoIds: new Set(),
          gerenteIds: new Set()
        });
      }
      const agencyMeta = MESU_BY_AGENCIA.get(agenciaId);
      if (segmentoId && !agencyMeta.segmentoId) agencyMeta.segmentoId = segmentoId;
      if (segmentoNome && !agencyMeta.segmentoNome) agencyMeta.segmentoNome = segmentoNome;
      if (segmentoLabel && !agencyMeta.segmentoLabel) agencyMeta.segmentoLabel = segmentoLabel;
      if (diretoriaId && !agencyMeta.diretoriaId) agencyMeta.diretoriaId = diretoriaId;
      if (diretoriaNome && !agencyMeta.diretoriaNome) agencyMeta.diretoriaNome = diretoriaNome;
      if (diretoriaLabel && !agencyMeta.diretoriaLabel) agencyMeta.diretoriaLabel = diretoriaLabel;
      if (regionalId && !agencyMeta.regionalId) agencyMeta.regionalId = regionalId;
      if (regionalNome && !agencyMeta.regionalNome) agencyMeta.regionalNome = regionalNome;
      if (regionalLabel && !agencyMeta.regionalLabel) agencyMeta.regionalLabel = regionalLabel;
      if (agenciaCodigo && !agencyMeta.agenciaCodigo) agencyMeta.agenciaCodigo = agenciaCodigo;
      if (!agencyMeta.regionalNomeAliases) agencyMeta.regionalNomeAliases = new Set();
      if (!agencyMeta.agenciaNomeAliases) agencyMeta.agenciaNomeAliases = new Set();
      regionalNomeAliases.forEach(alias => agencyMeta.regionalNomeAliases.add(alias));
      agenciaNomeAliases.forEach(alias => agencyMeta.agenciaNomeAliases.add(alias));
      if (gerenteGestaoId){
        agencyMeta.gerenteGestaoId = agencyMeta.gerenteGestaoId || gerenteGestaoId;
        const agencyGgNome = limparTexto(agencyMeta.gerenteGestaoNome);
        const shouldReplaceAgencyGgNome = !agencyGgNome
          || (agencyMeta.gerenteGestaoId && simplificarTexto(agencyGgNome) === simplificarTexto(agencyMeta.gerenteGestaoId))
          || (gerenteNome && simplificarTexto(agencyGgNome) === simplificarTexto(gerenteNome));
        if (gerenteGestaoNome && shouldReplaceAgencyGgNome) {
          agencyMeta.gerenteGestaoNome = gerenteGestaoNome;
          agencyMeta.gerenteGestaoLabel = gerenteGestaoLabel;
        } else if (!agencyMeta.gerenteGestaoNome) {
          agencyMeta.gerenteGestaoNome = gerenteGestaoNome;
          agencyMeta.gerenteGestaoLabel = agencyMeta.gerenteGestaoLabel || gerenteGestaoLabel;
        }
        agencyMeta.gerenteGestaoIds.add(gerenteGestaoId);
      }
      if (gerenteId){
        agencyMeta.gerenteId = agencyMeta.gerenteId || gerenteId;
        agencyMeta.gerenteNome = agencyMeta.gerenteNome || gerenteNome;
        agencyMeta.gerenteLabel = agencyMeta.gerenteLabel || gerenteLabel;
        agencyMeta.gerenteIds.add(gerenteId);
      }
      if (regionalId){
        if (!AGENCIAS_BY_GERENCIA.has(regionalId)) AGENCIAS_BY_GERENCIA.set(regionalId, new Set());
        AGENCIAS_BY_GERENCIA.get(regionalId).add(agenciaId);
      }
    }

    if (gerenteGestaoId){
      const ggEntry = ggMap.get(gerenteGestaoId) || {
        id: gerenteGestaoId,
        nome: gerenteGestaoNome || gerenteGestaoId,
        label: gerenteGestaoLabel || gerenteGestaoNome || gerenteGestaoId,
        agencia: agenciaId || '',
        gerencia: regionalId || '',
        diretoria: diretoriaId || ''
      };
      const ggEntryNome = limparTexto(ggEntry.nome);
      const shouldReplaceGgNome = !ggEntryNome
        || simplificarTexto(ggEntryNome) === simplificarTexto(ggEntry.id || '')
        || (gerenteNome && simplificarTexto(ggEntryNome) === simplificarTexto(gerenteNome));
      if (gerenteGestaoNome && shouldReplaceGgNome) ggEntry.nome = gerenteGestaoNome;
      if (gerenteGestaoLabel && !ggEntry.label) ggEntry.label = gerenteGestaoLabel;
      if (!ggEntry.agencia && agenciaId) ggEntry.agencia = agenciaId;
      if (!ggEntry.gerencia && regionalId) ggEntry.gerencia = regionalId;
      if (!ggEntry.diretoria && diretoriaId) ggEntry.diretoria = diretoriaId;
      ggMap.set(gerenteGestaoId, ggEntry);

      if (agenciaId){
        if (!GGESTAO_BY_AGENCIA.has(agenciaId)) GGESTAO_BY_AGENCIA.set(agenciaId, new Set());
        GGESTAO_BY_AGENCIA.get(agenciaId).add(gerenteGestaoId);
      }
    }

    if (gerenteId){
      const gerenteEntry = gerMap.get(gerenteId) || {
        id: gerenteId,
        nome: gerenteNome || gerenteId,
        label: gerenteLabel || gerenteNome || gerenteId,
        agencia: agenciaId || '',
        gerencia: regionalId || '',
        diretoria: diretoriaId || ''
      };
      if (!gerenteEntry.nome && gerenteNome) gerenteEntry.nome = gerenteNome;
      if (!gerenteEntry.label && gerenteLabel) gerenteEntry.label = gerenteLabel;
      if (!gerenteEntry.agencia && agenciaId) gerenteEntry.agencia = agenciaId;
      if (!gerenteEntry.gerencia && regionalId) gerenteEntry.gerencia = regionalId;
      if (!gerenteEntry.diretoria && diretoriaId) gerenteEntry.diretoria = diretoriaId;
      gerMap.set(gerenteId, gerenteEntry);

      if (agenciaId){
        if (!GERENTES_BY_AGENCIA.has(agenciaId)) GERENTES_BY_AGENCIA.set(agenciaId, new Set());
        GERENTES_BY_AGENCIA.get(agenciaId).add(gerenteId);
      }
    }
  });

  const segmentOptionList = DIMENSION_FILTER_OPTIONS.segmento.length
    ? DIMENSION_FILTER_OPTIONS.segmento
    : Array.from(segMap.values()).map(entry => ({ id: entry.id, label: entry.label }));
  const normalizedSegments = segmentOptionList.map(opt => {
    const normalized = normOpt(opt);
    const id = limparTexto(normalized.id);
    if (!id) return null;
    const lookup = DIM_SEGMENTOS_LOOKUP.get(id) || {};
    const base = segMap.get(id) || {};
    const nome = extractNameFromLabel(normalized.label) || lookup.nome || base.nome || id;
    const label = buildHierarchyLabel(id, nome);
    const aliases = new Set();
    if (Array.isArray(base.aliases)) base.aliases.forEach(alias => aliases.add(limparTexto(alias)));
    if (Array.isArray(lookup.aliases)) lookup.aliases.forEach(alias => aliases.add(limparTexto(alias)));
    return {
      ...base,
      ...lookup,
      id,
      nome,
      label,
      aliases: Array.from(aliases).filter(Boolean),
      segmentoId: base.segmentoId || id,
      segmentoNome: base.segmentoNome || nome,
      segmentoLabel: base.segmentoLabel || label,
    };
  }).filter(Boolean);
  const segmentoMap = new Map();
  normalizedSegments.forEach(seg => {
    const key = limparTexto(seg?.id);
    if (!key) return;
    if (!segmentoMap.has(key)) {
      segmentoMap.set(key, { ...seg });
      return;
    }
    const current = segmentoMap.get(key);
    if (seg.nome && !current.nome) current.nome = seg.nome;
    if (seg.label && !current.label) current.label = seg.label;
    if (Array.isArray(seg.aliases) && seg.aliases.length) {
      const aliasSet = new Set([...(current.aliases || []), ...seg.aliases]);
      current.aliases = Array.from(aliasSet).filter(Boolean);
    }
  });
  SEGMENTOS_DATA = Array.from(segmentoMap.values()).sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' }));

  const diretoriaOptions = DIMENSION_FILTER_OPTIONS.diretoria.length
    ? DIMENSION_FILTER_OPTIONS.diretoria
    : Array.from(dirMap.values()).map(entry => ({ id: entry.id, label: entry.label }));
  RANKING_DIRECTORIAS = diretoriaOptions.map(opt => {
    const normalized = normOpt(opt);
    const id = limparTexto(normalized.id);
    if (!id) return null;
    const lookup = DIM_DIRETORIAS_LOOKUP.get(id) || {};
    const baseEntry = dirMap.get(id) || {};
    const nome = extractNameFromLabel(normalized.label) || lookup.nome || baseEntry.nome || id;
    const label = buildHierarchyLabel(id, nome);
    const segmentoId = limparTexto(lookup.id_segmento || baseEntry.segmento || baseEntry.segmentoId);
    return {
      ...baseEntry,
      ...lookup,
      id,
      nome,
      label,
      segmento: segmentoId || '',
      segmentoId: segmentoId || '',
      diretoriaId: baseEntry.diretoriaId || id,
      diretoriaNome: baseEntry.diretoriaNome || nome,
      diretoriaLabel: baseEntry.diretoriaLabel || label,
    };
  }).filter(Boolean);

  const regionalOptions = DIMENSION_FILTER_OPTIONS.gerencia.length
    ? DIMENSION_FILTER_OPTIONS.gerencia
    : Array.from(regMap.values()).map(entry => ({ id: entry.id, label: entry.label }));
  RANKING_GERENCIAS = regionalOptions.map(opt => {
    const normalized = normOpt(opt);
    const id = limparTexto(normalized.id);
    if (!id) return null;
    const lookup = DIM_REGIONAIS_LOOKUP.get(id) || {};
    const baseEntry = regMap.get(id) || {};
    const nome = extractNameFromLabel(normalized.label) || lookup.nome || baseEntry.nome || id;
    const label = buildHierarchyLabel(id, nome);
    const diretoriaId = limparTexto(lookup.id_diretoria || baseEntry.diretoria);
    const segmentoId = limparTexto(lookup.id_segmento || baseEntry.segmentoId);
    return {
      ...baseEntry,
      ...lookup,
      id,
      nome,
      label,
      diretoria: diretoriaId || baseEntry.diretoria || '',
      segmentoId: segmentoId || baseEntry.segmentoId || '',
      regionalId: baseEntry.regionalId || id,
      regionalNome: baseEntry.regionalNome || nome,
      regionalLabel: baseEntry.regionalLabel || label,
    };
  }).filter(Boolean);

  const agenciaOptions = DIMENSION_FILTER_OPTIONS.agencia.length
    ? DIMENSION_FILTER_OPTIONS.agencia
    : Array.from(agMap.values()).map(entry => ({ id: entry.id, label: entry.label }));
  RANKING_AGENCIAS = agenciaOptions.map(opt => {
    const normalized = normOpt(opt);
    const id = limparTexto(normalized.id);
    if (!id) return null;
    const lookup = DIM_AGENCIAS_LOOKUP.get(id) || {};
    const baseEntry = agMap.get(id) || {};
    const nome = extractNameFromLabel(normalized.label) || lookup.nome || baseEntry.nome || id;
    const label = buildHierarchyLabel(id, nome);
    const regionalId = limparTexto(lookup.id_regional || baseEntry.gerencia);
    const diretoriaId = limparTexto(lookup.id_diretoria || baseEntry.diretoria);
    const segmentoId = limparTexto(lookup.id_segmento || baseEntry.segmento);
    return {
      ...baseEntry,
      ...lookup,
      id,
      nome,
      label,
      gerencia: regionalId || baseEntry.gerencia || '',
      diretoria: diretoriaId || baseEntry.diretoria || '',
      segmento: segmentoId || baseEntry.segmento || '',
      agenciaId: baseEntry.agenciaId || id,
      agenciaNome: baseEntry.agenciaNome || nome,
      agenciaLabel: baseEntry.agenciaLabel || label,
    };
  }).filter(Boolean);

  const ggestaoOptions = DIMENSION_FILTER_OPTIONS.gerenteGestao.length
    ? DIMENSION_FILTER_OPTIONS.gerenteGestao
    : Array.from(ggMap.values()).map(entry => ({ id: entry.id, label: entry.label }));
  GERENTES_GESTAO = ggestaoOptions.map(opt => {
    const normalized = normOpt(opt);
    const id = limparTexto(normalized.id);
    if (!id) return null;
    const lookup = DIM_GGESTAO_LOOKUP.get(id) || {};
    const baseEntry = ggMap.get(id) || {};
    const nome = extractNameFromLabel(normalized.label) || lookup.nome || baseEntry.nome || id;
    const label = buildHierarchyLabel(id, nome);
    const agencia = limparTexto(lookup.id_agencia || baseEntry.agencia);
    const gerencia = limparTexto(lookup.id_regional || baseEntry.gerencia);
    const diretoria = limparTexto(lookup.id_diretoria || baseEntry.diretoria);
    const segmento = limparTexto(lookup.id_segmento || baseEntry.segmento);
    return {
      ...baseEntry,
      ...lookup,
      id,
      nome,
      label,
      agencia: agencia || baseEntry.agencia || '',
      gerencia: gerencia || baseEntry.gerencia || '',
      diretoria: diretoria || baseEntry.diretoria || '',
      segmento: segmento || baseEntry.segmento || '',
      gerenteGestaoId: baseEntry.gerenteGestaoId || id,
      gerenteGestaoNome: baseEntry.gerenteGestaoNome || nome,
      gerenteGestaoLabel: baseEntry.gerenteGestaoLabel || label,
    };
  }).filter(Boolean);

  const gerenteOptions = DIMENSION_FILTER_OPTIONS.gerente.length
    ? DIMENSION_FILTER_OPTIONS.gerente
    : Array.from(gerMap.values()).map(entry => ({ id: entry.id, label: entry.label }));
  RANKING_GERENTES = gerenteOptions.map(opt => {
    const normalized = normOpt(opt);
    const id = limparTexto(normalized.id);
    if (!id) return null;
    const lookup = DIM_GERENTES_LOOKUP.get(id) || {};
    const baseEntry = gerMap.get(id) || {};
    const nome = extractNameFromLabel(normalized.label) || lookup.nome || baseEntry.nome || id;
    const label = buildHierarchyLabel(id, nome);
    const agencia = limparTexto(lookup.id_agencia || baseEntry.agencia);
    const gerencia = limparTexto(lookup.id_regional || baseEntry.gerencia);
    const diretoria = limparTexto(lookup.id_diretoria || baseEntry.diretoria);
    const segmento = limparTexto(lookup.id_segmento || baseEntry.segmento);
    return {
      ...baseEntry,
      ...lookup,
      id,
      nome,
      label,
      agencia: agencia || baseEntry.agencia || '',
      gerencia: gerencia || baseEntry.gerencia || '',
      diretoria: diretoria || baseEntry.diretoria || '',
      segmento: segmento || baseEntry.segmento || '',
      gerenteId: baseEntry.gerenteId || id,
      gerenteNome: baseEntry.gerenteNome || nome,
      gerenteLabel: baseEntry.gerenteLabel || label,
    };
  }).filter(Boolean);

  MESU_BY_AGENCIA.forEach(meta => {
    const aliases = [];
    if (meta.agenciaNomeAliases instanceof Set) aliases.push(...meta.agenciaNomeAliases);
    registerMesuAgencyLookup(meta, meta.agenciaId, meta.agenciaNome, meta.agenciaCodigo, ...aliases);
    if (meta.gerenteGestaoIds instanceof Set) {
      meta.gerenteGestaoLista = Array.from(meta.gerenteGestaoIds);
      delete meta.gerenteGestaoIds;
    }
    if (meta.gerenteIds instanceof Set) {
      meta.gerenteLista = Array.from(meta.gerenteIds);
      delete meta.gerenteIds;
    }
  });

  const localeCompare = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' });

  RANKING_DIRECTORIAS.sort((a,b) => localeCompare(a.nome, b.nome));
  RANKING_GERENCIAS.sort((a,b) => localeCompare(a.nome, b.nome));
  RANKING_AGENCIAS.sort((a,b) => localeCompare(a.nome, b.nome));
  GERENTES_GESTAO.sort((a,b) => localeCompare(a.nome, b.nome));
  RANKING_GERENTES.sort((a,b) => localeCompare(a.nome, b.nome));

  DIRETORIA_INDEX = new Map();
  RANKING_DIRECTORIAS.forEach(dir => {
    const key = limparTexto(dir.id || dir.nome);
    if (key) DIRETORIA_INDEX.set(key, dir);
  });
  GERENCIA_INDEX = new Map();
  RANKING_GERENCIAS.forEach(ger => {
    const key = limparTexto(ger.id || ger.nome);
    if (key) GERENCIA_INDEX.set(key, ger);
  });
  AGENCIA_INDEX = new Map();
  RANKING_AGENCIAS.forEach(ag => {
    const key = limparTexto(ag.id || ag.nome);
    if (key) AGENCIA_INDEX.set(key, ag);
  });
  GGESTAO_INDEX = new Map();
  GERENTES_GESTAO.forEach(gg => {
    const key = limparTexto(gg.id || gg.nome);
    if (key) GGESTAO_INDEX.set(key, gg);
  });
  GERENTE_INDEX = new Map();
  RANKING_GERENTES.forEach(ge => {
    const key = limparTexto(ge.id || ge.nome);
    if (key) GERENTE_INDEX.set(key, ge);
  });
  SEGMENTO_INDEX = new Map();
  SEGMENTOS_DATA.forEach(seg => {
    const key = limparTexto(seg.id || seg.nome);
    if (key) SEGMENTO_INDEX.set(key, seg);
  });

  DIRETORIA_LABEL_INDEX = new Map();
  RANKING_DIRECTORIAS.forEach(dir => registerLabelIndexEntry(DIRETORIA_LABEL_INDEX, dir, dir.id, dir.nome, dir.label));
  GERENCIA_LABEL_INDEX = new Map();
  RANKING_GERENCIAS.forEach(ger => registerLabelIndexEntry(GERENCIA_LABEL_INDEX, ger, ger.id, ger.nome, ger.label));
  AGENCIA_LABEL_INDEX = new Map();
  RANKING_AGENCIAS.forEach(ag => registerLabelIndexEntry(AGENCIA_LABEL_INDEX, ag, ag.id, ag.nome, ag.label, ag.codigo));
  MESU_BY_AGENCIA.forEach(meta => {
    registerLabelIndexEntry(AGENCIA_LABEL_INDEX, meta, meta.agenciaId, meta.agenciaNome, meta.agenciaLabel, meta.agenciaCodigo);
  });
  GGESTAO_LABEL_INDEX = new Map();
  GERENTES_GESTAO.forEach(gg => registerLabelIndexEntry(GGESTAO_LABEL_INDEX, gg, gg.id, gg.nome, gg.label));
  GERENTE_LABEL_INDEX = new Map();
  RANKING_GERENTES.forEach(ger => registerLabelIndexEntry(GERENTE_LABEL_INDEX, ger, ger.id, ger.nome, ger.label));
  SEGMENTO_LABEL_INDEX = new Map();
  SEGMENTOS_DATA.forEach(seg => registerLabelIndexEntry(SEGMENTO_LABEL_INDEX, seg, seg.id, seg.nome, seg.label));

  if (!CURRENT_USER_CONTEXT.diretoria && rows.length){
    const first = rows[0];
    CURRENT_USER_CONTEXT = {
      diretoria: first.diretoriaId || '',
      gerencia: first.regionalId || '',
      agencia: first.agenciaId || '',
      gerenteGestao: first.gerenteGestaoId || '',
      gerente: first.gerenteId || ''
    };
  }
}

function montarCatalogoDeProdutos(dimRows){
  const rows = Array.isArray(dimRows) ? dimRows : [];
  const famMap = new Map();
  const byFamilia = new Map();
  PRODUTO_TO_FAMILIA = new Map();
  SUBPRODUTO_TO_INDICADOR.clear();
  FORCED_EMPTY_SUBINDICADORES = new Set();
  resetSubIndicatorOptionCache();

  CARD_SECTIONS_DEF.forEach(section => {
    if (!section || !section.id) return;
    if (section.id === "outros") {
      section.items.forEach(item => {
        if (!item || !item.id) return;
        PRODUTO_TO_FAMILIA.set(item.id, {
          id: section.id,
          nome: section.label || section.id,
          secaoId: section.id,
          secaoNome: section.label || section.id
        });
        FORCED_EMPTY_SUBINDICADORES.add(item.id);
        const forcedSlug = simplificarTexto(item.id);
        if (forcedSlug && forcedSlug !== item.id) {
          FORCED_EMPTY_SUBINDICADORES.add(forcedSlug);
        }
        SUBINDICADORES_BY_INDICADOR.set(item.id, []);
      });
      return;
    }
    const familiaId = section.id;
    const familiaNome = section.label || familiaId;
    const entry = famMap.get(familiaId) || {
      id: familiaId,
      nome: familiaNome,
      secaoId: section.id,
      secaoNome: section.label || section.id
    };
    if (!entry.nome || entry.nome === entry.id) entry.nome = familiaNome;
    entry.secaoId = section.id;
    entry.secaoNome = section.label || section.id || familiaId;
    famMap.set(familiaId, entry);

    const list = byFamilia.get(familiaId) || [];
    section.items.forEach(item => {
      if (!item || !item.id) return;
      if (!list.some(prod => prod.id === item.id)) {
        list.push({ id: item.id, nome: item.nome || item.id, familiaId, secaoId: section.id });
      }
      PRODUTO_TO_FAMILIA.set(item.id, {
        id: familiaId,
        nome: familiaNome,
        secaoId: section.id,
        secaoNome: section.label || section.id || familiaNome
      });

      if (item.forceEmptySubIndicators) {
        FORCED_EMPTY_SUBINDICADORES.add(item.id);
        const forcedSlug = simplificarTexto(item.id);
        if (forcedSlug && forcedSlug !== item.id) {
          FORCED_EMPTY_SUBINDICADORES.add(forcedSlug);
        }
      }

      if (Array.isArray(item.subIndicators) && item.subIndicators.length) {
        const normalized = item.subIndicators.map(sub => ({
          id: sub.id,
          nome: sub.nome || sub.id,
          metric: sub.metric || item.metric || 'valor',
          peso: Number(sub.peso) || 1,
          aliases: Array.isArray(sub.aliases) ? sub.aliases.filter(Boolean).map(alias => limparTexto(alias)) : undefined,
          children: Array.isArray(sub.children)
            ? sub.children.map(child => ({
                id: child.id,
                nome: child.nome || child.id,
                metric: child.metric || sub.metric || item.metric || 'valor',
                peso: Number(child.peso) || 1,
                children: Array.isArray(child.children)
                  ? child.children.map(grand => ({
                      id: grand.id,
                      nome: grand.nome || grand.id,
                      metric: grand.metric || child.metric || sub.metric || item.metric || 'valor',
                      peso: Number(grand.peso) || 1,
                      children: []
                    }))
                  : []
              }))
            : []
        }));
        normalized.forEach(entry => {
          if (entry?.nome) registrarAliasIndicador(item.id, entry.nome);
          if (Array.isArray(entry?.aliases)) {
            entry.aliases.forEach(alias => registrarAliasIndicador(item.id, alias));
          }
          entry.children.forEach(child => {
            if (child?.nome) registrarAliasIndicador(item.id, child.nome);
            child.children.forEach(grand => {
              if (grand?.nome) registrarAliasIndicador(item.id, grand.nome);
            });
          });
        });
        SUBINDICADORES_BY_INDICADOR.set(item.id, normalized);
      } else {
        SUBINDICADORES_BY_INDICADOR.set(item.id, []);
      }
    });
    list.sort((a, b) => String(a.nome || a.id).localeCompare(String(b.nome || b.id), 'pt-BR', { sensitivity: 'base' }));
    byFamilia.set(familiaId, list);
  });

  rows.forEach(row => {
    if (!row) return;
    const familiaId = row.familiaId;
    const familiaNome = row.familiaNome || familiaId;
    if (familiaId && !famMap.has(familiaId)) {
      famMap.set(familiaId, {
        id: familiaId,
        nome: familiaNome || familiaId,
        secaoId: familiaId,
        secaoNome: familiaNome || familiaId
      });
    }
    const indicadorId = row.indicadorId;
    if (familiaId && indicadorId && !PRODUTO_TO_FAMILIA.has(indicadorId)) {
      PRODUTO_TO_FAMILIA.set(indicadorId, {
        id: familiaId,
        nome: familiaNome || familiaId,
        secaoId: familiaId,
        secaoNome: familiaNome || familiaId
      });
    }
    const subSlug = simplificarTexto(row.subId || row.subNome || row.subCodigo);
    if (subSlug && indicadorId) {
      SUBPRODUTO_TO_INDICADOR.set(subSlug, indicadorId);
    }
  });

  FAMILIA_DATA = Array.from(famMap.values()).sort((a,b) => String(a.nome || a.id).localeCompare(String(b.nome || b.id), 'pt-BR', { sensitivity: 'base' }));
  FAMILIA_BY_ID = new Map(FAMILIA_DATA.map(f => [f.id, f]));
  if (!FAMILIA_BY_ID.has('outros') && PRODUCT_INDEX.has('desconhecido')) {
    FAMILIA_BY_ID.set('outros', { id: 'outros', nome: 'Outros', secaoId: 'outros', secaoNome: 'Outros' });
  }
  PRODUTOS_BY_FAMILIA = byFamilia;
  PRODUTOS_DATA = rows;

  RESUMO_HIERARCHY = buildResumoHierarchyFromProducts(rows);

  CAMPAIGN_UNIT_DATA.forEach(unit => {
    const prodMeta = unit.produtoId ? PRODUTO_TO_FAMILIA.get(unit.produtoId) : null;
    if (prodMeta) {
      if (!unit.familiaId) unit.familiaId = prodMeta.id;
      if (!unit.familia) unit.familia = prodMeta.nome || prodMeta.id;
      if (!unit.familiaNome) unit.familiaNome = prodMeta.nome || prodMeta.id;
      if (!unit.secaoId) unit.secaoId = prodMeta.secaoId;
      if (!unit.secao) unit.secao = prodMeta.secaoId;
      if (!unit.secaoNome) unit.secaoNome = prodMeta.secaoNome || getSectionLabel(prodMeta.secaoId);
    } else if (unit.familiaId) {
      const fam = FAMILIA_BY_ID.get(unit.familiaId);
      if (fam) {
        unit.familia = fam.nome || unit.familiaId;
        unit.familiaNome = fam.nome || unit.familiaId;
        if (!unit.secaoId) unit.secaoId = fam.secaoId;
        if (!unit.secaoNome) unit.secaoNome = fam.secaoNome || getSectionLabel(fam.secaoId);
      }
    }
  });
}

function normalizarLinhasFatoRealizados(rows){
  return rows.map(raw => {
    const registroId = lerCelula(raw, ["Registro ID", "ID", "registro", "registro_id"]);
    if (!registroId) return null;

    const segmento = lerCelula(raw, ["Segmento"]);
    const segmentoId = lerCelula(raw, ["Segmento ID", "Id Segmento"]);
    const diretoriaId = lerCelula(raw, ["Diretoria ID", "Diretoria", "Id Diretoria", "Diretoria Codigo"]);
    const diretoriaNome = lerCelula(raw, ["Diretoria Nome", "Diretoria Regional"]) || diretoriaId;
    const gerenciaId = lerCelula(raw, ["Gerencia ID", "Gerencia Regional", "Id Gerencia Regional"]);
    const gerenciaNome = lerCelula(raw, ["Gerencia Nome", "Gerencia Regional", "Regional Nome"]) || gerenciaId;
    const regionalNome = lerCelula(raw, ["Regional Nome", "Regional"]) || gerenciaNome;
    const agenciaIdRaw = lerCelula(raw, ["Agencia ID", "Id Agencia", "Agência ID", "Agencia"]);
    const agenciaNome = lerCelula(raw, ["Agencia Nome", "Agência Nome", "Agencia"]);
    const agenciaCodigoRaw = lerCelula(raw, ["Agencia Codigo", "Código Agência", "Codigo Agencia"]);
    const agenciaCodigo = agenciaCodigoRaw || agenciaIdRaw || agenciaNome;
    const agenciaId = agenciaIdRaw || agenciaCodigoRaw || agenciaNome;
    const gerenteGestaoIdRaw = lerCelula(raw, [
      "Gerente Gestao ID",
      "Gerente Gestao",
      "Id Gerente de Gestao",
      "Id Gerente de Gestão",
      "gerenteGestaoId",
      "gerente_gestao_id"
    ]);
    const gerenteGestaoNomeRaw = lerCelula(raw, [
      "Gerente Gestao Nome",
      "Gerente de Gestao Nome",
      "Gerente de Gestão Nome",
      "Gerente de Gestao",
      "Gerente de Gestão",
      "Gerente Gestao",
      "gerenteGestaoNome",
      "gerente_gestao_nome"
    ]);
    const gerenteGestaoParsed = normalizeFuncionalPair(gerenteGestaoIdRaw, gerenteGestaoNomeRaw);
    const gerenteGestaoId = gerenteGestaoParsed.id;
    const gerenteGestaoNome = gerenteGestaoParsed.nome || gerenteGestaoParsed.label || gerenteGestaoId;
    const gerenteIdRaw = lerCelula(raw, ["Gerente ID", "Gerente"]);
    const gerenteNomeRaw = lerCelula(raw, ["Gerente Nome", "Gerente"]);
    const gerenteParsed = normalizeFuncionalPair(gerenteIdRaw, gerenteNomeRaw);
    const gerenteId = gerenteParsed.id;
    const gerenteNome = gerenteParsed.nome || gerenteParsed.label || gerenteId;
    let familiaId = lerCelula(raw, ["Familia ID", "Familia", "Família ID"]) || "";
    let familiaNome = lerCelula(raw, ["Familia Nome", "Família", "Familia"]) || familiaId;
    let produtoId = lerCelula(raw, ["id_indicador", "Produto ID", "Produto", "Id Produto"]);
    if (!produtoId) return null;
    let produtoNome = lerCelula(raw, ["ds_indicador", "Produto Nome", "Produto"]) || produtoId;
    let subproduto = lerCelula(raw, ["Subproduto", "Sub produto", "Sub-Produto"]);
    const familiaCodigoExtra = lerCelula(raw, ["Familia Codigo", "Familia Código", "FamiliaCod"]);
    const indicadorCodigoExtra = lerCelula(raw, ["Indicador Codigo", "Indicador Código", "IndicadorCod"]);
    const subCodigoExtra = lerCelula(raw, ["Subindicador Codigo", "Subindicador Código", "SubindicadorCod"]);
    const familiaCodigo = limparTexto(familiaCodigoExtra);
    if (familiaCodigo) {
      const familiaSlug = FAMILIA_CODE_TO_SLUG.get(familiaCodigo);
      if (familiaSlug && (!familiaId || familiaId === familiaCodigo)) {
        familiaId = familiaSlug;
        if (!familiaNome || familiaNome === familiaCodigo) {
          const famMeta = FAMILIA_BY_ID.get(familiaSlug);
          if (famMeta?.nome) familiaNome = famMeta.nome;
        }
      }
    }
    const indicadorCodigo = limparTexto(indicadorCodigoExtra);
    if (indicadorCodigo) {
      const indicadorSlug = INDICADOR_CODE_TO_SLUG.get(indicadorCodigo);
      if (indicadorSlug) {
        produtoId = indicadorSlug;
      }
    }
    const subCodigo = limparTexto(subCodigoExtra);
    const subSlug = subCodigo ? SUB_CODE_TO_SLUG.get(subCodigo) : "";
    const carteira = lerCelula(raw, ["Carteira"]);
    const canalVenda = lerCelula(raw, ["Canal Venda", "Canal"]);
    const tipoVenda = lerCelula(raw, ["Tipo Venda", "Tipo"]);
    const modalidadePagamento = lerCelula(raw, ["Modalidade Pagamento", "Modalidade"]);
    let data = converterDataISO(lerCelula(raw, ["Data", "Data Movimento", "Data Movimentacao", "Data Movimentação"]));
    let competencia = converterDataISO(lerCelula(raw, ["Competencia", "Competência"]));
    if (!data && competencia) {
      data = competencia;
    }
    if (!competencia && data) {
      competencia = `${data.slice(0, 7)}-01`;
    }
    const realizadoMens = toNumber(lerCelula(raw, ["Realizado Mensal", "Realizado"]));
    const realizadoAcum = toNumber(lerCelula(raw, ["Realizado Acumulado", "Realizado Acum"]));
    const quantidade = toNumber(lerCelula(raw, ["Quantidade", "Qtd"]));
    const variavelReal = toNumber(lerCelula(raw, ["Variavel Real", "Variável Real"]));

    const indicadorRes = resolveIndicatorFromDimension([produtoId, produtoNome, indicadorCodigoExtra]);
    if (indicadorRes) {
      if (indicadorRes.indicadorId) produtoId = indicadorRes.indicadorId;
      if (indicadorRes.indicadorNome) produtoNome = indicadorRes.indicadorNome;
      if (indicadorRes.familiaId) familiaId = indicadorRes.familiaId;
      if (indicadorRes.familiaNome) familiaNome = indicadorRes.familiaNome;
    }

    let resolvedSubId = subSlug;
    let resolvedSubNome = subproduto;
    const subRes = resolveSubIndicatorFromDimension([subSlug, subCodigo, subproduto], indicadorRes);
    if (subRes) {
      if (subRes.subId) resolvedSubId = subRes.subId;
      if (subRes.subNome) resolvedSubNome = subRes.subNome;
      if (subRes.familiaId && !familiaId) familiaId = subRes.familiaId;
      if (subRes.familiaNome && !familiaNome) familiaNome = subRes.familiaNome;
    }

    const base = {
      registroId,
      segmento,
      segmentoId,
      diretoria: diretoriaId || diretoriaNome,
      diretoriaId: diretoriaId || diretoriaNome,
      diretoriaNome,
      gerenciaRegional: gerenciaId || gerenciaNome,
      gerenciaId: gerenciaId || gerenciaNome,
      gerenciaNome,
      regional: regionalNome,
      agencia: agenciaId,
      agenciaId,
      agenciaNome: agenciaNome || agenciaCodigo || agenciaId,
      agenciaCodigo,
      gerenteGestao: gerenteGestaoId,
      gerenteGestaoId,
      gerenteGestaoNome,
      gerenteGestaoLabel: gerenteGestaoParsed.label,
      gerente: gerenteId,
      gerenteId,
      gerenteNome,
      gerenteLabel: gerenteParsed.label,
      familiaId,
      familiaNome,
      subproduto,
      carteira,
      canalVenda,
      tipoVenda,
      modalidadePagamento,
      data,
      competencia,
      realizado: realizadoMens,
      real_mens: realizadoMens,
      real_acum: realizadoAcum || realizadoMens,
      qtd: quantidade,
      variavelReal,
    };
    if (familiaCodigo) base.familiaCodigo = familiaCodigo;
    if (indicadorCodigo) base.indicadorCodigo = indicadorCodigo;
    if (subCodigo) base.subindicadorCodigo = subCodigo;
    if (resolvedSubId) {
      base.subprodutoId = resolvedSubId;
      base.subId = resolvedSubId;
      base.subindicadorId = resolvedSubId;
    }
    if (resolvedSubNome) {
      base.subproduto = resolvedSubNome;
      base.subProduto = resolvedSubNome;
      base.subindicadorNome = resolvedSubNome;
    }
    aplicarIndicadorAliases(base, produtoId, produtoNome);
    base.familiaId = familiaId;
    base.familiaNome = familiaNome;
    base.prodOrSub = resolvedSubNome || subproduto || base.produtoNome || base.produtoId;
    if (!base.gerenteGestaoId && base.agenciaId) {
      const derivedGg = deriveGerenteGestaoIdFromAgency(base.agenciaId || base.agencia);
      if (derivedGg) {
        base.gerenteGestao = derivedGg;
        base.gerenteGestaoId = derivedGg;
        if (!base.gerenteGestaoLabel) {
          base.gerenteGestaoLabel = labelGerenteGestao(derivedGg);
        }
        if (!base.gerenteGestaoNome || base.gerenteGestaoNome === base.gerenteGestao) {
          const ggEntry = getGerenteGestaoEntry(derivedGg);
          if (ggEntry) {
            base.gerenteGestaoNome = ggEntry.nome || extractNameFromLabel(ggEntry.label) || base.gerenteGestaoNome;
          }
        }
      }
    }
    return base;
  }).filter(Boolean);
}

// Aqui eu deixo o fato de metas com os mesmos padrões de datas e chaves dos realizados para facilitar os cruzamentos.
function normalizarLinhasFatoMetas(rows){
  return rows.map(raw => {
    const registroId = lerCelula(raw, ["Registro ID", "ID", "registro"]);
    if (!registroId) return null;

    const segmento = lerCelula(raw, ["Segmento"]);
    const segmentoId = lerCelula(raw, ["Segmento ID", "Id Segmento"]);
    const diretoriaId = lerCelula(raw, ["Diretoria ID", "Diretoria", "Id Diretoria"]);
    const diretoriaNome = lerCelula(raw, ["Diretoria Nome", "Diretoria Regional"]) || diretoriaId;
    const gerenciaId = lerCelula(raw, ["Gerencia ID", "Gerencia Regional", "Id Gerencia Regional"]);
    const gerenciaNome = lerCelula(raw, ["Gerencia Nome", "Gerencia Regional", "Regional Nome"]) || gerenciaId;
    const regionalNome = lerCelula(raw, ["Regional Nome", "Regional"]) || gerenciaNome;
    const agenciaIdRaw = lerCelula(raw, ["Agencia ID", "Agência ID", "Id Agencia"]);
    const agenciaCodigoRaw = lerCelula(raw, ["Agencia Codigo", "Agência Codigo", "Codigo Agencia"]);
    const agenciaNome = lerCelula(raw, ["Agencia Nome", "Agência Nome", "Agencia"])
      || agenciaCodigoRaw
      || agenciaIdRaw;
    const agenciaCodigo = agenciaCodigoRaw || agenciaIdRaw || agenciaNome;
    const agenciaId = agenciaIdRaw || agenciaCodigoRaw || agenciaNome;
    const gerenteGestaoIdRaw = lerCelula(raw, [
      "Gerente Gestao ID",
      "Gerente Gestao",
      "Id Gerente de Gestao",
      "Id Gerente de Gestão",
      "gerenteGestaoId",
      "gerente_gestao_id"
    ]);
    const gerenteGestaoNomeRaw = lerCelula(raw, [
      "Gerente Gestao Nome",
      "Gerente de Gestao Nome",
      "Gerente de Gestão Nome",
      "Gerente de Gestao",
      "Gerente de Gestão",
      "Gerente Gestao",
      "gerenteGestaoNome",
      "gerente_gestao_nome"
    ]);
    const gerenteGestaoParsed = normalizeFuncionalPair(gerenteGestaoIdRaw, gerenteGestaoNomeRaw);
    const gerenteGestaoId = gerenteGestaoParsed.id;
    const gerenteGestaoNome = gerenteGestaoParsed.nome || gerenteGestaoParsed.label || gerenteGestaoId;
    const gerenteIdRaw = lerCelula(raw, ["Gerente ID", "Gerente"]);
    const gerenteNomeRaw = lerCelula(raw, ["Gerente Nome", "Gerente"]);
    const gerenteParsed = normalizeFuncionalPair(gerenteIdRaw, gerenteNomeRaw);
    const gerenteId = gerenteParsed.id;
    const gerenteNome = gerenteParsed.nome || gerenteParsed.label || gerenteId;

    let familiaId = lerCelula(raw, ["Familia ID", "Familia", "Família ID"]);
    let familiaNome = lerCelula(raw, ["Familia Nome", "Família Nome", "Familia"]) || familiaId;
    let produtoId = lerCelula(raw, ["id_indicador", "Produto ID", "Produto", "Id Produto"]);
    let produtoNome = lerCelula(raw, ["ds_indicador", "Produto Nome", "Produto"]) || produtoId;
    let subproduto = lerCelula(raw, ["Subproduto", "Sub produto", "Sub-Produto"]);

    const familiaCodigoExtra = lerCelula(raw, ["Familia Codigo", "Familia Código", "FamiliaCod"]);
    const indicadorCodigoExtra = lerCelula(raw, ["Indicador Codigo", "Indicador Código", "IndicadorCod"]);
    const subCodigoExtra = lerCelula(raw, ["Subindicador Codigo", "Subindicador Código", "SubindicadorCod"]);
    const familiaCodigo = limparTexto(familiaCodigoExtra);
    if (familiaCodigo) {
      const familiaSlug = FAMILIA_CODE_TO_SLUG.get(familiaCodigo);
      if (familiaSlug && (!familiaId || familiaId === familiaCodigo)) {
        familiaId = familiaSlug;
        if (!familiaNome || familiaNome === familiaCodigo) {
          const famMeta = FAMILIA_BY_ID.get(familiaSlug);
          if (famMeta?.nome) familiaNome = famMeta.nome;
        }
      }
    }

    const indicadorCodigo = limparTexto(indicadorCodigoExtra);
    if (indicadorCodigo) {
      const indicadorSlug = INDICADOR_CODE_TO_SLUG.get(indicadorCodigo);
      if (indicadorSlug) {
        produtoId = indicadorSlug;
      }
    }

    const subCodigo = limparTexto(subCodigoExtra);
    const subSlug = subCodigo ? SUB_CODE_TO_SLUG.get(subCodigo) : "";
    const carteira = lerCelula(raw, ["Carteira"]);
    const canalVenda = lerCelula(raw, ["Canal Venda", "Canal"]);
    const tipoVenda = lerCelula(raw, ["Tipo Venda", "Tipo"]);
    const modalidadePagamento = lerCelula(raw, ["Modalidade Pagamento", "Modalidade"]);
    const metaMens = toNumber(lerCelula(raw, ["Meta Mensal", "Meta"]));
    const metaAcum = toNumber(lerCelula(raw, ["Meta Acumulada", "Meta Acum"]));
    const variavelMeta = toNumber(lerCelula(raw, ["Variavel Meta", "Variável Meta"]));
    const peso = toNumber(lerCelula(raw, ["Peso"]));
    let data = converterDataISO(lerCelula(raw, ["Data", "Data Competencia", "Data da Meta"]));
    let competencia = converterDataISO(lerCelula(raw, ["Competencia", "Competência"]));
    if (!data && competencia) {
      data = competencia;
    }
    if (!competencia && data) {
      competencia = `${data.slice(0, 7)}-01`;
    }

    const indicadorRes = resolveIndicatorFromDimension([produtoId, produtoNome, indicadorCodigoExtra]);
    if (indicadorRes) {
      if (indicadorRes.indicadorId) produtoId = indicadorRes.indicadorId;
      if (indicadorRes.indicadorNome) produtoNome = indicadorRes.indicadorNome;
      if (indicadorRes.familiaId) familiaId = indicadorRes.familiaId;
      if (indicadorRes.familiaNome) familiaNome = indicadorRes.familiaNome;
    }

    let resolvedSubId = subSlug;
    let resolvedSubNome = subproduto;
    const subRes = resolveSubIndicatorFromDimension([subSlug, subCodigo, subproduto], indicadorRes);
    if (subRes) {
      if (subRes.subId) resolvedSubId = subRes.subId;
      if (subRes.subNome) resolvedSubNome = subRes.subNome;
      if (subRes.familiaId && !familiaId) familiaId = subRes.familiaId;
      if (subRes.familiaNome && !familiaNome) familiaNome = subRes.familiaNome;
    }

    const base = {
      registroId,
      segmento,
      segmentoId,
      diretoria: diretoriaId || diretoriaNome,
      diretoriaId: diretoriaId || diretoriaNome,
      diretoriaNome,
      gerenciaRegional: gerenciaId || gerenciaNome,
      gerenciaId: gerenciaId || gerenciaNome,
      gerenciaNome,
      regional: regionalNome,
      agencia: agenciaId,
      agenciaId,
      agenciaNome,
      agenciaCodigo,
      gerenteGestao: gerenteGestaoId,
      gerenteGestaoId,
      gerenteGestaoNome,
      gerenteGestaoLabel: gerenteGestaoParsed.label,
      gerente: gerenteId,
      gerenteId,
      gerenteNome,
      gerenteLabel: gerenteParsed.label,
      familiaId,
      familiaNome,
      subproduto,
      carteira,
      canalVenda,
      tipoVenda,
      modalidadePagamento,
      data,
      competencia,
      meta: metaMens,
      meta_mens: metaMens,
      meta_acum: metaAcum || metaMens,
      variavelMeta,
      peso,
    };
    if (familiaCodigo) base.familiaCodigo = familiaCodigo;
    if (indicadorCodigo) base.indicadorCodigo = indicadorCodigo;
    if (subCodigo) base.subindicadorCodigo = subCodigo;
    if (resolvedSubId) {
      base.subprodutoId = resolvedSubId;
      base.subId = resolvedSubId;
      base.subindicadorId = resolvedSubId;
    }
    if (resolvedSubNome) {
      base.subproduto = resolvedSubNome;
      base.subProduto = resolvedSubNome;
      base.subindicadorNome = resolvedSubNome;
    }
    aplicarIndicadorAliases(base, produtoId, produtoNome);
    base.familiaId = familiaId;
    base.familiaNome = familiaNome;
    base.prodOrSub = resolvedSubNome || subproduto || base.produtoNome || base.produtoId;
    if (!base.gerenteGestaoId && base.agenciaId) {
      const derivedGg = deriveGerenteGestaoIdFromAgency(base.agenciaId || base.agencia);
      if (derivedGg) {
        base.gerenteGestao = derivedGg;
        base.gerenteGestaoId = derivedGg;
        if (!base.gerenteGestaoLabel) {
          base.gerenteGestaoLabel = labelGerenteGestao(derivedGg);
        }
        if (!base.gerenteGestaoNome || base.gerenteGestaoNome === base.gerenteGestao) {
          const ggEntry = getGerenteGestaoEntry(derivedGg);
          if (ggEntry) {
            base.gerenteGestaoNome = ggEntry.nome || extractNameFromLabel(ggEntry.label) || base.gerenteGestaoNome;
          }
        }
      }
    }
    return base;
  }).filter(Boolean);
}

// Aqui eu trato o fato variável (pontos) porque ele vem com os nomes de colunas diferentes das outras bases.
function normalizarLinhasFatoVariavel(rows){
  return rows.map(raw => {
    const registroId = lerCelula(raw, ["Registro ID", "ID", "registro"]);
    if (!registroId) return null;
    let produtoId = lerCelula(raw, ["id_indicador", "Produto ID", "Produto", "Id Produto"]);
    let produtoNome = lerCelula(raw, ["ds_indicador", "Produto Nome", "Produto"]) || produtoId;
    let familiaId = lerCelula(raw, ["Familia ID", "Familia", "Família ID"]);
    let familiaNome = lerCelula(raw, ["Familia Nome", "Família Nome", "Familia"]) || familiaId;
    const familiaCodigoExtra = lerCelula(raw, ["Familia Codigo", "Familia Código", "FamiliaCod"]);
    const indicadorCodigoExtra = lerCelula(raw, ["Indicador Codigo", "Indicador Código", "IndicadorCod"]);
    const subCodigoExtra = lerCelula(raw, ["Subindicador Codigo", "Subindicador Código", "SubindicadorCod"]);
    const familiaCodigo = limparTexto(familiaCodigoExtra);
    if (familiaCodigo) {
      const familiaSlug = FAMILIA_CODE_TO_SLUG.get(familiaCodigo);
      if (familiaSlug && (!familiaId || familiaId === familiaCodigo)) {
        familiaId = familiaSlug;
        if (!familiaNome || familiaNome === familiaCodigo) {
          const famMeta = FAMILIA_BY_ID.get(familiaSlug);
          if (famMeta?.nome) familiaNome = famMeta.nome;
        }
      }
    }
    const indicadorCodigo = limparTexto(indicadorCodigoExtra);
    if (indicadorCodigo) {
      const indicadorSlug = INDICADOR_CODE_TO_SLUG.get(indicadorCodigo);
      if (indicadorSlug) {
        produtoId = indicadorSlug;
      }
    }
    const subCodigo = limparTexto(subCodigoExtra);
    const subSlug = subCodigo ? SUB_CODE_TO_SLUG.get(subCodigo) : "";
    const variavelMeta = toNumber(lerCelula(raw, ["Variavel Meta", "Variável Meta"]));
    const variavelReal = toNumber(lerCelula(raw, ["Variavel Real", "Variável Real"]));
    let data = converterDataISO(lerCelula(raw, ["Data"]));
    let competencia = converterDataISO(lerCelula(raw, ["Competencia", "Competência"]));
    if (!data && competencia) {
      data = competencia;
    }
    if (!competencia && data) {
      competencia = `${data.slice(0, 7)}-01`;
    }
    const indicadorRes = resolveIndicatorFromDimension([produtoId, produtoNome, indicadorCodigoExtra]);
    if (indicadorRes) {
      if (indicadorRes.indicadorId) produtoId = indicadorRes.indicadorId;
      if (indicadorRes.indicadorNome) produtoNome = indicadorRes.indicadorNome;
      if (indicadorRes.familiaId) familiaId = indicadorRes.familiaId;
      if (indicadorRes.familiaNome) familiaNome = indicadorRes.familiaNome;
    }

    let resolvedSubId = subSlug;
    let resolvedSubNome = "";
    const subRes = resolveSubIndicatorFromDimension([subSlug, subCodigo], indicadorRes);
    if (subRes) {
      if (subRes.subId) resolvedSubId = subRes.subId;
      if (subRes.subNome) resolvedSubNome = subRes.subNome;
      if (subRes.familiaId && !familiaId) familiaId = subRes.familiaId;
      if (subRes.familiaNome && !familiaNome) familiaNome = subRes.familiaNome;
    }

    const base = {
      registroId,
      familiaId,
      familiaNome,
      data,
      competencia,
      variavelMeta,
      variavelReal,
    };
    if (familiaCodigo) base.familiaCodigo = familiaCodigo;
    if (indicadorCodigo) base.indicadorCodigo = indicadorCodigo;
    if (subCodigo) base.subindicadorCodigo = subCodigo;
    if (resolvedSubId) {
      base.subprodutoId = resolvedSubId;
      base.subId = resolvedSubId;
      base.subindicadorId = resolvedSubId;
    }
    if (resolvedSubNome) {
      base.subproduto = resolvedSubNome;
      base.subProduto = resolvedSubNome;
      base.subindicadorNome = resolvedSubNome;
    }
    aplicarIndicadorAliases(base, produtoId, produtoNome);
    base.familiaId = familiaId;
    base.familiaNome = familiaNome;
    base.prodOrSub = resolvedSubNome || base.produtoNome || base.produtoId;
    return base;
  }).filter(Boolean);
}

function extractFactKeyValues(entry = {}) {
  return {
    registro: limparTexto(entry.registroId || entry.registroid),
    produto: limparTexto(entry.produtoId || entry.indicadorId || entry.id_indicador),
    sub: limparTexto(
      entry.subId
      || entry.subindicadorId
      || entry.subprodutoId
      || entry.subindicador
      || entry.subproduto
    ),
    competencia: limparTexto(entry.competencia || entry.data),
    data: limparTexto(entry.data || entry.competencia),
    agencia: limparTexto(entry.agenciaId || entry.agenciaCodigo || entry.agencia),
    gerente: limparTexto(entry.gerenteId || entry.gerente),
    gerenteGestao: limparTexto(entry.gerenteGestaoId || entry.gerenteGestao),
    diretoria: limparTexto(entry.diretoriaId || entry.diretoria),
    gerencia: limparTexto(entry.gerenciaId || entry.gerenciaRegional),
    segmento: limparTexto(entry.segmentoId || entry.segmento),
    familia: limparTexto(entry.familiaId || entry.familia),
  };
}

function composeFactKey(parts){
  const list = Array.isArray(parts) ? parts : [parts];
  const filtered = [];
  list.forEach(part => {
    if (!part) return;
    if (Array.isArray(part)) {
      part.forEach(sub => {
        if (sub && sub.key && sub.value) filtered.push(`${sub.key}|${sub.value}`);
      });
    } else if (part.key && part.value) {
      filtered.push(`${part.key}|${part.value}`);
    }
  });
  if (!filtered.length) return "";
  return filtered.join("|");
}

function addFactLookupKey(set, ...parts){
  if (!(set instanceof Set)) return;
  const key = composeFactKey(parts);
  if (key) set.add(key);
}

function computeFactLookupKeys(entry = {}) {
  const values = extractFactKeyValues(entry);
  const keys = new Set();
  if (values.registro) keys.add(`id|${values.registro}`);
  if (!values.produto) return Array.from(keys);

  const prodPart = { key: "prod", value: values.produto };
  const subPart = values.sub ? { key: "sub", value: values.sub } : null;
  const compPart = values.competencia ? { key: "comp", value: values.competencia } : null;
  const dataPart = values.data ? { key: "data", value: values.data } : null;
  const agPart = values.agencia ? { key: "ag", value: values.agencia } : null;
  const gerPart = values.gerente ? { key: "ger", value: values.gerente } : null;
  const ggPart = values.gerenteGestao ? { key: "gg", value: values.gerenteGestao } : null;
  const dirPart = values.diretoria ? { key: "dir", value: values.diretoria } : null;
  const grPart = values.gerencia ? { key: "gr", value: values.gerencia } : null;
  const segPart = values.segmento ? { key: "seg", value: values.segmento } : null;
  const famPart = values.familia ? { key: "fam", value: values.familia } : null;

  addFactLookupKey(keys, prodPart, subPart, compPart, agPart, gerPart, ggPart);
  addFactLookupKey(keys, prodPart, subPart, compPart, agPart);
  addFactLookupKey(keys, prodPart, subPart, compPart, dirPart, grPart);
  addFactLookupKey(keys, prodPart, subPart, compPart, segPart);
  addFactLookupKey(keys, prodPart, subPart, compPart, famPart);
  addFactLookupKey(keys, prodPart, subPart, compPart);
  addFactLookupKey(keys, prodPart, subPart, dataPart);
  addFactLookupKey(keys, prodPart, compPart, agPart);
  addFactLookupKey(keys, prodPart, compPart);
  addFactLookupKey(keys, prodPart, dataPart);
  addFactLookupKey(keys, prodPart, subPart);

  return Array.from(keys).filter(Boolean);
}

function buildFactLookupMap(list = []) {
  const map = new Map();
  list.forEach(entry => {
    if (!entry) return;
    const keys = computeFactLookupKeys(entry);
    keys.forEach(key => {
      if (key && !map.has(key)) map.set(key, entry);
    });
  });
  return map;
}

function findFactMatch(row = {}, lookup){
  if (!row || !(lookup instanceof Map)) return null;
  const values = extractFactKeyValues(row);
  if (values.registro) {
    const direct = lookup.get(`id|${values.registro}`);
    if (direct) return direct;
  }
  if (!values.produto) return null;

  const prodPart = { key: "prod", value: values.produto };
  const subPart = values.sub ? { key: "sub", value: values.sub } : null;
  const compPart = values.competencia ? { key: "comp", value: values.competencia } : null;
  const dataPart = values.data ? { key: "data", value: values.data } : null;
  const agPart = values.agencia ? { key: "ag", value: values.agencia } : null;
  const gerPart = values.gerente ? { key: "ger", value: values.gerente } : null;
  const ggPart = values.gerenteGestao ? { key: "gg", value: values.gerenteGestao } : null;
  const dirPart = values.diretoria ? { key: "dir", value: values.diretoria } : null;
  const grPart = values.gerencia ? { key: "gr", value: values.gerencia } : null;
  const segPart = values.segmento ? { key: "seg", value: values.segmento } : null;
  const famPart = values.familia ? { key: "fam", value: values.familia } : null;

  const searchOrder = [
    [prodPart, subPart, compPart, agPart, gerPart, ggPart],
    [prodPart, subPart, compPart, agPart],
    [prodPart, subPart, compPart, dirPart, grPart],
    [prodPart, subPart, compPart, segPart],
    [prodPart, subPart, compPart, famPart],
    [prodPart, subPart, compPart],
    [prodPart, subPart, dataPart],
    [prodPart, compPart, agPart],
    [prodPart, compPart],
    [prodPart, dataPart],
    [prodPart, subPart],
  ];

  for (const parts of searchOrder) {
    const key = composeFactKey(parts);
    if (!key) continue;
    const match = lookup.get(key);
    if (match) return match;
  }

  return null;
}

// Aqui eu padronizo os dados das campanhas porque preciso ligar sprint, unidade e indicadores rapidamente.
function normalizarLinhasFatoCampanhas(rows){
  return rows.map(raw => {
    const id = lerCelula(raw, ["Campanha ID", "ID"]);
    if (!id) return null;
    const sprintId = lerCelula(raw, ["Sprint ID", "Sprint"]);
    const diretoriaId = lerCelula(raw, ["Diretoria", "Diretoria ID", "Id Diretoria"]);
    const diretoriaNome = lerCelula(raw, ["Diretoria Nome", "Diretoria Regional"]) || diretoriaId;
    const gerenciaId = lerCelula(raw, ["Gerencia Regional", "Gerencia ID", "Id Gerencia"]);
    const regionalNome = lerCelula(raw, ["Regional Nome", "Regional"]) || gerenciaId;
    const agenciaCodigoRaw = lerCelula(raw, ["Agencia Codigo", "Agencia ID", "Código Agência", "Agência Codigo"]);
    const agenciaNome = lerCelula(raw, ["Agencia Nome", "Agência Nome", "Agencia"]) || agenciaCodigoRaw;
    const agenciaId = agenciaCodigoRaw || agenciaNome;
    const gerenteGestaoIdRaw = lerCelula(raw, [
      "Gerente Gestao",
      "Gerente Gestao ID",
      "Gerente de Gestao",
      "Gerente de Gestão",
      "gerenteGestaoId",
      "gerente_gestao_id"
    ]);
    const gerenteGestaoNome = lerCelula(raw, [
      "Gerente Gestao Nome",
      "Gerente de Gestao Nome",
      "Gerente de Gestão Nome",
      "Gerente Gestao",
      "Gerente de Gestao",
      "Gerente de Gestão",
      "gerenteGestaoNome",
      "gerente_gestao_nome"
    ]) || gerenteGestaoIdRaw;
    const gerenteGestaoId = gerenteGestaoIdRaw || gerenteGestaoNome;
    const gerenteIdRaw = lerCelula(raw, ["Gerente", "Gerente ID"]);
    const gerenteNome = lerCelula(raw, ["Gerente Nome"]) || gerenteIdRaw;
    const gerenteId = gerenteIdRaw || gerenteNome;
    const segmento = lerCelula(raw, ["Segmento"]);
    let familiaId = lerCelula(raw, ["Familia ID", "Família ID", "Familia"]);
    let familiaNome = lerCelula(raw, ["Familia Nome", "Família Nome"]) || familiaId;
    let produtoId = lerCelula(raw, ["id_indicador", "Produto ID", "Produto"]);
    if (!produtoId) return null;
    const produtoNome = lerCelula(raw, ["ds_indicador", "Produto Nome", "Produto"]) || produtoId;
    const subproduto = lerCelula(raw, ["Subproduto", "Sub produto"]);
    const familiaCodigoExtra = lerCelula(raw, ["Familia Codigo", "Familia Código", "FamiliaCod"]);
    const indicadorCodigoExtra = lerCelula(raw, ["Indicador Codigo", "Indicador Código", "IndicadorCod"]);
    const subCodigoExtra = lerCelula(raw, ["Subindicador Codigo", "Subindicador Código", "SubindicadorCod"]);
    const familiaCodigo = limparTexto(familiaCodigoExtra);
    if (familiaCodigo) {
      const familiaSlug = FAMILIA_CODE_TO_SLUG.get(familiaCodigo);
      if (familiaSlug && (!familiaId || familiaId === familiaCodigo)) {
        familiaId = familiaSlug;
        if (!familiaNome || familiaNome === familiaCodigo) {
          const famMeta = FAMILIA_BY_ID.get(familiaSlug);
          if (famMeta?.nome) familiaNome = famMeta.nome;
        }
      }
    }
    const indicadorCodigo = limparTexto(indicadorCodigoExtra);
    if (indicadorCodigo) {
      const indicadorSlug = INDICADOR_CODE_TO_SLUG.get(indicadorCodigo);
      if (indicadorSlug) {
        produtoId = indicadorSlug;
      }
    }
    const subCodigo = limparTexto(subCodigoExtra);
    const subSlug = subCodigo ? SUB_CODE_TO_SLUG.get(subCodigo) : "";
    const carteira = lerCelula(raw, ["Carteira"]);
    const linhas = toNumber(lerCelula(raw, ["Linhas"]));
    const cash = toNumber(lerCelula(raw, ["Cash"]));
    const conquista = toNumber(lerCelula(raw, ["Conquista"]));
    const atividade = converterBooleano(lerCelula(raw, ["Atividade", "Ativo", "Status"]), true);
    let data = converterDataISO(lerCelula(raw, ["Data"]));
    let competencia = converterDataISO(lerCelula(raw, ["Competencia", "Competência"]));
    if (!data && competencia) {
      data = competencia;
    }
    if (!competencia && data) {
      competencia = `${data.slice(0, 7)}-01`;
    }

    const base = {
      id,
      sprintId,
      diretoria: diretoriaId || diretoriaNome,
      diretoriaId: diretoriaId || diretoriaNome,
      diretoriaNome,
      gerenciaRegional: gerenciaId || regionalNome,
      gerenciaId: gerenciaId || regionalNome,
      regional: regionalNome,
      agenciaCodigo: agenciaCodigoRaw || agenciaId,
      agencia: agenciaId,
      agenciaId,
      agenciaNome,
      gerenteGestao: gerenteGestaoId,
      gerenteGestaoId,
      gerenteGestaoNome,
      gerente: gerenteId,
      gerenteId,
      gerenteNome,
      segmento,
      familiaId,
      familiaNome,
      subproduto,
      carteira,
      linhas,
      cash,
      conquista,
      atividade,
      data,
      competencia,
    };
    if (familiaCodigo) base.familiaCodigo = familiaCodigo;
    if (indicadorCodigo) base.indicadorCodigo = indicadorCodigo;
    if (subCodigo) base.subindicadorCodigo = subCodigo;
    if (subSlug) base.subprodutoId = subSlug;
    aplicarIndicadorAliases(base, produtoId, produtoNome);
    return base;
  }).filter(Boolean);
}

// Aqui eu organizo o calendário corporativo (competências) para usar nas telas de período.
function normalizarLinhasCalendario(rows){
  return rows.map(raw => {
    const data = converterDataISO(lerCelula(raw, ["Data"]));
    if (!data) return null;
    const competencia = converterDataISO(lerCelula(raw, ["Competencia", "Competência"])) || `${data.slice(0, 7)}-01`;
    const ano = lerCelula(raw, ["Ano"]) || data.slice(0, 4);
    const mes = lerCelula(raw, ["Mes", "Mês"]) || data.slice(5, 7);
    const mesNome = lerCelula(raw, ["Mes Nome", "Mês Nome"]);
    const dia = lerCelula(raw, ["Dia"]) || data.slice(8, 10);
    const diaSemana = lerCelula(raw, ["Dia da Semana"]);
    const semana = lerCelula(raw, ["Semana"]);
    const trimestre = lerCelula(raw, ["Trimestre"]);
    const semestre = lerCelula(raw, ["Semestre"]);
    const ehDiaUtil = converterBooleano(lerCelula(raw, ["Eh Dia Util", "É Dia Útil", "Dia Util"]), false) ? 1 : 0;
    const mesAnoCurto = construirEtiquetaMesAno(ano, mes, mesNome);
    return { data, competencia, ano, mes, mesNome, mesAnoCurto, dia, diaSemana, semana, trimestre, semestre, ehDiaUtil };
  }).filter(Boolean).sort((a, b) => (a.data || "").localeCompare(b.data || ""));
}

// Aqui eu trato a base de status dos indicadores para poder exibir os nomes amigáveis e a ordem certa.
function normalizarLinhasStatus(rows){
  const normalized = [];
  const seen = new Set();
  const missing = new Set();
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) {
    console.warn("Status_Indicadores.csv não encontrado ou vazio; aplicando valores padrão.");
  }

  const register = (candidate = {}) => {
    const rawKey = pegarPrimeiroPreenchido(
      candidate.key,
      candidate.slug,
      candidate.id,
      candidate.codigo,
      candidate.nome
    );
    const resolvedKey = normalizarChaveStatus(rawKey);
    if (!resolvedKey) return false;
    if (seen.has(resolvedKey)) return true;

    const codigo = limparTexto(candidate.codigo)
      || limparTexto(candidate.id)
      || resolvedKey;
    const nome = limparTexto(candidate.nome)
      || STATUS_LABELS[resolvedKey]
      || limparTexto(candidate.label)
      || codigo
      || resolvedKey;
    const originalId = limparTexto(candidate.id) || codigo || resolvedKey;
    const ordemRaw = limparTexto(candidate.ordem);
    const ordemNum = Number(ordemRaw);
    const ordem = ordemRaw !== "" && Number.isFinite(ordemNum) ? ordemNum : undefined;

    const entry = { id: originalId, codigo, nome, key: resolvedKey };
    if (ordem !== undefined) entry.ordem = ordem;

    normalized.push(entry);
    seen.add(resolvedKey);
    return true;
  };

  list.forEach(raw => {
    if (!raw || typeof raw !== "object") return;
    const nome = lerCelula(raw, ["Status Nome", "Status", "Nome", "Descrição", "Descricao"]);
    const codigo = lerCelula(raw, ["Status Id", "StatusID", "id", "ID", "Codigo", "Código"]);
    const chave = lerCelula(raw, ["Status Chave", "Status Key", "Chave", "Slug"]);
    const ordem = lerCelula(raw, ["Ordem", "Order", "Posicao", "Posição", "Sequencia", "Sequência"]);
    const key = pegarPrimeiroPreenchido(chave, codigo, nome);
    const ok = register({ id: codigo || key, codigo, nome, key, ordem });
    if (!ok) {
      const fallback = pegarPrimeiroPreenchido(nome, codigo, chave);
      if (fallback) missing.add(fallback);
    }
  });

  DEFAULT_STATUS_INDICADORES.forEach(item => register(item));

  if (missing.size) {
    console.warn(`Status sem identificador válido: ${Array.from(missing).join(", ")}`);
  }

  return normalized;
}

function normalizarDimProdutos(rows){
  const list = Array.isArray(rows) ? rows : [];
  return list.map(raw => {
    const familiaCodigoRaw = lerCelula(raw, [
      "idFamilia", "IdFamilia", "ID Familia", "Id Familia", "Familia ID"
    ]);
    const familiaSlugRaw = lerCelula(raw, [
      "FamiliaSlug", "SlugFamilia", "Familia Slug", "Familia Chave", "Familia Codigo Alternativo"
    ]);
    const familiaNomeRaw = lerCelula(raw, [
      "Familia", "Família", "Nome Familia", "Nome Família"
    ]);
    const indicadorCodigoRaw = lerCelula(raw, [
      "IdIndicador", "ID Indicador", "Indicador ID", "Indicador Codigo", "Indicador Código"
    ]);
    const indicadorSlugRaw = lerCelula(raw, [
      "IndicadorSlug", "SlugIndicador", "Indicador Slug", "Indicador Chave", "CardId"
    ]);
    const indicadorNomeRaw = lerCelula(raw, [
      "Indicador", "Nome Indicador", "Nome indicador"
    ]);
    const indicadorAliasesRaw = raw?.indicadorAliases
      ?? raw?.IndicadorAliases
      ?? raw?.aliases
      ?? raw?.Aliases
      ?? lerCelula(raw, ["Indicador Aliases", "Indicador Alias", "Aliases Indicador", "IndicadorAliases"]);
    const subCodigoRaw = lerCelula(raw, [
      "idSubindicador", "IdSubindicador", "ID Subindicador", "Subindicador ID", "Subindicador Codigo", "Subindicador Código"
    ]);
    const subSlugRaw = lerCelula(raw, [
      "SubindicadorSlug", "SlugSubindicador", "Subindicador Slug", "Subindicador Chave", "SubprodutoSlug"
    ]);
    const subNomeRaw = lerCelula(raw, [
      "Subindicador", "Nome Subindicador", "Sub Indicador"
    ]);
    const subAliasesRaw = raw?.subIndicadorAliases
      ?? raw?.SubIndicadorAliases
      ?? raw?.subAliases
      ?? raw?.SubAliases
      ?? lerCelula(raw, ["Subindicador Aliases", "Subindicador Alias", "Aliases Subindicador", "SubindicadorAliases"]);

    const familiaNome = limparTexto(familiaNomeRaw) || "Indicador";
    const familiaCodigo = limparTexto(familiaCodigoRaw);
    let familiaId = limparTexto(familiaSlugRaw);
    if (!familiaId) {
      if (familiaCodigo && /[^0-9]/.test(familiaCodigo)) {
        familiaId = familiaCodigo;
      } else {
        const slug = simplificarTexto(familiaNome);
        familiaId = slug ? slug.replace(/\s+/g, "_") : "";
      }
    }

    const indicadorNome = limparTexto(indicadorNomeRaw) || "Indicador";
    const indicadorCodigo = limparTexto(indicadorCodigoRaw);
    let indicadorId = limparTexto(indicadorSlugRaw);
    if (!indicadorId) {
      if (indicadorCodigo && /[^0-9]/.test(indicadorCodigo)) {
        indicadorId = indicadorCodigo;
      } else {
        const slug = simplificarTexto(indicadorNome);
        indicadorId = slug ? slug.replace(/\s+/g, "_") : "";
      }
    }

    const subNomeLimpo = limparTexto(subNomeRaw);
    const subCodigo = limparTexto(subCodigoRaw);
    let subId = limparTexto(subSlugRaw);
    const subCodigoValido = subCodigo && subCodigo !== "-" ? subCodigo : "";
    const hasSub = Boolean(subId) || Boolean(subCodigoValido && subCodigoValido !== "0") || Boolean(subNomeLimpo);
    if (!hasSub) {
      return {
        familiaCodigo,
        familiaId,
        familiaNome,
        indicadorCodigo,
        indicadorId,
        indicadorNome,
        subCodigo: "",
        subId: "",
        subNome: ""
      };
    }

    if (!subId) {
      if (subCodigoValido && /[^0-9]/.test(subCodigoValido) && !subNomeLimpo) {
        subId = subCodigoValido;
      } else {
        const slug = subNomeLimpo ? simplificarTexto(subNomeLimpo) : simplificarTexto(subCodigoValido);
        subId = slug ? slug.replace(/\s+/g, "_") : subCodigoValido;
      }
    }

    const subNome = subNomeLimpo || subId || subCodigoValido || "";
    const indicadorAliases = parseAliasList(indicadorAliasesRaw);
    const subAliases = parseAliasList(subAliasesRaw);

    return {
      familiaCodigo,
      familiaId,
      familiaNome,
      indicadorCodigo,
      indicadorId,
      indicadorNome,
      indicadorAliases,
      subCodigo: subCodigoValido,
      subId,
      subNome,
      subAliases
    };
  }).filter(row => row.indicadorId);
}

function resetGlobalDimensionAliasIndex(){
  GLOBAL_INDICATOR_ALIAS_INDEX.clear();
  GLOBAL_INDICATOR_META.clear();
  GLOBAL_SUB_ALIAS_INDEX.clear();
  GLOBAL_SUB_BY_INDICATOR.clear();
}

function registerGlobalIndicatorAliasEntry(meta, alias){
  const key = simplificarTexto(alias);
  if (!key) return;
  let list = GLOBAL_INDICATOR_ALIAS_INDEX.get(key);
  if (!list) {
    list = [];
    GLOBAL_INDICATOR_ALIAS_INDEX.set(key, list);
  }
  if (!list.some(entry => entry.key === meta.key)) {
    list.push(meta);
  }
}

function registerGlobalSubAliasEntry(meta, alias){
  const key = simplificarTexto(alias);
  if (!key) return;
  let list = GLOBAL_SUB_ALIAS_INDEX.get(key);
  if (!list) {
    list = [];
    GLOBAL_SUB_ALIAS_INDEX.set(key, list);
  }
  if (!list.some(entry => entry.indicadorKey === meta.indicadorKey && entry.subId === meta.subId)) {
    list.push(meta);
  }
}

function rebuildGlobalDimensionAliasIndex(){
  resetGlobalDimensionAliasIndex();
  const list = Array.isArray(DIM_PRODUTOS) ? DIM_PRODUTOS : [];
  list.forEach(row => {
    if (!row) return;
    const indicadorId = limparTexto(row.indicadorId);
    if (!indicadorId) return;
    const indicadorNome = limparTexto(row.indicadorNome) || indicadorId;
    const familiaId = limparTexto(row.familiaId) || limparTexto(row.familiaSlug) || limparTexto(row.familiaCodigo) || "";
    const familiaNome = limparTexto(row.familiaNome) || limparTexto(row.familia) || familiaId;
    const indicatorKey = indicadorId;
    let indicatorMeta = GLOBAL_INDICATOR_META.get(indicatorKey);
    if (!indicatorMeta) {
      indicatorMeta = {
        indicadorId,
        indicadorNome,
        familiaId,
        familiaNome,
        key: indicatorKey,
        aliases: new Set(),
      };
      GLOBAL_INDICATOR_META.set(indicatorKey, indicatorMeta);
    } else {
      if (indicadorNome) indicatorMeta.indicadorNome = indicadorNome;
      if (familiaId) indicatorMeta.familiaId = familiaId;
      if (familiaNome) indicatorMeta.familiaNome = familiaNome;
    }

    const aliasCandidates = [
      indicadorId,
      indicadorNome,
      limparTexto(row.indicadorCodigo),
      ...(Array.isArray(row.indicadorAliases) ? row.indicadorAliases : [])
    ];
    aliasCandidates.forEach(alias => {
      const texto = limparTexto(alias);
      if (!texto) return;
      indicatorMeta.aliases.add(texto);
      registerGlobalIndicatorAliasEntry(indicatorMeta, texto);
    });

    let subMap = GLOBAL_SUB_BY_INDICATOR.get(indicatorKey);
    if (!subMap) {
      subMap = new Map();
      GLOBAL_SUB_BY_INDICATOR.set(indicatorKey, subMap);
    }

    const subId = limparTexto(row.subId);
    if (subId) {
      const subNome = limparTexto(row.subNome) || subId;
      const subKey = `${indicatorKey}::${subId}`;
      let subMeta = subMap.get(subId);
      if (!subMeta) {
        subMeta = {
          indicadorId,
          indicadorKey: indicatorKey,
          subId,
          subNome,
          familiaId,
          familiaNome,
          key: subKey,
          aliases: new Set(),
        };
        subMap.set(subId, subMeta);
      } else {
        if (subNome) subMeta.subNome = subNome;
        if (familiaId) subMeta.familiaId = familiaId;
        if (familiaNome) subMeta.familiaNome = familiaNome;
      }

      const subAliasCandidates = [
        subId,
        subNome,
        limparTexto(row.subCodigo),
        ...(Array.isArray(row.subAliases) ? row.subAliases : [])
      ];
      subAliasCandidates.forEach(alias => {
        const texto = limparTexto(alias);
        if (!texto) return;
        subMeta.aliases.add(texto);
        registerGlobalSubAliasEntry(subMeta, texto);
      });
    }
  });
}

function resolveIndicatorFromDimension(candidates) {
  const values = Array.isArray(candidates) ? candidates : [candidates];
  const aliases = [];
  values.forEach(value => {
    const texto = limparTexto(value);
    if (!texto) return;
    aliases.push(texto);
    const slug = simplificarTexto(texto);
    if (slug && slug !== texto) aliases.push(slug);
  });
  for (const alias of aliases) {
    const key = simplificarTexto(alias);
    if (!key) continue;
    const entries = GLOBAL_INDICATOR_ALIAS_INDEX.get(key);
    if (!entries || !entries.length) continue;
    return entries[0];
  }
  return null;
}

function resolveSubIndicatorFromDimension(candidates, indicatorMeta = null) {
  const indicatorKey = indicatorMeta?.key || "";
  const values = Array.isArray(candidates) ? candidates : [candidates];
  const aliases = [];
  values.forEach(value => {
    const texto = limparTexto(value);
    if (!texto) return;
    aliases.push(texto);
    const slug = simplificarTexto(texto);
    if (slug && slug !== texto) aliases.push(slug);
  });

  if (indicatorKey && GLOBAL_SUB_BY_INDICATOR.has(indicatorKey)) {
    const subMap = GLOBAL_SUB_BY_INDICATOR.get(indicatorKey);
    for (const alias of aliases) {
      const key = simplificarTexto(alias);
      if (!key) continue;
      for (const entry of subMap.values()) {
        if (entry.aliases.has(alias) || entry.aliases.has(key)) {
          return entry;
        }
      }
    }
  }

  for (const alias of aliases) {
    const key = simplificarTexto(alias);
    if (!key) continue;
    const entries = GLOBAL_SUB_ALIAS_INDEX.get(key);
    if (!entries || !entries.length) continue;
    if (indicatorKey) {
      const indicatorMatch = entries.find(entry => entry.indicadorKey === indicatorKey);
      if (indicatorMatch) return indicatorMatch;
    }
    return entries[0];
  }
  return null;
}

function normalizarLinhasFatoDetalhes(rows){
  if (!Array.isArray(rows)) return [];

  return rows.map(raw => {
    const contratoId = limparTexto(lerCelula(raw, ["Contrato ID", "contrato_id", "Contrato", "Id Contrato", "ID Contrato"]));
    const registroId = limparTexto(lerCelula(raw, ["Registro ID", "registro_id", "Registro", "Id Registro", "ID Registro"]));
    if (!contratoId || !registroId) return null;

    const segmentoId = limparTexto(lerCelula(raw, ["Segmento ID", "segmento_id", "segmentoId"]));
    const segmento = limparTexto(lerCelula(raw, ["Segmento", "segmento"])) || segmentoId;
    const diretoriaId = limparTexto(lerCelula(raw, ["Diretoria ID", "diretoria_id", "diretoriaId"]));
    const diretoriaNome = limparTexto(lerCelula(raw, ["Diretoria Nome", "Diretoria Regional", "diretoria_nome"])) || diretoriaId;
    const gerenciaId = limparTexto(lerCelula(raw, ["Gerencia Regional ID", "Gerencia ID", "gerencia_regional_id", "gerenciaId", "regional_id"]));
    const gerenciaNome = limparTexto(lerCelula(raw, ["Gerencia Regional Nome", "Regional Nome", "gerencia_regional_nome", "gerenciaNome"])) || gerenciaId;
    const agenciaId = limparTexto(lerCelula(raw, ["Agencia ID", "Agência ID", "agencia_id", "agenciaId"]));
    const agenciaNome = limparTexto(lerCelula(raw, ["Agencia Nome", "Agência Nome", "agencia_nome"])) || agenciaId;
    const agenciaCodigo = limparTexto(lerCelula(raw, ["Agencia Codigo", "Agência Codigo", "Codigo Agencia", "agencia_codigo"]))
      || agenciaId
      || agenciaNome;
    let gerenteGestaoId = limparTexto(lerCelula(raw, ["Gerente Gestao ID", "gerente_gestao_id", "GerenteGestaoId"]));
    let gerenteGestaoNome = limparTexto(lerCelula(raw, ["Gerente Gestao Nome", "Gerente de Gestao", "Gerente Gestao", "gerente_gestao_nome"]));
    let gerenteId = limparTexto(lerCelula(raw, ["Gerente ID", "gerente_id", "GerenteId"]));
    let gerenteNome = limparTexto(lerCelula(raw, ["Gerente Nome", "Gerente", "gerente_nome", "Gerente Geral", "Gerente geral"])) || gerenteId;

    if (!gerenteGestaoId) {
      const derivedGg = deriveGerenteGestaoIdFromAgency(agenciaId || agenciaCodigo || agenciaNome);
      if (derivedGg) {
        gerenteGestaoId = derivedGg;
      }
    }

    if (!gerenteGestaoNome && gerenteGestaoId) {
      const entry = getGerenteGestaoEntry(gerenteGestaoId);
      if (entry) {
        gerenteGestaoNome = limparTexto(entry.nome) || extractNameFromLabel(entry.label) || gerenteGestaoId;
      }
    }

    if (gerenteGestaoNome && gerenteGestaoNome.includes(" - ")) {
      gerenteGestaoNome = extractNameFromLabel(gerenteGestaoNome);
    }

    if (!gerenteNome && gerenteId) {
      const entry = getGerenteEntry(gerenteId);
      if (entry) {
        gerenteNome = limparTexto(entry.nome) || extractNameFromLabel(entry.label) || gerenteId;
      }
    }

    if (gerenteNome && gerenteNome.includes(" - ")) {
      gerenteNome = extractNameFromLabel(gerenteNome);
    }

    let familiaId = limparTexto(lerCelula(raw, ["Familia ID", "familia_id", "Familia"]));
    let familiaNome = limparTexto(lerCelula(raw, ["Familia Nome", "familia_nome", "Família Nome", "Familia"])) || familiaId;

    let indicadorId = limparTexto(lerCelula(raw, ["ID Indicador", "Indicador ID", "id_indicador", "Indicador"]));
    let indicadorNome = limparTexto(lerCelula(raw, ["Indicador Nome", "ds_indicador", "Indicador"])) || indicadorId;

    let subId = limparTexto(lerCelula(raw, ["Subindicador ID", "id_subindicador", "Sub Produto ID", "Subproduto ID", "Subproduto"]));
    let subNome = limparTexto(lerCelula(raw, ["Subindicador Nome", "subindicador", "Subproduto", "Sub Produto"])) || subId;

    const carteira = limparTexto(lerCelula(raw, ["Carteira", "carteira"]));
    const canalVenda = limparTexto(lerCelula(raw, ["Canal Venda", "Canal", "canal_venda"]));
    const tipoVenda = limparTexto(lerCelula(raw, ["Tipo Venda", "tipo_venda", "Tipo"]));
    const modalidade = limparTexto(lerCelula(raw, ["Modalidade Pagamento", "modalidade_pagamento", "Modalidade"]));

    let data = converterDataISO(lerCelula(raw, ["Data", "Data Movimento", "data"]));
    let competencia = converterDataISO(lerCelula(raw, ["Competencia", "competencia", "Competência"]));
    if (!competencia && data) competencia = `${data.slice(0, 7)}-01`;
    if (!data && competencia) data = competencia;

    const dataVencimento = converterDataISO(lerCelula(raw, ["Data Vencimento", "data_vencimento"]));
    const dataCancelamento = converterDataISO(lerCelula(raw, ["Data Cancelamento", "data_cancelamento"]));
    const motivoCancelamento = limparTexto(lerCelula(raw, ["Motivo Cancelamento", "motivo_cancelamento", "Motivo"]));

    const valorMeta = toNumber(lerCelula(raw, ["Valor Meta", "Meta", "meta", "meta_mensal", "meta_contrato", "metaValor"]));
    const valorReal = toNumber(lerCelula(raw, ["Valor Realizado", "Realizado", "realizado", "real_mensal", "valor_realizado", "realizadoValor"]));
    const quantidade = toNumber(lerCelula(raw, ["Quantidade", "Qtd", "quantidade", "Quantidade Contrato"]));
    const peso = toNumber(lerCelula(raw, ["Peso", "peso", "pontos_meta", "Pontos Meta"]));
    const pontos = toNumber(lerCelula(raw, ["Pontos", "pontos", "pontos_cumpridos", "Pontos Cumpridos"]));
    const statusId = limparTexto(lerCelula(raw, ["Status ID", "status_id", "Status"]));

    const indicadorRes = resolveIndicatorFromDimension([indicadorId, indicadorNome]);
    if (indicadorRes) {
      if (indicadorRes.indicadorId) indicadorId = indicadorRes.indicadorId;
      if (indicadorRes.indicadorNome) indicadorNome = indicadorRes.indicadorNome;
      if (indicadorRes.familiaId) familiaId = indicadorRes.familiaId;
      if (indicadorRes.familiaNome) familiaNome = indicadorRes.familiaNome;
    }

    const subRes = resolveSubIndicatorFromDimension([subId, subNome], indicadorRes);
    if (subRes) {
      if (subRes.subId) subId = subRes.subId;
      if (subRes.subNome) subNome = subRes.subNome;
      if (subRes.familiaId && !familiaId) familiaId = subRes.familiaId;
      if (subRes.familiaNome && !familiaNome) familiaNome = subRes.familiaNome;
    }

    const detail = {
      id: contratoId,
      registroId,
      segmento,
      segmentoId,
      diretoria: diretoriaId,
      diretoriaId,
      diretoriaNome,
      gerenciaRegional: gerenciaId,
      gerenciaId,
      gerenciaNome,
      regional: gerenciaNome,
      agencia: agenciaId || agenciaCodigo || agenciaNome,
      agenciaId: agenciaId || agenciaCodigo || agenciaNome,
      agenciaNome: agenciaNome || agenciaId || agenciaCodigo,
      agenciaCodigo: agenciaCodigo || agenciaId || agenciaNome,
      gerenteGestao: gerenteGestaoId,
      gerenteGestaoId,
      gerenteGestaoNome: gerenteGestaoNome || gerenteGestaoId,
      gerente: gerenteId,
      gerenteId,
      gerenteNome,
      familiaId,
      familiaNome,
      carteira,
      canalVenda,
      tipoVenda,
      modalidadePagamento: modalidade,
      data,
      competencia,
      realizado: Number.isFinite(valorReal) ? valorReal : 0,
      meta: Number.isFinite(valorMeta) ? valorMeta : 0,
      qtd: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
      peso: Number.isFinite(peso) ? peso : 0,
      pontos: Number.isFinite(pontos) ? pontos : undefined,
      dataVencimento,
      dataCancelamento,
      motivoCancelamento,
      statusId,
    };

    detail.segmentoLabel = resolveMapLabel(segMap, segmentoId, segmento, segmentoId);
    detail.diretoriaLabel = resolveMapLabel(dirMap, diretoriaId, diretoriaNome, diretoriaId);
    detail.gerenciaLabel = resolveMapLabel(regMap, gerenciaId, gerenciaNome, gerenciaId);
    detail.agenciaLabel = resolveMapLabel(agMap, agenciaId, agenciaNome, agenciaId);
    detail.gerenteGestaoLabel = labelGerenteGestao(gerenteGestaoId, gerenteGestaoNome);
    detail.gerenteLabel = labelGerente(gerenteId, gerenteNome);

    if (detail.segmentoLabel) detail.segmento = detail.segmentoLabel;
    if (detail.diretoriaLabel) detail.diretoriaNome = extractNameFromLabel(detail.diretoriaLabel) || detail.diretoriaNome;
    if (detail.gerenciaLabel) detail.gerenciaNome = extractNameFromLabel(detail.gerenciaLabel) || detail.gerenciaNome;
    if (detail.agenciaLabel) detail.agenciaNome = extractNameFromLabel(detail.agenciaLabel) || detail.agenciaNome;
    if (detail.gerenteGestaoLabel) detail.gerenteGestaoNome = extractNameFromLabel(detail.gerenteGestaoLabel) || detail.gerenteGestaoNome;
    if (detail.gerenteLabel) detail.gerenteNome = extractNameFromLabel(detail.gerenteLabel) || detail.gerenteNome;

    aplicarIndicadorAliases(detail, indicadorId, indicadorNome);
    if (subId) {
      detail.subproduto = subNome || subId;
      detail.subIndicadorId = subId;
      detail.subIndicadorNome = subNome || subId;
    }
    if (!detail.familiaId) detail.familiaId = familiaId;
    if (!detail.familiaNome) detail.familiaNome = familiaNome || familiaId;
    detail.prodOrSub = detail.subproduto || detail.produtoNome || detail.produtoId;
    detail.ating = detail.meta ? (detail.realizado / detail.meta) : 0;
    if (detail.pontos === undefined) {
      const pontosCalc = Math.max(0, detail.peso || 0) * (detail.ating || 0);
      detail.pontos = Number.isFinite(pontosCalc) ? pontosCalc : 0;
    }

    return detail;
  }).filter(Boolean);
}

function normalizarLinhasHistoricoRankingPobj(rows){
  if (!Array.isArray(rows)) return [];

  const mapNivel = (value) => {
    const simple = simplificarTexto(value);
    if (simple === "diretoria") return "diretoria";
    if (simple === "gerencia" || simple === "gerenciaregional") return "gerencia";
    if (simple === "agencia") return "agencia";
    if (simple === "gerente") return "gerente";
    return "";
  };

  return rows.map(raw => {
    const nivel = mapNivel(lerCelula(raw, ["nivel", "Nivel", "Nível", "level"]));
    if (!nivel) return null;

    const anoText = lerCelula(raw, ["ano", "Ano", "year", "Year"]);
    const anoNum = Number(anoText);
    const ano = Number.isFinite(anoNum) ? anoNum : null;
    const database = converterDataISO(lerCelula(raw, ["database", "competencia", "Competencia", "data", "Data"]));

    const segmento = lerCelula(raw, ["segmento", "Segmento"]);
    const segmentoId = lerCelula(raw, ["segmentoId", "SegmentoId", "segmento_id", "Id Segmento"]);
    const diretoria = lerCelula(raw, ["diretoria", "Diretoria", "diretoriaId", "DiretoriaId", "ID Diretoria"]);
    const diretoriaNome = lerCelula(raw, ["diretoriaNome", "DiretoriaNome", "Diretoria Nome", "diretoria_nome"]);
    const gerenciaRegional = lerCelula(raw, ["gerenciaRegional", "GerenciaRegional", "gerencia", "Gerencia", "Gerencia ID"]);
    const gerenciaNome = lerCelula(raw, ["gerenciaNome", "GerenciaNome", "Regional Nome", "regionalNome"]);
    const agencia = lerCelula(raw, ["agencia", "Agencia", "agenciaId", "AgenciaId"]);
    const agenciaNome = lerCelula(raw, ["agenciaNome", "AgenciaNome", "Agencia Nome"]);
    const agenciaCodigo = lerCelula(raw, ["agenciaCodigo", "AgenciaCodigo", "Codigo Agencia", "Agencia Codigo"]);
    const gerenteGestao = lerCelula(raw, ["gerenteGestao", "GerenteGestao", "gerenteGestaoId", "GerenteGestaoId", "gerente_gestao_id"]);
    const gerenteGestaoNome = lerCelula(raw, [
      "gerenteGestaoNome",
      "GerenteGestaoNome",
      "Gerente Gestao Nome",
      "Gerente de Gestao Nome",
      "Gerente de Gestão Nome",
      "gerente_gestao_nome"
    ]);
    const gerente = lerCelula(raw, ["gerente", "Gerente", "gerenteId", "GerenteId"]);
    const gerenteNome = lerCelula(raw, ["gerenteNome", "GerenteNome", "Gerente Nome"]);

    const participantesNum = Number(lerCelula(raw, ["participantes", "Participantes", "totalParticipantes"]));
    const participantes = Number.isFinite(participantesNum) && participantesNum > 0 ? participantesNum : null;

    const rankNum = Number(lerCelula(raw, ["rank", "Rank", "posicao", "posição", "classificacao"]));
    const rank = Number.isFinite(rankNum) && rankNum > 0 ? rankNum : null;

    const pontosNum = Number(lerCelula(raw, ["pontos", "Pontos", "pontuacao", "Pontuacao", "p_acum"]));
    const pontos = Number.isFinite(pontosNum) ? pontosNum : null;

    const realizadoNum = Number(lerCelula(raw, ["realizado", "Realizado", "real_acum", "Real_acum", "resultado"]));
    const metaNum = Number(lerCelula(raw, ["meta", "Meta", "meta_acum", "Meta_acum"]));

    return {
      nivel,
      ano,
      database: database || (ano ? `${ano}-12-31` : ""),
      segmento,
      segmentoId,
      diretoria,
      diretoriaId: diretoria || diretoriaNome,
      diretoriaNome: diretoriaNome || diretoria,
      gerenciaRegional,
      gerenciaId: gerenciaRegional || gerenciaNome,
      gerenciaNome: gerenciaNome || gerenciaRegional,
      agencia,
      agenciaId: agencia || agenciaCodigo || agenciaNome,
      agenciaNome: agenciaNome || agencia,
      agenciaCodigo: agenciaCodigo || agencia,
      gerenteGestao,
      gerenteGestaoId: gerenteGestao || gerenteGestaoNome,
      gerenteGestaoNome: gerenteGestaoNome || gerenteGestao,
      gerente,
      gerenteId: gerente || gerenteNome,
      gerenteNome: gerenteNome || gerente,
      participantes,
      rank,
      pontos,
      realizado: Number.isFinite(realizadoNum) ? realizadoNum : null,
      meta: Number.isFinite(metaNum) ? metaNum : null,
    };
  }).filter(Boolean);
}

function rebuildStatusIndex(rows) {
  const cleaned = [];
  const map = new Map();
  const source = Array.isArray(rows) ? rows : [];

  source.forEach(item => {
    if (!item || typeof item !== "object") return;
    const key = item.key || normalizarChaveStatus(item.id ?? item.codigo ?? item.nome);
    if (!key || map.has(key)) return;
    const ordemRaw = limparTexto(item.ordem);
    const ordemNum = Number(ordemRaw);
    const ordem = ordemRaw !== "" && Number.isFinite(ordemNum) ? ordemNum : undefined;
    const entry = { ...item, key };
    if (ordem !== undefined) entry.ordem = ordem;
    cleaned.push(entry);
    map.set(key, entry);
  });

  DEFAULT_STATUS_INDICADORES.forEach(defaultItem => {
    if (map.has(defaultItem.key)) return;
    const entry = { ...defaultItem };
    cleaned.push(entry);
    map.set(entry.key, entry);
  });

  cleaned.sort((a, b) => {
    if (a.key === "todos") return -1;
    if (b.key === "todos") return 1;
    const ordA = Number.isFinite(a.ordem) ? a.ordem : Number.MAX_SAFE_INTEGER;
    const ordB = Number.isFinite(b.ordem) ? b.ordem : Number.MAX_SAFE_INTEGER;
    if (ordA !== ordB) return ordA - ordB;
    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" });
  });

  STATUS_INDICADORES_DATA = cleaned;
  STATUS_BY_KEY = map;
  updateStatusFilterOptions();
}

function getStatusEntry(key) {
  const normalized = normalizarChaveStatus(key);
  if (!normalized) return null;
  return STATUS_BY_KEY.get(normalized) || null;
}

function buildStatusFilterEntries() {
  const base = Array.isArray(STATUS_INDICADORES_DATA) ? STATUS_INDICADORES_DATA : [];
  const entries = base.map(st => {
    const key = st?.key || normalizarChaveStatus(st?.id ?? st?.codigo ?? st?.nome);
    if (!key) return null;
    const label = st?.nome || obterRotuloStatus(key, st?.codigo ?? st?.id ?? key);
    const codigo = st?.codigo ?? st?.id ?? key;
    let ordem = st?.ordem;
    if (typeof ordem === "string" && ordem !== "") {
      const parsed = Number(ordem);
      ordem = Number.isFinite(parsed) ? parsed : undefined;
    }
    if (!Number.isFinite(ordem)) {
      ordem = Number.isFinite(st?.ordem) ? st.ordem : Number.MAX_SAFE_INTEGER;
    }
    return {
      key,
      value: key,
      label,
      codigo,
      id: st?.id ?? codigo,
      ordem,
    };
  }).filter(Boolean);

  if (!entries.some(entry => entry.key === "todos")) {
    entries.unshift({
      key: "todos",
      value: "todos",
      label: STATUS_LABELS.todos,
      codigo: "todos",
      id: "todos",
      ordem: -Infinity,
    });
  }

  entries.sort((a, b) => {
    if (a.key === "todos") return -1;
    if (b.key === "todos") return 1;
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return String(a.label || "").localeCompare(String(b.label || ""), "pt-BR", { sensitivity: "base" });
  });

  return entries;
}

function updateStatusFilterOptions(preserveSelection = true) {
  const select = document.getElementById("f-status-kpi");
  if (!select) return;

  const previousOption = select.selectedOptions?.[0] || null;
  const previousKey = preserveSelection
    ? (previousOption?.dataset.statusKey || normalizarChaveStatus(select.value) || "")
    : "";

  const entries = buildStatusFilterEntries();
  select.innerHTML = "";

  entries.forEach(entry => {
    const opt = document.createElement("option");
    opt.value = entry.value;
    opt.textContent = entry.label;
    opt.dataset.statusKey = entry.key;
    if (entry.codigo !== undefined) opt.dataset.statusCodigo = entry.codigo;
    if (entry.id !== undefined) opt.dataset.statusId = entry.id;
    select.appendChild(opt);
  });

  if (preserveSelection && previousKey) {
    const match = entries.find(entry => entry.key === previousKey);
    if (match) {
      select.value = match.value;
    }
  }

  if (!entries.some(entry => entry.value === select.value)) {
    const fallback = entries.find(entry => entry.key === "todos") || entries[0];
    if (fallback) {
      select.value = fallback.value;
    }
  }
}

function processBaseDataSources({
  mesuRaw = [],
  statusRaw = [],
  produtosDimRaw = [],
  realizadosRaw = [],
  metasRaw = [],
  variavelRaw = [],
  campanhasRaw = [],
  calendarioRaw = [],
  leadsRaw = [],
  detalhesRaw = [],
  historicoRaw = [],
  dimSegmentosRaw = [],
  dimDiretoriasRaw = [],
  dimRegionaisRaw = [],
  dimAgenciasRaw = [],
  dimGerentesGestaoRaw = [],
  dimGerentesRaw = [],
} = {}) {
  const segmentosDim = Array.isArray(dimSegmentosRaw) ? dimSegmentosRaw : [];
  const diretoriasDim = Array.isArray(dimDiretoriasRaw) ? dimDiretoriasRaw : [];
  const regionaisDim = Array.isArray(dimRegionaisRaw) ? dimRegionaisRaw : [];
  const agenciasDim = Array.isArray(dimAgenciasRaw) ? dimAgenciasRaw : [];
  const gerentesGestaoDim = Array.isArray(dimGerentesGestaoRaw) ? dimGerentesGestaoRaw : [];
  const gerentesDim = Array.isArray(dimGerentesRaw) ? dimGerentesRaw : [];

  registerDimensionLookups({
    segmentos: segmentosDim,
    diretorias: diretoriasDim,
    regionais: regionaisDim,
    agencias: agenciasDim,
    gerentesGestao: gerentesGestaoDim,
    gerentes: gerentesDim,
  });

  const segmentosOptions = uniqById(segmentosDim.map(row => normOpt({
    id: row?.id ?? row?.segmento_id ?? row?.segmentoId,
    label: row?.label ?? row?.nome ?? '',
  })));
  const diretoriasOptions = uniqById(diretoriasDim.map(row => normOpt({
    id: row?.id ?? row?.diretoria_id ?? row?.diretoriaId,
    label: row?.label ?? row?.nome ?? '',
  })));
  const regionaisOptions = uniqById(regionaisDim.map(row => normOpt({
    id: row?.id ?? row?.gerencia_regional_id ?? row?.regional_id ?? row?.regionalId,
    label: row?.label ?? row?.nome ?? '',
  })));
  const agenciasOptions = uniqById(agenciasDim.map(row => normOpt({
    id: row?.id ?? row?.agencia_id ?? row?.agenciaId,
    label: row?.label ?? row?.nome ?? '',
  })));
  const gerentesGestaoOptions = uniqById(gerentesGestaoDim.map(row => normOpt({
    id: row?.id ?? row?.funcional ?? row?.gerente_gestao_id,
    label: row?.label ?? row?.nome ?? '',
  })));
  const gerentesOptions = uniqById(gerentesDim.map(row => normOpt({
    id: row?.id ?? row?.funcional ?? row?.gerente_id,
    label: row?.label ?? row?.nome ?? '',
  })));

  DIMENSION_FILTER_OPTIONS.segmento = segmentosOptions;
  DIMENSION_FILTER_OPTIONS.diretoria = diretoriasOptions;
  DIMENSION_FILTER_OPTIONS.gerencia = regionaisOptions;
  DIMENSION_FILTER_OPTIONS.agencia = agenciasOptions;
  DIMENSION_FILTER_OPTIONS.gerenteGestao = gerentesGestaoOptions;
  DIMENSION_FILTER_OPTIONS.gerente = gerentesOptions;

  const mesuRows = normalizarLinhasMesu(Array.isArray(mesuRaw) ? mesuRaw : []);
  const statusRows = normalizarLinhasStatus(Array.isArray(statusRaw) ? statusRaw : []);
  if (statusRows.length) {
    rebuildStatusIndex(statusRows);
  } else {
    rebuildStatusIndex(DEFAULT_STATUS_INDICADORES);
  }

  const produtosDimRows = Array.isArray(produtosDimRaw) ? produtosDimRaw : [];
  const baseDimProdutos = normalizarDimProdutos(produtosDimRows);
  DIM_PRODUTOS = baseDimProdutos.map(row => ({ ...row }));
  rebuildCardCatalogFromDimension(DIM_PRODUTOS);
  montarCatalogoDeProdutos(DIM_PRODUTOS);
  if (typeof window !== "undefined") {
    [window.segMap, window.dirMap, window.regMap, window.ageMap, window.agMap]
      .filter(map => map instanceof Map)
      .forEach(map => map.clear());
  }
  rebuildGlobalDimensionAliasIndex();
  montarHierarquiaMesu(mesuRows);

  FACT_REALIZADOS = normalizarLinhasFatoRealizados(Array.isArray(realizadosRaw) ? realizadosRaw : []);
  FACT_METAS = normalizarLinhasFatoMetas(Array.isArray(metasRaw) ? metasRaw : []);
  FACT_VARIAVEL = normalizarLinhasFatoVariavel(Array.isArray(variavelRaw) ? variavelRaw : []);
  FACT_CAMPANHAS = normalizarLinhasFatoCampanhas(Array.isArray(campanhasRaw) ? campanhasRaw : []);
  if (FACT_CAMPANHAS.length) {
    replaceCampaignUnitData(FACT_CAMPANHAS);
  }
  DIM_CALENDARIO = normalizarLinhasCalendario(Array.isArray(calendarioRaw) ? calendarioRaw : []);
  updateCampaignSprintsUnits();

  OPPORTUNITY_LEADS_RAW = Array.isArray(leadsRaw) ? leadsRaw : [];
  ingestOpportunityLeadRows(OPPORTUNITY_LEADS_RAW);

  FACT_HISTORICO_RANKING_POBJ = normalizarLinhasHistoricoRankingPobj(Array.isArray(historicoRaw) ? historicoRaw : []);
  FACT_DETALHES = normalizarLinhasFatoDetalhes(Array.isArray(detalhesRaw) ? detalhesRaw : []);
  applyHierarchyFallback(FACT_REALIZADOS);
  applyHierarchyFallback(FACT_METAS);
  applyHierarchyFallback(FACT_VARIAVEL);
  applyHierarchyFallback(FACT_DETALHES);
  DETAIL_BY_REGISTRO = new Map();
  DETAIL_CONTRACT_IDS = new Set();
  FACT_DETALHES.forEach(row => {
    if (!row) return;
    const registroKey = limparTexto(row.registroId);
    if (registroKey) {
      const bucket = DETAIL_BY_REGISTRO.get(registroKey) || [];
      bucket.push({ ...row });
      DETAIL_BY_REGISTRO.set(registroKey, bucket);
    }
    const contratoKey = limparTexto(row.id);
    if (contratoKey) DETAIL_CONTRACT_IDS.add(contratoKey);
  });

  const availableDatesSource = (DIM_CALENDARIO.length
    ? DIM_CALENDARIO.map(row => row.data)
    : [
        ...FACT_REALIZADOS.flatMap(row => [row.data, row.competencia]),
        ...FACT_METAS.flatMap(row => [row.data, row.competencia]),
        ...FACT_VARIAVEL.flatMap(row => [row.data, row.competencia]),
      ]
  );
  const availableDates = availableDatesSource.filter(Boolean).sort();
  AVAILABLE_DATE_MIN = availableDates[0] || "";
  AVAILABLE_DATE_MAX = availableDates[availableDates.length - 1] || "";
  if (typeof window !== "undefined") {
    window.calendarCapISO = AVAILABLE_DATE_MAX || "";
  }
  state.period = getDefaultPeriodRange();
  updatePeriodLabels();

  state._raw = {
    mesu: mesuRows,
    dimSegmentos: segmentosDim,
    dimDiretorias: diretoriasDim,
    dimRegionais: regionaisDim,
    dimAgencias: agenciasDim,
    dimGerentesGestao: gerentesGestaoDim,
    dimGerentes: gerentesDim,
    dimProdutos: DIM_PRODUTOS,
    dimProdutosPorSegmento: { default: DIM_PRODUTOS },
    status: STATUS_INDICADORES_DATA,
    dados: FACT_REALIZADOS,
    realizados: FACT_REALIZADOS,
    metas: FACT_METAS,
    variavel: FACT_VARIAVEL,
    campanhas: FACT_CAMPANHAS,
    calendario: DIM_CALENDARIO,
    detalhes: FACT_DETALHES,
    historico: FACT_HISTORICO_RANKING_POBJ,
  };

  if (DETAIL_CONTRACT_IDS.size) {
    state.contractIndex = [...DETAIL_CONTRACT_IDS].sort();
  }

  return state._raw;
}

// Carrega os dados da pasta "Bases" ou via API
async function loadBaseData(){
  if (baseDataPromise) return baseDataPromise;
  baseDataPromise = (async () => {
    showLoader("Carregando dados…");
    try {
      if (DATA_SOURCE === "sql") {
        const payload = await apiGet('/bootstrap');
        return processBaseDataSources({
          mesuRaw: payload?.mesu || [],
          statusRaw: payload?.status || [],
          produtosDimRaw: payload?.produtos || [],
          realizadosRaw: payload?.realizados || [],
          metasRaw: payload?.metas || [],
          variavelRaw: payload?.variavel || [],
          campanhasRaw: payload?.campanhas || [],
          calendarioRaw: payload?.calendario || [],
          leadsRaw: payload?.leads || [],
          detalhesRaw: payload?.detalhes || [],
          historicoRaw: payload?.historico || [],
          dimSegmentosRaw: payload?.dimSegmentos || payload?.segmentosDim || payload?.segmentos || [],
          dimDiretoriasRaw: payload?.dimDiretorias || payload?.diretoriasDim || payload?.diretorias || [],
          dimRegionaisRaw: payload?.dimRegionais || payload?.regionaisDim || payload?.regionais || [],
          dimAgenciasRaw: payload?.dimAgencias || payload?.agenciasDim || payload?.agencias || [],
          dimGerentesGestaoRaw: payload?.dimGerentesGestao || payload?.gerentesGestaoDim || payload?.ggestoes || [],
          dimGerentesRaw: payload?.dimGerentes || payload?.gerentesDim || payload?.gerentes || [],
        });
      }

      const basePath = "Bases/";
      const [
        mesuRaw,
        statusRaw,
        produtosDimRaw,
        realizadosRaw,
        metasRaw,
        variavelRaw,
        campanhasRaw,
        calendarioRaw,
        leadsRaw,
        detalhesRaw,
        historicoRaw,
      ] = await Promise.all([
        loadCSVAuto(`${basePath}mesu.csv`),
        loadCSVAuto(`${basePath}Status_Indicadores.csv`),
        loadCSVAuto(`${basePath}dProdutos.csv`).catch(() => []),
        loadCSVAuto(`${basePath}fRealizados.csv`).catch(() => []),
        loadCSVAuto(`${basePath}fMetas.csv`).catch(() => []),
        loadCSVAuto(`${basePath}fVariavel.csv`).catch(() => []),
        loadCSVAuto(`${basePath}fCampanhas.csv`).catch(() => []),
        loadCSVAuto(`${basePath}dCalendario.csv`).catch(() => []),
        loadCSVAuto(`${basePath}leads_propensos.csv`).catch(() => []),
        loadCSVAuto(`${basePath}fDetalhes.csv`).catch(() => []),
        loadCSVAuto(`${basePath}FHistoricoRankingPobj.csv`).catch(() => []),
      ]);

      return processBaseDataSources({
        mesuRaw,
        statusRaw,
        produtosDimRaw,
        realizadosRaw,
        metasRaw,
        variavelRaw,
        campanhasRaw,
        calendarioRaw,
        leadsRaw,
        detalhesRaw,
        historicoRaw,
      });
    } finally {
      hideLoader();
    }
  })();
  baseDataPromise.catch(() => { baseDataPromise = null; });
  return baseDataPromise;
}

/* ===== Aqui eu ajusto a altura da topbar para o CSS responsivo funcionar ===== */
// Aqui eu calculo a altura real da topbar e jogo no CSS para o layout não quebrar ao abrir menus.
const setTopbarH = () => {
  const h = document.querySelector('.topbar')?.offsetHeight || 56;
  document.documentElement.style.setProperty('--topbar-h', `${h}px`);
};
window.addEventListener('load', setTopbarH);
window.addEventListener('resize', setTopbarH);
setTopbarH();

/* ===== Aqui eu defino as visões (chips) que aparecem acima da tabela detalhada ===== */
// Aqui eu descrevo as visões possíveis da tabela para alternar entre diretoria, gerente etc.
const TABLE_VIEWS = [
  { id:"diretoria", label:"Diretoria", key:"diretoria" },
  { id:"gerencia",  label:"Regional",  key:"gerenciaRegional" },
  { id:"agencia",   label:"Agência",            key:"agencia" },
  { id:"gGestao",   label:"Gerente de gestão",  key:"gerenteGestao" },
  { id:"gerente",   label:"Gerente",            key:"gerente" },
  { id:"secao",    label:"Família",           key:"secao" },
  { id:"familia",   label:"Indicador",         key:"familia" },
  { id:"prodsub",   label:"Subindicador",      key:"prodOrSub" },
  { id:"contrato",  label:"Contratos",          key:"contrato" },
];

/* === Seções e cards === */
// Aqui eu construo os grupos de indicadores dinamicamente a partir da dimensão dProdutos.
const DEFAULT_CARD_ICON = "ti ti-chart-bar";

const CARD_SECTION_ORDER = [
  { id: "captacao", label: "CAPTAÇÃO", order: 10 },
  { id: "financeiro", label: "FINANCEIRO", order: 20 },
  { id: "credito", label: "CRÉDITO", order: 30 },
  { id: "ligadas", label: "LIGADAS", order: 40 },
  { id: "produtividade", label: "PRODUTIVIDADE", order: 50 },
  { id: "clientes", label: "CLIENTES", order: 60 },
  { id: "relacionamento_emp", label: "RELACIONAMENTO", order: 15 },
  { id: "negocios_emp", label: "NEGÓCIOS", order: 35 },
  { id: "adicionais_emp", label: "ADICIONAIS", order: 45 },
];

const CARD_INDICATOR_META = {
  captacao_bruta: {
    sectionId: "captacao",
    sectionLabel: "CAPTAÇÃO",
    order: 10,
    nome: "Captação Bruta (CDB, Isentos, Fundos, Corretora e Previdência)",
    icon: "ti ti-pig-money",
    peso: 4,
    metric: "valor"
  },
  captacao_bruta_total: {
    sectionId: "captacao",
    sectionLabel: "CAPTAÇÃO",
    order: 11,
    nome: "Captação Bruta Total",
    icon: "ti ti-pig-money",
    peso: 4,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  captacao_liquida: {
    sectionId: "captacao",
    sectionLabel: "CAPTAÇÃO",
    order: 20,
    nome: "Captação Líquida",
    icon: "ti ti-arrows-exchange",
    peso: 4,
    metric: "valor",
    subMeta: {
      capt_liq_grupo_a: { nome: "Captação Líquida - Grupo A", order: 10 },
      capt_liq_grupo_b: { nome: "Captação Líquida - Grupo B", order: 11 },
      capt_liq_isentos_aplicacao: { nome: "Isentos - Aplicação", order: 20 },
      capt_liq_isentos_resgate: { nome: "Isentos - Resgate", order: 21 },
      capt_liq_fundos_aplicacao: { nome: "Fundos - Aplicação", order: 30 },
      capt_liq_fundos_resgate: { nome: "Fundos - Resgate", order: 31 },
      capt_liq_corretora_aplicacao: { nome: "Corretora - Aplicação", order: 40 },
      capt_liq_corretora_resgate: { nome: "Corretora - Resgate", order: 41 },
      capt_liq_coe_resgate: { nome: "COE - Resgate", order: 42 },
      capt_liq_deposito_prazo_aplicacao: { nome: "Depósito a Prazo - Aplicação", order: 50 },
      capt_liq_deposito_prazo_resgate: { nome: "Depósito a Prazo - Resgate", order: 51 },
      capt_liq_investfacil_aplicacao: { nome: "InvestFácil - Aplicação", order: 60 },
      capt_liq_investfacil_resgate: { nome: "InvestFácil - Resgate", order: 61 },
      capt_liq_prev_privada_aplicacao: { nome: "Previdência Privada - Aplicação", order: 70 },
      capt_liq_prev_privada_resgate: { nome: "Previdência Privada - Resgate", order: 71 },
      capt_liq_poupanca_aplicacao: { nome: "Poupança - Aplicação", order: 80 },
      capt_liq_poupanca_resgate: { nome: "Poupança - Resgate", order: 81 }
    }
  },
  portab_prev: {
    sectionId: "captacao",
    sectionLabel: "CAPTAÇÃO",
    order: 30,
    nome: "Portabilidade de Previdência Privada",
    icon: "ti ti-shield-check",
    peso: 3,
    metric: "valor",
    subMeta: {
      portab_prev_aplicacao: { nome: "Portabilidade de Previdência Privada - Aplicação", order: 10 },
      portab_prev_resgate: { nome: "Portabilidade de Previdência Privada - Resgate", order: 20 }
    }
  },
  centralizacao: {
    sectionId: "captacao",
    sectionLabel: "CAPTAÇÃO",
    order: 40,
    nome: "Centralização de Caixa (Cash)",
    icon: "ti ti-briefcase",
    peso: 3,
    metric: "valor",
    subMeta: {
      centralizacao_cash: { nome: "Cash", order: 10 }
    }
  },
  rec_vencidos_59: {
    sectionId: "financeiro",
    sectionLabel: "FINANCEIRO",
    order: 10,
    nome: "Recuperação de Vencidos até 59 dias",
    icon: "ti ti-rotate-rectangle",
    peso: 6,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  rec_vencidos_50mais: {
    sectionId: "financeiro",
    sectionLabel: "FINANCEIRO",
    order: 20,
    nome: "Recuperação de Vencidos acima de 50 dias",
    icon: "ti ti-rotate-rectangle",
    peso: 5,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  rec_credito: {
    sectionId: "financeiro",
    sectionLabel: "FINANCEIRO",
    order: 30,
    nome: "Recuperação de Crédito",
    icon: "ti ti-cash",
    peso: 5,
    metric: "valor",
    subMeta: {
      rec_credito_lp_total: { nome: "LP Total", order: 10 },
      rec_credito_lp_avista: { nome: "LP à vista", order: 20 }
    }
  },
  prod_credito_pj: {
    sectionId: "credito",
    sectionLabel: "CRÉDITO",
    order: 10,
    nome: "Produção de Crédito PJ",
    icon: "ti ti-building-bank",
    peso: 8,
    metric: "valor",
    subMeta: {
      linha_pj: { nome: "Linha PJ", order: 10 }
    }
  },
  rotativo_pj_vol: {
    sectionId: "credito",
    sectionLabel: "CRÉDITO",
    order: 20,
    nome: "Limite Rotativo PJ (Volume)",
    icon: "ti ti-wallet",
    peso: 3,
    metric: "valor",
    subMeta: {
      volume: { nome: "Volume", order: 10 }
    }
  },
  rotativo_pj_qtd: {
    sectionId: "credito",
    sectionLabel: "CRÉDITO",
    order: 30,
    nome: "Limite Rotativo PJ (Quantidade)",
    icon: "ti ti-list-numbers",
    peso: 3,
    metric: "qtd",
    subMeta: {
      quantidade: { nome: "Quantidade", metric: "qtd", order: 10 }
    }
  },
  cartoes: {
    sectionId: "ligadas",
    sectionLabel: "LIGADAS",
    order: 10,
    nome: "Cartões",
    icon: "ti ti-credit-card",
    peso: 4,
    metric: "perc",
    subMeta: {
      cartao_credito_emissao_classic: { nome: "Cartão de Crédito Emissão Classic", order: 10 },
      cartao_credito_emissao_exclusive: { nome: "Cartão de Crédito Emissão Exclusive", order: 20 },
      cartao_credito_emissao_pj_negocios: { nome: "Cartão de Crédito Emissão PJ Negócios", order: 30 },
      faturamento_cartao_credito_pj_negocios: { nome: "Faturamento Cartão de Crédito PJ Negócios", order: 40 },
      cartao_consignado_saque_parcelado: { nome: "Cartão Consignado - Saque Parcelado", order: 50 },
      faturamento_novo_alelo: { nome: "Faturamento Novo Alelo", order: 60 },
      faturamento_cielo_novo: { nome: "Faturamento Cielo - Novo", order: 70 }
    }
  },
  consorcios: {
    sectionId: "ligadas",
    sectionLabel: "LIGADAS",
    order: 20,
    nome: "Consórcios",
    icon: "ti ti-building-bank",
    peso: 3,
    metric: "perc",
    subMeta: {
      consorcios_total: { nome: "Consórcios - Total", order: 10 },
      consorcios_pesados_imoveis: { nome: "Consórcios Pesados e Imóveis", order: 20 },
      consorcios_auto: { nome: "Consórcios Auto", order: 30 }
    }
  },
  seguros: {
    sectionId: "ligadas",
    sectionLabel: "LIGADAS",
    order: 30,
    nome: "Seguros",
    icon: "ti ti-shield-lock",
    peso: 5,
    metric: "perc",
    subMeta: {
      seguro_vida_pu_pm: { nome: "Seguro de Vida (PU + PM)", order: 10 },
      seguro_vida_pm: { nome: "Seguro de Vida PM", order: 20 },
      vida_carteira: { nome: "Vida Carteira", order: 30 },
      capitalizacao_pu_pm: { nome: "Capitalização (PU + PM)", order: 40 },
      capitalizacao_pm: { nome: "Capitalização PM", order: 50 },
      prev_privada_vb_pu_pm: { nome: "Previdência Privada - Venda Bruta (PU + PM)", order: 60 },
      prev_privada_vb_pm: { nome: "Previdência Privada - Venda Bruta PM", order: 70 },
      dental_pf: { nome: "Dental PF", order: 80 },
      saude_pf: { nome: "Saúde PF", order: 90 },
      seguro_prestamista_volume: { nome: "Seguro Prestamista Volume (Prêmio)", order: 100 },
      seguro_residencial: { nome: "Seguro Residencial", order: 110 }
    }
  },
  sucesso_equipe_credito: {
    sectionId: "produtividade",
    sectionLabel: "PRODUTIVIDADE",
    order: 10,
    nome: "Sucesso de Equipe Crédito",
    icon: "ti ti-activity",
    peso: 10,
    metric: "perc",
    subMeta: {
      equipe_credito: { nome: "Equipe Crédito", order: 10 }
    }
  },
  conquista_qualif_pj: {
    sectionId: "clientes",
    sectionLabel: "CLIENTES",
    order: 10,
    nome: "Conquista Qualificada Gerenciado PJ",
    icon: "ti ti-user-star",
    peso: 3,
    metric: "qtd",
    subMeta: {
      qualificacao: { nome: "Qualificação", order: 10 }
    }
  },
  conquista_folha: {
    sectionId: "clientes",
    sectionLabel: "CLIENTES",
    order: 20,
    nome: "Conquista de Clientes Folha de Pagamento",
    icon: "ti ti-users-group",
    peso: 3,
    metric: "qtd",
    subMeta: {
      folha: { nome: "Folha", order: 10 }
    }
  },
  bradesco_expresso: {
    sectionId: "clientes",
    sectionLabel: "CLIENTES",
    order: 30,
    nome: "Bradesco Expresso",
    icon: "ti ti-bolt",
    peso: 2,
    metric: "perc",
    subMeta: {
      expresso: { nome: "Expresso", order: 10 }
    }
  },
  cash_contas_receber_pagar_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 10,
    nome: "CASH - Contas a Receber e Contas a Pagar",
    icon: "ti ti-arrows-left-right",
    peso: 10,
    metric: "qtd",
    forceEmptySubIndicators: true
  },
  folha_pagamento_novos_convenios_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 20,
    nome: "Folha de Pagamento - Novos Convênios",
    icon: "ti ti-report-money",
    peso: 10,
    metric: "qtd",
    forceEmptySubIndicators: true
  },
  conquista_recuperacao_clientes_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 30,
    nome: "Conquista (+) Recuperação de Clientes",
    icon: "ti ti-user-plus",
    peso: 3,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  crescimento_liquido_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 40,
    nome: "Crescimento Líquido",
    icon: "ti ti-trending-up",
    peso: 3,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  retencao_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 50,
    nome: "Retenção",
    icon: "ti ti-shield-check",
    peso: 1,
    metric: "perc",
    forceEmptySubIndicators: true
  },
  inativacao_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 60,
    nome: "Inativação",
    icon: "ti ti-player-pause",
    peso: 1,
    metric: "perc",
    forceEmptySubIndicators: true
  },
  encerramento_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 70,
    nome: "Encerramento",
    icon: "ti ti-door-exit",
    peso: 1,
    metric: "perc",
    forceEmptySubIndicators: true
  },
  cielo_faturamento_novo_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 80,
    nome: "Cielo: Faturamento Novo",
    icon: "ti ti-credit-card",
    peso: 2,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  cielo_faturamento_novo_alelo_emp: {
    sectionId: "relacionamento_emp",
    sectionLabel: "RELACIONAMENTO",
    order: 90,
    nome: "Cielo: Faturamento Novo Alelo",
    icon: "ti ti-credit-card",
    peso: 2,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  producao_credito_total_emp: {
    sectionId: "negocios_emp",
    sectionLabel: "NEGÓCIOS",
    order: 10,
    nome: "Produção de Crédito Total",
    icon: "ti ti-building-bank",
    peso: 10,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  captacao_bruta_total_emp: {
    sectionId: "negocios_emp",
    sectionLabel: "NEGÓCIOS",
    order: 20,
    nome: "Captação Bruta - Total",
    icon: "ti ti-pig-money",
    peso: 5,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  captacao_liquida_emp: {
    sectionId: "negocios_emp",
    sectionLabel: "NEGÓCIOS",
    order: 30,
    nome: "Captação Líquida",
    icon: "ti ti-arrows-exchange",
    peso: 5,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  atraso_5a59_emp: {
    sectionId: "negocios_emp",
    sectionLabel: "NEGÓCIOS",
    order: 40,
    nome: "Atraso de 5 a 59 Dias",
    icon: "ti ti-alert-triangle",
    peso: 3,
    metric: "perc",
    forceEmptySubIndicators: true
  },
  recuperacao_pj_avista_emp: {
    sectionId: "negocios_emp",
    sectionLabel: "NEGÓCIOS",
    order: 50,
    nome: "Recuperação PJ - À Vista",
    icon: "ti ti-cash-banknote",
    peso: 3,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  cartoes_emp: {
    sectionId: "adicionais_emp",
    sectionLabel: "ADICIONAIS",
    order: 10,
    nome: "Cartões",
    icon: "ti ti-credit-card",
    peso: 4,
    metric: "perc",
    forceEmptySubIndicators: true
  },
  consorcios_emp: {
    sectionId: "adicionais_emp",
    sectionLabel: "ADICIONAIS",
    order: 20,
    nome: "Consórcios",
    icon: "ti ti-building-community",
    peso: 4,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  seguros_emp: {
    sectionId: "adicionais_emp",
    sectionLabel: "ADICIONAIS",
    order: 30,
    nome: "Seguros",
    icon: "ti ti-shield-star",
    peso: 4,
    metric: "valor",
    forceEmptySubIndicators: true
  },
  sucesso_equipe_credito_producao_emp: {
    sectionId: "adicionais_emp",
    sectionLabel: "ADICIONAIS",
    order: 40,
    nome: "Sucesso de Equipe - Crédito (Produção)",
    icon: "ti ti-users-group",
    peso: 3,
    metric: "perc",
    forceEmptySubIndicators: true
  },
  sucesso_equipe_cash_emp: {
    sectionId: "adicionais_emp",
    sectionLabel: "ADICIONAIS",
    order: 50,
    nome: "Sucesso de Equipe - Cash",
    icon: "ti ti-users",
    peso: 3,
    metric: "perc",
    forceEmptySubIndicators: true
  }
};

// Cenário "empresas" agora reutiliza a dimensão entregue pelo SQL; deixamos o array manual vazio
// apenas para manter compatibilidade com o pipeline de normalização.
const EMPRESAS_DIM_PRODUTOS_RAW = [];

let CARD_SECTIONS_DEF = [];
let INDICATOR_STRUCTURE_OVERRIDES = {};
let INDICATOR_CARD_INDEX = new Map();
let SECTION_IDS = new Set();
let SECTION_BY_ID = new Map();
let SECTION_ORDER_INDEX = new Map();
let FAMILIA_CODE_TO_SLUG = new Map();
let INDICADOR_CODE_TO_SLUG = new Map();
let SUB_CODE_TO_SLUG = new Map();
let PRODUCT_INDEX = new Map();

function buildCardSectionsFromDimension(rows = []) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const sectionOrderMap = new Map(CARD_SECTION_ORDER.map(entry => [entry.id, entry.order]));
  const sectionsMap = new Map();
  let dynamicOrderSeed = 1000;

  FAMILIA_CODE_TO_SLUG = new Map();
  INDICADOR_CODE_TO_SLUG = new Map();
  SUB_CODE_TO_SLUG = new Map();

  const resolveSectionId = (sectionId, label) => {
    const rawId = limparTexto(sectionId);
    if (rawId) return rawId;
    const labelSlug = simplificarTexto(label);
    if (labelSlug) return labelSlug.replace(/\s+/g, "_");
    return `familia_${sectionsMap.size + 1}`;
  };

  const ensureSection = (sectionId, label, meta = {}) => {
    const baseId = resolveSectionId(sectionId, meta.sectionLabel || label);
    let section = sectionsMap.get(baseId);
    if (!section) {
      const orderHint = meta.sectionOrder ?? sectionOrderMap.get(baseId) ?? sectionOrderMap.get(sectionId) ?? meta.order ?? (dynamicOrderSeed++);
      section = {
        id: baseId,
        label: meta.sectionLabel || label || baseId,
        order: orderHint,
        items: new Map()
      };
      sectionsMap.set(baseId, section);
    } else {
      if (meta.sectionLabel && (!section.label || section.label === section.id)) {
        section.label = meta.sectionLabel;
      } else if (label && (!section.label || section.label === section.id)) {
        section.label = label;
      }
    }
    return section;
  };

  const ensureItem = (section, indicadorId, nome, meta = {}) => {
    const safeId = limparTexto(indicadorId);
    if (!safeId) return null;
    let item = section.items.get(safeId);
    if (!item) {
      item = {
        id: safeId,
        nome: nome || meta.nome || safeId,
        icon: meta.icon || DEFAULT_CARD_ICON,
        peso: meta.peso != null ? meta.peso : 1,
        metric: meta.metric || "valor",
        hiddenInCards: Boolean(meta.hiddenInCards),
        order: meta.order ?? Number.MAX_SAFE_INTEGER,
        aliases: Array.isArray(meta.aliases) ? [...meta.aliases] : undefined,
        forceEmptySubIndicators: Boolean(meta.forceEmptySubIndicators),
        subIndicators: new Map()
      };
      section.items.set(safeId, item);
    } else {
      if (nome && nome !== item.nome) item.nome = nome;
      if (!item.icon && meta.icon) item.icon = meta.icon;
      if (meta.metric) item.metric = meta.metric;
      if (meta.peso != null) item.peso = meta.peso;
      if (meta.hiddenInCards != null) item.hiddenInCards = meta.hiddenInCards;
      if (meta.order != null) item.order = meta.order;
      if (meta.forceEmptySubIndicators) item.forceEmptySubIndicators = true;
      if (Array.isArray(meta.aliases)) {
        if (!Array.isArray(item.aliases)) item.aliases = [];
        meta.aliases.forEach(alias => {
          if (!item.aliases.includes(alias)) item.aliases.push(alias);
        });
      }
    }
    return item;
  };

  const registerSubIndicator = (item, subId, subNome, subMeta = {}, sourceRow = null) => {
    const safeSubId = limparTexto(subId);
    if (!safeSubId) return;
    const current = item.subIndicators.get(safeSubId);
    const entry = current || {
      id: safeSubId,
      nome: subNome || subMeta.nome || safeSubId,
      metric: subMeta.metric || item.metric || "valor",
      peso: Number(subMeta.peso) || 1,
      order: subMeta.order ?? Number.MAX_SAFE_INTEGER,
      aliases: current?.aliases ? new Set(current.aliases) : new Set()
    };
    if (subNome && subNome !== entry.nome) entry.nome = subNome;
    if (subMeta.metric) entry.metric = subMeta.metric;
    if (subMeta.peso != null) entry.peso = Number(subMeta.peso) || entry.peso;
    if (subMeta.order != null) entry.order = subMeta.order;
    const aliasSet = entry.aliases instanceof Set ? entry.aliases : new Set();
    aliasSet.add(safeSubId);
    if (subNome) aliasSet.add(limparTexto(subNome));
    if (subMeta?.aliases) {
      const candidates = Array.isArray(subMeta.aliases) ? subMeta.aliases : [subMeta.aliases];
      candidates.forEach(alias => {
        const text = limparTexto(alias);
        if (text) aliasSet.add(text);
      });
    }
    const subCodigo = sourceRow?.subCodigo || sourceRow?.subcodigo;
    if (subCodigo) aliasSet.add(limparTexto(subCodigo));
    const sourceAliases = sourceRow?.subAliases;
    if (Array.isArray(sourceAliases)) {
      sourceAliases.forEach(alias => {
        const text = limparTexto(alias);
        if (text) aliasSet.add(text);
      });
    }
    if (sourceRow?.subNome) {
      const text = limparTexto(sourceRow.subNome);
      if (text) aliasSet.add(text);
    }
    entry.aliases = aliasSet;
    item.subIndicators.set(safeSubId, entry);
  };

  normalizedRows.forEach(row => {
    const meta = CARD_INDICATOR_META[row.indicadorId] || {};
    const familiaCodigo = limparTexto(row.familiaCodigo);
    if (familiaCodigo && row.familiaId && !FAMILIA_CODE_TO_SLUG.has(familiaCodigo)) {
      FAMILIA_CODE_TO_SLUG.set(familiaCodigo, row.familiaId);
    }
    const indicadorCodigo = limparTexto(row.indicadorCodigo);
    if (indicadorCodigo && row.indicadorId && !INDICADOR_CODE_TO_SLUG.has(indicadorCodigo)) {
      INDICADOR_CODE_TO_SLUG.set(indicadorCodigo, row.indicadorId);
    }
    const subCodigo = limparTexto(row.subCodigo);
    if (subCodigo && row.subId && !SUB_CODE_TO_SLUG.has(subCodigo)) {
      SUB_CODE_TO_SLUG.set(subCodigo, row.subId);
    }
    const section = ensureSection(meta.sectionId || row.familiaId, row.familiaNome, meta);
    const item = ensureItem(section, row.indicadorId, row.indicadorNome, meta);
    if (!item) return;
    const subMeta = meta.subMeta && row.subId ? meta.subMeta[row.subId] : undefined;
    if (row.subId) {
      registerSubIndicator(item, row.subId, row.subNome, subMeta || {}, row);
    }
  });

  const fallbackSection = ensureSection("outros", "Outros", { sectionLabel: "Outros", order: Number.MAX_SAFE_INTEGER });
  const fallbackMeta = {
    sectionId: "outros",
    sectionLabel: "Outros",
    order: Number.MAX_SAFE_INTEGER,
    icon: "ti ti-help",
    metric: "valor",
    forceEmptySubIndicators: true
  };
  const fallbackItem = ensureItem(fallbackSection, "desconhecido", "Desconhecido", fallbackMeta);
  if (fallbackItem) {
    fallbackItem.icon = fallbackMeta.icon;
    fallbackItem.metric = fallbackMeta.metric;
    fallbackItem.peso = 0;
    fallbackItem.hiddenInCards = false;
    fallbackItem.forceEmptySubIndicators = true;
  }



  const sections = Array.from(sectionsMap.values());
  sections.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.label || a.id).localeCompare(String(b.label || b.id), "pt-BR", { sensitivity: "base" });
  });

  sections.forEach(section => {
    const items = Array.from(section.items.values());
    items.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.nome || a.id).localeCompare(String(b.nome || b.id), "pt-BR", { sensitivity: "base" });
    });

    section.items = items.map(item => {
      const subList = Array.from(item.subIndicators.values());
      subList.sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.nome || a.id).localeCompare(String(b.nome || b.id), "pt-BR", { sensitivity: "base" });
      });

      const entry = {
        id: item.id,
        nome: item.nome || item.id,
        icon: item.icon || DEFAULT_CARD_ICON,
        peso: item.peso != null ? item.peso : 1,
        metric: item.metric || "valor",
        hiddenInCards: Boolean(item.hiddenInCards)
      };

      if (Array.isArray(item.aliases) && item.aliases.length) {
        entry.aliases = [...item.aliases];
      }

      if (item.forceEmptySubIndicators) {
        entry.subIndicators = [];
        entry.forceEmptySubIndicators = true;
      } else if (subList.length) {
        entry.subIndicators = subList.map(sub => {
          const aliasArray = Array.from(sub.aliases instanceof Set ? sub.aliases : [])
            .map(alias => limparTexto(alias))
            .filter(Boolean);
          const uniqueAliases = aliasArray.length ? Array.from(new Set(aliasArray)) : undefined;
          return {
            id: sub.id,
            nome: sub.nome || sub.id,
            metric: sub.metric || entry.metric,
            peso: sub.peso != null ? sub.peso : 1,
            aliases: uniqueAliases
          };
        });
      }

      return entry;
    });
  });

  return sections;
}

function applyCardSections(sections = []) {
  CARD_SECTIONS_DEF = sections;
  INDICATOR_STRUCTURE_OVERRIDES = {};

  sections.forEach(section => {
    section.items.forEach(item => {
      if (item.forceEmptySubIndicators) {
        INDICATOR_STRUCTURE_OVERRIDES[item.id] = { subIndicators: [] };
      } else if (Array.isArray(item.subIndicators) && item.subIndicators.length) {
        INDICATOR_STRUCTURE_OVERRIDES[item.id] = {
          subIndicators: item.subIndicators.map(sub => ({
            id: sub.id,
            nome: sub.nome,
            metric: sub.metric,
            peso: sub.peso
          }))
        };
      }
    });
  });

  resetIndicatorAliasIndex();
  INDICATOR_CARD_INDEX = new Map();

  sections.forEach(section => {
    section.items.forEach(item => {
      registrarAliasIndicador(item.id, item.id);
      registrarAliasIndicador(item.id, item.nome);
      if (Array.isArray(item.aliases)) {
        item.aliases.forEach(alias => registrarAliasIndicador(item.id, alias));
      }
      INDICATOR_CARD_INDEX.set(item.id, { ...item, sectionId: section.id, sectionLabel: section.label });
    });
  });

  SECTION_IDS = new Set(sections.map(section => section.id));
  SECTION_BY_ID = new Map(sections.map(section => [section.id, section]));
  SECTION_ORDER_INDEX = new Map(sections.map((section, idx) => [section.id, idx]));
  PRODUCT_INDEX = new Map();
  sections.forEach(section => {
    section.items.forEach(item => {
      PRODUCT_INDEX.set(item.id, {
        sectionId: section.id,
        sectionLabel: section.label,
        name: item.nome,
        icon: item.icon,
        metric: item.metric,
        peso: item.peso,
      });
    });
  });
}

function rebuildCardCatalogFromDimension(rows = DIM_PRODUTOS) {
  const sections = buildCardSectionsFromDimension(rows);
  applyCardSections(sections);
}

rebuildCardCatalogFromDimension([]);
function normalizeStructureChildren(parentId, parentName, parentMetric, list = []) {
  if (!Array.isArray(list) || !list.length) return [];
  return list.map((entry, idx) => {
    const rawId = limparTexto(entry?.id) || "";
    const fallbackId = `${parentId}_lp_${idx + 1}`;
    const id = rawId || fallbackId;
    const nome = limparTexto(entry?.nome || entry?.label || entry?.descricao || entry?.name) || `${parentName} ${idx + 1}`;
    const metric = limparTexto(entry?.metric) || parentMetric || "valor";
    const peso = Number(entry?.peso) || 1;
    const nested = normalizeStructureChildren(id, nome, metric, entry?.children || []);
    return {
      id,
      nome,
      metric,
      peso,
      children: nested
    };
  });
}

function resolveIndicatorStructureMeta(indicatorId, indicatorNome = "", metric = "valor") {
  const override = INDICATOR_STRUCTURE_OVERRIDES[indicatorId];
  const normalizedMetric = typeof metric === "string" && metric ? metric : "valor";
  const ensureArray = (source = []) => Array.isArray(source) ? source : [];
  if (override && Array.isArray(override.subIndicators)) {
    if (!override.subIndicators.length) {
      return { subIndicators: [] };
    }
    const entries = override.subIndicators.map((entry, idx) => {
      const rawId = limparTexto(entry?.id) || "";
      const fallbackId = `${indicatorId}_sub_${idx + 1}`;
      const id = rawId || fallbackId;
      const nome = limparTexto(entry?.nome || entry?.label || entry?.descricao || entry?.name) || `${indicatorNome || "Subindicador"} ${idx + 1}`;
      const metricEntry = limparTexto(entry?.metric) || normalizedMetric;
      const peso = Number(entry?.peso) || 1;
      const children = normalizeStructureChildren(id, nome, metricEntry, ensureArray(entry?.children));
      return { id, nome, metric: metricEntry, peso, children };
    });
    return { subIndicators: entries };
  }

  const baseName = indicatorNome || "Subindicador";
  const fallback = [
    { id: `${indicatorId}_sub_1`, nome: `${baseName} 1`, metric: normalizedMetric, peso: 0.6 },
    { id: `${indicatorId}_sub_2`, nome: `${baseName} 2`, metric: normalizedMetric, peso: 0.4 }
  ];
  return { subIndicators: fallback };
}

const SIMULATOR_SUPPORTED_METRICS = new Set(["valor", "qtd"]);

// Aqui eu deixo prontas as opções de visão acumulada para mudar o período sem ter que mexer no calendário manualmente.
const ACCUMULATED_VIEW_OPTIONS = [
  { value: "mensal",      label: "Mensal",      monthsBack: 0 },
  { value: "trimestral",  label: "Trimestral",  monthsBack: 2 },
  { value: "semestral",   label: "Semestral",   monthsBack: 5 },
  { value: "anual",       label: "Anual",       monthsBack: 11 },
];

// Aqui eu busco o nome bonitinho da seção pelo id.
function getSectionLabel(id) {
  if (!id) return "";
  return SECTION_BY_ID.get(id)?.label || id;
}

// Aqui eu tento descobrir a seção de um indicador olhando tanto a linha quanto a relação produto → seção.
function resolveSectionMetaFromRow(row) {
  if (!row) return { id: "", label: "" };
  const prodMeta = row.produtoId ? PRODUTO_TO_FAMILIA.get(row.produtoId) : null;
  const fromRow = row.secaoId || row.secao || row.familiaSecaoId;
  const fromProd = prodMeta?.secaoId || PRODUCT_INDEX.get(row.produtoId)?.sectionId || "";
  const sectionId = fromRow || fromProd || "";
  const label = row.secaoNome
    || prodMeta?.secaoNome
    || getSectionLabel(sectionId)
    || sectionId;
  return { id: sectionId, label: label || sectionId };
}

// Aqui eu garanto que cada linha tenha uma família associada, buscando informações extras quando necessário.
function resolveFamilyMetaFromRow(row) {
  if (!row) return { id: "", label: "" };
  const prodMeta = row.produtoId ? PRODUTO_TO_FAMILIA.get(row.produtoId) : null;
  let familiaId = row.familiaId || row.familia || prodMeta?.id || "";
  let familiaLabel = row.familiaNome || prodMeta?.nome || "";

  if (familiaId && !familiaLabel) {
    const famRow = FAMILIA_BY_ID.get(familiaId);
    if (famRow?.nome) familiaLabel = famRow.nome;
  }

  if (!familiaId) {
    const sectionMeta = resolveSectionMetaFromRow(row);
    familiaId = sectionMeta.id || "";
    familiaLabel = sectionMeta.label || familiaId;
  }

  if (!familiaLabel) familiaLabel = familiaId;

  return { id: familiaId, label: familiaLabel };
}

const DEFAULT_CAMPAIGN_UNIT_DATA = [
  { id: "nn-atlas", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 01", regional: "Regional Fortaleza", gerenteGestao: "GG 01", agenciaCodigo: "Ag 1001", agencia: "Agência 1001 • Fortaleza Centro", segmento: "Negócios", produtoId: "captacao_bruta", subproduto: "Aplicação", gerente: "Gerente 1", gerenteNome: "Ana Lima", carteira: "Carteira Atlas", linhas: 132.4, cash: 118.2, conquista: 112.6, atividade: true, data: "2025-09-15" },
  { id: "nn-delta", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 01", regional: "Regional Fortaleza", gerenteGestao: "GG 01", agenciaCodigo: "Ag 1001", agencia: "Agência 1001 • Fortaleza Centro", segmento: "Negócios", produtoId: "captacao_liquida", subproduto: "Resgate", gerente: "Gerente 1", gerenteNome: "Ana Lima", carteira: "Carteira Delta", linhas: 118.3, cash: 109.5, conquista: 104.1, atividade: true, data: "2025-09-16" },
  { id: "nn-iguatu", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 02", regional: "Regional Recife", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1002", agencia: "Agência 1002 • Recife Boa Vista", segmento: "Empresas", produtoId: "prod_credito_pj", subproduto: "À vista", gerente: "Gerente 2", gerenteNome: "Paulo Nunes", carteira: "Carteira Iguatu", linhas: 124.2, cash: 110.3, conquista: 102.1, atividade: true, data: "2025-09-12" },
  { id: "nn-sertao", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 02", regional: "Regional Recife", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1002", agencia: "Agência 1002 • Recife Boa Vista", segmento: "Empresas", produtoId: "centralizacao", subproduto: "Parcelado", gerente: "Gerente 2", gerenteNome: "Paulo Nunes", carteira: "Carteira Sertão", linhas: 98.4, cash: 94.6, conquista: 96.8, atividade: false, data: "2025-09-09" },
  { id: "sd-horizonte", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Empresas", produtoId: "rotativo_pj_vol", subproduto: "Aplicação", gerente: "Gerente 3", gerenteNome: "Juliana Prado", carteira: "Carteira Horizonte", linhas: 115.2, cash: 120.5, conquista: 108.4, atividade: true, data: "2025-09-14" },
  { id: "sd-paulista", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Empresas", produtoId: "rotativo_pj_qtd", subproduto: "Resgate", gerente: "Gerente 3", gerenteNome: "Juliana Prado", carteira: "Carteira Paulista", linhas: 104.8, cash: 99.1, conquista: 101.3, atividade: true, data: "2025-09-06" },
  { id: "sd-bandeirantes", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Negócios", produtoId: "consorcios", subproduto: "Parcelado", gerente: "Gerente 4", gerenteNome: "Bruno Garcia", carteira: "Carteira Bandeirantes", linhas: 92.7, cash: 88.6, conquista: 94.2, atividade: true, data: "2025-09-10" },
  { id: "sd-capital", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 03", regional: "Regional São Paulo", gerenteGestao: "GG 03", agenciaCodigo: "Ag 1004", agencia: "Agência 1004 • Avenida Paulista", segmento: "Negócios", produtoId: "cartoes", subproduto: "À vista", gerente: "Gerente 4", gerenteNome: "Bruno Garcia", carteira: "Carteira Capital", linhas: 105.6, cash: 102.4, conquista: 100.2, atividade: true, data: "2025-09-18" },
  { id: "sc-curitiba", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 04", regional: "Regional Curitiba", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1003", agencia: "Agência 1003 • Curitiba Batel", segmento: "MEI", produtoId: "seguros", subproduto: "Aplicação", gerente: "Gerente 5", gerenteNome: "Carla Menezes", carteira: "Carteira Curitiba", linhas: 109.6, cash: 101.2, conquista: 98.5, atividade: true, data: "2025-09-11" },
  { id: "sc-litoral", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 04", regional: "Regional Curitiba", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1003", agencia: "Agência 1003 • Curitiba Batel", segmento: "MEI", produtoId: "bradesco_expresso", subproduto: "Resgate", gerente: "Gerente 5", gerenteNome: "Carla Menezes", carteira: "Carteira Litoral", linhas: 95.4, cash: 90.1, conquista: 92.8, atividade: true, data: "2025-09-07" },
  { id: "sc-vale", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 04", regional: "Regional Curitiba", gerenteGestao: "GG 02", agenciaCodigo: "Ag 1003", agencia: "Agência 1003 • Curitiba Batel", segmento: "MEI", produtoId: "rec_credito", subproduto: "À vista", gerente: "Gerente 5", gerenteNome: "Carla Menezes", carteira: "Carteira Vale", linhas: 120.2, cash: 115.6, conquista: 110.4, atividade: true, data: "2025-09-17" },
  { id: "nn-manaus", diretoria: "DR 01", diretoriaNome: "Norte & Nordeste", gerenciaRegional: "GR 05", regional: "Regional Manaus", gerenteGestao: "GG 05", agenciaCodigo: "Ag 2001", agencia: "Agência 2001 • Manaus Centro", segmento: "Negócios", produtoId: "captacao_bruta", subproduto: "Aplicação", gerente: "Lara Costa", gerenteNome: "Lara Costa", carteira: "Carteira Amazônia", linhas: 119.4, cash: 111.8, conquista: 103.2, atividade: true, data: "2025-09-12" },
  { id: "sc-floripa", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 06", regional: "Regional Florianópolis", gerenteGestao: "GG 06", agenciaCodigo: "Ag 2002", agencia: "Agência 2002 • Florianópolis Beira-Mar", segmento: "Empresas", produtoId: "rotativo_pj_vol", subproduto: "Volume", gerente: "Sofia Martins", gerenteNome: "Sofia Martins", carteira: "Carteira Litoral", linhas: 108.6, cash: 116.3, conquista: 105.5, atividade: true, data: "2025-09-16" },
  { id: "sc-goiania", diretoria: "DR 03", diretoriaNome: "Sul & Centro-Oeste", gerenciaRegional: "GR 07", regional: "Regional Goiânia", gerenteGestao: "GG 07", agenciaCodigo: "Ag 2003", agencia: "Agência 2003 • Goiânia Setor Bueno", segmento: "MEI", produtoId: "bradesco_expresso", subproduto: "Expresso", gerente: "Tiago Andrade", gerenteNome: "Tiago Andrade", carteira: "Carteira Centro-Oeste", linhas: 102.5, cash: 94.2, conquista: 97.1, atividade: true, data: "2025-09-15" },
  { id: "sd-campinas", diretoria: "DR 02", diretoriaNome: "Sudeste", gerenciaRegional: "GR 05", regional: "Regional Campinas", gerenteGestao: "GG 05", agenciaCodigo: "Ag 2004", agencia: "Agência 2004 • Campinas Tech", segmento: "Negócios", produtoId: "centralizacao", subproduto: "Cash", gerente: "Eduardo Freitas", gerenteNome: "Eduardo Freitas", carteira: "Carteira Inovação", linhas: 123.1, cash: 129.4, conquista: 111.7, atividade: true, data: "2025-09-09" }
];
DEFAULT_CAMPAIGN_UNIT_DATA.forEach(unit => aplicarIndicadorAliases(unit, unit.produtoId, unit.produtoNome || unit.produtoId));

const CAMPAIGN_UNIT_DATA = [];

function replaceCampaignUnitData(rows = []) {
  CAMPAIGN_UNIT_DATA.length = 0;
  const source = Array.isArray(rows) && rows.length ? rows : DEFAULT_CAMPAIGN_UNIT_DATA;
  source.forEach(item => {
    const dataISO = converterDataISO(item.data);
    let competencia = converterDataISO(item.competencia);
    const resolvedData = dataISO || "";
    if (!competencia && resolvedData) {
      competencia = `${resolvedData.slice(0, 7)}-01`;
    }
    CAMPAIGN_UNIT_DATA.push({ ...item, data: resolvedData, competencia: competencia || "" });
  });
}

replaceCampaignUnitData(DEFAULT_CAMPAIGN_UNIT_DATA);

CAMPAIGN_UNIT_DATA.forEach(unit => {
  const meta = PRODUCT_INDEX.get(unit.produtoId);
  const familiaMeta = PRODUTO_TO_FAMILIA.get(unit.produtoId);
  if (familiaMeta) {
    if (!unit.familiaId) unit.familiaId = familiaMeta.id;
    if (!unit.familia) unit.familia = familiaMeta.nome || familiaMeta.id;
    if (!unit.familiaNome) unit.familiaNome = familiaMeta.nome || familiaMeta.id;
    if (!unit.secaoId) unit.secaoId = familiaMeta.secaoId || meta?.sectionId;
    if (!unit.secao) unit.secao = familiaMeta.secaoId || meta?.sectionId;
    if (!unit.secaoNome) unit.secaoNome = familiaMeta.secaoNome || meta?.sectionLabel || getSectionLabel(familiaMeta.secaoId);
  } else if (meta?.sectionId) {
    if (!unit.familiaId) unit.familiaId = meta.sectionId;
    if (!unit.familia) unit.familia = meta.sectionId;
    if (!unit.secaoId) unit.secaoId = meta.sectionId;
    if (!unit.secao) unit.secao = meta.sectionId;
    if (!unit.secaoNome) unit.secaoNome = meta.sectionLabel || meta.sectionId;
    if (!unit.familiaNome) unit.familiaNome = meta.sectionLabel || meta.sectionId;
  }
  if (!unit.produtoNome) unit.produtoNome = meta?.name || unit.produto || unit.produtoId || "Subindicador";
  if (!unit.gerenteGestaoNome) {
    const numeric = (unit.gerenteGestao || "").replace(/[^0-9]/g, "");
    unit.gerenteGestaoNome = numeric ? `Gerente geral ${numeric}` : "Gerente geral";
  }
  if (!unit.familiaNome && unit.familia) unit.familiaNome = unit.familia;
  if (!unit.subproduto) unit.subproduto = "";
  if (unit.subproduto) registrarAliasIndicador(unit.produtoId, unit.subproduto);
});
const CAMPAIGN_SPRINTS = [
  {
    id: "sprint-pj-2025",
    label: "Sprint PJ 2025",
    cycle: "Sprint PJ • Setembro a Dezembro 2025",
    period: { start: "2025-09-01", end: "2025-12-31" },
    note: "Projete cenários e acompanhe apenas as unidades visíveis nos filtros atuais.",
    headStats: [
      { label: "Meta mínima", value: "100 pts" },
      { label: "Indicador mínimo", value: "90%" },
      { label: "Teto considerado", value: "150%" }
    ],
    summary: [
      { id: "equipes", label: "Equipes elegíveis", value: CAMPAIGN_UNIT_DATA.length, total: CAMPAIGN_UNIT_DATA.length },
      { id: "media", label: "Pontuação média", value: 0, unit: "pts" },
      { id: "recorde", label: "Maior pontuação", value: 0, unit: "pts", complement: "" },
      { id: "atualizacao", label: "Atualização", text: "20/09/2025 08:30" }
    ],
    team: {
      minThreshold: 90,
      superThreshold: 120,
      cap: 150,
      eligibilityMinimum: 100,
      defaultPreset: "meta",
      indicators: [
        { id: "linhas", label: "Linhas governamentais", short: "Linhas", weight: 40, hint: "Operações direcionadas, BB Giro e BNDES.", default: 100 },
        { id: "cash", label: "Cash (TPV)", short: "Cash", weight: 30, hint: "Centralização de caixa e TPV eletrônico.", default: 100 },
        { id: "conquista", label: "Conquista cliente PJ", short: "Conquista", weight: 30, hint: "Abertura de contas e ativação digital.", default: 100 }
      ],
      presets: [
        { id: "minimo", label: "Mínimo obrigatório (90%)", values: { linhas: 90, cash: 90, conquista: 90 } },
        { id: "meta", label: "Meta do sprint (100%)", values: { linhas: 100, cash: 100, conquista: 100 } },
        { id: "stretch", label: "Meta esticada (120%)", values: { linhas: 120, cash: 120, conquista: 120 } }
      ]
    },
    individual: {
      profiles: [
        {
          id: "negocios",
          label: "Negócios",
          description: "Carteiras MPE com foco em relacionamento consultivo.",
          minThreshold: 90,
          superThreshold: 120,
          cap: 150,
          eligibilityMinimum: 100,
          defaultPreset: "meta",
          indicators: [
            { id: "linhas", label: "Linhas governamentais", short: "Linhas", weight: 40, default: 100 },
            { id: "cash", label: "Cash (TPV)", short: "Cash", weight: 30, default: 100 },
            { id: "conquista", label: "Conquista cliente PJ", short: "Conquista", weight: 30, default: 100 }
          ],
          presets: [
            { id: "minimo", label: "90% em todos", values: { linhas: 90, cash: 90, conquista: 90 } },
            { id: "meta", label: "Meta (100%)", values: { linhas: 100, cash: 100, conquista: 100 } },
            { id: "destaque", label: "Stretch (120%)", values: { linhas: 120, cash: 120, conquista: 120 } }
          ]
        },
        {
          id: "empresas",
          label: "Empresas",
          description: "Grandes empresas e governo com foco em volume.",
          minThreshold: 90,
          superThreshold: 120,
          cap: 150,
          eligibilityMinimum: 100,
          defaultPreset: "meta",
          indicators: [
            { id: "linhas", label: "Linhas governamentais", short: "Linhas", weight: 45, default: 100 },
            { id: "cash", label: "Cash (TPV)", short: "Cash", weight: 35, default: 100 },
            { id: "conquista", label: "Conquista cliente PJ", short: "Conquista", weight: 20, default: 100 }
          ],
          presets: [
            { id: "minimo", label: "90% em todos", values: { linhas: 90, cash: 90, conquista: 90 } },
            { id: "meta", label: "Meta (100%)", values: { linhas: 100, cash: 100, conquista: 100 } },
            { id: "stretch", label: "Stretch (120%)", values: { linhas: 120, cash: 120, conquista: 120 } }
          ]
        }
      ]
    },
    units: CAMPAIGN_UNIT_DATA
  }
];

function updateCampaignSprintsUnits() {
  CAMPAIGN_SPRINTS.forEach(sprint => {
    const filtered = CAMPAIGN_UNIT_DATA.filter(unit => !unit.sprintId || unit.sprintId === sprint.id);
    const effectiveUnits = filtered.length ? filtered : CAMPAIGN_UNIT_DATA;
    sprint.units = effectiveUnits;

    const summaryList = Array.isArray(sprint.summary) ? sprint.summary : [];
    const summaryById = new Map(summaryList.map(item => [item.id, item]));
    const totalUnits = effectiveUnits.length;

    const equipesItem = summaryById.get("equipes");
    if (equipesItem) {
      equipesItem.value = totalUnits;
      equipesItem.total = totalUnits;
    }

    const scores = effectiveUnits.map(unit => computeCampaignScore(sprint.team, {
      linhas: unit.linhas,
      cash: unit.cash,
      conquista: unit.conquista,
    }));

    const mediaItem = summaryById.get("media");
    if (mediaItem) {
      const sum = scores.reduce((acc, score) => acc + (score?.totalPoints || 0), 0);
      mediaItem.value = totalUnits ? sum / totalUnits : 0;
    }

    const recordItem = summaryById.get("recorde");
    if (recordItem) {
      let maxPoints = -Infinity;
      let destaque = "";
      effectiveUnits.forEach((unit, idx) => {
        const pts = scores[idx]?.totalPoints ?? 0;
        if (pts > maxPoints) {
          maxPoints = pts;
          destaque = unit.agenciaNome || unit.agencia || unit.regional || unit.diretoriaNome || "";
        }
      });
      recordItem.value = maxPoints > 0 ? maxPoints : 0;
      if (destaque) recordItem.complement = destaque;
    }
  });
}

updateCampaignSprintsUnits();

const CAMPAIGN_LEVEL_META = {
  diretoria:     { groupField: "diretoria", displayField: "diretoriaNome", singular: "Diretoria", plural: "diretorias" },
  regional:      { groupField: "gerenciaRegional", displayField: "regional", singular: "Regional", plural: "regionais" },
  agencia:       { groupField: "agenciaCodigo", displayField: "agencia", singular: "Agência", plural: "agências" },
  gerenteGestao: { groupField: "gerenteGestao", displayField: "gerenteGestaoNome", singular: "Gerente geral", plural: "gerentes gerais" },
  gerente:       { groupField: "gerente", displayField: "gerenteNome", singular: "Gerente", plural: "gerentes" },
  produto:       { groupField: "produtoId", displayField: "produtoNome", singular: "Subindicador", plural: "subindicadores" },
  carteira:      { groupField: "carteira", displayField: "carteira", singular: "Carteira", plural: "carteiras" }
};

function determineCampaignDisplayLevel(filters = getFilterValues()) {
  if (filters.produtoId && filters.produtoId !== "Todos" && filters.produtoId !== "Todas") {
    return { level: "produto", meta: CAMPAIGN_LEVEL_META.produto };
  }
  if (filters.familiaId && filters.familiaId !== "Todas") {
    return { level: "produto", meta: CAMPAIGN_LEVEL_META.produto };
  }
  if (filters.secaoId && filters.secaoId !== "Todas") {
    return { level: "produto", meta: CAMPAIGN_LEVEL_META.produto };
  }
  if (filters.gerente && !selecaoPadrao(filters.gerente)) {
    return { level: "produto", meta: CAMPAIGN_LEVEL_META.produto };
  }
  if (filters.ggestao && !selecaoPadrao(filters.ggestao)) {
    return { level: "gerente", meta: CAMPAIGN_LEVEL_META.gerente };
  }
  if (filters.agencia && filters.agencia !== "Todas") {
    return { level: "gerenteGestao", meta: CAMPAIGN_LEVEL_META.gerenteGestao };
  }
  if (filters.gerencia && filters.gerencia !== "Todas") {
    return { level: "agencia", meta: CAMPAIGN_LEVEL_META.agencia };
  }
  if (filters.diretoria && filters.diretoria !== "Todas") {
    return { level: "regional", meta: CAMPAIGN_LEVEL_META.regional };
  }
  return { level: "diretoria", meta: CAMPAIGN_LEVEL_META.diretoria };
}

function filterCampaignUnits(sprint, filters = getFilterValues()) {
  const startISO = state.period.start;
  const endISO = state.period.end;
  const factRows = Array.isArray(state.facts?.campanhas) && state.facts.campanhas.length
    ? state.facts.campanhas
    : fCampanhas;
  const base = sprint
    ? (factRows.filter(row => row.sprintId === sprint.id) || [])
    : [];
  const units = base.length ? base : (sprint?.units || []);
  return units.filter(unit => {
    const okSegmento = selecaoPadrao(filters.segmento) || unit.segmento === filters.segmento;
    const okDiretoria = selecaoPadrao(filters.diretoria) || unit.diretoria === filters.diretoria;
    const okGerencia = selecaoPadrao(filters.gerencia) || unit.gerenciaRegional === filters.gerencia;
    const okAgencia = selecaoPadrao(filters.agencia) || unit.agenciaCodigo === filters.agencia;
    const okGG = selecaoPadrao(filters.ggestao)
      || matchesSelection(
        filters.ggestao,
        unit.gerenteGestao,
        unit.gerenteGestaoId,
        unit.gerenteGestaoNome,
        unit.gerenteGestaoLabel
      );
    const okGerente = selecaoPadrao(filters.gerente)
      || matchesSelection(
        filters.gerente,
        unit.gerente,
        unit.gerenteId,
        unit.gerenteNome,
        unit.gerenteLabel
      );
    const okFamilia = selecaoPadrao(filters.familiaId)
      || matchesSelection(filters.familiaId, unit.produtoId, unit.produtoNome, unit.produto);
    const okProduto = selecaoPadrao(filters.produtoId)
      || matchesSelection(filters.produtoId, unit.subIndicadorId, unit.subproduto, unit.subIndicadorNome, unit.prodOrSub);
    const prodSecao = unit.produtoId ? (PRODUCT_INDEX.get(unit.produtoId)?.sectionId || PRODUTO_TO_FAMILIA.get(unit.produtoId)?.secaoId) : "";
    const unitSecaoId = unit.secaoId || prodSecao || "";
    const okSecao = (!filters.secaoId || filters.secaoId === "Todas" || unitSecaoId === filters.secaoId || unit.familiaId === filters.secaoId || unit.familia === filters.secaoId);
    const okDate = (!startISO || unit.data >= startISO) && (!endISO || unit.data <= endISO);
    return okSegmento && okDiretoria && okGerencia && okAgencia && okGG && okGerente && okSecao && okFamilia && okProduto && okDate;
  });
}

function campaignStatusMatches(score, statusFilter = "todos") {
  const normalized = normalizarChaveStatus(statusFilter) || "todos";
  if (normalized === "todos") return true;
  const elegivel = score.finalStatus === "Parabéns" || score.finalStatus === "Elegível";
  if (normalized === "atingidos") return elegivel;
  if (normalized === "nao") return !elegivel;
  return true;
}

function aggregateCampaignUnitResults(unitResults, level, teamConfig) {
  const meta = CAMPAIGN_LEVEL_META[level] || CAMPAIGN_LEVEL_META.diretoria;
  const field = meta.groupField;
  const nameField = meta.displayField || field;
  const buckets = new Map();

  unitResults.forEach(({ unit }) => {
    const key = unit[field] || unit[nameField] || "—";
    const bucket = buckets.get(key) || {
      key,
      name: unit[nameField] || key,
      linhas: 0,
      cash: 0,
      conquista: 0,
      count: 0,
      atividadeHits: 0
    };
    bucket.name = unit[nameField] || key;
    bucket.linhas += toNumber(unit.linhas);
    bucket.cash += toNumber(unit.cash);
    bucket.conquista += toNumber(unit.conquista);
    bucket.count += 1;
    bucket.atividadeHits += unit.atividade ? 1 : 0;
    buckets.set(key, bucket);
  });

  return [...buckets.values()].map(bucket => {
    const linhas = bucket.count ? bucket.linhas / bucket.count : 0;
    const cash = bucket.count ? bucket.cash / bucket.count : 0;
    const conquista = bucket.count ? bucket.conquista / bucket.count : 0;
    const result = computeCampaignScore(teamConfig, { linhas, cash, conquista });
    const atividade = bucket.atividadeHits >= Math.ceil(bucket.count / 2);
    return {
      key: bucket.key,
      name: bucket.name,
      linhas,
      cash,
      conquista,
      atividade,
      finalStatus: result.finalStatus,
      finalClass: result.finalClass,
      totalPoints: result.totalPoints,
      result
    };
  });
}

function summarizeCampaignUnitResults(unitResults) {
  const total = unitResults.length;
  if (!total) {
    return { total: 0, elegiveis: 0, media: 0, recorde: 0, destaque: "" };
  }

  let soma = 0;
  let elegiveis = 0;
  let recorde = -Infinity;
  let destaque = "";

  unitResults.forEach(({ unit, score }) => {
    soma += score.totalPoints;
    if (score.finalStatus === "Parabéns" || score.finalStatus === "Elegível") elegiveis += 1;
    if (score.totalPoints > recorde) {
      recorde = score.totalPoints;
      destaque = unit.regional || unit.agencia || unit.gerenteNome || unit.carteira || unit.diretoriaNome || "";
    }
  });

  return {
    total,
    elegiveis,
    media: soma / total,
    recorde: recorde > 0 ? recorde : 0,
    destaque
  };
}

function buildCampaignRankingContext(sprint) {
  if (!sprint) {
    const levelInfo = determineCampaignDisplayLevel();
    return { unitResults: [], aggregated: [], levelInfo };
  }

  const filters = getFilterValues();
  const filteredUnits = filterCampaignUnits(sprint, filters);
  const unitResults = filteredUnits.map(unit => {
    const score = unit.score || computeCampaignScore(sprint.team, {
      linhas: unit.linhas,
      cash: unit.cash,
      conquista: unit.conquista
    });
    return { unit, score };
  }).filter(({ score }) => campaignStatusMatches(score, filters.status || "todos"));

  const levelInfo = determineCampaignDisplayLevel(filters);
  const aggregated = aggregateCampaignUnitResults(unitResults, levelInfo.level, sprint.team);

  return { unitResults, aggregated, levelInfo };
}

/* ===== Aqui eu concentro tudo que mexe com datas e horários em UTC ===== */
// Aqui eu gero a data de hoje em ISO (aaaa-mm-dd).
function __pad2(n){ return String(n).padStart(2, "0"); }
function fmtISO(date){
  if (!(date instanceof Date) || Number.isNaN(date?.getTime?.())) return "";
  return `${date.getFullYear()}-${__pad2(date.getMonth() + 1)}-${__pad2(date.getDate())}`;
}
function todayISO(){
  return fmtISO(new Date());
}
function resolveCalendarToday(){
  const cap = (typeof window !== "undefined" && typeof window.calendarCapISO === "string")
    ? window.calendarCapISO.trim()
    : "";
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (cap && isoPattern.test(cap)) return cap;

  if (Array.isArray(DIM_CALENDARIO) && DIM_CALENDARIO.length) {
    const ordered = DIM_CALENDARIO
      .map(entry => (typeof entry?.data === "string" ? entry.data.slice(0, 10) : ""))
      .filter(Boolean)
      .sort();
    const last = ordered[ordered.length - 1];
    if (last && isoPattern.test(last)) return last;
  }

  return todayISO();
}
function getCurrentMonthPeriod(){
  const end = resolveCalendarToday();
  const start = `${end.slice(0, 7)}-01`;
  return { from: start, to: end };
}
function getDefaultPeriodRange(){
  const { from, to } = getCurrentMonthPeriod();
  return { start: from, end: to };
}
// Aqui eu descubro os limites (início e fim) do mês referente a uma data ISO qualquer.
function getMonthBoundsForISO(baseISO){
  const fallbackToday = todayISO();
  const iso = baseISO || fallbackToday;
  const ref = dateUTCFromISO(iso);
  if (!(ref instanceof Date) || Number.isNaN(ref?.getTime?.())) {
    const todayRef = dateUTCFromISO(fallbackToday);
    const startFallback = `${todayRef.getUTCFullYear()}-${String(todayRef.getUTCMonth()+1).padStart(2,"0")}-01`;
    const endFallbackDate = new Date(Date.UTC(todayRef.getUTCFullYear(), todayRef.getUTCMonth()+1, 0));
    return { start:startFallback, end: isoFromUTCDate(endFallbackDate) };
  }
  const start = `${ref.getUTCFullYear()}-${String(ref.getUTCMonth()+1).padStart(2,"0")}-01`;
  const endDate = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth()+1, 0));
  const end = isoFromUTCDate(endDate);
  return { start, end };
}
// Aqui eu calculo um panorama rápido de dias úteis do mês corrente usando o calendário completo.
function getCurrentMonthBusinessSnapshot(){
  const today = todayISO();
  const { start: monthStart, end: monthEnd } = getMonthBoundsForISO(today);
  const monthKey = today.slice(0,7);
  let total = 0;
  let elapsed = 0;
  if (Array.isArray(DIM_CALENDARIO) && DIM_CALENDARIO.length) {
    const entries = DIM_CALENDARIO.filter(entry => {
      const data = entry.data || entry.dt || "";
      return typeof data === "string" && data.startsWith(monthKey);
    });
    const businessEntries = entries.filter(entry => {
      const utilFlag = entry.ehDiaUtil ?? entry.util ?? entry.diaUtil ?? "";
      const value = typeof utilFlag === "string" ? utilFlag.trim() : utilFlag;
      if (value === true || value === 1 || value === "1") return true;
      if (typeof value === "string" && value.toLowerCase() === "sim") return true;
      return false;
    });
    total = businessEntries.length;
    const todayFiltered = businessEntries.filter(entry => (entry.data || entry.dt || "") <= today);
    elapsed = todayFiltered.length;
  }
  if (!total) {
    total = businessDaysBetweenInclusive(monthStart, monthEnd);
    const cappedToday = today < monthStart ? monthStart : (today > monthEnd ? monthEnd : today);
    elapsed = businessDaysBetweenInclusive(monthStart, cappedToday);
  }
  const remaining = Math.max(0, total - elapsed);
  return { total, elapsed, remaining, monthStart, monthEnd };
}
// Aqui eu descubro rapidamente quantos meses devo voltar em cada visão acumulada.
function getAccumulatedViewMonths(view){
  const match = ACCUMULATED_VIEW_OPTIONS.find(opt => opt.value === view);
  return match ? match.monthsBack : 0;
}
// Aqui eu calculo o período inicial/final com base na visão acumulada escolhida.
function computeAccumulatedPeriod(view = state.accumulatedView || "mensal", referenceEndISO = ""){
  const today = todayISO();
  const datasetMax = AVAILABLE_DATE_MAX || "";
  const cap = datasetMax || today;
  let endISO = referenceEndISO || state.period?.end || cap;
  if (!endISO) endISO = cap;
  if (datasetMax && endISO > datasetMax) {
    endISO = datasetMax;
  } else if (!datasetMax && endISO > today) {
    endISO = today;
  }
  let endDate = dateUTCFromISO(endISO);
  if (!(endDate instanceof Date) || Number.isNaN(endDate?.getTime?.())) {
    endDate = dateUTCFromISO(cap);
    endISO = isoFromUTCDate(endDate);
  }
  const monthsBack = getAccumulatedViewMonths(view);
  let startDate;
  if (view === "anual") {
    startDate = new Date(Date.UTC(endDate.getUTCFullYear(), 0, 1));
  } else {
    startDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - monthsBack, 1));
  }
  const startISO = isoFromUTCDate(startDate);
  const endIsoFinal = isoFromUTCDate(endDate);
  return { start: startISO, end: endIsoFinal };
}
// Aqui eu aplico a visão acumulada escolhida direto no estado e atualizo o rótulo do período.
function syncPeriodFromAccumulatedView(view = state.accumulatedView || "mensal", referenceEndISO = ""){
  let period;
  if (view === "mensal") {
    const ref = referenceEndISO || state.period?.end || todayISO();
    const safeRef = ref || todayISO();
    period = { start: `${safeRef.slice(0, 7)}-01`, end: safeRef };
  } else {
    period = computeAccumulatedPeriod(view, referenceEndISO);
  }
  state.period.start = period.start;
  state.period.end = period.end;
  updatePeriodLabels();
  return period;
}
// Aqui eu atualizo os textos "De xx/xx/xxxx até yy/yy/yyyy" sempre que o período mudar.
function updatePeriodLabels(){
  const startEl = document.getElementById("lbl-periodo-inicio");
  const endEl = document.getElementById("lbl-periodo-fim");
  if (startEl) startEl.textContent = formatBRDate(state.period.start);
  if (endEl) endEl.textContent = formatBRDate(state.period.end);
}
// Aqui eu calculo o período que alimenta os gráficos mensais da visão executiva.
function getExecutiveMonthlyPeriod(){
  const today = todayISO();
  const datasetMax = AVAILABLE_DATE_MAX || "";
  const datasetYear = datasetMax ? datasetMax.slice(0,4) : "";
  const currentYear = today.slice(0,4);
  const useCurrentYear = !datasetYear || datasetYear === currentYear;
  let end = useCurrentYear ? today : (datasetMax || today);
  if (!end) end = today;
  let year = useCurrentYear ? currentYear : (datasetYear || currentYear);
  let start = `${year}-01-01`;
  if (end && start && start > end) {
    start = `${end.slice(0,7)}-01`;
  }
  return { start, end };
}
// Aqui eu formato uma data ISO para o padrão BR.
function formatBRDate(iso){ if(!iso) return ""; const [y,m,day]=iso.split("-"); return `${day}/${m}/${y}`; }
// Aqui eu converto uma data ISO para um Date em UTC.
function dateUTCFromISO(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); }
// Aqui eu faço o caminho inverso: Date UTC para string ISO.
function isoFromUTCDate(d){ return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`; }
// Aqui eu mantenho um conjunto fixo de colunas que aparecem quando o usuário abre o detalhe de um contrato.
const DETAIL_SUBTABLE_COLUMNS = [
  { id: "canal",       label: "Canal da venda",         render: (group = {}) => escapeHTML(group.canal || "—") },
  { id: "tipo",        label: "Tipo da venda",          render: (group = {}) => escapeHTML(group.tipo || "—") },
  { id: "gerente",     label: "Gerente",                render: (group = {}) => escapeHTML(group.gerente || "—") },
  { id: "modalidade",  label: "Condição de pagamento",  render: (group = {}) => escapeHTML(group.modalidade || "—") },
  { id: "vencimento",  label: "Data de vencimento",     render: (group = {}) => renderDetailDateCell(group.dataVencimento) },
  { id: "cancelamento",label: "Data de cancelamento",   render: (group = {}) => renderDetailDateCell(group.dataCancelamento) },
  { id: "motivo",      label: "Motivo do cancelamento", render: (group = {}) => escapeHTML(group.motivoCancelamento || "—") },
];

// Aqui eu montei os metadados das colunas da tabela principal para poder ligar/desligar conforme a visão escolhida.
const DETAIL_COLUMNS = [
  { id: "quantidade",    label: "Quantidade",          cellClass: "", render: renderDetailQtyCell, sortType: "number", getValue: (node = {}) => toNumber(node.qtd) },
  { id: "realizado",     label: "Realizado no mês (R$)",      cellClass: "", render: renderDetailRealizadoCell, sortType: "number", getValue: (node = {}) => toNumber(node.realizado) },
  { id: "meta",          label: "Meta no mês (R$)",           cellClass: "", render: renderDetailMetaCell, sortType: "number", getValue: (node = {}) => toNumber(node.meta) },
  { id: "atingimento_v", label: "Atingimento (R$)",    cellClass: "", render: renderDetailAchievementValueCell, sortType: "number", getValue: (node = {}) => {
    const realizado = toNumber(node.realizado);
    const meta = toNumber(node.meta);
    if (meta > 0) return Math.max(0, Math.min(realizado, meta));
    return Math.max(0, realizado);
  } },
  { id: "atingimento_p", label: "Atingimento (%)",     cellClass: "", render: renderDetailAchievementPercentCell, sortType: "number", getValue: (node = {}) => Number(node.ating || 0) },
  { id: "pontos",        label: "Pontos no mês (pts)",        cellClass: "", render: renderDetailPointsCell, sortType: "number", getValue: (node = {}) => toNumber(node.pontos ?? node.pontosCumpridos) },
  { id: "peso",          label: "Peso (pts)",          cellClass: "", render: renderDetailPesoCell, sortType: "number", getValue: (node = {}) => toNumber(node.peso ?? node.pontosMeta) },
  { id: "data",          label: "Data",                cellClass: "", render: renderDetailDateCellFromNode, sortType: "date", getValue: (node = {}) => node.data || "" },
  { id: "meta_diaria",   label: "Meta diária total (R$)",    cellClass: "", render: renderDetailMetaDiariaCell, sortType: "number", getValue: (node = {}) => toNumber(node.metaDiaria) },
  { id: "referencia_hoje", label: "Referência para hoje (R$)", cellClass: "", render: renderDetailReferenciaHojeCell, sortType: "number", getValue: (node = {}) => toNumber(node.referenciaHoje) },
  { id: "meta_diaria_necessaria", label: "Meta diária necessária (R$)", cellClass: "", render: renderDetailMetaDiariaNecessariaCell, sortType: "number", getValue: (node = {}) => toNumber(node.metaDiariaNecessaria) },
  { id: "projecao",      label: "Projeção (R$)",       cellClass: "", render: renderDetailProjecaoCell, sortType: "number", getValue: (node = {}) => toNumber(node.projecao) },
];
const DETAIL_DEFAULT_COLUMNS = [
  "quantidade",
  "realizado",
  "meta",
  "atingimento_v",
  "atingimento_p",
  "pontos",
  "peso",
  "data",
];
const DETAIL_DEFAULT_VIEW = {
  id: "default",
  name: "Visão padrão",
  columns: [...DETAIL_DEFAULT_COLUMNS],
};
const DETAIL_MAX_CUSTOM_VIEWS = 5;
const DETAIL_VIEW_STORAGE_KEY = "pobj3:detailViews";
const DETAIL_VIEW_ACTIVE_KEY = "pobj3:detailActiveView";
const DETAIL_VIEW_CUSTOM_KEY = "pobj3:detailCustomView";
const DETAIL_CUSTOM_DEFAULT_LABEL = "Visão personalizada";

function renderDetailDateCell(iso){
  if (!iso) return "—";
  const label = formatBRDate(iso);
  if (!label) return "—";
  const safe = escapeHTML(label);
  return `<span class="detail-date" title="${safe}">${safe}</span>`;
}

function renderDetailQtyCell(node = {}){
  const qty = toNumber(node.qtd);
  const rounded = Math.round(qty);
  const full = fmtINT.format(rounded);
  const display = formatIntReadable(qty);
  return `<span title="${full}">${display}</span>`;
}

function renderDetailRealizadoCell(node = {}){
  const value = toNumber(node.realizado);
  const rounded = Math.round(value);
  const full = fmtBRL.format(rounded);
  const display = formatBRLReadable(value);
  return `<span title="${full}">${display}</span>`;
}

function isContractNode(node = {}){
  return node?.type === "contrato" || node?.levelKey === "contrato";
}

function renderDetailContractPlaceholder(){
  return `<span class="detail-placeholder">-</span>`;
}

function renderDetailMetaCell(node = {}){
  if (isContractNode(node)) return renderDetailContractPlaceholder();
  const value = toNumber(node.meta);
  const rounded = Math.round(value);
  const full = fmtBRL.format(rounded);
  const display = formatBRLReadable(value);
  return `<span title="${full}">${display}</span>`;
}

function renderDetailAchievementValueCell(node = {}){
  if (isContractNode(node)) return renderDetailContractPlaceholder();
  return renderDetailAchievementCurrency(node.realizado, node.meta);
}

function renderDetailAchievementPercentCell(node = {}){
  if (isContractNode(node)) return renderDetailContractPlaceholder();
  const ratio = Number(node.ating || 0);
  return renderDetailAchievementPercent(ratio);
}

function renderDetailPointsCell(node = {}){
  const pontos = Math.max(0, toNumber(node.pontos ?? node.pontosCumpridos ?? 0));
  const formatted = formatPoints(pontos, { withUnit: true });
  return `<span title="${formatted}">${formatted}</span>`;
}

function renderDetailPesoCell(node = {}){
  const peso = Math.max(0, toNumber(node.peso ?? node.pontosMeta ?? 0));
  const formatted = formatPoints(peso, { withUnit: true });
  return `<span title="${formatted}">${formatted}</span>`;
}

function renderDetailDateCellFromNode(node = {}){
  return renderDetailDateCell(node.data);
}

function renderDetailCurrencyValue(amount){
  const value = toNumber(amount);
  const rounded = Math.round(value);
  const full = fmtBRL.format(rounded);
  const display = formatBRLReadable(value);
  return `<span title="${full}">${display}</span>`;
}

function renderDetailMetaDiariaCell(node = {}){
  return renderDetailCurrencyValue(node.metaDiaria);
}

function renderDetailReferenciaHojeCell(node = {}){
  return renderDetailCurrencyValue(node.referenciaHoje);
}

function renderDetailMetaDiariaNecessariaCell(node = {}){
  return renderDetailCurrencyValue(node.metaDiariaNecessaria);
}

function renderDetailProjecaoCell(node = {}){
  return renderDetailCurrencyValue(node.projecao);
}

function renderDetailAchievementCurrency(realizado, meta){
  const r = toNumber(realizado);
  const m = toNumber(meta);
  const hasMeta = m > 0;
  const achieved = hasMeta ? Math.max(0, Math.min(r, m)) : Math.max(0, r);
  const cls = hasMeta ? (r >= m ? "def-pos" : "def-neg") : "def-pos";
  const full = fmtBRL.format(Math.round(achieved));
  const display = formatBRLReadable(achieved);
  return `<span class="def-badge ${cls}" title="${full}">${display}</span>`;
}

function renderDetailAchievementPercent(ratio){
  const pct = Number.isFinite(ratio) ? ratio * 100 : 0;
  const safe = Math.max(0, pct);
  const cls = safe < 50 ? "att-low" : (safe < 100 ? "att-warn" : "att-ok");
  return `<span class="att-badge ${cls}">${safe.toFixed(1)}%</span>`;
}
function getDetailColumnMeta(id){
  return DETAIL_COLUMNS.find(col => col.id === id) || null;
}

const DETAIL_LABEL_SORT_META = {
  id: "__label__",
  sortType: "string",
  defaultDirection: "asc",
  getValue: (node = {}) => node.label || "",
};

function getDetailSortMeta(sortId){
  if (!sortId) return null;
  if (sortId === "__label__") return DETAIL_LABEL_SORT_META;
  const col = getDetailColumnMeta(sortId);
  if (!col) return null;
  const sortType = col.sortType || "string";
  const getValue = typeof col.getValue === "function"
    ? col.getValue
    : ((node = {}) => node[col.id]);
  const defaultDirection = col.defaultDirection || (sortType === "string" ? "asc" : "desc");
  return { id: col.id, sortType, getValue, defaultDirection };
}

function compareDetailSortValues(a, b, sortType){
  if (sortType === "number") {
    const diff = toNumber(a) - toNumber(b);
    if (diff < 0) return -1;
    if (diff > 0) return 1;
    return 0;
  }
  const strA = String(a ?? "");
  const strB = String(b ?? "");
  if (sortType === "date") {
    return strA.localeCompare(strB);
  }
  return strA.localeCompare(strB, "pt-BR", { sensitivity: "base" });
}

function applyDetailSort(nodes, sortMeta, direction){
  if (!Array.isArray(nodes) || !nodes.length) return;
  const dir = direction === "asc" || direction === "desc" ? direction : null;
  if (sortMeta && dir) {
    const multiplier = dir === "asc" ? 1 : -1;
    nodes.sort((a, b) => {
      const va = sortMeta.getValue ? sortMeta.getValue(a) : undefined;
      const vb = sortMeta.getValue ? sortMeta.getValue(b) : undefined;
      const cmp = compareDetailSortValues(va, vb, sortMeta.sortType);
      if (cmp !== 0) return cmp * multiplier;
      return compareDetailSortValues(a.label || "", b.label || "", "string");
    });
  }
  nodes.forEach(node => {
    if (Array.isArray(node.children) && node.children.length) {
      applyDetailSort(node.children, sortMeta, direction);
    }
  });
}
function sanitizeDetailColumns(columns = []){
  const valid = [];
  columns.forEach(id => {
    const meta = getDetailColumnMeta(id);
    if (!meta) return;
    if (!valid.includes(meta.id)) valid.push(meta.id);
  });
  return valid.length ? valid : [...DETAIL_DEFAULT_VIEW.columns];
}
function detailColumnsEqual(a = [], b = []){
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
function normalizeDetailViewPayload(payload){
  if (!payload || typeof payload !== "object") return null;
  const rawId = typeof payload.id === "string" ? payload.id.trim() : payload.id;
  const id = rawId || null;
  if (!id) return null;
  const name = limparTexto(payload.name || "");
  const columns = sanitizeDetailColumns(Array.isArray(payload.columns) ? payload.columns : []);
  return { id, name: name || "Visão personalizada", columns };
}
function readLocalStorageItem(key){
  try{
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  }catch(err){
    console.warn("Não consegui ler preferências de coluna:", err);
    return null;
  }
}
function writeLocalStorageItem(key, value){
  if (typeof window === "undefined" || !window.localStorage) return;
  try{
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  }catch(err){
    console.warn("Não consegui salvar preferências de coluna:", err);
  }
}
function readLocalStorageJSON(key){
  const raw = readLocalStorageItem(key);
  if (!raw) return null;
  try{
    return JSON.parse(raw);
  }catch(err){
    console.warn("JSON inválido para", key, err);
    return null;
  }
}
function writeLocalStorageJSON(key, value){
  if (value == null) writeLocalStorageItem(key, null);
  else writeLocalStorageItem(key, JSON.stringify(value));
}
function generateDetailViewId(){
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
}
// Aqui eu conto quantos dias úteis existem entre duas datas (inclusive).
function businessDaysBetweenInclusive(startISO,endISO){
  if(!startISO || !endISO) return 0;
  let s = dateUTCFromISO(startISO), e = dateUTCFromISO(endISO);
  if(s > e) return 0;
  let cnt=0;
  for(let d=new Date(s); d<=e; d.setUTCDate(d.getUTCDate()+1)){
    const wd = d.getUTCDay(); if(wd!==0 && wd!==6) cnt++;
  }
  return cnt;
}
// Aqui eu calculo quantos dias úteis já se passaram dentro do intervalo até hoje (incluindo hoje).
function businessDaysElapsedUntilToday(startISO,endISO){
  if(!startISO || !endISO) return 0;
  const todayISOValue = todayISO();
  let start = dateUTCFromISO(startISO), end = dateUTCFromISO(endISO), today = dateUTCFromISO(todayISOValue);
  if(!start || !end || !today) return 0;
  if(today < start) return 0;
  if(today > end) today = end;
  return businessDaysBetweenInclusive(startISO, isoFromUTCDate(today));
}
// Aqui eu calculo quantos dias úteis ainda faltam a partir de hoje até o fim de um período.
function businessDaysRemainingFromToday(startISO,endISO){
  if(!startISO || !endISO) return 0;
  const total = businessDaysBetweenInclusive(startISO, endISO);
  const elapsed = businessDaysElapsedUntilToday(startISO, endISO);
  return Math.max(0, total - elapsed);
}

/* ===== Aqui eu deixo funções auxiliares para métricas e números ===== */
// Aqui eu converto qualquer valor para número sem deixar NaN escapar.
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Aqui eu fujo de problemas de XSS escapando HTML sempre que crio strings manualmente.
var escapeHTML = typeof escapeHTML === "function"
  ? escapeHTML
  : (value = "") => String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));

// Aqui eu deixo um formatador genérico para exibir números grandes com sufixo (mil, milhão...).
function formatNumberWithSuffix(value, { currency = false } = {}) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return currency ? fmtBRL.format(0) : fmtINT.format(0);
  const abs = Math.abs(n);
  if (abs < 1000) {
    return currency ? fmtBRL.format(n) : fmtINT.format(Math.round(n));
  }
  const rule = SUFFIX_RULES.find(r => abs >= r.value);
  if (!rule) {
    return currency ? fmtBRL.format(n) : fmtINT.format(Math.round(n));
  }
  const absScaled = abs / rule.value;
  const nearInteger = Math.abs(absScaled - Math.round(absScaled)) < 0.05;
  let digits;
  if (absScaled >= 100) digits = 0;
  else if (absScaled >= 10) digits = nearInteger ? 0 : 1;
  else digits = nearInteger ? 0 : 1;
  const numberFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const formatted = numberFmt.format(absScaled);
  const isSingular = Math.abs(absScaled - 1) < 0.05;
  const label = isSingular ? rule.singular : rule.plural;
  if (currency) {
    const sign = n < 0 ? "-" : "";
    return `${sign}${CURRENCY_SYMBOL}${CURRENCY_LITERAL}${formatted} ${label}`;
  }
  const sign = n < 0 ? "-" : "";
  return `${sign}${formatted} ${label}`;
}

// Aqui eu reaproveito o formatador para mostrar números grandes sem estourar layout.
function formatIntReadable(value){
  return formatNumberWithSuffix(value, { currency: false });
}
function formatBRLReadable(value){
  return formatNumberWithSuffix(value, { currency: true });
}

function formatPoints(value, { withUnit = false } = {}) {
  const n = Math.round(toNumber(value));
  const formatted = fmtINT.format(n);
  return withUnit ? `${formatted} pts` : formatted;
}

function formatMetricFull(metric, value){
  const n = Math.round(toNumber(value));
  if(metric === "perc") return `${toNumber(value).toFixed(1)}%`;
  if(metric === "qtd")  return fmtINT.format(n);
  return fmtBRL.format(n);
}
function formatByMetric(metric, value){
  if(metric === "perc") return `${toNumber(value).toFixed(1)}%`;
  if(metric === "qtd")  return formatIntReadable(value);
  return formatBRLReadable(value);
}
function formatCompactBRL(value){
  return formatNumberWithSuffix(value, { currency: true });
}
function makeRandomForMetric(metric){
  if(metric === "perc"){
    const meta = 100;
    const realizado = Math.round(45 + Math.random()*75);
    const variavelMeta = Math.round(160_000 + Math.random()*180_000);
    return { meta, realizado, variavelMeta };
  }
  if(metric === "qtd"){
    const meta = Math.round(1_000 + Math.random()*19_000);
    const realizado = Math.round(meta * (0.75 + Math.random()*0.6));
    const variavelMeta = Math.round(150_000 + Math.random()*220_000);
    return { meta, realizado, variavelMeta };
  }
  const meta = Math.round(4_000_000 + Math.random()*16_000_000);
  const realizado = Math.round(meta * (0.75 + Math.random()*0.6));
  const variavelMeta = Math.round(320_000 + Math.random()*420_000);
  return { meta, realizado, variavelMeta };
}

/* ===== Aqui eu centralizo o carregamento de dados (API ou CSV local) ===== */
// Aqui eu faço uma chamada GET simples contra a API com tratamento básico de erro.
async function apiGet(path, params){
  const fetchJson = async (targetUrl) => {
    let response;
    try {
      response = await fetch(targetUrl, { cache: "no-store" });
    } catch (err) {
      const error = new Error("Não foi possível contactar a API PHP em config/api/index.php.");
      error.cause = err;
      error.url = targetUrl;
      throw error;
    }

    let text;
    try {
      text = await response.text();
    } catch (err) {
      const error = new Error("Falha ao ler a resposta da API PHP.");
      error.cause = err;
      error.url = targetUrl;
      throw error;
    }

    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (err) {
      const error = new Error("A API PHP retornou um JSON inválido.");
      error.cause = err;
      error.responseText = text;
      error.url = targetUrl;
      throw error;
    }

    if (!response.ok) {
      const message = (json && typeof json === "object" && json.error)
        ? String(json.error)
        : `Falha ao carregar dados (HTTP ${response.status})`;
      const error = new Error(message);
      error.code = "HTTP_ERROR";
      error.status = response.status;
      error.payload = json;
      error.url = targetUrl;
      throw error;
    }

    if (json && typeof json === "object" && json.error) {
      const error = new Error(String(json.error));
      error.code = "API_ERROR";
      error.payload = json;
      error.url = targetUrl;
      throw error;
    }

    return json;
  };

  if ((params === undefined || params === null) && typeof path === "string") {
    const trimmed = path.trim();
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      const isAbsolute = lower.startsWith("http://") || lower.startsWith("https://");
      const isRelativePhp = trimmed.startsWith(API_BASE) || trimmed.startsWith("config/") || trimmed.startsWith("./") || trimmed.startsWith("../");
      const hasQuery = trimmed.includes("?");
      const isQueryOnly = trimmed.startsWith("?");
      if (isAbsolute) {
        return fetchJson(trimmed);
      }
      if (isQueryOnly) {
        return fetchJson(`${API_BASE}${trimmed}`);
      }
      if (hasQuery || isRelativePhp) {
        return fetchJson(trimmed);
      }
    }
  }

  let baseUrl;
  try {
    baseUrl = resolveApiBaseUrl();
  } catch (err) {
    const error = new Error("Não foi possível resolver o endereço da API PHP.");
    error.cause = err;
    throw error;
  }
  const { url } = prepareApiUrl(baseUrl, path, params);
  return fetchJson(url.toString());
}

function setOptions(selectEl, items, emptyLabel='Todos') {
  if (!selectEl) return;
  const opts = (Array.isArray(items) ? items : [])
    .map(it => {
      const id = String(it.id ?? it.value ?? it.funcional ?? '').trim();
      const label = String(it.label ?? it.nome ?? id).trim();
      return id && label ? { value: id, label } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  const prev = selectEl.value;
  selectEl.innerHTML = '';
  selectEl.appendChild(new Option(emptyLabel, ''));
  for (const o of opts) selectEl.appendChild(new Option(o.label, o.value));
  if (opts.some(o => o.value === prev)) selectEl.value = prev;
}

function refreshSelectSearchOptions(selectEl, aliasFactory) {
  if (!selectEl || selectEl.dataset.search !== 'true') return;
  ensureSelectSearch(selectEl);
  const entries = Array.from(selectEl.options || []).map(opt => {
    const value = String(opt.value ?? '').trim();
    const label = String(opt.textContent ?? opt.label ?? value).trim();
    if (!value && !label) return null;
    const aliases = typeof aliasFactory === 'function'
      ? aliasFactory(value, label)
      : [label, value].filter(Boolean);
    return { value, label: label || value, aliases: Array.isArray(aliases) ? aliases.filter(Boolean) : [] };
  }).filter(Boolean);
  storeSelectSearchOptions(selectEl, entries);
  syncSelectSearchInput(selectEl);
}

function resolveIndicadorSearchAliases(value, label) {
  const aliases = new Set([value, label]);
  const meta = INDICATOR_CARD_INDEX.get(value) || PRODUCT_INDEX.get(value) || {};
  if (meta.nome) aliases.add(meta.nome);
  if (meta.name) aliases.add(meta.name);
  if (Array.isArray(meta.aliases)) meta.aliases.forEach(alias => aliases.add(alias));
  const aliasSet = CARD_ALIAS_INDEX.get(value);
  if (aliasSet instanceof Set) aliasSet.forEach(alias => aliases.add(alias));
  return Array.from(aliases).map(item => limparTexto(item) || item).filter(Boolean);
}

function resolveSubindicadorSearchAliases(value, label) {
  const aliases = new Set([value, label]);
  return Array.from(aliases).map(item => limparTexto(item) || item).filter(Boolean);
}

// Aqui eu faço uma chamada POST simples contra a API para enviar JSON.
async function apiPost(path, body = {}, params){
  let baseUrl;
  try {
    baseUrl = resolveApiBaseUrl();
  } catch (err) {
    const error = new Error("Não foi possível resolver o endereço da API PHP.");
    error.cause = err;
    throw error;
  }

  const { url } = prepareApiUrl(baseUrl, path, params);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? "{}" : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    const error = new Error("Não foi possível contactar a API PHP em config/api/index.php.");
    error.cause = err;
    throw error;
  }

  let text;
  try {
    text = await response.text();
  } catch (err) {
    const error = new Error("Falha ao ler a resposta da API PHP.");
    error.cause = err;
    throw error;
  }

  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    const error = new Error("A API PHP retornou um JSON inválido.");
    error.cause = err;
    error.responseText = text;
    throw error;
  }

  if (!response.ok) {
    const message = (json && typeof json === "object" && json.error)
      ? String(json.error)
      : `Falha ao enviar dados (HTTP ${response.status})`;
    const error = new Error(message);
    error.code = "HTTP_ERROR";
    error.status = response.status;
    error.payload = json;
    throw error;
  }

  if (json && typeof json === "object" && json.error) {
    const error = new Error(String(json.error));
    error.code = "API_ERROR";
    error.payload = json;
    throw error;
  }

  return json;
}

function prepareApiUrl(baseUrl, path, params){
  const url = new URL(baseUrl.toString());
  const searchParams = new URLSearchParams(url.search);

  if (params && typeof params === "object"){
    Object.entries(params).forEach(([key, value]) => {
      if (key === API_ENDPOINT_PARAM) return;
      if (value === undefined || value === null) return;
      searchParams.append(key, value);
    });
  }

  const normalized = typeof path === "string" ? path.trim() : "";
  const endpoint = normalized.replace(/^\/+/, "");
  if (endpoint){
    searchParams.set(API_ENDPOINT_PARAM, endpoint);
    const basePath = url.pathname.replace(/\/+$/, "");
    const endpointPath = endpoint.replace(/^\/+/, "");
    if (endpointPath){
      url.pathname = `${basePath}/${endpointPath}`;
    }
  }

  const queryString = searchParams.toString();
  url.search = queryString ? `?${queryString}` : "";

  return { url: url.toString() };
}

const $segmento = document.getElementById('f-segmento');
const $diretoria = document.getElementById('f-diretoria');
const $regional  = document.getElementById('f-gerencia');
const $agencia   = document.getElementById('f-agencia');
const $gg        = document.getElementById('f-ggestao');
const $gerente   = document.getElementById('f-gerente');
const $indicador = document.getElementById('f-familia');
const $subindicador = document.getElementById('f-produto');

function qs() {
  const p = new URLSearchParams();
  if ($segmento?.value)  p.set('segmento_id', $segmento.value);
  if ($diretoria?.value) p.set('diretoria_id', $diretoria.value);
  if ($regional?.value)  p.set('regional_id',  $regional.value);
  if ($agencia?.value)   p.set('agencia_id',   $agencia.value);
  if ($gg?.value)        p.set('gg_funcional', $gg.value);
  return p.toString();
}

function buildFiltrosUrl(nivel) {
  const query = qs();
  const base = `${API_BASE}?endpoint=filtros&nivel=${encodeURIComponent(nivel)}`;
  return query ? `${base}&${query}` : base;
}

function buildSubindicadoresUrl(indicadorId) {
  const base = `${API_BASE}?endpoint=filtros&nivel=subindicadores`;
  if (!indicadorId) return base;
  return `${base}&indicador_id=${encodeURIComponent(indicadorId)}`;
}

function buildResumoParams() {
  const params = new URLSearchParams();
  if ($segmento?.value)  params.set('segmento_id', $segmento.value);
  if ($diretoria?.value) params.set('diretoria_id', $diretoria.value);
  if ($regional?.value)  params.set('regional_id', $regional.value);
  if ($agencia?.value)   params.set('agencia_id', $agencia.value);
  if ($gg?.value)        params.set('gg_funcional', $gg.value);
  if ($gerente?.value)   params.set('gerente_funcional', $gerente.value);
  if ($indicador?.value) params.set('indicador_id', $indicador.value);
  if ($subindicador?.value) params.set('subindicador_id', $subindicador.value);
  return params.toString();
}

async function bootstrapFiltros() {
  try {
    const data = await apiGet(`${API_BASE}?endpoint=bootstrap`);
    setOptions($segmento,  data?.segmentos,  'Todos');
    setOptions($diretoria, data?.diretorias, 'Todas');
    setOptions($regional,  data?.regionais,  'Todas');
    setOptions($agencia,   data?.agencias,   'Todas');
    setOptions($gg,        data?.ggestoes,   'Todos');
    setOptions($gerente,   data?.gerentes,   'Todos');
    setOptions($indicador, data?.indicadores, 'Todos');
    setOptions($subindicador, data?.subindicadores ?? [], 'Todos');
    if ($indicador) {
      $indicador.dataset.apiManaged = '1';
      refreshSelectSearchOptions($indicador, resolveIndicadorSearchAliases);
    }
    if ($subindicador) {
      $subindicador.dataset.apiManaged = '1';
      refreshSelectSearchOptions($subindicador, resolveSubindicadorSearchAliases);
    }
  } catch (error) {
    console.error('Falha ao carregar filtros iniciais.', error);
  }
}

function ensureBootstrapFiltros() {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void bootstrapFiltros(); });
  } else {
    void bootstrapFiltros();
  }
}

ensureBootstrapFiltros();

function handleApiError(context, error) {
  console.error(context, error);
}

$segmento?.addEventListener('change', async () => {
  const context = 'Falha ao atualizar diretorias.';
  setOptions($diretoria, [], 'Todas');
  setOptions($regional,  [], 'Todas');
  setOptions($agencia,   [], 'Todas');
  setOptions($gg,        [], 'Todos');
  setOptions($gerente,   [], 'Todos');
  try {
    const d = await apiGet(buildFiltrosUrl('diretorias'));
    setOptions($diretoria, d?.diretorias, 'Todas');
  } catch (error) {
    handleApiError(context, error);
  }
});

$diretoria?.addEventListener('change', async () => {
  const context = 'Falha ao atualizar regionais.';
  setOptions($regional, [], 'Todas');
  setOptions($agencia,  [], 'Todas');
  setOptions($gg,       [], 'Todos');
  setOptions($gerente,  [], 'Todos');
  try {
    const r = await apiGet(buildFiltrosUrl('regionais'));
    setOptions($regional, r?.regionais, 'Todas');
  } catch (error) {
    handleApiError(context, error);
  }
});

$regional?.addEventListener('change', async () => {
  const context = 'Falha ao atualizar agências.';
  setOptions($agencia, [], 'Todas');
  setOptions($gg,      [], 'Todos');
  setOptions($gerente, [], 'Todos');
  try {
    const a = await apiGet(buildFiltrosUrl('agencias'));
    setOptions($agencia, a?.agencias, 'Todas');
  } catch (error) {
    handleApiError(context, error);
  }
});

$agencia?.addEventListener('change', async () => {
  const context = 'Falha ao atualizar gerentes de gestão.';
  setOptions($gg,      [], 'Todos');
  setOptions($gerente, [], 'Todos');
  try {
    const g = await apiGet(buildFiltrosUrl('ggestoes'));
    setOptions($gg, g?.ggestoes, 'Todos');
  } catch (error) {
    handleApiError(context, error);
  }
});

$gg?.addEventListener('change', async () => {
  const context = 'Falha ao atualizar gerentes.';
  setOptions($gerente, [], 'Todos');
  try {
    const ge = await apiGet(buildFiltrosUrl('gerentes'));
    setOptions($gerente, ge?.gerentes, 'Todos');
  } catch (error) {
    handleApiError(context, error);
  }
});

$indicador?.addEventListener('change', async () => {
  const context = 'Falha ao atualizar subindicadores.';
  const id = $indicador?.value || '';
  setOptions($subindicador, [], 'Todos');
  refreshSelectSearchOptions($subindicador, resolveSubindicadorSearchAliases);
  if (!id) {
    return;
  }
  try {
    const res = await apiGet(buildSubindicadoresUrl(id));
    setOptions($subindicador, res?.subindicadores, 'Todos');
    refreshSelectSearchOptions($subindicador, resolveSubindicadorSearchAliases);
  } catch (error) {
    handleApiError(context, error);
  }
});
// Aqui eu faço todo o processo de montar os dados consolidados (fatos + metas + campanhas) usados nas telas.
async function getData(){
  const period = state.period || getDefaultPeriodRange();

  const calendarioByDate = new Map(DIM_CALENDARIO.map(entry => [entry.data, entry]));
  const calendarioByCompetencia = new Map(DIM_CALENDARIO.map(entry => [entry.competencia, entry]));

  // Aqui eu gero linhas sintéticas das campanhas para reaproveitar no ranking e nos simuladores.
  const buildCampanhaFacts = () => {
    const campanhaFacts = [];
    CAMPAIGN_SPRINTS.forEach(sprint => {
      const units = CAMPAIGN_UNIT_DATA.filter(unit => !unit.sprintId || unit.sprintId === sprint.id);
      const effectiveUnits = units.length ? units : sprint.units || CAMPAIGN_UNIT_DATA;
      effectiveUnits.forEach(unit => {
        const unitData = unit.data || "";
        const unitCompetencia = unit.competencia || (unitData ? `${unitData.slice(0, 7)}-01` : "");
        const score = computeCampaignScore(sprint.team, {
          linhas: unit.linhas,
          cash: unit.cash,
          conquista: unit.conquista,
        });
        campanhaFacts.push({
          ...unit,
          data: unitData,
          competencia: unitCompetencia,
          sprintId: unit.sprintId || sprint.id,
          sprintLabel: sprint.label,
          realizado: score.totalPoints,
          meta: score.eligibilityMinimum,
          pontos: score.totalPoints,
          finalStatus: score.finalStatus,
          finalClass: score.finalClass,
          score,
        });
      });
    });
    return campanhaFacts;
  };

  if (FACT_REALIZADOS.length) {
    const metasLookup = buildFactLookupMap(FACT_METAS);
    let variavelLookup = buildFactLookupMap(FACT_VARIAVEL);

    let factRows = FACT_REALIZADOS.map(row => {
      const meta = findFactMatch(row, metasLookup) || {};
      const variavel = findFactMatch(row, variavelLookup) || {};
      const produtoMeta = PRODUCT_INDEX.get(row.produtoId) || {};
      const familiaMeta = PRODUTO_TO_FAMILIA.get(row.produtoId);
      const secaoIdRaw = produtoMeta.sectionId || familiaMeta?.secaoId || row.secaoId || row.sectionId || "";
      const secaoLabelRaw = produtoMeta.sectionLabel || familiaMeta?.secaoNome || row.secaoNome || row.secao || "";
      const familiaIdRaw = row.familiaId || row.familia || "";
      const familiaNomeRaw = row.familiaNome || row.familia || "";
      const resolvedSecaoId = secaoIdRaw || familiaMeta?.secaoId || familiaIdRaw || "";
      const resolvedSecaoNome = secaoLabelRaw || getSectionLabel(resolvedSecaoId) || familiaNomeRaw || familiaIdRaw || resolvedSecaoId;
      let resolvedFamiliaId = familiaIdRaw;
      let resolvedFamiliaNome = familiaNomeRaw;
      if (!resolvedFamiliaId || SECTION_IDS.has(resolvedFamiliaId)) {
        resolvedFamiliaId = familiaMeta?.id || row.produtoId || resolvedSecaoId;
      }
      if (!resolvedFamiliaNome || resolvedFamiliaNome === familiaIdRaw || resolvedFamiliaNome === resolvedSecaoNome || SECTION_IDS.has(resolvedFamiliaId)) {
        resolvedFamiliaNome = familiaMeta?.nome || row.produtoNome || resolvedFamiliaNome || resolvedSecaoNome;
      }
      const peso = toNumber(meta.peso ?? produtoMeta.peso ?? 1);
      const metaMens = toNumber(meta.meta_mens ?? meta.meta ?? 0);
      const metaAcum = toNumber(meta.meta_acum ?? meta.meta ?? metaMens);
      const realizadoMens = toNumber(row.real_mens ?? row.realizado ?? 0);
      const realizadoAcum = toNumber(row.real_acum ?? row.realizadoAcumulado ?? realizadoMens);
      const variavelMeta = toNumber(variavel.variavelMeta ?? meta.variavelMeta ?? row.variavelMeta ?? 0);
      const variavelReal = toNumber(variavel.variavelReal ?? row.variavelReal ?? 0);
      const qtd = toNumber(row.qtd ?? row.quantidade ?? 0);
      let dataISO = row.data || meta.data || variavel.data || "";
      let competencia = row.competencia || meta.competencia || variavel.competencia || "";
      if (!competencia && dataISO) {
        competencia = `${dataISO.slice(0, 7)}-01`;
      }
      if (!dataISO && competencia) {
        dataISO = competencia;
      }
      const calendario = calendarioByDate.get(dataISO) || calendarioByCompetencia.get(competencia);
      const ating = metaMens ? (realizadoMens / metaMens) : 0;
      const pontos = Math.round(Math.max(0, ating) * peso);

      const gerentePair = normalizeFuncionalPair(
        row.gerenteId ?? row.gerente ?? row.gerente_id ?? meta.gerenteId ?? meta.gerente ?? meta.gerente_id,
        row.gerenteLabel ?? row.gerenteNome ?? meta.gerenteLabel ?? meta.gerenteNome ?? meta.gerente
      );
      const gerenteId = limparTexto(gerentePair.id);
      const gerenteNome = limparTexto(gerentePair.nome) || extractNameFromLabel(gerentePair.label) || gerenteId;
      const gerenteLabel = gerentePair.label || labelGerente(gerenteId, gerenteNome);

      const gerenteGestaoPair = normalizeFuncionalPair(
        row.gerenteGestaoId ?? row.gerenteGestao ?? row.gerente_gestao_id ?? meta.gerenteGestaoId ?? meta.gerenteGestao ?? meta.gerente_gestao_id,
        row.gerenteGestaoLabel ?? row.gerenteGestaoNome ?? meta.gerenteGestaoLabel ?? meta.gerenteGestaoNome ?? meta.gerenteGestao
      );
      let gerenteGestaoId = limparTexto(gerenteGestaoPair.id);
      if (!gerenteGestaoId) {
        const derivedGg = deriveGerenteGestaoIdFromAgency(row.agenciaId || row.agencia || meta.agenciaId || meta.agencia);
        if (derivedGg) gerenteGestaoId = derivedGg;
      }
      const gerenteGestaoLabel = gerenteGestaoPair.label || labelGerenteGestao(gerenteGestaoId, gerenteGestaoPair.nome);
      const gerenteGestaoNome = limparTexto(gerenteGestaoPair.nome)
        || extractNameFromLabel(gerenteGestaoLabel)
        || gerenteGestaoId;

      const segmentoId = limparTexto(row.segmentoId ?? row.segmento_id ?? meta.segmentoId ?? meta.segmento_id ?? row.segmento);
      const diretoriaId = limparTexto(row.diretoriaId ?? row.diretoria_id ?? meta.diretoriaId ?? meta.diretoria_id ?? row.diretoria);
      const gerenciaRegionalId = limparTexto(
        row.gerenciaRegionalId ?? row.gerencia_regional_id ?? row.gerenciaRegional ?? meta.gerenciaRegionalId ?? meta.gerencia_regional_id
      );
      const agenciaId = limparTexto(row.agenciaId ?? row.agencia_id ?? row.agenciaCodigo ?? meta.agenciaId ?? meta.agencia ?? row.agencia);

      const base = {
        registroId: row.registroId,
        segmento: row.segmento,
        segmentoId: segmentoId || row.segmentoId,
        segmento_id: segmentoId || row.segmentoId,
        diretoria: row.diretoria,
        diretoriaNome: row.diretoriaNome,
        diretoria_id: diretoriaId || row.diretoriaId,
        gerenciaRegional: row.gerenciaRegional,
        gerenciaNome: row.gerenciaNome,
        gerencia_regional_id: gerenciaRegionalId || row.gerenciaRegionalId,
        regional: row.regional,
        agencia: row.agencia,
        agenciaNome: row.agenciaNome,
        agenciaCodigo: row.agenciaCodigo || row.agencia,
        agencia_id: agenciaId || row.agenciaId,
        gerenteGestao: gerenteGestaoLabel || gerenteGestaoId,
        gerenteGestaoId,
        gerente_gestao_id: gerenteGestaoId,
        gerenteGestaoNome: gerenteGestaoNome || gerenteGestaoLabel || gerenteGestaoId,
        gerenteGestaoLabel,
        gerente: gerenteLabel || gerenteId,
        gerenteId,
        gerente_id: gerenteId,
        gerenteNome: gerenteNome || gerenteLabel || gerenteId,
        gerenteLabel,
        secaoId: resolvedSecaoId,
        secao: resolvedSecaoNome,
        secaoNome: resolvedSecaoNome,
        familiaId: resolvedFamiliaId,
        familia: resolvedFamiliaNome,
        familiaNome: resolvedFamiliaNome,
        prodOrSub: row.prodOrSub || row.subproduto || row.produtoNome || row.produtoId,
        subproduto: row.subproduto || "",
        carteira: row.carteira,
        canalVenda: row.canalVenda,
        tipoVenda: row.tipoVenda,
        modalidadePagamento: row.modalidadePagamento,
        data: dataISO,
        competencia,
        realizado: realizadoMens,
        real_mens: realizadoMens,
        real_acum: realizadoAcum,
        meta: metaMens,
        meta_mens: metaMens,
        meta_acum: metaAcum,
        qtd,
        peso,
        pontos,
        variavelMeta,
        variavelReal,
        ating,
        atingVariavel: variavelMeta ? variavelReal / variavelMeta : 0,
      };

      aplicarIndicadorAliases(base, row.produtoId, row.produtoNome || row.produtoId);

      if (calendario) {
        base.ano = calendario.ano;
        base.mes = calendario.mes;
        base.mesNome = calendario.mesNome;
        base.dia = calendario.dia;
        base.diaSemana = calendario.diaSemana;
        base.ehDiaUtil = calendario.ehDiaUtil;
      }

      return base;
    });

    if (FACT_VARIAVEL.length) {
      const variavelIds = new Set(FACT_VARIAVEL.map(row => row?.registroId || row?.registroid));
      const novosVariavel = factRows.filter(row => row?.registroId && !variavelIds.has(row.registroId)).map(row => ({
        registroId: row.registroId,
        produtoId: row.produtoId,
        produtoNome: row.produtoNome,
        familiaId: row.familiaId,
        familiaNome: row.familiaNome,
        variavelMeta: row.variavelMeta,
        variavelReal: row.variavelReal,
        data: row.data,
        competencia: row.competencia,
      }));
      if (novosVariavel.length) {
        novosVariavel.forEach(item => aplicarIndicadorAliases(item, item.produtoId, item.produtoNome));
        FACT_VARIAVEL.push(...novosVariavel);
        variavelLookup = buildFactLookupMap(FACT_VARIAVEL);
      }
    }

    const baseByRegistro = new Map(factRows.map(row => [row.registroId, row]));
    const variavelFacts = (FACT_VARIAVEL.length ? FACT_VARIAVEL : factRows).map(source => {
      const registroId = source.registroId || source.registroid;
      const base = baseByRegistro.get(registroId) || {};
      if (!registroId || !base.registroId) return null;

      let dataISO = pegarPrimeiroPreenchido(source.data, base.data, source.competencia, base.competencia);
      let competencia = pegarPrimeiroPreenchido(source.competencia, base.competencia);
      if (!competencia && dataISO) {
        competencia = `${String(dataISO).slice(0, 7)}-01`;
      }
      if (!dataISO && competencia) {
        dataISO = competencia;
      }
      const calendario = calendarioByDate.get(dataISO) || calendarioByCompetencia.get(competencia);
      const variavelMeta = toNumber(source.variavelMeta ?? base.variavelMeta ?? 0);
      const variavelReal = toNumber(source.variavelReal ?? base.variavelReal ?? 0);
      const ating = variavelMeta ? (variavelReal / variavelMeta) : (base.atingVariavel ?? base.ating ?? 0);

      const item = {
        registroId,
        segmento: base.segmento,
        segmentoId: base.segmentoId,
        segmento_id: base.segmento_id,
        diretoria: base.diretoria,
        diretoriaNome: base.diretoriaNome,
        diretoria_id: base.diretoria_id,
        gerenciaRegional: base.gerenciaRegional,
        gerenciaNome: base.gerenciaNome,
        gerencia_regional_id: base.gerencia_regional_id,
        regional: base.regional,
        agencia: base.agencia,
        agenciaNome: base.agenciaNome,
        agenciaCodigo: base.agenciaCodigo,
        agencia_id: base.agencia_id,
        gerenteGestao: base.gerenteGestao,
        gerenteGestaoNome: base.gerenteGestaoNome,
        gerenteGestaoId: base.gerenteGestaoId,
        gerente_gestao_id: base.gerente_gestao_id,
        gerente: base.gerente,
        gerenteNome: base.gerenteNome,
        gerenteId: base.gerenteId,
        gerente_id: base.gerente_id,
        secaoId: base.secaoId,
        secao: base.secao,
        secaoNome: base.secaoNome,
        familiaId: base.familiaId,
        familia: base.familia,
        familiaNome: base.familiaNome,
        produtoId: base.produtoId,
        produto: base.produtoNome,
        produtoNome: base.produtoNome,
        prodOrSub: base.prodOrSub,
        data: dataISO,
        competencia,
        realizado: variavelReal,
        meta: variavelMeta,
        real_mens: variavelReal,
        meta_mens: variavelMeta,
        real_acum: variavelReal,
        meta_acum: variavelMeta,
        variavelMeta,
        variavelReal,
        peso: base.peso,
        pontos: base.pontos,
        ating,
      };

      aplicarIndicadorAliases(item, base.produtoId, base.produtoNome);

      if (calendario) {
        item.ano = calendario.ano;
        item.mes = calendario.mes;
        item.mesNome = calendario.mesNome;
        item.dia = calendario.dia;
        item.diaSemana = calendario.diaSemana;
        item.ehDiaUtil = calendario.ehDiaUtil;
      } else if (dataISO) {
        item.ano = String(dataISO).slice(0, 4);
        item.mes = String(dataISO).slice(5, 7);
        item.dia = String(dataISO).slice(8, 10);
      }

      return item;
    }).filter(Boolean);

    fDados = factRows;
    fVariavel = variavelFacts;

    const campanhaFacts = buildCampanhaFacts();
    fCampanhas = campanhaFacts;

    const baseDashboard = buildDashboardDatasetFromRows(factRows, period);
    const ranking = factRows.map(row => ({ ...row }));

    return {
      sections: baseDashboard.sections,
      summary: baseDashboard.summary,
      ranking,
      period,
      facts: { dados: factRows, variavel: fVariavel, campanhas: campanhaFacts, historico: FACT_HISTORICO_RANKING_POBJ }
    };
  }

  const startDt = dateUTCFromISO(period.start);
  const endDt = dateUTCFromISO(period.end);
  let startRef = startDt;
  let endRef = endDt;
  if (startRef && endRef && startRef > endRef) [startRef, endRef] = [endRef, startRef];
  const defaultISO = period.end || period.start || todayISO();
  const randomPeriodISO = () => {
    if (!startRef || !endRef) return defaultISO;
    const spanDays = Math.max(0, Math.round((endRef - startRef) / (24 * 60 * 60 * 1000)));
    const offset = spanDays > 0 ? Math.floor(Math.random() * (spanDays + 1)) : 0;
    const dt = new Date(startRef.getTime());
    dt.setUTCDate(dt.getUTCDate() + offset);
    return isoFromUTCDate(dt);
  };

  const periodYear = Number((period.start || todayISO()).slice(0, 4)) || new Date().getFullYear();
  const productDefs = CARD_SECTIONS_DEF.flatMap(sec =>
    sec.items.map(item => ({
      ...item,
      sectionId: sec.id,
      sectionLabel: sec.label
    }))
  );

  const segsBase = SEGMENTOS_DATA.length
    ? SEGMENTOS_DATA.map(seg => seg.nome || seg.id).filter(Boolean)
    : ["Empresas","Negócios","MEI"];
  const segs = segsBase.length ? segsBase : ["Empresas"];

  const diretoriasBase = RANKING_DIRECTORIAS.length ? RANKING_DIRECTORIAS : [{ id: "DR 01", nome: "Diretoria" }];
  const gerenciasBase = RANKING_GERENCIAS.length ? RANKING_GERENCIAS : [{ id: "GR 01", nome: "Regional", diretoria: diretoriasBase[0]?.id || "" }];
  const agenciasBase = RANKING_AGENCIAS.length ? RANKING_AGENCIAS : [{ id: "Ag 1001", nome: "Agência", gerencia: gerenciasBase[0]?.id || "" }];
  const gerentesBase = RANKING_GERENTES.length ? RANKING_GERENTES : [{ id: "Gerente 1", nome: "Gerente" }];
  const gerentesGestaoBase = GERENTES_GESTAO.length ? GERENTES_GESTAO : [{ id: "GG 01", nome: "Gestão 01" }];

  let agenciesList = Array.from(MESU_BY_AGENCIA.values());
  if (!agenciesList.length) {
    const gerMap = new Map(gerenciasBase.map(g => [g.id, g]));
    const dirMap = new Map(diretoriasBase.map(d => [d.id, d]));
    agenciesList = agenciasBase.map((ag, idx) => {
      const gerMeta = gerMap.get(ag.gerencia) || gerenciasBase[idx % gerenciasBase.length] || {};
      const dirMeta = dirMap.get(gerMeta.diretoria) || diretoriasBase[idx % diretoriasBase.length] || {};
      const gerenteMeta = gerentesBase[idx % gerentesBase.length] || {};
      const ggMeta = gerentesGestaoBase.find(gg => gg.agencia === ag.id) || gerentesGestaoBase[idx % gerentesGestaoBase.length] || {};
      const segmentoNome = segs[idx % segs.length] || segs[0];
      return {
        segmentoId: segmentoNome,
        segmentoNome,
        diretoriaId: dirMeta.id || `DR ${String(idx + 1).padStart(2, "0")}`,
        diretoriaNome: dirMeta.nome || `Diretoria ${idx + 1}`,
        regionalId: gerMeta.id || `GR ${String(idx + 1).padStart(2, "0")}`,
        regionalNome: gerMeta.nome || `Regional ${idx + 1}`,
        agenciaId: ag.id || `Ag ${String(idx + 1).padStart(2, "0")}`,
        agenciaNome: ag.nome || ag.id || `Agência ${idx + 1}`,
        gerenteGestaoId: ggMeta.id || `GG ${String(idx + 1).padStart(2, "0")}`,
        gerenteGestaoNome: ggMeta.nome || ggMeta.id || `Gerente geral ${idx + 1}`,
        gerenteId: gerenteMeta.id || `Gerente ${idx + 1}`,
        gerenteNome: gerenteMeta.nome || gerenteMeta.id || `Gerente ${idx + 1}`
      };
    });
  }
  if (!agenciesList.length) {
    agenciesList = [{
      segmentoId: segs[0] || "Segmento",
      segmentoNome: segs[0] || "Segmento",
      diretoriaId: diretoriasBase[0]?.id || "DR 01",
      diretoriaNome: diretoriasBase[0]?.nome || "Diretoria",
      regionalId: gerenciasBase[0]?.id || "GR 01",
      regionalNome: gerenciasBase[0]?.nome || "Regional",
      agenciaId: agenciasBase[0]?.id || "Ag 1001",
      agenciaNome: agenciasBase[0]?.nome || "Agência",
      gerenteGestaoId: gerentesGestaoBase[0]?.id || "GG 01",
      gerenteGestaoNome: gerentesGestaoBase[0]?.nome || "Gerente geral",
      gerenteId: gerentesBase[0]?.id || "Gerente 1",
      gerenteNome: gerentesBase[0]?.nome || "Gerente 1"
    }];
  }

  const canaisVenda = ["Agência física","Digital","Correspondente","APP Empresas"];
  const tiposVenda = ["Venda consultiva","Venda direta","Cross-sell","Pós-venda"];
  const modalidadesVenda = ["À vista","Parcelado"];

  const factRows = [];
  agenciesList.forEach((agency, agencyIndex) => {
    productDefs.forEach((prod, prodIndex) => {
      const iterations = 1 + ((agencyIndex + prodIndex) % 2);
      for (let iter = 0; iter < iterations; iter += 1) {
        const { meta, realizado, variavelMeta } = makeRandomForMetric(prod.metric);
        const metaMens = prod.metric === "perc" ? Math.min(150, meta) : meta;
        const realMens = prod.metric === "perc" ? Math.min(150, realizado) : realizado;
        const dataISO = randomPeriodISO();
        const competenciaMes = dataISO ? `${dataISO.slice(0, 7)}-01` : `${periodYear}-${String(((agencyIndex + prodIndex) % 12) + 1).padStart(2, "0")}-01`;
        const realAcum = Math.round(realMens * (1.15 + Math.random() * 0.4));
        const metaAcum = Math.round(metaMens * (1.2 + Math.random() * 0.45));
        const ating = metaMens ? (realMens / metaMens) : 0;
        const variavelReal = Math.max(0, Math.round((variavelMeta || 0) * Math.max(0.6, Math.min(1.25, ating))));
        const peso = prod.peso || 1;
        const pontos = Math.round(Math.max(0, ating) * peso);
        const qtd = prod.metric === "qtd"
          ? Math.max(1, Math.round(realMens))
          : Math.round(80 + Math.random() * 2200);

        const familiaMeta = PRODUTO_TO_FAMILIA.get(prod.id) || {
          id: prod.id,
          nome: prod.nome,
          secaoId: prod.sectionId,
          secaoNome: prod.sectionLabel
        };

        const structureMeta = resolveIndicatorStructureMeta(prod.id, prod.nome, prod.metric);
        const mappedSubs = SUBINDICADORES_BY_INDICADOR.get(prod.id);
        const subDefs = Array.isArray(mappedSubs) ? mappedSubs : (Array.isArray(structureMeta?.subIndicators) ? structureMeta.subIndicators : []);
        const hasForcedEmpty = FORCED_EMPTY_SUBINDICADORES.has(prod.id);
        const subIndicators = (subDefs.length || hasForcedEmpty)
          ? subDefs
          : [{ id: `${prod.id}_sub`, nome: prod.nome, metric: prod.metric, peso: 1, children: [] }];
        const subWeightSum = subIndicators.reduce((acc, sub) => acc + Math.max(0.01, Number(sub.peso) || 1), 0);

        let metaSubAssigned = 0;
        let realSubAssigned = 0;
        let varMetaSubAssigned = 0;
        let varRealSubAssigned = 0;
        let pesoSubAssigned = 0;

        subIndicators.forEach((sub, subIdx) => {
          const subWeight = Math.max(0.01, Number(sub.peso) || 1);
          const remainingSubs = subIndicators.length - subIdx;
          const baseShare = subWeight / (subWeightSum || subIndicators.length || 1);
          const jitterMeta = 0.88 + Math.random() * 0.24;
          const jitterReal = 0.85 + Math.random() * 0.3;
          const jitterVar = 0.9 + Math.random() * 0.2;
          const jitterPeso = 0.9 + Math.random() * 0.2;

          const metaTarget = subIdx === subIndicators.length - 1
            ? Math.max(0, metaMens - metaSubAssigned)
            : Math.max(0, Math.round(metaMens * baseShare * jitterMeta));
          const realTarget = subIdx === subIndicators.length - 1
            ? Math.max(0, realMens - realSubAssigned)
            : Math.max(0, Math.round(realMens * baseShare * jitterReal));
          const varMetaTarget = subIdx === subIndicators.length - 1
            ? Math.max(0, variavelMeta - varMetaSubAssigned)
            : Math.max(0, Math.round(variavelMeta * baseShare * jitterVar));
          const varRealTarget = subIdx === subIndicators.length - 1
            ? Math.max(0, variavelReal - varRealSubAssigned)
            : Math.max(0, Math.round(variavelReal * baseShare * jitterVar));
          const pesoTarget = subIdx === subIndicators.length - 1
            ? Math.max(0, peso - pesoSubAssigned)
            : Math.max(0, Math.round(peso * baseShare * jitterPeso));

          metaSubAssigned += metaTarget;
          realSubAssigned += realTarget;
          varMetaSubAssigned += varMetaTarget;
          varRealSubAssigned += varRealTarget;
          pesoSubAssigned += pesoTarget;

          const hasChildren = Array.isArray(sub.children) && sub.children.length;
          const childDefs = hasChildren
            ? sub.children
            : [{ id: `${sub.id}_lp`, nome: sub.nome, metric: sub.metric, peso: 1, children: [], __isSelf: true }];
          const childWeightSum = childDefs.reduce((acc, child) => acc + Math.max(0.01, Number(child.peso) || 1), 0);

          let metaChildAssigned = 0;
          let realChildAssigned = 0;
          let varMetaChildAssigned = 0;
          let varRealChildAssigned = 0;
          let pesoChildAssigned = 0;

          childDefs.forEach((child, childIdx) => {
            const childWeight = Math.max(0.01, Number(child.peso) || 1);
            const childShare = childWeight / (childWeightSum || childDefs.length || 1);
            const childJitter = 0.9 + Math.random() * 0.2;

            const childMeta = childIdx === childDefs.length - 1
              ? Math.max(0, metaTarget - metaChildAssigned)
              : Math.max(0, Math.round(metaTarget * childShare * childJitter));
            const childReal = childIdx === childDefs.length - 1
              ? Math.max(0, realTarget - realChildAssigned)
              : Math.max(0, Math.round(realTarget * childShare * childJitter));
            const childVarMeta = childIdx === childDefs.length - 1
              ? Math.max(0, varMetaTarget - varMetaChildAssigned)
              : Math.max(0, Math.round(varMetaTarget * childShare * childJitter));
            const childVarReal = childIdx === childDefs.length - 1
              ? Math.max(0, varRealTarget - varRealChildAssigned)
              : Math.max(0, Math.round(varRealTarget * childShare * childJitter));
            const childPeso = childIdx === childDefs.length - 1
              ? Math.max(0, pesoTarget - pesoChildAssigned)
              : Math.max(0, Math.round(pesoTarget * childShare * childJitter));

            if (metaTarget > 0 && childMeta <= 0) {
              childMeta = Math.max(1, Math.round(metaTarget / Math.max(1, childDefs.length)));
            }
            if (realTarget > 0 && childReal <= 0) {
              childReal = Math.max(1, Math.round(realTarget / Math.max(1, childDefs.length)));
            }
            if (pesoTarget > 0 && childPeso <= 0) {
              childPeso = Math.max(1, Math.round(pesoTarget / Math.max(1, childDefs.length)));
            }
            if (varMetaTarget > 0 && childVarMeta <= 0) {
              childVarMeta = Math.max(1, Math.round(varMetaTarget / Math.max(1, childDefs.length)));
            }
            if (varRealTarget > 0 && childVarReal <= 0) {
              childVarReal = Math.max(1, Math.round(varRealTarget / Math.max(1, childDefs.length)));
            }

            metaChildAssigned += childMeta;
            realChildAssigned += childReal;
            varMetaChildAssigned += childVarMeta;
            varRealChildAssigned += childVarReal;
            pesoChildAssigned += childPeso;

            const isSelfChild = child.__isSelf === true;
            const childMetric = child.metric || sub.metric || prod.metric || "valor";
            const childAting = childMeta ? (childReal / childMeta) : 0;
            const childPontos = Math.round(Math.max(0, Math.min(childPeso, childPeso * childAting)));

            factRows.push({
              segmento: agency.segmentoNome || agency.segmentoId || segs[agencyIndex % segs.length] || "Segmento",
              diretoria: agency.diretoriaId || diretoriasBase[agencyIndex % diretoriasBase.length]?.id || `DR ${String(agencyIndex + 1).padStart(2, "0")}`,
              diretoriaNome: agency.diretoriaNome || diretoriasBase[agencyIndex % diretoriasBase.length]?.nome || `Diretoria ${agencyIndex + 1}`,
              gerenciaRegional: agency.regionalId || gerenciasBase[agencyIndex % gerenciasBase.length]?.id || `GR ${String(agencyIndex + 1).padStart(2, "0")}`,
              gerenciaNome: agency.regionalNome || gerenciasBase[agencyIndex % gerenciasBase.length]?.nome || `Regional ${agencyIndex + 1}`,
              regional: agency.regionalNome || gerenciasBase[agencyIndex % gerenciasBase.length]?.nome || `Regional ${agencyIndex + 1}`,
              agencia: agency.agenciaId || agenciasBase[agencyIndex % agenciasBase.length]?.id || `Ag ${String(agencyIndex + 1).padStart(2, "0")}`,
              agenciaNome: agency.agenciaNome || agenciasBase[agencyIndex % agenciasBase.length]?.nome || `Agência ${agencyIndex + 1}`,
              agenciaCodigo: agency.agenciaId || agenciasBase[agencyIndex % agenciasBase.length]?.id || `Ag ${String(agencyIndex + 1).padStart(2, "0")}`,
              gerenteGestao: agency.gerenteGestaoId || gerentesGestaoBase[agencyIndex % gerentesGestaoBase.length]?.id || `GG ${String(agencyIndex + 1).padStart(2, "0")}`,
              gerenteGestaoNome: agency.gerenteGestaoNome || gerentesGestaoBase[agencyIndex % gerentesGestaoBase.length]?.nome || `Gerente geral ${agencyIndex + 1}`,
              gerente: agency.gerenteId || gerentesBase[agencyIndex % gerentesBase.length]?.id || `Gerente ${agencyIndex + 1}`,
              gerenteNome: agency.gerenteNome || gerentesBase[agencyIndex % gerentesBase.length]?.nome || `Gerente ${agencyIndex + 1}`,
              segmentoNome: agency.segmentoNome || agency.segmentoId || segs[agencyIndex % segs.length] || "Segmento",
              secaoId: familiaMeta.secaoId || prod.sectionId,
              secao: familiaMeta.secaoNome || prod.sectionLabel,
              secaoNome: familiaMeta.secaoNome || prod.sectionLabel,
              familiaId: familiaMeta.id,
              familia: familiaMeta.nome || familiaMeta.id,
              familiaNome: familiaMeta.nome || familiaMeta.id,
              produtoId: prod.id,
              produto: prod.nome,
              produtoNome: prod.nome,
              prodOrSub: prod.nome,
              subIndicadorId: sub.id,
              subIndicadorNome: sub.nome,
              subIndicador: sub.nome,
              linhaProdutoId: isSelfChild ? "" : (child.id || ""),
              linhaProdutoNome: isSelfChild ? "" : (child.nome || ""),
              lpId: isSelfChild ? "" : (child.id || ""),
              lpNome: isSelfChild ? "" : (child.nome || ""),
              subproduto: isSelfChild ? "" : (child.nome || ""),
              carteira: `${agency.agenciaNome || agency.agenciaId || "Carteira"} ${String.fromCharCode(65 + iter)}`,
              canalVenda: canaisVenda[(agencyIndex + prodIndex + iter) % canaisVenda.length],
              tipoVenda: tiposVenda[(agencyIndex + iter) % tiposVenda.length],
              modalidadePagamento: modalidadesVenda[(prodIndex + iter) % modalidadesVenda.length],
              realizado: childReal,
              meta: childMeta,
              real_mens: childReal,
              meta_mens: childMeta,
              real_acum: Math.round(childReal * (1.15 + Math.random() * 0.4)),
              meta_acum: Math.round(childMeta * (1.2 + Math.random() * 0.45)),
              qtd: childMetric === "qtd" ? Math.max(1, Math.round(childReal)) : qtd,
              data: dataISO,
              competencia: competenciaMes,
              peso: childPeso,
              pontos: childPontos,
              variavelMeta: childVarMeta,
              variavelReal: childVarReal,
              ating: childAting,
              metric: childMetric
            });
          });
        });
      }
    });
  });

  factRows.forEach(row => {
    row.ating = row.meta ? (row.realizado / row.meta) : 0;
  });

  fDados = factRows;
  fVariavel = factRows.map(row => ({
    segmento: row.segmento,
    diretoria: row.diretoria,
    diretoriaNome: row.diretoriaNome,
    gerenciaRegional: row.gerenciaRegional,
    gerenciaNome: row.gerenciaNome,
    agencia: row.agencia,
    agenciaNome: row.agenciaNome,
    gerenteGestao: row.gerenteGestao,
    gerenteGestaoNome: row.gerenteGestaoNome,
    gerente: row.gerente,
    gerenteNome: row.gerenteNome,
    secaoId: row.secaoId,
    secao: row.secao,
    secaoNome: row.secaoNome,
    familiaId: row.familiaId,
    familia: row.familia,
    produtoId: row.produtoId,
    produto: row.produto,
    realizado: row.variavelReal,
    meta: row.variavelMeta,
    pontos: row.pontos,
    data: row.data,
    competencia: row.competencia
  }));

  const campanhaFacts = buildCampanhaFacts();
  fCampanhas = campanhaFacts;

  const baseDashboard = buildDashboardDatasetFromRows(fDados, period);
  const ranking = fDados.map(row => ({ ...row }));

  return {
    sections: baseDashboard.sections,
    summary: baseDashboard.summary,
    ranking,
    period,
    facts: { dados: fDados, variavel: fVariavel, campanhas: fCampanhas, historico: FACT_HISTORICO_RANKING_POBJ }
  };
}

/* ===== Aqui eu monto a sidebar retrátil direto via JS, sem depender do CSS ===== */
/* ===== Aqui eu guardo e manipulo o estado geral da aplicação ===== */
const PRODUCT_RANK_LEVELS = ["gerente", "gerenteGestao", "agencia", "gerencia"];
function normalizeProductRankLevel(level) {
  return PRODUCT_RANK_LEVELS.includes(level) ? level : "gerente";
}

const state = {
  _dataset:null,
  _rankingRaw:[],
  facts:{ dados:[], campanhas:[], variavel:[], historico:[] },
  dashboard:{ sections:[], summary:{} },
  dashboardVisibleSections:[],
  activeView:"cards",
  resumoMode: readLocalStorageItem(RESUMO_MODE_STORAGE_KEY) === "legacy" ? "legacy" : "cards",
  tableView:"diretoria",
  tableRendered:false,
  isAnimating:false,
  period: getDefaultPeriodRange(),
  accumulatedView:"mensal",
  datePopover:null,
  compact:false,
  contractIndex:[],
  lastNonContractView:"diretoria",

  exec:{ heatmapMode:"secoes", seriesColors:new Map() },

  // ranking
  rk:{
    level:"agencia",
    type:"pobj",
    product:"",
    productMode:"melhores",
    productLevel:"gerente",
  },

  detailSort:{ id:null, direction:null },

  // busca por contrato (usa o input #busca)
  tableSearchTerm:"",

  campanhas:{
    sprintId: CAMPAIGN_SPRINTS[0]?.id || null,
    teamValues:{},
    teamPreset:{},
    individualProfile: CAMPAIGN_SPRINTS[0]?.individual?.profiles?.[0]?.id || null,
    individualValues:{},
    individualPreset:{},
  },

  details:{
    activeViewId: DETAIL_DEFAULT_VIEW.id,
    activeColumns: [...DETAIL_DEFAULT_VIEW.columns],
    savedViews: [],
    customView: null,
    designerDraft: null,
    designerMessage: "",
  },

  opportunities:{
    open:false,
    node:null,
    lineage:[],
    baseFilters:new Map(),
    selectedProduct:"",
    filtered:[],
    trail:[],
    contact:{ open:false, leadId:null, trigger:null },
    detail:{ selectedId:null },
  },

  animations:{
    resumo:{
      kpiKey:null,
      varRatios:new Map(),
    },
    campanhas:{
      team:new Map(),
      individual:new Map(),
      ranking:new Map(),
    },
  }
};

if (typeof document !== "undefined") {
  const ensurePeriodLabel = () => {
    if (!state.period) state.period = getDefaultPeriodRange();
    updatePeriodLabels();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePeriodLabel, { once: true });
  } else {
    ensurePeriodLabel();
  }
}

hydrateDetailViewsFromStorage();

const SIMULATOR_STATE = {
  catalog: [],
  selectedId: "",
  delta: 0
};

function hydrateDetailViewsFromStorage(){
  const savedRaw = readLocalStorageJSON(DETAIL_VIEW_STORAGE_KEY);
  const savedList = Array.isArray(savedRaw)
    ? savedRaw.map(normalizeDetailViewPayload).filter(Boolean)
    : [];
  state.details.savedViews = savedList.slice(0, DETAIL_MAX_CUSTOM_VIEWS);

  const customRaw = readLocalStorageJSON(DETAIL_VIEW_CUSTOM_KEY);
  if (customRaw && Array.isArray(customRaw.columns)) {
    const baseCandidate = typeof customRaw.baseId === "string" && customRaw.baseId.trim() && customRaw.baseId !== "__custom__"
      ? customRaw.baseId.trim()
      : DETAIL_DEFAULT_VIEW.id;
    const savedBase = (state.details.savedViews || []).find(view => view.id === baseCandidate);
    const baseView = baseCandidate === DETAIL_DEFAULT_VIEW.id
      ? DETAIL_DEFAULT_VIEW
      : (savedBase ? { id: savedBase.id, name: savedBase.name || "Visão personalizada" } : DETAIL_DEFAULT_VIEW);
    const label = limparTexto(customRaw.name || "") || limparTexto(baseView.name || "") || DETAIL_CUSTOM_DEFAULT_LABEL;
    state.details.customView = {
      name: label,
      columns: sanitizeDetailColumns(customRaw.columns),
      baseId: baseView.id,
    };
  } else {
    state.details.customView = null;
  }

  const activeId = readLocalStorageItem(DETAIL_VIEW_ACTIVE_KEY) || DETAIL_DEFAULT_VIEW.id;
  const candidate = detailViewById(activeId);
  if (candidate) {
    state.details.activeViewId = candidate.id;
    state.details.activeColumns = sanitizeDetailColumns(candidate.columns);
    if (candidate.id === "__custom__") {
      state.details.customView = {
        name: candidate.name || DETAIL_CUSTOM_DEFAULT_LABEL,
        columns: [...state.details.activeColumns],
        baseId: candidate.baseId && candidate.baseId !== "__custom__"
          ? candidate.baseId
          : (state.details.customView?.baseId || DETAIL_DEFAULT_VIEW.id),
      };
    }
  } else {
    state.details.activeViewId = DETAIL_DEFAULT_VIEW.id;
    state.details.activeColumns = [...DETAIL_DEFAULT_VIEW.columns];
  }
  persistDetailState();
}

function getAllDetailViews(){
  const saved = Array.isArray(state.details.savedViews) ? state.details.savedViews : [];
  return [DETAIL_DEFAULT_VIEW, ...saved.map(view => ({
    id: view.id,
    name: limparTexto(view.name || "") || "Visão personalizada",
    columns: sanitizeDetailColumns(view.columns),
  }))];
}

function getActiveDetailColumns(){
  const ids = sanitizeDetailColumns(state.details.activeColumns || DETAIL_DEFAULT_VIEW.columns);
  return ids.map(id => getDetailColumnMeta(id)).filter(Boolean);
}

function detailViewById(viewId){
  if (!viewId) return null;
  if (viewId === DETAIL_DEFAULT_VIEW.id) return { ...DETAIL_DEFAULT_VIEW };
  if (viewId === "__custom__") {
    const custom = state.details.customView;
    if (custom && Array.isArray(custom.columns) && custom.columns.length) {
      const baseId = custom.baseId && custom.baseId !== "__custom__"
        ? custom.baseId
        : DETAIL_DEFAULT_VIEW.id;
      const baseView = baseId === DETAIL_DEFAULT_VIEW.id
        ? DETAIL_DEFAULT_VIEW
        : (baseId ? detailViewById(baseId) : null) || DETAIL_DEFAULT_VIEW;
      return {
        id: "__custom__",
        name: limparTexto(custom.name || "") || limparTexto(baseView.name || "") || DETAIL_CUSTOM_DEFAULT_LABEL,
        columns: sanitizeDetailColumns(custom.columns),
        baseId: baseView.id,
      };
    }
    return null;
  }
  const saved = Array.isArray(state.details.savedViews) ? state.details.savedViews : [];
  const match = saved.find(v => v.id === viewId);
  return match ? {
    id: match.id,
    name: limparTexto(match.name || "") || "Visão personalizada",
    columns: sanitizeDetailColumns(match.columns),
  } : null;
}

function persistDetailViews(){
  const payload = (Array.isArray(state.details.savedViews) ? state.details.savedViews : []).map(view => ({
    id: view.id,
    name: limparTexto(view.name || "") || "Visão personalizada",
    columns: sanitizeDetailColumns(view.columns),
  }));
  writeLocalStorageJSON(DETAIL_VIEW_STORAGE_KEY, payload.length ? payload : null);
}

function persistActiveDetailState(){
  writeLocalStorageItem(DETAIL_VIEW_ACTIVE_KEY, state.details.activeViewId || DETAIL_DEFAULT_VIEW.id);
  if (state.details.customView && Array.isArray(state.details.customView.columns) && state.details.customView.columns.length) {
    writeLocalStorageJSON(DETAIL_VIEW_CUSTOM_KEY, {
      name: limparTexto(state.details.customView.name || "") || DETAIL_CUSTOM_DEFAULT_LABEL,
      columns: sanitizeDetailColumns(state.details.customView.columns),
      baseId: state.details.customView.baseId && state.details.customView.baseId !== "__custom__"
        ? state.details.customView.baseId
        : (state.details.activeViewId && state.details.activeViewId !== "__custom__"
          ? state.details.activeViewId
          : DETAIL_DEFAULT_VIEW.id),
    });
  } else {
    writeLocalStorageItem(DETAIL_VIEW_CUSTOM_KEY, null);
  }
}

function persistDetailState(){
  persistDetailViews();
  persistActiveDetailState();
}

function updateActiveDetailConfiguration(viewId, columns, options = {}){
  const sanitized = sanitizeDetailColumns(columns);
  const label = limparTexto(options.label || "");
  const baseHint = typeof options.baseId === "string" ? options.baseId.trim() : "";
  if (viewId === "__custom__") {
    const fallbackBase = baseHint && baseHint !== "__custom__"
      ? baseHint
      : (state.details.customView?.baseId && state.details.customView.baseId !== "__custom__"
        ? state.details.customView.baseId
        : (state.details.activeViewId && state.details.activeViewId !== "__custom__"
          ? state.details.activeViewId
          : DETAIL_DEFAULT_VIEW.id));
    const baseView = fallbackBase === DETAIL_DEFAULT_VIEW.id
      ? DETAIL_DEFAULT_VIEW
      : detailViewById(fallbackBase) || DETAIL_DEFAULT_VIEW;
    const name = label || limparTexto(baseView.name || "") || DETAIL_CUSTOM_DEFAULT_LABEL;
    state.details.customView = {
      name,
      columns: [...sanitized],
      baseId: baseView.id,
    };
    state.details.activeViewId = "__custom__";
  } else {
    state.details.activeViewId = viewId;
    if (state.details.customView) {
      state.details.customView.baseId = state.details.customView.baseId && state.details.customView.baseId !== "__custom__"
        ? state.details.customView.baseId
        : viewId;
    }
  }
  state.details.activeColumns = [...sanitized];
  persistDetailState();
  return [...sanitized];
}

function updateSavedDetailView(viewId, columns){
  if (!viewId) return null;
  const saved = Array.isArray(state.details.savedViews) ? state.details.savedViews : [];
  const idx = saved.findIndex(v => v.id === viewId);
  if (idx < 0) return null;
  const next = {
    id: saved[idx].id,
    name: saved[idx].name,
    columns: sanitizeDetailColumns(columns),
  };
  saved[idx] = next;
  persistDetailViews();
  return next;
}

function createDetailView(columns, name){
  const saved = Array.isArray(state.details.savedViews) ? state.details.savedViews : [];
  if (saved.length >= DETAIL_MAX_CUSTOM_VIEWS) return null;
  const sanitized = sanitizeDetailColumns(columns);
  const label = limparTexto(name || "") || `Visão ${saved.length + 1}`;
  const view = { id: generateDetailViewId(), name: label, columns: sanitized };
  saved.push(view);
  state.details.savedViews = saved;
  persistDetailViews();
  return view;
}

function deleteDetailView(viewId){
  if (!viewId || viewId === DETAIL_DEFAULT_VIEW.id) return false;
  const saved = Array.isArray(state.details.savedViews) ? state.details.savedViews : [];
  const idx = saved.findIndex(v => v.id === viewId);
  if (idx < 0) return false;
  saved.splice(idx, 1);
  state.details.savedViews = saved;
  persistDetailViews();
  if (state.details.activeViewId === viewId) {
    updateActiveDetailConfiguration(DETAIL_DEFAULT_VIEW.id, DETAIL_DEFAULT_VIEW.columns);
  } else {
    persistActiveDetailState();
  }
  return true;
}

function prefersReducedMotion(){
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    return false;
  }
}

function isDOMElement(value){
  return !!value && typeof value === 'object' && 'classList' in value;
}

function triggerBarAnimation(targets, shouldAnimate, className = 'is-animating'){
  const iterable = targets && typeof targets[Symbol.iterator] === 'function';
  const list = !targets ? [] : (Array.isArray(targets) ? targets : (iterable && !isDOMElement(targets) ? Array.from(targets) : [targets]));
  list.forEach(el => {
    if (!isDOMElement(el)) return;
    el.classList.remove(className);
    if (!shouldAnimate || prefersReducedMotion()) return;
    void el.offsetWidth;
    el.classList.add(className);
    const cleanup = () => el.classList.remove(className);
    el.addEventListener('animationend', cleanup, { once:true });
    el.addEventListener('animationcancel', cleanup, { once:true });
  });
}

function shouldAnimateDelta(prev, next, tolerance = 0.1){
  if (prev == null || !Number.isFinite(prev)) return true;
  if (next == null || !Number.isFinite(next)) return false;
  return Math.abs(prev - next) > tolerance;
}

let __varTrackResizeBound = false;
function positionVarTrackLabel(trackEl){
  if (!trackEl) return;
  const label = trackEl.querySelector('.prod-card__var-label');
  if (!label) return;
  const trackWidth = trackEl.clientWidth;
  if (!trackWidth) return;

  const ratio = Number(trackEl.dataset?.ratio);
  const safeRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(100, ratio)) : 0;
  const padding = 6;
  const maxWidth = Math.max(trackWidth - (padding * 2), 0);
  label.style.maxWidth = `${maxWidth}px`;

  const labelWidth = label.offsetWidth;
  const tip = (safeRatio / 100) * trackWidth;
  const half = labelWidth / 2;
  const minLeft = padding + half;
  const maxLeft = Math.max(minLeft, trackWidth - padding - half);
  let left = tip;
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = maxLeft;

  label.style.left = `${left}px`;
}

function layoutProdVarTracks(){
  $$('.prod-card__var-track').forEach(track => {
    if (!track?.offsetParent) return;
    positionVarTrackLabel(track);
  });
}

function ensureVarLabelResizeListener(){
  if (typeof window === 'undefined') return;
  if (__varTrackResizeBound) return;
  __varTrackResizeBound = true;
  window.addEventListener('resize', () => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(layoutProdVarTracks);
    } else {
      layoutProdVarTracks();
    }
  });
}

const contractSuggestState = { items: [], highlight: -1, open: false, term: "", pending: null };
let contractSuggestDocBound = false;
let contractSuggestPanelBound = false;

/* ===== Aqui eu junto utilidades de interface que reaproveito em várias telas ===== */
function injectStyles(){
  if(document.getElementById("dynamic-styles")) return;
  const style = document.createElement("style");
  style.id = "dynamic-styles";
  style.textContent = `
  .view-panel{ opacity:1; transform:translateY(0); transition:opacity .28s ease, transform .28s ease; will-change:opacity, transform; }
  .view-panel.is-exit{ opacity:0; transform:translateY(8px); }
  .view-panel.is-enter{ opacity:0; transform:translateY(-6px); }
  .view-panel.is-enter-active{ opacity:1; transform:translateY(0); }
  .hidden{ display:none; }

  /* ===== KPI topo: versão ajustada ===== */
  #kpi-summary.kpi-summary{
    display:flex !important;
    flex-wrap:wrap;
    gap:18px;
    margin:8px 0 14px;
    align-items:flex-start;
  }
  #kpi-summary .kpi-pill{
    flex:1 1 320px;
    min-width:280px;
    padding:24px 26px;
    gap:14px;
  }
  #kpi-summary .kpi-strip__main{ gap:14px; }
  #kpi-summary .kpi-icon{ width:42px; height:42px; font-size:18px; }
  #kpi-summary .kpi-strip__label{ font-size:13.5px; max-width:220px; }
  #kpi-summary .kpi-stat{ font-size:12.5px; }

  #kpi-summary .hitbar{
    width:100%;
    gap:12px;
  }
  #kpi-summary .hitbar__track{
    min-width:0;
    height:9px;
    border-width:1.5px;
  }
  #kpi-summary .hitbar strong{
    font-size:12.5px;
  }

  @media (max-width: 720px){
    #kpi-summary .kpi-pill{ min-width:100%; }
  }
`;
  document.head.appendChild(style);
  ["#view-cards", "#view-table"].forEach(sel => $(sel)?.classList.add("view-panel"));
}

/* ===== Aqui eu trato o popover de data para facilitar a seleção de período ===== */
function openDatePopover(anchor){
  closeDatePopover();

  const pop = document.createElement("div");
  pop.className = "date-popover";
  pop.id = "date-popover";
  pop.innerHTML = `
    <h4>Alterar data</h4>
    <div class="row" style="margin-bottom:8px">
      <input id="inp-start" type="date" value="${state.period.start}" aria-label="Data inicial">
      <input id="inp-end"   type="date" value="${state.period.end}"   aria-label="Data final">
    </div>
    <div class="actions">
      <button type="button" class="btn-sec" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn-pri" id="btn-salvar">Salvar</button>
    </div>
  `;
  document.body.appendChild(pop);

  // Posiciona relativo à viewport (o popover é FIXO)
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth || 340;
  const h = pop.offsetHeight || 170;
  const pad = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top  = r.bottom + 8;
  let left = r.right - w;
  if (top + h + pad > vh) top = Math.max(pad, r.top - h - 8);
  if (left < pad) left = pad;
  if (left + w + pad > vw) left = Math.max(pad, vw - w - pad);

  pop.style.top  = `${top}px`;
  pop.style.left = `${left}px`;

  pop.querySelector("#btn-cancelar").addEventListener("click", closeDatePopover);
  pop.querySelector("#btn-salvar").addEventListener("click", ()=>{
    const s = document.getElementById("inp-start").value;
    const e = document.getElementById("inp-end").value;
    if(!s || !e || new Date(s) > new Date(e)){ alert("Período inválido."); return; }
    state.period.start = s;
    state.period.end   = e;
    state.accumulatedView = "mensal";
    const visaoSelect = document.getElementById("f-visao");
    if (visaoSelect) visaoSelect.value = "mensal";
    document.getElementById("lbl-periodo-inicio").textContent = formatBRDate(s);
    document.getElementById("lbl-periodo-fim").textContent    = formatBRDate(e);
    closeDatePopover();
    refresh().catch(handleBootstrapError);
  });

  const outside = (ev)=>{ if(ev.target===pop || pop.contains(ev.target) || ev.target===anchor) return; closeDatePopover(); };
  const esc     = (ev)=>{ if(ev.key==="Escape") closeDatePopover(); };
  document.addEventListener("mousedown", outside, { once:true });
  document.addEventListener("keydown", esc, { once:true });

  state.datePopover = pop;
}
function closeDatePopover(){
  if(state.datePopover?.parentNode) state.datePopover.parentNode.removeChild(state.datePopover);
  state.datePopover = null;
}

/* ===== Aqui eu configuro o botão de limpar filtros e mantenho o fluxo claro ===== */
function wireClearFiltersButton() {
  const btn = $("#btn-limpar");
  if (!btn || btn.dataset.wired === "1") return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    btn.disabled = true;
    try { await clearFilters(); } finally { setTimeout(() => (btn.disabled = false), 250); }
  });
}
async function clearFilters() {
  [
    "#f-segmento","#f-diretoria","#f-gerencia","#f-gerente",
    "#f-agencia","#f-ggestao","#f-secao","#f-familia","#f-produto",
    "#f-status-kpi","#f-visao"
  ].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    if (el.tagName === "SELECT") el.selectedIndex = 0;
    if (el.tagName === "INPUT")  el.value = "";
  });

  // valores padrão explícitos
  const st = $("#f-status-kpi"); if (st) st.value = "todos";
  const visaoSelect = $("#f-visao");
  if (visaoSelect) visaoSelect.value = "mensal";
  state.accumulatedView = "mensal";
  const secaoSelect = $("#f-secao");
  if (secaoSelect) secaoSelect.dispatchEvent(new Event("change"));
  const familiaSelect = $("#f-familia");
  if (familiaSelect) familiaSelect.dispatchEvent(new Event("change"));
  const produtoSelect = $("#f-produto");
  if (produtoSelect) produtoSelect.dispatchEvent(new Event("change"));

  refreshHierarchyCombos();

  // limpa busca (contrato) e estado
  state.tableSearchTerm = "";
  if ($("#busca")) $("#busca").value = "";
  refreshContractSuggestions("");
  const defaultPeriod = getDefaultPeriodRange();
  state.period = defaultPeriod;
  syncPeriodFromAccumulatedView(state.accumulatedView, defaultPeriod.end);
  if (state.tableView === "contrato") {
    state.tableView = "diretoria";
    state.lastNonContractView = "diretoria";
    setActiveChip("diretoria");
  }

  await withSpinner(async () => {
    applyFiltersAndRender();
    renderAppliedFilters();
    renderCampanhasView();
    if (state.activeView === "ranking") renderRanking();
  }, "Limpando filtros…");
  closeMobileFilters();
}

function setMobileFiltersState(open) {
  const card = document.querySelector(".card--filters");
  if (!card) return;
  card.classList.toggle("is-mobile-open", open);
  card.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("filters-open", open);

  const hamburger = document.querySelector(".topbar-hamburger");
  if (hamburger) hamburger.setAttribute("aria-expanded", open ? "true" : "false");

  const backdrop = document.getElementById("filters-backdrop");
  if (backdrop) {
    if (open) {
      backdrop.hidden = false;
      backdrop.classList.add("is-show");
    } else {
      backdrop.classList.remove("is-show");
      backdrop.hidden = true;
    }
  }

  const carousel = document.getElementById("mobile-carousel");
  if (carousel) {
    carousel.classList.toggle("mobile-carousel--hidden", open);
    carousel.setAttribute("aria-hidden", open ? "true" : "false");
    const ctrl = carousel._carouselControl;
    if (ctrl) {
      if (open && typeof ctrl.stop === "function") ctrl.stop();
      if (!open && typeof ctrl.start === "function") ctrl.start();
    }
  }

  const toggle = document.getElementById("btn-mobile-filtros");
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function openMobileFilters(){ setMobileFiltersState(true); }
function closeMobileFilters(){ setMobileFiltersState(false); }

function setupMobileFilters(){
  const openBtn = document.getElementById("btn-mobile-filtros");
  const closeBtn = document.getElementById("btn-fechar-filtros");
  const backdrop = document.getElementById("filters-backdrop");

  if (openBtn && !openBtn.dataset.bound) {
    openBtn.dataset.bound = "1";
    openBtn.addEventListener("click", () => openMobileFilters());
  }
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", () => closeMobileFilters());
  }
  if (backdrop && !backdrop.dataset.bound) {
    backdrop.dataset.bound = "1";
    backdrop.addEventListener("click", () => closeMobileFilters());
  }

  if (!setupMobileFilters._escBound) {
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeMobileFilters();
    });
    setupMobileFilters._escBound = true;
  }
}

let userMenuBound = false;
function setupUserMenu(){
  if (userMenuBound) return;
  const trigger = document.getElementById("btn-user-menu");
  const menu = document.getElementById("user-menu");
  if (!trigger || !menu) return;

  const subToggle = menu.querySelector('[data-submenu="manuais"]');
  const subList = document.getElementById("user-submenu-manuais");

  const closeSubmenu = () => {
    if (!subToggle || !subList) return;
    subToggle.setAttribute("aria-expanded", "false");
    subList.hidden = true;
    subList.classList.remove("is-open");
  };

  const closeMenu = () => {
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (menu.contains(document.activeElement)) {
      trigger.focus();
    }
    closeSubmenu();
  };

  const openMenu = () => {
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  };

  trigger.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const isOpen = menu.classList.contains("is-open");
    if (isOpen) closeMenu(); else openMenu();
  });

  if (subToggle && subList) {
    subToggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const expanded = subToggle.getAttribute("aria-expanded") === "true";
      const next = !expanded;
      subToggle.setAttribute("aria-expanded", String(next));
      if (next) {
        subList.hidden = false;
        subList.classList.add("is-open");
      } else {
        subList.classList.remove("is-open");
        subList.hidden = true;
      }
    });
  }

  menu.addEventListener("click", (ev) => {
    const item = ev.target?.closest?.(".userbox__menu-item");
    if (!item || item.hasAttribute("data-submenu")) return;
    closeMenu();
  });

  document.addEventListener("click", (ev) => {
    if (!menu.contains(ev.target) && !trigger.contains(ev.target)) {
      closeMenu();
    }
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeMenu();
  });

  userMenuBound = true;
}

let topbarNotificationsBound = false;
function setupTopbarNotifications(){
  if (topbarNotificationsBound) return;
  const trigger = document.getElementById("btn-topbar-notifications");
  const panel = document.getElementById("topbar-notification-panel");
  const badge = document.getElementById("topbar-notification-badge");
  if (!trigger || !panel) return;

  const closePanel = () => {
    panel.setAttribute("aria-hidden", "true");
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (panel.contains(document.activeElement)) {
      trigger.focus();
    }
  };

  const openPanel = () => {
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
  };

  trigger.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    if (expanded) closePanel(); else openPanel();
  });

  document.addEventListener("click", (ev) => {
    if (panel.contains(ev.target) || trigger.contains(ev.target)) return;
    closePanel();
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closePanel();
  });

  const setBadge = (count) => {
    if (!badge) return;
    const safe = Number.isFinite(count) ? Math.max(0, count) : 0;
    if (safe > 0) {
      badge.textContent = safe > 99 ? "99+" : String(safe);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  };

  setBadge(0);
  closePanel();
  topbarNotificationsBound = true;
  setupTopbarNotifications.setBadge = setBadge;
}

function initMobileCarousel(){
  const host = document.getElementById("mobile-carousel");
  if (!host) return;
  const slides = Array.from(host.querySelectorAll(".mobile-carousel__slide"));
  const dots = Array.from(host.querySelectorAll(".mobile-carousel__dot"));
  if (slides.length <= 1) {
    slides.forEach(slide => slide.classList.add("is-active"));
    dots.forEach(dot => dot.setAttribute("aria-current", "true"));
    return;
  }

  let current = 0;
  let timer = null;
  let pointerStart = null;

  const activate = (idx) => {
    if (!slides.length) return;
    const next = (idx + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === next);
      slide.setAttribute("aria-hidden", i === next ? "false" : "true");
    });
    dots.forEach((dot, i) => {
      dot.setAttribute("aria-current", i === next ? "true" : "false");
    });
    current = next;
  };

  const goTo = (idx) => {
    stop();
    activate(idx);
    start();
  };

  const start = () => {
    if (timer) return;
    timer = setInterval(() => activate(current + 1), 6000);
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  dots.forEach((dot, idx) => {
    if (dot.dataset.bound) return;
    dot.dataset.bound = "1";
    dot.addEventListener("click", () => {
      goTo(idx);
    });
  });

  const handlePointerDown = (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    pointerStart = ev.clientX;
    stop();
  };

  const handlePointerUp = (ev) => {
    if (pointerStart === null) return;
    const delta = ev.clientX - pointerStart;
    pointerStart = null;
    if (Math.abs(delta) > 30) {
      goTo(delta < 0 ? current + 1 : current - 1);
    } else {
      start();
    }
  };

  const handlePointerCancel = () => {
    pointerStart = null;
    start();
  };

  host.addEventListener("pointerdown", handlePointerDown);
  host.addEventListener("pointerup", handlePointerUp);
  host.addEventListener("pointercancel", handlePointerCancel);
  host.addEventListener("pointerleave", () => {
    pointerStart = null;
  });

  host.addEventListener("pointerenter", stop, { passive: true });
  host.addEventListener("pointerleave", start, { passive: true });
  host.addEventListener("focusin", stop);
  host.addEventListener("focusout", start);

  activate(0);
  start();

  host._carouselControl = {
    start,
    stop
  };
}

/* ===== Aqui eu descrevo as opções avançadas de filtro que ficam escondidas ===== */
function ensureStatusFilterInAdvanced() {
  const adv = $("#advanced-filters");
  if (!adv) return;
  const host = adv.querySelector(".adv__grid") || adv;

  if (!$("#f-status-kpi")) {
    const wrap = document.createElement("div");
    wrap.className = "filters__group";
    wrap.innerHTML = `
      <label for="f-status-kpi">Status dos indicadores</label>
      <select id="f-status-kpi" class="input"></select>`;
    host.appendChild(wrap);
    $("#f-status-kpi").addEventListener("change", async () => {
      await withSpinner(async () => {
        applyFiltersAndRender();
        renderAppliedFilters();
        renderCampanhasView();
        if (state.activeView === "ranking") renderRanking();
      }, "Atualizando filtros…");
    });
  }

  updateStatusFilterOptions();

  const gStart = $("#f-inicio")?.closest(".filters__group");
  if (gStart) gStart.remove();
}



/* ===== Aqui eu monto os chips da tabela e a toolbar com as ações rápidas ===== */
function ensureChipBarAndToolbar() {
  if ($("#table-controls")) return;
  const card = $("#table-section"); if (!card) return;

  const holder = document.createElement("div");
  holder.id = "table-controls";
  holder.innerHTML = `
    <div id="applied-bar" class="applied-bar"></div>
    <div class="table-controls__main">
      <div class="table-controls__chips">
        <div id="chipbar" class="chipbar"></div>
      </div>
      <div id="table-search-holder" class="table-controls__search"></div>
    </div>
    <div id="detail-view-bar" class="detail-view-bar">
      <div class="detail-view-bar__left">
        <span class="detail-view-bar__label">Visões da tabela</span>
        <div id="detail-view-chips" class="detail-view-chips"></div>
      </div>
      <div class="detail-view-bar__right">
        <div id="tt-toolbar" class="table-toolbar"></div>
      </div>
    </div>`;
  const header = card.querySelector(".card__header") || card;
  header.insertAdjacentElement("afterend", holder);

  const searchHolder = holder.querySelector("#table-search-holder");
  const searchWrap = card.querySelector(".card__search-autocomplete");
  if (searchHolder && searchWrap) {
    searchHolder.appendChild(searchWrap);
  }
  const headerActions = card.querySelector(".card__actions");
  if (headerActions && !headerActions.children.length) {
    headerActions.remove();
  }

  const chipbar = $("#chipbar");
  TABLE_VIEWS.forEach(v => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.view = v.id;
    chip.textContent = v.label;
    if (v.id === state.tableView) chip.classList.add("is-active");
    chip.addEventListener("click", () => {
      if (state.tableView === v.id) return;
      if (v.id === "contrato" && state.tableView !== "contrato") {
        state.lastNonContractView = state.tableView;
      }
      state.tableView = v.id;
      setActiveChip(v.id);
      renderTreeTable();
    });
    chipbar.appendChild(chip);
  });

  $("#tt-toolbar").innerHTML = `
    <button type="button" id="btn-expandir" class="btn btn--sm table-toolbar__btn" title="Expandir todas as linhas">
      <span class="table-toolbar__icon"><i class="ti ti-chevrons-down"></i></span>
      <span class="table-toolbar__text">Expandir tudo</span>
    </button>
    <button type="button" id="btn-recolher" class="btn btn--sm table-toolbar__btn" title="Recolher todas as linhas">
      <span class="table-toolbar__icon"><i class="ti ti-chevrons-up"></i></span>
      <span class="table-toolbar__text">Recolher tudo</span>
    </button>
    <button type="button" id="btn-compacto" class="btn btn--sm table-toolbar__btn" aria-pressed="false" title="Alternar modo compacto">
      <span class="table-toolbar__icon"><i class="ti ti-layout-collage"></i></span>
      <span class="table-toolbar__text">Modo compacto</span>
    </button>
    <button type="button" id="btn-manage-detail-columns" class="btn btn--sm table-toolbar__btn detail-view-manage" title="Personalizar colunas da tabela">
      <span class="table-toolbar__icon"><i class="ti ti-columns"></i></span>
      <span class="table-toolbar__text">Personalizar colunas</span>
    </button>`;
  $("#btn-expandir").addEventListener("click", expandAllRows);
  $("#btn-recolher").addEventListener("click", collapseAllRows);
  $("#btn-compacto").addEventListener("click", () => {
    state.compact = !state.compact;
    $("#table-section")?.classList.toggle("is-compact", state.compact);
    updateCompactButtonLabel();
  });
  updateCompactButtonLabel();

  const detailChips = document.getElementById("detail-view-chips");
  if (detailChips && !detailChips.dataset.bound) {
    detailChips.dataset.bound = "1";
    detailChips.addEventListener("click", handleDetailViewChipClick);
  }

  const manageBtn = document.getElementById("btn-manage-detail-columns");
  if (manageBtn && !manageBtn.dataset.bound) {
    manageBtn.dataset.bound = "1";
    manageBtn.addEventListener("click", () => openDetailDesigner());
  }

  renderDetailViewBar();
  initDetailDesigner();

  const headerSearch = $("#busca");
  if (headerSearch) headerSearch.placeholder = "Contrato (Ex.: CT-AAAA-999999)";
  $$('#table-section input[placeholder*="Contrato" i]').forEach(el => { if (el !== headerSearch) el.remove(); });

  renderAppliedFilters();
}

function openLeadsForCurrentFilters(){
  if (typeof openOpportunityModal !== "function") {
    console.warn("Módulo de leads não disponível.");
    return;
  }
  const filters = getFilterValues();
  const lineage = buildLineageFromFilters(filters);
  const lastEntry = lineage.length ? lineage[lineage.length - 1] : null;
  const detail = {
    node: {
      label: lastEntry?.label || "Leads propensos",
      levelKey: lastEntry?.levelKey || "",
      type: "filters"
    },
    lineage,
  };
  openOpportunityModal(detail);
}

function openLeadsWithoutFilters(){
  if (typeof openOpportunityModal !== "function") {
    console.warn("Módulo de leads não disponível.");
    return;
  }
  openOpportunityModal({});
}

function updateCompactButtonLabel() {
  const btn = document.getElementById("btn-compacto");
  if (!btn) return;
  btn.setAttribute("aria-pressed", state.compact ? "true" : "false");
  const text = btn.querySelector(".table-toolbar__text");
  const icon = btn.querySelector(".table-toolbar__icon i");
  if (text) text.textContent = state.compact ? "Modo confortável" : "Modo compacto";
  if (icon) icon.className = state.compact ? "ti ti-arrows-minimize" : "ti ti-layout-collage";
  btn.classList.toggle("is-active", !!state.compact);
  btn.title = state.compact ? "Voltar para modo confortável" : "Ativar modo compacto";
}

function renderDetailViewBar(){
  const chipsHolder = document.getElementById("detail-view-chips");
  if (!chipsHolder) return;
  const views = getAllDetailViews();
  if (!views.length) {
    chipsHolder.innerHTML = `<span class="detail-view-empty">Sem visões disponíveis</span>`;
    return;
  }
  const availableIds = new Set(views.map(view => view.id));
  const rawActiveId = state.details.activeViewId || DETAIL_DEFAULT_VIEW.id;
  let highlightId = rawActiveId;
  if (rawActiveId === "__custom__") {
    const baseId = state.details.customView?.baseId && state.details.customView.baseId !== "__custom__"
      ? state.details.customView.baseId
      : DETAIL_DEFAULT_VIEW.id;
    highlightId = availableIds.has(baseId) ? baseId : DETAIL_DEFAULT_VIEW.id;
  } else if (!availableIds.has(rawActiveId)) {
    highlightId = DETAIL_DEFAULT_VIEW.id;
  }
  chipsHolder.innerHTML = views.map(view => {
    const isActive = view.id === highlightId;
    const safeId = escapeHTML(view.id);
    const safeName = escapeHTML(view.name || "Visão");
    return `<button type="button" class="detail-chip${isActive ? " is-active" : ""}" data-view-id="${safeId}"><span>${safeName}</span></button>`;
  }).join("");
}

function handleDetailViewChipClick(ev){
  const chip = ev.target.closest(".detail-chip");
  if (!chip) return;
  const viewId = chip.dataset.viewId;
  if (!viewId || viewId === state.details.activeViewId) return;
  const view = detailViewById(viewId);
  if (!view) return;
  updateActiveDetailConfiguration(view.id, view.columns, { label: view.name });
  if (state.tableRendered) renderTreeTable();
  else renderDetailViewBar();
}

let detailDesignerInitialized = false;
let detailDesignerDragState = null;
let detailDesignerFeedbackTimer = null;

function initDetailDesigner(){
  if (detailDesignerInitialized) return;
  const host = document.getElementById("detail-designer");
  if (!host) return;
  detailDesignerInitialized = true;

  host.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-designer-close]")) {
      ev.preventDefault();
      closeDetailDesigner();
    }
  });

  host.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeDetailDesigner();
  });

  host.querySelectorAll(".detail-designer__items").forEach(list => {
    list.addEventListener("click", handleDetailDesignerListClick);
    list.addEventListener("dragover", handleDetailDesignerDragOver);
    list.addEventListener("drop", handleDetailDesignerDrop);
    list.addEventListener("dragleave", handleDetailDesignerDragLeave);
  });

  const viewsContainer = document.getElementById("detail-designer-views");
  if (viewsContainer) viewsContainer.addEventListener("click", handleDetailDesignerViewClick);

  document.getElementById("detail-apply-columns")?.addEventListener("click", handleDetailDesignerApply);
  document.getElementById("detail-save-view")?.addEventListener("click", handleDetailDesignerSave);
  document.getElementById("detail-view-name")?.addEventListener("input", () => updateDetailDesignerControls());
}

function openDetailDesigner(){
  const host = document.getElementById("detail-designer");
  if (!host) return;
  if (host.parentElement !== document.body) {
    document.body.appendChild(host);
  }
  const current = detailViewById(state.details.activeViewId) || DETAIL_DEFAULT_VIEW;
  const baseId = current.id === "__custom__"
    ? (state.details.customView?.baseId && state.details.customView.baseId !== "__custom__"
      ? state.details.customView.baseId
      : DETAIL_DEFAULT_VIEW.id)
    : current.id;
  const baseView = baseId === current.id && current.id !== "__custom__"
    ? current
    : (baseId === DETAIL_DEFAULT_VIEW.id ? DETAIL_DEFAULT_VIEW : detailViewById(baseId) || DETAIL_DEFAULT_VIEW);
  const baseColumns = sanitizeDetailColumns(current.columns);
  state.details.designerDraft = {
    viewId: baseView.id,
    name: baseView.name,
    columns: [...baseColumns],
    original: [...baseColumns],
    modified: false,
  };
  state.details.designerMessage = "";

  const nameInput = document.getElementById("detail-view-name");
  if (nameInput) nameInput.value = "";

  renderDetailDesigner();
  host.hidden = false;
  host.setAttribute("aria-hidden", "false");
  host.classList.add("is-open");
  document.body.classList.add("has-modal-open");
  const panel = host.querySelector(".detail-designer__panel");
  if (panel) {
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    panel.focus({ preventScroll: true });
  }
}

function closeDetailDesigner(){
  const host = document.getElementById("detail-designer");
  if (!host) return;
  host.classList.remove("is-open");
  host.setAttribute("aria-hidden", "true");
  host.hidden = true;
  document.body.classList.remove("has-modal-open");
  state.details.designerDraft = null;
  state.details.designerMessage = "";
  if (detailDesignerFeedbackTimer) {
    clearTimeout(detailDesignerFeedbackTimer);
    detailDesignerFeedbackTimer = null;
  }
  const nameInput = document.getElementById("detail-view-name");
  if (nameInput) nameInput.value = "";
}

function renderDetailDesigner(){
  const host = document.getElementById("detail-designer");
  const draft = state.details.designerDraft;
  if (!host || !draft) return;

  const selectedWrap = host.querySelector('[data-items="selected"]');
  const availableWrap = host.querySelector('[data-items="available"]');
  if (!selectedWrap || !availableWrap) return;

  const selectedIds = sanitizeDetailColumns(draft.columns);
  if (!detailColumnsEqual(selectedIds, draft.columns)) draft.columns = [...selectedIds];
  draft.modified = !detailColumnsEqual(selectedIds, draft.original || []);

  const available = DETAIL_COLUMNS.filter(col => !selectedIds.includes(col.id));
  const canRemove = selectedIds.length > 1;

  selectedWrap.innerHTML = selectedIds.length
    ? selectedIds.map(id => {
        const meta = getDetailColumnMeta(id);
        if (!meta) return "";
        const safeId = escapeHTML(meta.id);
        const safeLabel = escapeHTML(meta.label);
        const disabledAttr = canRemove ? "" : " disabled";
        const disabledClass = canRemove ? "" : " is-disabled";
        return `
          <div class="detail-item" data-col="${safeId}" draggable="true">
            <span class="detail-item__handle" aria-hidden="true"><i class="ti ti-grip-vertical"></i></span>
            <span class="detail-item__label">${safeLabel}</span>
            <button type="button" class="detail-item__remove${disabledClass}" data-action="remove" aria-label="Remover ${safeLabel}"${disabledAttr}><i class="ti ti-x"></i></button>
          </div>`;
      }).join("")
    : `<p class="detail-designer__empty">Escolha ao menos uma coluna.</p>`;

  availableWrap.innerHTML = available.length
    ? available.map(meta => {
        const safeId = escapeHTML(meta.id);
        const safeLabel = escapeHTML(meta.label);
        return `
          <div class="detail-item detail-item--available" data-col="${safeId}" draggable="true">
            <span class="detail-item__handle" aria-hidden="true"><i class="ti ti-grip-vertical"></i></span>
            <span class="detail-item__label">${safeLabel}</span>
            <button type="button" class="detail-item__add" data-action="add" aria-label="Adicionar ${safeLabel}"><i class="ti ti-plus"></i></button>
          </div>`;
      }).join("")
    : `<p class="detail-designer__empty">Todas as colunas já estão na tabela.</p>`;

  selectedWrap.querySelectorAll(".detail-item").forEach(item => {
    item.addEventListener("dragstart", handleDetailDesignerDragStart);
    item.addEventListener("dragend", handleDetailDesignerDragEnd);
  });
  availableWrap.querySelectorAll(".detail-item").forEach(item => {
    item.addEventListener("dragstart", handleDetailDesignerDragStart);
    item.addEventListener("dragend", handleDetailDesignerDragEnd);
  });

  renderDetailDesignerViews();
  updateDetailDesignerControls();
  updateDetailDesignerFeedback();
}

function renderDetailDesignerViews(){
  const container = document.getElementById("detail-designer-views");
  const draft = state.details.designerDraft;
  if (!container || !draft) return;
  const views = getAllDetailViews();
  if (!views.length) {
    container.innerHTML = `<span class="detail-view-empty">Nenhuma visão salva.</span>`;
    return;
  }
  const currentId = draft.viewId;
  container.innerHTML = views.map(view => {
    const safeId = escapeHTML(view.id);
    const safeName = escapeHTML(view.name || "Visão");
    const isActive = view.id === currentId;
    const deletable = view.id !== DETAIL_DEFAULT_VIEW.id && view.id !== "__custom__";
    const deleteBtn = deletable
      ? `<button type="button" class="detail-chip__remove" data-action="delete" data-view-id="${safeId}" aria-label="Excluir ${safeName}"><i class="ti ti-trash"></i></button>`
      : "";
    return `
      <div class="detail-chip detail-chip--designer${isActive ? " is-active" : ""}" data-view-id="${safeId}">
        <button type="button" class="detail-chip__action" data-action="load" data-view-id="${safeId}">${safeName}</button>
        ${deleteBtn}
      </div>`;
  }).join("");
}

function updateDetailDesignerControls(){
  const draft = state.details.designerDraft;
  const saveBtn = document.getElementById("detail-save-view");
  const nameInput = document.getElementById("detail-view-name");
  const applyBtn = document.getElementById("detail-apply-columns");
  const hint = document.getElementById("detail-save-hint");
  if (!draft) {
    if (saveBtn) saveBtn.disabled = true;
    if (applyBtn) applyBtn.disabled = true;
    return;
  }
  const selectedIds = sanitizeDetailColumns(draft.columns);
  if (applyBtn) applyBtn.disabled = !selectedIds.length;
  const limitReached = (state.details.savedViews || []).length >= DETAIL_MAX_CUSTOM_VIEWS;
  if (saveBtn && nameInput && hint) {
    const name = limparTexto(nameInput.value || "");
    if (limitReached) {
      saveBtn.disabled = true;
      hint.textContent = `Você já salvou ${DETAIL_MAX_CUSTOM_VIEWS} visões. Apague uma para liberar espaço.`;
    } else {
      saveBtn.disabled = name.length < 3 || !selectedIds.length;
      hint.textContent = `Você pode guardar até ${DETAIL_MAX_CUSTOM_VIEWS} visões personalizadas.`;
    }
  }
}

function updateDetailDesignerFeedback(){
  const feedback = document.getElementById("detail-designer-feedback");
  if (!feedback) return;
  if (detailDesignerFeedbackTimer) {
    clearTimeout(detailDesignerFeedbackTimer);
    detailDesignerFeedbackTimer = null;
  }
  const message = state.details.designerMessage || "";
  if (message) {
    feedback.textContent = message;
    feedback.hidden = false;
    detailDesignerFeedbackTimer = setTimeout(() => {
      state.details.designerMessage = "";
      feedback.hidden = true;
      feedback.textContent = "";
      detailDesignerFeedbackTimer = null;
    }, 3200);
  } else {
    feedback.textContent = "";
    feedback.hidden = true;
  }
}

function handleDetailDesignerListClick(ev){
  const actionBtn = ev.target.closest("[data-action]");
  if (!actionBtn) return;
  const item = actionBtn.closest(".detail-item");
  const colId = item?.dataset.col;
  if (!colId) return;
  ev.preventDefault();
  if (actionBtn.dataset.action === "remove") {
    removeColumnFromDesigner(colId);
  } else if (actionBtn.dataset.action === "add") {
    insertColumnIntoDesigner(colId);
  }
}

function handleDetailDesignerViewClick(ev){
  const button = ev.target.closest("[data-action][data-view-id]");
  if (!button) return;
  const action = button.dataset.action;
  const viewId = button.dataset.viewId;
  if (!viewId) return;
  ev.preventDefault();
  if (action === "load") {
    const view = detailViewById(viewId);
    if (!view) return;
    const cols = sanitizeDetailColumns(view.columns);
    state.details.designerDraft = {
      viewId: view.id,
      name: view.name,
      columns: [...cols],
      original: [...cols],
      modified: false,
    };
    state.details.designerMessage = "";
    const nameInput = document.getElementById("detail-view-name");
    if (nameInput) nameInput.value = "";
    renderDetailDesigner();
  } else if (action === "delete") {
    if (!deleteDetailView(viewId)) return;
    state.details.designerMessage = "Visão removida.";
    renderDetailViewBar();
    if (state.tableRendered) renderTreeTable();
    const fallback = detailViewById(state.details.activeViewId) || DETAIL_DEFAULT_VIEW;
    const cols = sanitizeDetailColumns(fallback.columns);
    state.details.designerDraft = {
      viewId: fallback.id,
      name: fallback.name,
      columns: [...cols],
      original: [...cols],
      modified: false,
    };
    renderDetailDesigner();
  }
}

function handleDetailDesignerApply(){
  const draft = state.details.designerDraft;
  if (!draft) { closeDetailDesigner(); return; }
  const columns = sanitizeDetailColumns(draft.columns);
  if (!columns.length) {
    state.details.designerMessage = "Escolha ao menos uma coluna para aplicar.";
    updateDetailDesignerFeedback();
    return;
  }

  const baseId = draft.viewId && draft.viewId !== "__custom__"
    ? draft.viewId
    : (state.details.customView?.baseId && state.details.customView.baseId !== "__custom__"
      ? state.details.customView.baseId
      : DETAIL_DEFAULT_VIEW.id);

  let targetId = draft.viewId;
  if (!targetId || targetId === DETAIL_DEFAULT_VIEW.id) targetId = "__custom__";
  if (targetId !== "__custom__" && draft.modified) {
    updateSavedDetailView(targetId, columns);
    draft.original = [...columns];
    draft.modified = false;
  }

  let label;
  if (targetId === "__custom__") {
    const baseMeta = detailViewById(baseId) || DETAIL_DEFAULT_VIEW;
    label = limparTexto(baseMeta.name || "") || DETAIL_CUSTOM_DEFAULT_LABEL;
  } else {
    const viewMeta = detailViewById(targetId) || detailViewById(draft.viewId);
    label = viewMeta?.name || draft.name || DETAIL_CUSTOM_DEFAULT_LABEL;
  }

  updateActiveDetailConfiguration(targetId, columns, { label, baseId });
  renderDetailViewBar();
  if (state.tableRendered) renderTreeTable();
  closeDetailDesigner();
}

function handleDetailDesignerSave(){
  const draft = state.details.designerDraft;
  if (!draft) return;
  const nameInput = document.getElementById("detail-view-name");
  if (!nameInput) return;
  const name = limparTexto(nameInput.value || "");
  const columns = sanitizeDetailColumns(draft.columns);
  if (!columns.length) {
    state.details.designerMessage = "Adicione ao menos uma coluna antes de salvar.";
    updateDetailDesignerFeedback();
    return;
  }
  if (name.length < 3) {
    state.details.designerMessage = "Use um nome com pelo menos 3 caracteres.";
    updateDetailDesignerFeedback();
    return;
  }
  if ((state.details.savedViews || []).length >= DETAIL_MAX_CUSTOM_VIEWS) {
    state.details.designerMessage = "Limite de visões atingido. Remova uma visão antes de salvar outra.";
    updateDetailDesignerFeedback();
    return;
  }

  const view = createDetailView(columns, name);
  if (!view) {
    state.details.designerMessage = "Não foi possível salvar a visão.";
    updateDetailDesignerFeedback();
    return;
  }

  nameInput.value = "";
  state.details.designerDraft = {
    viewId: view.id,
    name: view.name,
    columns: [...view.columns],
    original: [...view.columns],
    modified: false,
  };
  state.details.designerMessage = "Visão salva com sucesso.";
  updateActiveDetailConfiguration(view.id, view.columns, { label: view.name });
  renderDetailViewBar();
  if (state.tableRendered) renderTreeTable();
  renderDetailDesigner();
}

function insertColumnIntoDesigner(colId, beforeId = null){
  const draft = state.details.designerDraft;
  if (!draft) return;
  const sanitized = sanitizeDetailColumns(draft.columns);
  let next = sanitized.filter(id => id !== colId);
  if (beforeId && next.includes(beforeId)) {
    next.splice(next.indexOf(beforeId), 0, colId);
  } else if (!next.includes(colId)) {
    next.push(colId);
  }
  draft.columns = [...next];
  draft.modified = !detailColumnsEqual(draft.columns, draft.original || []);
  state.details.designerMessage = "";
  renderDetailDesigner();
}

function removeColumnFromDesigner(colId){
  const draft = state.details.designerDraft;
  if (!draft) return;
  const sanitized = sanitizeDetailColumns(draft.columns);
  if (sanitized.length <= 1) {
    state.details.designerMessage = "Mantenha pelo menos uma coluna visível.";
    updateDetailDesignerFeedback();
    return;
  }
  const next = sanitized.filter(id => id !== colId);
  draft.columns = [...next];
  draft.modified = !detailColumnsEqual(draft.columns, draft.original || []);
  state.details.designerMessage = "";
  renderDetailDesigner();
}

function handleDetailDesignerDragStart(ev){
  const item = ev.currentTarget;
  const colId = item?.dataset.col;
  if (!colId) return;
  detailDesignerDragState = {
    colId,
    from: item.closest('[data-items]')?.dataset.items || "",
  };
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", colId);
  }
  item.classList.add("is-dragging");
}

function handleDetailDesignerDragEnd(ev){
  ev.currentTarget?.classList?.remove("is-dragging");
  detailDesignerDragState = null;
}

function handleDetailDesignerDragOver(ev){
  ev.preventDefault();
  const container = ev.currentTarget.closest('[data-items]');
  if (container) container.classList.add("is-drag-over");
}

function handleDetailDesignerDragLeave(ev){
  const container = ev.currentTarget.closest('[data-items]');
  if (container) container.classList.remove("is-drag-over");
}

function handleDetailDesignerDrop(ev){
  ev.preventDefault();
  const container = ev.currentTarget.closest('[data-items]');
  if (!container) return;
  container.classList.remove("is-drag-over");
  const colId = (ev.dataTransfer && ev.dataTransfer.getData("text/plain")) || detailDesignerDragState?.colId;
  if (!colId) return;
  const beforeItem = ev.target.closest(".detail-item");
  const beforeId = beforeItem?.dataset.col || null;
  if (container.dataset.items === "selected") {
    if (beforeId === colId) return;
    insertColumnIntoDesigner(colId, beforeId);
  } else {
    removeColumnFromDesigner(colId);
  }
}
function setActiveChip(viewId) {
  $$("#chipbar .chip").forEach(c => c.classList.toggle("is-active", c.dataset.view === viewId));
  if (viewId && viewId !== "contrato") {
    state.lastNonContractView = viewId;
  }
}

/* ===== Aqui eu mostro o resumo dos filtros aplicados para o usuário não se perder ===== */
function renderAppliedFilters() {
  const bar = $("#applied-bar"); if (!bar) return;
  const vals = getFilterValues();
  const items = [];

  const push = (k, v, resetFn) => {
    const chip = document.createElement("div");
    chip.className = "applied-chip";
    chip.innerHTML = `
      <span class="k">${k}</span>
      <span class="v">${v}</span>
      <button type="button" title="Limpar" class="applied-x" aria-label="Remover ${k}"><i class="ti ti-x"></i></button>`;
    chip.querySelector("button").addEventListener("click", async () => {
      await withSpinner(async () => {
        resetFn?.();
        applyFiltersAndRender();
        renderAppliedFilters();
        renderCampanhasView();
        if (state.activeView === "ranking") renderRanking();
      }, "Atualizando filtros…");
    });
    items.push(chip);
  };

  bar.innerHTML = "";

  if (vals.segmento && vals.segmento !== "Todos") push("Segmento", vals.segmento, () => $("#f-segmento").selectedIndex = 0);
  if (vals.diretoria && vals.diretoria !== "Todas") {
    const label = $("#f-diretoria")?.selectedOptions?.[0]?.text || vals.diretoria;
    push("Diretoria", label, () => $("#f-diretoria").selectedIndex = 0);
  }
  if (vals.gerencia && vals.gerencia !== "Todas") {
    const label = $("#f-gerencia")?.selectedOptions?.[0]?.text || vals.gerencia;
    push("Gerência", label, () => $("#f-gerencia").selectedIndex = 0);
  }
  if (vals.agencia && vals.agencia !== "Todas") {
    const label = $("#f-agencia")?.selectedOptions?.[0]?.text || vals.agencia;
    push("Agência", label, () => $("#f-agencia").selectedIndex = 0);
  }
  if (vals.ggestao && vals.ggestao !== "Todos") {
    const label = $("#f-ggestao")?.selectedOptions?.[0]?.text || labelGerenteGestao(vals.ggestao);
    push("Gerente de gestão", label, () => $("#f-ggestao").selectedIndex = 0);
  }
  if (vals.gerente && vals.gerente !== "Todos") {
    const label = $("#f-gerente")?.selectedOptions?.[0]?.text || labelGerente(vals.gerente);
    push("Gerente", label, () => $("#f-gerente").selectedIndex = 0);
  }
  if (vals.secaoId && vals.secaoId !== "Todas") {
    const secaoLabel = $("#f-secao")?.selectedOptions?.[0]?.text
      || getSectionLabel(vals.secaoId)
      || vals.secaoId;
    push("Família", secaoLabel, () => $("#f-secao").selectedIndex = 0);
  }
  if (vals.familiaId && vals.familiaId !== "Todas") {
    const familiaLabel = $("#f-familia")?.selectedOptions?.[0]?.text
      || INDICATOR_CARD_INDEX.get(vals.familiaId)?.nome
      || PRODUCT_INDEX.get(vals.familiaId)?.name
      || vals.familiaId;
    push("Indicador", familiaLabel, () => $("#f-familia").selectedIndex = 0);
  }
  if (vals.produtoId && vals.produtoId !== "Todos" && vals.produtoId !== "Todas") {
    const indicadorResolved = resolverIndicadorPorAlias(vals.familiaId) || vals.familiaId;
    const prodLabel = $("#f-produto")?.selectedOptions?.[0]?.text
      || resolveSubIndicatorLabel(indicadorResolved, vals.produtoId)
      || vals.produtoId;
    push("Subindicador", prodLabel, () => $("#f-produto").selectedIndex = 0);
  }
  if (vals.status && vals.status !== "todos") {
    const statusEntry = getStatusEntry(vals.status);
    const statusLabel = statusEntry?.nome
      || $("#f-status-kpi")?.selectedOptions?.[0]?.text
      || obterRotuloStatus(vals.status);
    push("Status", statusLabel, () => $("#f-status-kpi").selectedIndex = 0);
  }
  if (vals.visao && vals.visao !== "mensal") {
    const visaoEntry = ACCUMULATED_VIEW_OPTIONS.find(opt => opt.value === vals.visao);
    const visaoLabel = visaoEntry?.label || $("#f-visao")?.selectedOptions?.[0]?.text || vals.visao;
    push("Visão", visaoLabel, () => {
      const sel = $("#f-visao");
      if (sel) sel.value = "mensal";
      state.accumulatedView = "mensal";
      syncPeriodFromAccumulatedView("mensal");
    });
  }

  items.forEach(ch => bar.appendChild(ch));
}

const HIERARCHY_FIELDS_DEF = [
  { key: "segmento",  select: "#f-segmento",  defaultValue: "Todos", defaultLabel: "Todos",  idKey: "segmentoId",    labelKey: "segmentoNome",    fallback: () => SEGMENTOS_DATA },
  { key: "diretoria", select: "#f-diretoria", defaultValue: "Todas", defaultLabel: "Todas", idKey: "diretoriaId",   labelKey: "diretoriaNome",   fallback: () => RANKING_DIRECTORIAS },
  { key: "gerencia",  select: "#f-gerencia",  defaultValue: "Todas", defaultLabel: "Todas", idKey: "regionalId",    labelKey: "regionalNome",    fallback: () => RANKING_GERENCIAS },
  { key: "agencia",   select: "#f-agencia",   defaultValue: "Todas", defaultLabel: "Todas", idKey: "agenciaId",     labelKey: "agenciaNome",     fallback: () => RANKING_AGENCIAS },
  { key: "ggestao",   select: "#f-ggestao",   defaultValue: "Todos", defaultLabel: "Todos", idKey: "gerenteGestaoId", labelKey: "gerenteGestaoNome", fallback: () => GERENTES_GESTAO },
  { key: "gerente",   select: "#f-gerente",   defaultValue: "Todos", defaultLabel: "Todos", idKey: "gerenteId",      labelKey: "gerenteNome",      fallback: () => RANKING_GERENTES }
];
const HIERARCHY_FIELD_MAP = new Map(HIERARCHY_FIELDS_DEF.map(field => [field.key, field]));

function buildHierarchyFallbackRow(fieldKey, item) {
  const def = HIERARCHY_FIELD_MAP.get(fieldKey);
  if (!def) return null;
  const meta = resolveFallbackMeta(fieldKey, item) || {};
  const full = {};
  if (item && typeof item === "object") {
    Object.entries(item).forEach(([key, value]) => {
      if (value == null) return;
      full[key] = value;
    });
  }
  if (meta && typeof meta === "object") {
    Object.entries(meta).forEach(([key, value]) => {
      if (value == null) return;
      if (typeof value === "string" && !value.trim()) return;
      full[key] = value;
    });
  }

  const row = {
    segmentoId: full.segmentoId || full.segmento || "",
    segmentoNome: full.segmentoNome || full.segmento || "",
    segmentoLabel: full.segmentoLabel || full.label || full.rotulo || full.segmentoNome || full.segmento || "",
    segmentoNomeOriginal: full.segmentoNomeOriginal || full.segmentoNome || full.segmento || "",
    segmentoOrder: Number.isFinite(full.segmentoOrder) ? Number(full.segmentoOrder) : undefined,
    segmentoHidden: full.segmentoHidden,
    segmentoAliases: Array.isArray(full.segmentoAliases) ? [...full.segmentoAliases] : undefined,
    segmentoSlug: full.segmentoSlug,
    segmentoScenario: full.segmentoScenario,
    diretoriaId: full.diretoriaId || full.diretoria || "",
    diretoriaNome: full.diretoriaNome || full.diretoria || "",
    diretoriaLabel: full.diretoriaLabel || full.label || full.rotulo || full.diretoriaNome || full.diretoria || "",
    diretoriaNomeOriginal: full.diretoriaNomeOriginal || full.diretoriaNome || full.diretoria || "",
    regionalId: full.regionalId || full.regional || full.gerenciaId || full.gerencia || "",
    regionalNome: full.regionalNome || full.gerenciaNome || full.regional || "",
    regionalLabel: full.regionalLabel || full.label || full.rotulo || full.regionalNome || full.gerenciaNome || full.regional || "",
    regionalNomeOriginal: full.regionalNomeOriginal || full.regionalNome || full.regional || full.gerenciaNome || "",
    agenciaId: full.agenciaId || full.agencia || full.agenciaCodigo || "",
    agenciaNome: full.agenciaNome || full.agencia || "",
    agenciaLabel: full.agenciaLabel || full.label || full.rotulo || full.agenciaNome || full.agencia || "",
    agenciaCodigo: full.agenciaCodigo || full.codigo || "",
    gerenteGestaoId: full.gerenteGestaoId || full.gerenteGestao || "",
    gerenteGestaoNome: full.gerenteGestaoNome || full.nomeGerenteGestao || "",
    gerenteGestaoLabel: full.gerenteGestaoLabel || full.label || full.rotulo || full.gerenteGestaoNome || full.gerenteGestao || "",
    gerenteId: full.gerenteId || full.gerente || "",
    gerenteNome: full.gerenteNome || full.nomeGerente || "",
    gerenteLabel: full.gerenteLabel || full.label || full.rotulo || full.gerenteNome || full.gerente || "",
  };

  switch (fieldKey) {
    case "segmento":
      if (full.id) row.segmentoId = full.id;
      if (full.nome) row.segmentoNome = full.nome;
      if (full.label) row.segmentoLabel = full.label;
      break;
    case "diretoria":
      if (full.id) row.diretoriaId = full.id;
      if (full.nome) row.diretoriaNome = full.nome;
      if (full.label) row.diretoriaLabel = full.label;
      break;
    case "gerencia":
      if (full.id) row.regionalId = full.id;
      if (full.nome) row.regionalNome = full.nome;
      if (full.label) row.regionalLabel = full.label;
      break;
    case "agencia":
      if (full.id) row.agenciaId = full.id;
      if (full.nome) row.agenciaNome = full.nome;
      if (full.label) row.agenciaLabel = full.label;
      if (!row.agenciaCodigo) row.agenciaCodigo = row.agenciaId;
      break;
    case "ggestao":
      if (full.id) row.gerenteGestaoId = full.id;
      if (full.nome) row.gerenteGestaoNome = full.nome;
      if (full.label) row.gerenteGestaoLabel = full.label;
      if (!row.agenciaId && full.agencia) row.agenciaId = full.agencia;
      if (!row.agenciaNome && full.agenciaNome) row.agenciaNome = full.agenciaNome;
      break;
    case "gerente":
      if (full.id) row.gerenteId = full.id;
      if (full.nome) row.gerenteNome = full.nome;
      if (full.label) row.gerenteLabel = full.label;
      if (!row.gerenteGestaoId && full.gerenteGestao) row.gerenteGestaoId = full.gerenteGestao;
      if (!row.agenciaId && full.agencia) row.agenciaId = full.agencia;
      if (!row.agenciaNome && full.agenciaNome) row.agenciaNome = full.agenciaNome;
      break;
    default:
      break;
  }

  applyHierarchyFallbackToRow(row);

  const fallbackValue = row[def.idKey]
    || full[def.idKey]
    || full.id
    || full.value
    || full.codigo
    || "";
  const fallbackLabel = row[def.labelKey]
    || full[def.labelKey]
    || full.nome
    || full.name
    || full.label
    || fallbackValue;

  if (!row[def.idKey]) row[def.idKey] = fallbackValue;
  if (!row[def.labelKey]) row[def.labelKey] = fallbackLabel;

  const aliasSet = new Set();
  const addAlias = (val) => {
    if (val == null) return;
    if (Array.isArray(val)) { val.forEach(addAlias); return; }
    const clean = limparTexto(val);
    if (clean) aliasSet.add(clean);
  };
  addAlias(full.aliases);
  addAlias(full.alias);
  addAlias(full.apelidos);
  addAlias(full.slug);
  addAlias(full.codigo);
  addAlias(full.value);
  addAlias(full.id);
  if (item && typeof item === "object" && item !== full) addAlias(item.aliases);
  if (meta && typeof meta === "object" && meta !== full) addAlias(meta.aliases);

  const cleanValue = limparTexto(row[def.idKey]);
  const cleanLabel = limparTexto(row[def.labelKey]);
  const aliases = Array.from(aliasSet).filter(alias => alias && alias !== cleanValue && alias !== cleanLabel);
  if (aliases.length) {
    row[`${def.labelKey}Aliases`] = aliases;
    row[`${fieldKey}Aliases`] = aliases;
    if (!Array.isArray(row.aliases) || !row.aliases.length) row.aliases = aliases;
  }

  if (full.hidden != null) row.hidden = Boolean(full.hidden);
  if (Number.isFinite(full.order)) row.order = Number(full.order);
  if (full.slug) row.slug = full.slug;

  return row;
}

function buildHierarchyFallbackRows(fieldKey) {
  const def = HIERARCHY_FIELD_MAP.get(fieldKey);
  if (!def || typeof def.fallback !== "function") return [];
  const fallback = def.fallback();
  if (!Array.isArray(fallback) || !fallback.length) return [];
  const rows = [];
  fallback.forEach(item => {
    const row = buildHierarchyFallbackRow(fieldKey, item);
    if (row) rows.push(row);
  });
  return rows;
}

function resolveFallbackMeta(fieldKey, item = {}) {
  const base = item?.id ?? item?.value ?? item?.codigo ?? item?.nome ?? item?.name ?? item?.label;
  switch (fieldKey) {
    case "segmento":
      return findSegmentoMeta(base) || item;
    case "diretoria":
      return findDiretoriaMeta(base) || item;
    case "gerencia":
      return findGerenciaMeta(base) || item;
    case "agencia":
      return findAgenciaMeta(base) || item;
    case "ggestao":
      return findGerenteGestaoMeta(base) || item;
    case "gerente":
      return findGerenteMeta(base) || item;
    default:
      return item;
  }
}

function hierarchyDefaultSelection(){
  const defaults = {};
  HIERARCHY_FIELDS_DEF.forEach(field => { defaults[field.key] = field.defaultValue; });
  return defaults;
}

function getHierarchyRows(){
  if (Array.isArray(MESU_DATA) && MESU_DATA.length) return MESU_DATA;
  if (MESU_FALLBACK_ROWS.length) return MESU_FALLBACK_ROWS;

  const rows = [];
  const dirMap = new Map(RANKING_DIRECTORIAS.map(dir => [dir.id, dir]));
  const gerMap = new Map(RANKING_GERENCIAS.map(ger => [ger.id, ger]));
  const segMap = new Map(SEGMENTOS_DATA.map(seg => [seg.id || seg.nome, seg]));

  if (RANKING_AGENCIAS.length){
    RANKING_AGENCIAS.forEach(ag => {
      const gerMeta = gerMap.get(ag.gerencia) || {};
      const dirMeta = dirMap.get(gerMeta.diretoria) || {};
      const segKey = dirMeta.segmento || gerMeta.segmentoId || ag.segmento || ag.segmentoId || "";
      const segMeta = segMap.get(segKey) || {};
      const ggMeta = GERENTES_GESTAO.find(gg => gg.agencia === ag.id) || {};
      const gerenteMeta = RANKING_GERENTES.find(ge => ge.agencia === ag.id) || {};
      rows.push({
        segmentoId: segMeta.id || segMeta.nome || segKey || "",
        segmentoNome: segMeta.nome || segMeta.id || segKey || "",
        segmentoOrder: Number.isFinite(segMeta.order) ? Number(segMeta.order) : undefined,
        segmentoHidden: segMeta.hidden,
        segmentoAliases: Array.isArray(segMeta.aliases) ? [...segMeta.aliases] : undefined,
        segmentoSlug: segMeta.slug,
        diretoriaId: dirMeta.id || dirMeta.nome || "",
        diretoriaNome: dirMeta.nome || dirMeta.id || dirMeta.segmento || "",
        regionalId: gerMeta.id || gerMeta.nome || "",
        regionalNome: gerMeta.nome || gerMeta.id || "",
        agenciaId: ag.id,
        agenciaNome: ag.nome || ag.id,
        gerenteGestaoId: ggMeta.id || "",
        gerenteGestaoNome: ggMeta.nome || ggMeta.id || "",
        gerenteId: gerenteMeta.id || "",
        gerenteNome: gerenteMeta.nome || gerenteMeta.id || "",
      });
    });
  }

  if (!rows.length){
    rows.push({
      segmentoId: "",
      segmentoNome: "",
      diretoriaId: "",
      diretoriaNome: "",
      regionalId: "",
      regionalNome: "",
      agenciaId: "",
      agenciaNome: "",
      gerenteGestaoId: "",
      gerenteGestaoNome: "",
      gerenteId: "",
      gerenteNome: "",
    });
  }

  MESU_FALLBACK_ROWS = rows;
  return rows;
}

function getHierarchySelectionFromDOM(){
  const values = hierarchyDefaultSelection();
  HIERARCHY_FIELDS_DEF.forEach(field => {
    const select = $(field.select);
    if (!select) return;
    const value = limparTexto(select.value);
    values[field.key] = value || field.defaultValue;
  });
  return values;
}

function hierarchyRowMatchesField(row, field, value){
  if (!field) return true;
  const def = HIERARCHY_FIELD_MAP.get(field);
  if (!def) return true;
  if (selecaoPadrao(value) || value === def.defaultValue) return true;
  const rowId = limparTexto(row[def.idKey]);
  const rowLabel = limparTexto(row[def.labelKey]);
  if (field === "segmento") {
    return matchesSegmentFilter(value, rowId, rowLabel);
  }
  return matchesSelection(value, rowId, rowLabel);
}

function filterHierarchyRowsForField(targetField, selection, rows){
  return rows.filter(row => HIERARCHY_FIELDS_DEF.every(field => {
    if (field.key === targetField) return true;
    return hierarchyRowMatchesField(row, field.key, selection[field.key]);
  }));
}

function buildHierarchyOptions(fieldKey, selection, rows){
  const def = HIERARCHY_FIELD_MAP.get(fieldKey);
  if (!def) return [];
  const fallbackRows = buildHierarchyFallbackRows(fieldKey);
  const hasDimensionPreset = Array.isArray(DIMENSION_FILTER_OPTIONS[fieldKey])
    && DIMENSION_FILTER_OPTIONS[fieldKey].length > 0;
  const sourceRows = Array.isArray(rows)
    ? (fallbackRows.length ? rows.concat(fallbackRows) : rows)
    : fallbackRows;
  const filtered = filterHierarchyRowsForField(fieldKey, selection, sourceRows);
  const dimensionOptionMap = new Map(
    (DIMENSION_FILTER_OPTIONS[fieldKey] || [])
      .map(opt => normOpt(opt))
      .filter(opt => opt.id)
      .map(opt => [limparTexto(opt.id), opt.label])
  );
  const candidateOptions = filtered.map(row => {
    const rawId = row[def.idKey]
      ?? row[`${fieldKey}Id`]
      ?? row.id
      ?? row.value
      ?? row.codigo;
    const normalizedId = limparTexto(rawId);
    const labelSource = dimensionOptionMap.get(normalizedId)
      || limparTexto(row[`${fieldKey}Label`])
      || limparTexto(row[`${def.labelKey}Label`])
      || limparTexto(row.label)
      || limparTexto(row[def.labelKey])
      || limparTexto(row.nome)
      || normalizedId;
    return normOpt({ id: normalizedId, label: labelSource });
  });
  const uniqueOptions = uniqById(candidateOptions);
  const orderById = new Map();
  uniqueOptions.forEach((opt, idx) => {
    const id = limparTexto(opt.id);
    if (id) orderById.set(id, idx);
  });
  const labelIndex = new Map();
  const valueIndex = new Map();
  const options = [];

  const mergeEntry = (entry, safeValue, safeLabel, meta = {}) => {
    if (!entry) return entry;
    if (safeLabel && entry.label !== safeLabel) {
      if (entry.label && entry.label !== safeLabel && !entry.aliases.includes(entry.label)) {
        entry.aliases.push(entry.label);
      }
      entry.label = safeLabel;
    }
    if (safeValue && safeValue !== entry.value && !entry.aliases.includes(safeValue)) {
      entry.aliases.push(safeValue);
    }
    if (Array.isArray(meta.aliases)) {
      meta.aliases.forEach(alias => {
        const clean = limparTexto(alias);
        if (clean && !entry.aliases.includes(clean)) entry.aliases.push(clean);
      });
    }
    if (meta.hidden != null && entry.hidden == null) entry.hidden = Boolean(meta.hidden);
    if (meta.slug && !entry.slug) entry.slug = meta.slug;
    if (Number.isFinite(meta.order)) {
      const order = Number(meta.order);
      if (!Number.isFinite(entry.order) || order < entry.order) entry.order = order;
    } else if (safeValue && orderById.has(safeValue) && !Number.isFinite(entry.order)) {
      entry.order = orderById.get(safeValue);
    }
    return entry;
  };

  const register = (value, label, meta = {}) => {
    const safeLabel = limparTexto(label) || limparTexto(value);
    const safeValue = limparTexto(value);
    if (!safeLabel && !safeValue) return null;
    if (safeValue && valueIndex.has(safeValue)) {
      return mergeEntry(valueIndex.get(safeValue), safeValue, safeLabel, meta);
    }
    const key = simplificarTexto(safeLabel || safeValue);
    if (labelIndex.has(key)) {
      const existing = labelIndex.get(key);
      const merged = mergeEntry(existing, safeValue, safeLabel, meta);
      if (safeValue && merged) valueIndex.set(safeValue, merged);
      return merged;
    }
    if (!safeValue) return null;
    const optionValue = safeValue || safeLabel;
    const entry = {
      value: optionValue,
      label: safeLabel || optionValue,
      aliases: [],
    };
    if (safeLabel && safeLabel !== optionValue && !entry.aliases.includes(safeLabel)) entry.aliases.push(safeLabel);
    if (safeValue && safeValue !== optionValue && !entry.aliases.includes(safeValue)) entry.aliases.push(safeValue);
    if (Array.isArray(meta.aliases)) {
      meta.aliases.forEach(alias => {
        const clean = limparTexto(alias);
        if (clean && !entry.aliases.includes(clean)) entry.aliases.push(clean);
      });
    }
    if (meta.hidden != null) entry.hidden = Boolean(meta.hidden);
    if (meta.slug) entry.slug = meta.slug;
    if (Number.isFinite(meta.order)) entry.order = Number(meta.order);
    else if (safeValue && orderById.has(safeValue)) entry.order = orderById.get(safeValue);
    labelIndex.set(key, entry);
    valueIndex.set(safeValue, entry);
    options.push(entry);
    return entry;
  };

  const comboFieldsWithConcat = new Set(["segmento", "diretoria", "gerencia", "agencia"]);

  filtered.forEach(row => {
    const valueCandidates = [
      row[def.idKey],
      row[`${fieldKey}Id`],
      row.id,
      row.value,
      row.codigo,
      row[def.labelKey]
    ];
    const labelCandidates = [
      row[`${fieldKey}Label`],
      row[`${def.labelKey}Label`],
      row.label,
      row.nome,
      row[def.labelKey],
      row[def.idKey]
    ];
    const rawValue = valueCandidates.find(candidate => limparTexto(candidate)) || valueCandidates[0];
    const rawLabel = labelCandidates.find(candidate => limparTexto(candidate)) || labelCandidates[0] || rawValue;
    const aliasCandidates = [];
    [
      `${def.labelKey}Aliases`,
      `${fieldKey}Aliases`,
      `${def.labelKey}Alias`,
      `${fieldKey}Alias`
    ].forEach(key => {
      const data = row[key];
      if (Array.isArray(data)) aliasCandidates.push(...data);
      else if (typeof data === "string" && data) aliasCandidates.push(data);
    });
    const cleanValue = limparTexto(rawValue);
    const cleanLabel = limparTexto(rawLabel);
    const explicitLabel = limparTexto(row[`${fieldKey}Label`]) || limparTexto(row[`${def.labelKey}Label`]);
    const idForLabel = limparTexto(row[def.idKey] || row[`${fieldKey}Id`]);
    const nameForLabel = limparTexto(row[`${fieldKey}NomeOriginal`])
      || limparTexto(row[`${def.labelKey}NomeOriginal`])
      || limparTexto(row[`${fieldKey}Nome`])
      || limparTexto(row[def.labelKey])
      || limparTexto(row.nome);
    const dimensionLabel = cleanValue ? dimensionOptionMap.get(cleanValue) : undefined;
    let displayLabel = dimensionLabel || explicitLabel || cleanLabel || cleanValue;
    if (!explicitLabel && comboFieldsWithConcat.has(fieldKey) && idForLabel && nameForLabel && idForLabel !== nameForLabel) {
      displayLabel = `${idForLabel} - ${nameForLabel}`;
      aliasCandidates.push(nameForLabel);
    }
    if (cleanLabel) aliasCandidates.push(cleanLabel);
    if (cleanValue) aliasCandidates.push(cleanValue);
    if (explicitLabel) aliasCandidates.push(explicitLabel);
    if (dimensionLabel) aliasCandidates.push(dimensionLabel);
    if (hasDimensionPreset && !cleanValue) {
      return;
    }

    const meta = fieldKey === "segmento"
      ? {
          order: row.segmentoOrder ?? row.order,
          hidden: row.segmentoHidden ?? row.hidden,
          aliases: row.segmentoAliases ?? row.aliases,
          slug: row.segmentoSlug ?? row.slug
        }
      : {};
    if (aliasCandidates.length) {
      const normalized = aliasCandidates
        .map(alias => limparTexto(alias))
        .filter(alias => alias && alias !== cleanLabel && alias !== cleanValue);
      if (normalized.length) {
        meta.aliases = Array.from(new Set(normalized));
      }
    }
    if (meta.aliases && !meta.aliases.length) delete meta.aliases;
    if (row.hidden != null && meta.hidden == null) meta.hidden = Boolean(row.hidden);
    if (Number.isFinite(row.order) && !Number.isFinite(meta.order)) meta.order = Number(row.order);
    if (row.slug && !meta.slug) meta.slug = row.slug;
    register(cleanValue || rawValue, displayLabel || cleanLabel || cleanValue, meta);
  });

  if (!options.length && hasDimensionPreset) {
    DIMENSION_FILTER_OPTIONS[fieldKey].forEach(opt => {
      const normalized = normOpt(opt);
      if (!normalized.id) return;
      register(normalized.id, normalized.label);
    });
  }

  const hasOrder = options.some(opt => Number.isFinite(opt.order));
  options.sort((a, b) => {
    if (hasOrder) {
      const orderA = Number.isFinite(a.order) ? Number(a.order) : Number.POSITIVE_INFINITY;
      const orderB = Number.isFinite(b.order) ? Number(b.order) : Number.POSITIVE_INFINITY;
      if (orderA !== orderB) return orderA - orderB;
    }
    return String(a.label || "").localeCompare(String(b.label || ""), "pt-BR", { sensitivity: "base" });
  });

  const visibleOptions = options.filter(opt => !opt.hidden);
  const defaultEntry = {
    value: def.defaultValue,
    label: def.defaultLabel,
    aliases: [def.defaultValue]
  };
  return [defaultEntry].concat(visibleOptions);
}

function setSelectOptions(select, options, desiredValue, defaultValue){
  const current = limparTexto(desiredValue);
  select.innerHTML = "";
  let chosen = null;
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
    if (!chosen && optionMatchesValue(opt, current)) {
      chosen = opt;
    }
  });
  if (!chosen) {
    chosen = options.find(opt => optionMatchesValue(opt, defaultValue)) || options[0] || null;
  }
  const nextValue = chosen ? chosen.value : "";
  select.value = nextValue;
  if (select.value !== nextValue) {
    select.selectedIndex = 0;
  }
  if (select.dataset.search === "true") {
    ensureSelectSearch(select);
    storeSelectSearchOptions(select, options);
    syncSelectSearchInput(select);
  }
  return select.value || nextValue;
}

function ensureSelectSearchGlobalListeners(){
  if (SELECT_SEARCH_GLOBAL_LISTENERS) return;
  document.addEventListener("click", (ev) => {
    SELECT_SEARCH_REGISTRY.forEach(data => {
      if (data.wrapper?.contains(ev.target)) return;
      if (typeof data.hidePanel === "function") data.hidePanel();
    });
  });
  SELECT_SEARCH_GLOBAL_LISTENERS = true;
}

function ensureSelectSearch(select){
  if (!select || select.dataset.searchBound === "1" || select.dataset.search !== "true") return;
  const group = select.closest(".filters__group");
  if (!group) return;
  const labelText = limparTexto(group.querySelector("label")?.textContent) || "opção";
  const wrapper = document.createElement("div");
  wrapper.className = "select-search";
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);

  const panel = document.createElement("div");
  panel.className = "select-search__panel";
  panel.setAttribute("role", "listbox");
  panel.setAttribute("aria-label", `Sugestões de ${labelText}`);
  panel.hidden = true;
  panel.innerHTML = `
    <div class="select-search__box">
      <input type="search" class="input input--xs select-search__input" placeholder="Pesquisar ${labelText.toLowerCase()}" aria-label="Pesquisar ${labelText}">
    </div>
    <div class="select-search__results"></div>`;
  wrapper.appendChild(panel);

  const input = panel.querySelector("input");
  const list = panel.querySelector(".select-search__results");
  const hidePanel = () => {
    panel.hidden = true;
    wrapper.classList.remove("is-open");
  };
  const showPanel = () => {
    panel.hidden = false;
    wrapper.classList.add("is-open");
    updateSelectSearchResults(select, { limit: 12, forceAll: true });
    window.requestAnimationFrame(() => input.focus());
  };

  const data = { select, input, panel, list, options: [], wrapper, hidePanel, showPanel };
  SELECT_SEARCH_DATA.set(select, data);
  SELECT_SEARCH_REGISTRY.add(data);
  ensureSelectSearchGlobalListeners();

  input.addEventListener("input", () => updateSelectSearchResults(select));
  input.addEventListener("focus", () => updateSelectSearchResults(select));
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      input.value = "";
      hidePanel();
    }
    if (ev.key === "Enter") {
      const first = list.querySelector(".select-search__item");
      if (first) {
        ev.preventDefault();
        first.click();
      }
    }
  });
  input.addEventListener("blur", () => setTimeout(hidePanel, 120));

  panel.addEventListener("mousedown", (ev) => ev.preventDefault());
  panel.addEventListener("click", (ev) => {
    const item = ev.target.closest(".select-search__item");
    if (!item) return;
    ev.preventDefault();
    aplicarSelecaoBusca(select, item.dataset.value || item.getAttribute("data-value") || "");
    hidePanel();
  });

  select.addEventListener("mousedown", (ev) => {
    ev.preventDefault();
    if (panel.hidden) showPanel(); else hidePanel();
  });
  select.addEventListener("keydown", (ev) => {
    if (["ArrowDown", "ArrowUp", " ", "Enter"].includes(ev.key)) {
      ev.preventDefault();
      showPanel();
    }
  });
  select.addEventListener("change", () => {
    const meta = SELECT_SEARCH_DATA.get(select);
    if (!meta) return;
    meta.input.value = "";
    meta.hidePanel();
  });

  select.dataset.searchBound = "1";
}

function storeSelectSearchOptions(select, options){
  const data = SELECT_SEARCH_DATA.get(select);
  if (!data) return;
  data.options = options.map(opt => ({
    value: opt.value,
    label: opt.label,
    aliases: Array.isArray(opt.aliases) ? opt.aliases.map(item => limparTexto(item)) : []
  }));
  if (data.list) data.list.innerHTML = "";
  if (typeof data.hidePanel === "function") data.hidePanel();
}

function syncSelectSearchInput(select){
  const data = SELECT_SEARCH_DATA.get(select);
  if (!data) return;
  data.input.value = "";
  if (typeof data.hidePanel === "function") data.hidePanel();
}

function updateSelectSearchResults(select, opts = {}){
  const data = SELECT_SEARCH_DATA.get(select);
  if (!data) return;
  const { input, panel, list, options } = data;
  if (!options || !options.length) {
    panel.hidden = true;
    if (list) list.innerHTML = "";
    return;
  }
  const term = simplificarTexto(input.value);
  const base = options.slice();
  const matches = base.filter(opt => {
    if (!term) return true;
    if (simplificarTexto(opt.label).includes(term)) return true;
    return (opt.aliases || []).some(alias => simplificarTexto(alias).includes(term));
  });
  const selected = term ? matches : matches.slice(0, 10);
  const finalList = selected.slice(0, 10);
  if (!finalList.length) {
    if (!term) {
      panel.hidden = true;
      if (list) list.innerHTML = "";
      return;
    }
    if (list) list.innerHTML = `<div class="select-search__empty">Nenhum resultado encontrado</div>`;
    panel.hidden = false;
    return;
  }
  const limit = Number.isFinite(opts.limit) ? opts.limit : 10;
  const rows = finalList.slice(0, limit).map(opt => `<button type="button" class="select-search__item" data-value="${escapeHTML(opt.value)}">${escapeHTML(opt.label)}</button>`).join("\n");
  if (list) list.innerHTML = rows;
  panel.hidden = false;
}

function aplicarSelecaoBusca(select, rawValue){
  const data = SELECT_SEARCH_DATA.get(select);
  if (!data) return;
  const options = data.options || [];
  const match = options.find(opt => optionMatchesValue(opt, rawValue));
  const targetValue = match ? match.value : rawValue;
  select.value = targetValue;
  if (select.value !== targetValue) {
    const fallback = options.find(opt => opt.value === targetValue);
    if (!fallback) select.selectedIndex = 0;
  }
  data.input.value = "";
  if (typeof data.hidePanel === "function") data.hidePanel();
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function refreshHierarchyCombos(opts = {}){
  const rows = getHierarchyRows();
  const baseSelection = { ...hierarchyDefaultSelection(), ...getHierarchySelectionFromDOM(), ...(opts.selection || {}) };
  const result = { ...baseSelection };
  HIERARCHY_FIELDS_DEF.forEach(field => {
    const select = $(field.select);
    if (!select) return;
    const options = buildHierarchyOptions(field.key, result, rows);
    const chosen = setSelectOptions(select, options, result[field.key], field.defaultValue);
    result[field.key] = chosen;
  });
  return result;
}

function adjustHierarchySelection(selection, changedField){
  const def = HIERARCHY_FIELD_MAP.get(changedField);
  if (!def) return selection;
  const value = limparTexto(selection[changedField]);
  const effective = value || def.defaultValue;
  selection[changedField] = effective;

  const setIf = (key, next) => {
    if (!next) return;
    const meta = HIERARCHY_FIELD_MAP.get(key);
    const normalized = limparTexto(next);
    if (!meta) return;
    selection[key] = normalized || meta.defaultValue;
  };

  if (changedField === "agencia" && effective !== def.defaultValue){
    const meta = findAgenciaMeta(effective) || {};
    setIf("gerencia", meta.gerencia || meta.regionalId || meta.regional);
    setIf("diretoria", meta.diretoria || meta.diretoriaId);
    setIf("segmento", meta.segmento || meta.segmentoId);
  }

  if (changedField === "gerencia" && effective !== def.defaultValue){
    const meta = findGerenciaMeta(effective) || {};
    setIf("diretoria", meta.diretoria);
    setIf("segmento", meta.segmentoId);
  }

  if (changedField === "diretoria" && effective !== def.defaultValue){
    const meta = findDiretoriaMeta(effective) || {};
    setIf("segmento", meta.segmento);
  }

  if (changedField === "ggestao" && effective !== def.defaultValue){
    const meta = findGerenteGestaoMeta(effective) || {};
    setIf("agencia", meta.agencia);
    setIf("gerencia", meta.gerencia);
    setIf("diretoria", meta.diretoria);
    const agMeta = meta.agencia ? (findAgenciaMeta(meta.agencia) || {}) : {};
    setIf("segmento", agMeta.segmento || agMeta.segmentoId);
  }

  if (changedField === "gerente" && effective !== def.defaultValue){
    const meta = findGerenteMeta(effective) || {};
    setIf("agencia", meta.agencia);
    setIf("gerencia", meta.gerencia);
    setIf("diretoria", meta.diretoria);
    const agMeta = meta.agencia ? (findAgenciaMeta(meta.agencia) || {}) : {};
    setIf("segmento", agMeta.segmento || agMeta.segmentoId);
  }

  return selection;
}

function handleHierarchySelectionChange(changedField){
  const selection = adjustHierarchySelection(getHierarchySelectionFromDOM(), changedField);
  refreshHierarchyCombos({ selection });
}

/* ===== Aqui eu organizo os filtros superiores (diretoria, agência etc.) ===== */
function ensureSegmentoField() {
  if ($("#f-segmento")) return;
  const filters = $(".filters");
  if (!filters) return;
  const actions = filters.querySelector(".filters__actions");
  const wrap = document.createElement("div");
  wrap.className = "filters__group";
  wrap.innerHTML = `<label>Segmento</label><select id="f-segmento" class="input"></select>`;
  filters.insertBefore(wrap, actions);
}
function getFilterValues() {
  const val = (sel) => $(sel)?.value || "";
  const statusSelect = $("#f-status-kpi");
  const statusOption = statusSelect?.selectedOptions?.[0] || null;
  const statusKey = statusOption?.dataset.statusKey || normalizarChaveStatus(statusSelect?.value) || (statusSelect?.value || "");
  const statusCodigo = statusOption?.dataset.statusCodigo || statusOption?.value || "";
  const statusId = statusOption?.dataset.statusId || statusCodigo || "";
  return {
    segmento: val("#f-segmento"),
    diretoria: val("#f-diretoria"),
    gerencia:  val("#f-gerencia"),
    agencia:   val("#f-agencia"),
    ggestao:   val("#f-ggestao"),
    gerente:   val("#f-gerente"),
    secaoId:   val("#f-secao"),
    familiaId: val("#f-familia"),
    produtoId: val("#f-produto"),
    indicadorId: val("#f-familia"),
    subindicadorId: val("#f-produto"),
    status:    statusKey || "todos",
    statusCodigo,
    statusId,
    visao:     val("#f-visao") || state.accumulatedView || "mensal",
  };
}

/* ===== Aqui eu construo a busca por contrato com autocomplete ===== */
function rowMatchesSearch(r, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  const contracts = ensureContracts(r);
  return contracts.some(c => (c.id || "").toLowerCase().includes(t));
}

/* ===== Aqui eu aplico o filtro base que decide o que aparece em cada visão ===== */
function filterRowsExcept(rows, except = {}, opts = {}) {
  const f = getFilterValues();
  const {
    searchTerm: searchRaw = "",
    dateStart,
    dateEnd,
    ignoreDate = false,
  } = opts;
  const searchTerm = searchRaw.trim();
  const startISO = ignoreDate ? "" : (dateStart ?? state.period.start);
  const endISO = ignoreDate ? "" : (dateEnd ?? state.period.end);

  return rows.filter(r => {
    const okSeg = selecaoPadrao(f.segmento) || matchesSegmentFilter(f.segmento, r.segmento, r.segmentoId, r.segmentoNome);
    const okDR  = (except.diretoria) || selecaoPadrao(f.diretoria) || matchesSelection(f.diretoria, r.diretoria, r.diretoriaNome);
    const okGR  = (except.gerencia)  || selecaoPadrao(f.gerencia)  || matchesSelection(f.gerencia, r.gerenciaRegional, r.gerenciaNome, r.regional);
    const okAg  = (except.agencia)   || selecaoPadrao(f.agencia)   || matchesSelection(f.agencia, r.agencia, r.agenciaNome, r.agenciaCodigo);
    const okGG  = (except.gerenteGestao)
      || selecaoPadrao(f.ggestao)
      || matchesSelection(
        f.ggestao,
        r.gerente_gestao_id,
        r.gerenteGestaoId,
        r.gerenteGestao,
        r.gerenteGestaoNome,
        r.gerenteGestaoLabel
      );
    const okGer = (except.gerente)
      || selecaoPadrao(f.gerente)
      || matchesSelection(
        f.gerente,
        r.gerente_id,
        r.gerenteId,
        r.gerente,
        r.gerenteNome,
        r.gerenteLabel
      );
    const familiaMetaRow = r.produtoId ? PRODUTO_TO_FAMILIA.get(r.produtoId) : null;
    const rowSecaoId = r.secaoId
      || familiaMetaRow?.secaoId
      || (r.produtoId ? PRODUCT_INDEX.get(r.produtoId)?.sectionId : "")
      || (SECTION_IDS.has(r.familiaId) ? r.familiaId : "");
    const okSec = selecaoPadrao(f.secaoId) || matchesSelection(f.secaoId, rowSecaoId, r.secaoId, r.secaoNome, r.secao, getSectionLabel(rowSecaoId));
    const okIndicador = selecaoPadrao(f.familiaId)
      || matchesSelection(f.familiaId,
        r.produtoId,
        r.indicadorId,
        r.produto,
        r.produtoNome,
        r.ds_indicador,
        r.indicadorNome);
    const okSub = selecaoPadrao(f.produtoId)
      || matchesSelection(f.produtoId,
        r.subIndicadorId,
        r.subIndicador,
        r.subIndicadorNome,
        r.subproduto,
        r.prodOrSub,
        r.linhaProdutoId,
        r.linhaProdutoNome);
    let rowDate = r.data || r.competencia || "";
    if (rowDate && typeof rowDate !== "string") {
      if (rowDate instanceof Date) {
        rowDate = isoFromUTCDate(rowDate);
      } else {
        rowDate = String(rowDate);
      }
    }
    const okDt  = (!startISO || !rowDate || rowDate >= startISO) && (!endISO || !rowDate || rowDate <= endISO);

    const ating = r.meta ? (r.realizado / r.meta) : 0;
    const statusKey = normalizarChaveStatus(f.status) || "todos";
    let okStatus = true;
    if (statusKey === "atingidos") {
      okStatus = ating >= 1;
    } else if (statusKey === "nao") {
      okStatus = ating < 1;
    }

    const okSearch = rowMatchesSearch(r, searchTerm);

    return okSeg && okDR && okGR && okAg && okGG && okGer && okSec && okIndicador && okSub && okDt && okStatus && okSearch;
  });
}
function filterRows(rows) { return filterRowsExcept(rows, {}, { searchTerm: state.tableSearchTerm }); }

function autoSnapViewToFilters() {
  if (state.tableSearchTerm) return;
  const f = getFilterValues();
  let snap = null;
  if (f.produtoId && f.produtoId !== "Todos" && f.produtoId !== "Todas") snap = "prodsub";
  else if (f.familiaId && f.familiaId !== "Todas") snap = "familia";
  else if (f.secaoId && f.secaoId !== "Todas") snap = "secao";
  else if (f.gerente && f.gerente !== "Todos") snap = "gerente";
  else if (f.gerencia && f.gerencia !== "Todas") snap = "gerencia";
  else if (f.diretoria && f.diretoria !== "Todas") snap = "diretoria";
  if (snap && state.tableView !== snap) { state.tableView = snap; setActiveChip(snap); }
}

/* ===== Aqui eu monto a árvore da tabela detalhada ===== */
function hydrateDetailContract(raw = {}, fallback = {}) {
  const detail = { ...raw };
  const fallbackId = fallback && (fallback.contratoId || fallback.id || fallback.registroId || "");
  const resolvedId = limparTexto(detail.id || detail.contratoId || detail.contrato || fallbackId);
  detail.id = resolvedId || `CT-${String(Math.random()).slice(2, 8)}`;
  detail.registroId = limparTexto(detail.registroId || fallback.registroId || "");
  detail.produtoId = detail.produtoId || detail.indicadorId || detail.id_indicador || fallback.produtoId || fallback.indicadorId || "";
  detail.produtoNome = detail.produtoNome || detail.produto || detail.ds_indicador || fallback.produtoNome || detail.produtoId;
  detail.produto = detail.produtoNome;
  detail.subproduto = detail.subproduto || detail.subIndicadorNome || detail.subIndicador || fallback.subproduto || "";
  detail.prodOrSub = detail.prodOrSub || detail.subproduto || fallback.prodOrSub || detail.produtoNome || detail.produtoId;
  const qtdValor = toNumber(detail.qtd ?? detail.quantidade);
  detail.qtd = Number.isFinite(qtdValor) && qtdValor > 0 ? qtdValor : 1;
  const realValor = toNumber(detail.realizado ?? detail.valorRealizado);
  detail.realizado = Number.isFinite(realValor) ? realValor : 0;
  const metaValor = toNumber(detail.meta ?? detail.valorMeta);
  detail.meta = Number.isFinite(metaValor) ? metaValor : 0;
  detail.ating = detail.meta ? (detail.realizado / detail.meta) : 0;
  const pesoValor = toNumber(detail.peso ?? detail.pontosMeta);
  detail.peso = Number.isFinite(pesoValor) ? pesoValor : toNumber(fallback.peso) || 0;
  const pontosBrutos = toNumber(detail.pontos ?? detail.pontosBrutos);
  detail.pontos = Number.isFinite(pontosBrutos) && pontosBrutos > 0
    ? pontosBrutos
    : Math.max(0, Math.min(detail.peso, detail.peso * detail.ating));
  detail.pontosBrutos = detail.pontos;
  detail.pontosMeta = detail.peso;
  detail.data = detail.data || detail.dataMovimento || fallback.data || fallback.competencia || detail.competencia || "";
  detail.competencia = detail.competencia || (detail.data ? `${detail.data.slice(0, 7)}-01` : fallback.competencia || detail.data);
  detail.canalVenda = detail.canalVenda || fallback.canalVenda || "";
  detail.tipoVenda = detail.tipoVenda || fallback.tipoVenda || "";
  detail.modalidadePagamento = detail.modalidadePagamento || fallback.modalidadePagamento || "";
  detail.gerente = detail.gerente || detail.gerenteNome || fallback.gerenteNome || fallback.gerente || "";
  detail.gerenteNome = detail.gerenteNome || detail.gerente;
  detail.gerenteGestao = detail.gerenteGestao || detail.gerenteGestaoId || fallback.gerenteGestao || fallback.gerenteGestaoId || "";
  detail.gerenteGestaoNome = detail.gerenteGestaoNome || fallback.gerenteGestaoNome || "";
  detail.carteira = detail.carteira || fallback.carteira || "";
  detail.statusId = detail.statusId || detail.status || fallback.statusId || "";
  return detail;
}

function ensureContracts(r) {
  if (!r) return [];
  if (r._contracts) return r._contracts;
  const registroKey = limparTexto(r.registroId || r.registro_id || r.registro);
  if (registroKey && DETAIL_BY_REGISTRO.has(registroKey)) {
    const hydrated = DETAIL_BY_REGISTRO.get(registroKey).map(item => hydrateDetailContract(item, r));
    r._contracts = hydrated;
    return hydrated;
  }

  const n = 2 + Math.floor(Math.random() * 3);
  const arr = [];
  const periodYear = Number((state.period?.start || todayISO()).slice(0,4)) || new Date().getFullYear();
  const totalPeso = Math.max(0, toNumber(r.peso ?? r.pontosMeta ?? 0));
  const totalPontos = Math.max(0, toNumber(r.pontosBrutos ?? r.pontos ?? r.pontosCumpridos ?? 0));
  let pesoDistribuido = 0;
  let pontosDistribuidos = 0;
  for (let i = 0; i < n; i++) {
    const id = `CT-${periodYear}-${String(Math.floor(1e6 + Math.random() * 9e6)).padStart(7, "0")}`;
    const valor = Math.round((r.realizado / n) * (0.6 + Math.random() * 0.9));
    const meta  = Math.round((r.meta       / n) * (0.6 + Math.random() * 0.9));
    const sp = r.subproduto || r.produto;
    const canalVenda = r.canalVenda || (Math.random() > .5 ? "Agência física" : "Digital");
    const tipoVenda = r.tipoVenda || (Math.random() > .5 ? "Venda consultiva" : "Venda direta");
    const modalidadePagamento = r.modalidadePagamento || (Math.random() > .5 ? "À vista" : "Parcelado");
    const baseISO = r.data || todayISO();
    const baseDateUTC = dateUTCFromISO(baseISO);
    const dueDateUTC = new Date(baseDateUTC);
    dueDateUTC.setUTCDate(dueDateUTC.getUTCDate() + 10 + Math.floor(Math.random() * 25));
    const dataVencimento = isoFromUTCDate(dueDateUTC);
    let dataCancelamento = "";
    let motivoCancelamento = "";
    if (Math.random() < 0.25) {
      const cancelDateUTC = new Date(dueDateUTC);
      cancelDateUTC.setUTCDate(cancelDateUTC.getUTCDate() - Math.floor(Math.random() * 6));
      dataCancelamento = isoFromUTCDate(cancelDateUTC);
      motivoCancelamento = MOTIVOS_CANCELAMENTO[Math.floor(Math.random() * MOTIVOS_CANCELAMENTO.length)];
    }
    const restantes = n - i;
    const pesoShare = restantes === 1 ? Math.max(0, totalPeso - pesoDistribuido) : (totalPeso / n);
    pesoDistribuido += pesoShare;
    const pontosShareBrutos = restantes === 1 ? Math.max(0, totalPontos - pontosDistribuidos) : (totalPontos / n);
    pontosDistribuidos += pontosShareBrutos;
    const pontosShare = Math.max(0, Math.min(pesoShare, pontosShareBrutos));
    arr.push({
      id,
      produto: r.produto,
      subproduto: r.subproduto || "",
      prodOrSub: sp,
      qtd: 1,
      realizado: valor,
      meta,
      ating: meta ? (valor / meta) : 0,
      data: r.data,
      peso: pesoShare,
      pontosMeta: pesoShare,
      pontos: pontosShare,
      pontosBrutos: pontosShareBrutos,
      canalVenda,
      tipoVenda,
      modalidadePagamento,
      gerente: r.gerenteNome || r.gerente,
      dataVencimento,
      dataCancelamento,
      motivoCancelamento
    });
  }
  r._contracts = arr;
  return arr;
}

const TREE_LEVEL_LABEL_RESOLVERS = {
  diretoria: (row) => {
    const dirId = row.diretoriaId || row.diretoria;
    const label = row.diretoriaLabel
      || resolveMapLabel(dirMap, dirId, row.diretoriaNome, dirId);
    return label || row.diretoriaNome || row.diretoria || "—";
  },
  gerencia: (row) => {
    const regId = row.gerenciaRegionalId || row.regionalId || row.gerenciaId || row.gerenciaRegional || row.regional;
    const label = row.gerenciaLabel
      || resolveMapLabel(regMap, regId, row.gerenciaNome || row.regional, regId);
    return label || row.regional || row.gerenciaNome || row.gerenciaRegional || "—";
  },
  agencia: (row) => {
    const agId = row.agenciaId || row.agencia;
    const label = row.agenciaLabel
      || resolveMapLabel(agMap, agId, row.agenciaNome, agId);
    return label || row.agenciaNome || row.agencia || "—";
  },
  gGestao: (row) => {
    const ggId = row.gerenteGestaoId || row.gerenteGestao;
    const ggNome = row.gerenteGestaoNome;
    const label = row.gerenteGestaoLabel || labelGerenteGestao(ggId, ggNome);
    return label || ggNome || ggId || "—";
  },
  gerente: (row) => {
    const geId = row.gerenteId || row.gerente;
    const geNome = row.gerenteNome;
    const label = row.gerenteLabel || labelGerente(geId, geNome);
    return label || geNome || geId || "—";
  },
  secao:     (row) => row.secaoNome || row.secao || getSectionLabel(row.secaoId) || "—",
  familia:   (row, fallbackKey) => resolveTreeIndicatorLabel(row, fallbackKey),
  prodsub:   (row) => {
    const idCandidates = [
      row.subIndicadorId,
      row.subIndicador,
      row.linhaProdutoId,
      row.produtoId,
    ];
    const nameCandidates = [
      row.prodOrSub,
      row.subIndicadorNome,
      row.subIndicador,
      row.linhaProdutoNome,
      row.subproduto,
      row.produtoNome,
      row.produto,
    ];
    const resolvedId = limparTexto(idCandidates.find(value => limparTexto(value)));
    const resolvedName = limparTexto(nameCandidates.find(value => limparTexto(value)));
    if (resolvedName && resolvedName.includes(" - ")) return resolvedName;
    if (resolvedId && resolvedName && resolvedId !== resolvedName) return `${resolvedId} - ${resolvedName}`;
    return resolvedName || resolvedId || "—";
  },
};

function rollupFromChildren(node) {
  if (!node || typeof node !== "object") return;
  const children = Array.isArray(node.children) ? node.children.filter(Boolean) : [];
  if (!children.length) return;

  children.forEach(child => rollupFromChildren(child));

  let sumMeta = 0;
  let sumRealizado = 0;
  let sumReferencia = 0;
  let sumProjecao = 0;
  let sumPontos = 0;
  let sumMetaNecessaria = 0;
  let sumMetaDiaria = 0;
  let sumQtd = 0;
  let sumPeso = 0;
  let sumPontosMeta = 0;
  let sumPontosBrutos = 0;

  children.forEach(child => {
    sumMeta += Number(child.meta) || 0;
    sumRealizado += Number(child.realizado) || 0;
    sumReferencia += Number(child.referenciaHoje ?? child.refDia) || 0;
    sumProjecao += Number(child.projecao ?? child.forecast) || 0;
    sumPontos += Number(child.pontos) || 0;
    sumMetaNecessaria += Number(child.metaDiariaNecessaria ?? child.metaNecDia) || 0;
    sumMetaDiaria += Number(child.metaDiaria) || 0;
    sumQtd += Number(child.qtd) || 0;
    sumPeso += Number(child.peso) || 0;
    sumPontosMeta += Number(child.pontosMeta) || 0;
    sumPontosBrutos += Number(child.pontosBrutos) || 0;
  });

  const hasValue = [
    sumMeta,
    sumRealizado,
    sumReferencia,
    sumProjecao,
    sumPontos,
    sumMetaNecessaria
  ].some(value => Math.abs(value) > 0);

  if (!hasValue) return;

  node.meta = sumMeta;
  node.realizado = sumRealizado;
  node.referenciaHoje = sumReferencia;
  node.projecao = sumProjecao;
  node.pontos = sumPontos;
  node.metaDiariaNecessaria = sumMetaNecessaria;
  node.metaDiaria = sumMetaDiaria;
  if (Number.isFinite(sumQtd)) node.qtd = sumQtd;
  if (Number.isFinite(sumPeso)) node.peso = sumPeso;
  node.pontosMeta = sumPontosMeta;
  node.pontosBrutos = sumPontosBrutos;
  node.ating = sumMeta > 0 ? (sumRealizado / sumMeta) : 0;
}

function resolveTreeIndicatorKey(row = {}) {
  if (!row || typeof row !== "object") return "—";
  const candidates = [
    row.produtoId,
    row.indicadorId,
    row.id_indicador,
    row.produto,
    row.produtoNome,
    row.indicadorNome,
    row.ds_indicador,
    row.familiaId,
    row.familiaNome,
    row.familia,
  ];
  for (const candidate of candidates) {
    const resolved = resolverIndicadorPorAlias(candidate);
    if (resolved) return resolved;
  }
  for (const candidate of candidates) {
    const text = limparTexto(candidate);
    if (text) return text;
  }
  return "—";
}

function resolveTreeIndicatorLabel(row = {}, fallbackKey = "") {
  if (!row || typeof row !== "object") return "—";
  const candidates = [
    fallbackKey,
    row.produtoNome,
    row.produto,
    row.indicadorNome,
    row.ds_indicador,
    row.indicadorId,
    row.id_indicador,
    row.produtoId,
    row.familiaNome,
    row.familia,
  ];
  for (const candidate of candidates) {
    const resolved = resolverIndicadorPorAlias(candidate);
    if (resolved) {
      const meta = INDICATOR_CARD_INDEX.get(resolved);
      if (meta?.nome) return meta.nome;
    }
  }
  for (const candidate of candidates) {
    const text = limparTexto(candidate);
    if (text) return text;
  }
  return "—";
}

function resolveTreeLabel(levelKey, subset, fallback) {
  if (!Array.isArray(subset) || !subset.length) return fallback;
  const resolver = TREE_LEVEL_LABEL_RESOLVERS[levelKey];
  if (!resolver) return fallback;
  const label = resolver(subset[0], fallback);
  return label != null && label !== "" ? label : fallback;
}
function buildTree(list, startKey) {
  const keyMap = { diretoria:"diretoria", gerencia:"gerenciaRegional", agencia:"agencia", gGestao:"gerenteGestao", gerente:"gerente", secao:"secaoId", familia:"produtoId", prodsub:"prodOrSub", contrato:"contrato" };
  const NEXT   = { diretoria:"gerencia",  gerencia:"agencia",         agencia:"gGestao", gGestao:"gerente",       gerente:"secao", secao:"familia", familia:"prodsub",   prodsub:"contrato", contrato:null };

  const periodStart = state.period?.start || "";
  const periodEnd = state.period?.end || "";
  const diasTotais = businessDaysBetweenInclusive(periodStart, periodEnd);
  const diasDecorridos = businessDaysElapsedUntilToday(periodStart, periodEnd);
  const diasRestantes = Math.max(0, diasTotais - diasDecorridos);

  function group(arr, key){
    const m = new Map();
    const resolver = typeof key === "function" ? key : null;
    arr.forEach(r => {
      let rawKey;
      if (resolver) {
        rawKey = resolver(r);
      } else if (key === "produtoId") {
        rawKey = resolveTreeIndicatorKey(r);
      } else {
        rawKey = r[key];
      }
      let mapKeyValue;
      if (typeof rawKey === "string") {
        const cleaned = limparTexto(rawKey);
        mapKeyValue = cleaned || "—";
      } else if (rawKey != null && rawKey !== "") {
        mapKeyValue = rawKey;
      } else {
        mapKeyValue = "—";
      }
      const bucket = m.get(mapKeyValue) || [];
      bucket.push(r);
      m.set(mapKeyValue, bucket);
    });
    return [...m.entries()];
  }
  function agg(arr){
    const realizado = arr.reduce((a,b)=>a+(b.realizado||0),0),
          meta      = arr.reduce((a,b)=>a+(b.meta||0),0),
          qtd       = arr.reduce((a,b)=>a+(b.qtd||0),0),
          data      = arr.reduce((mx,b)=> b.data>mx?b.data:mx, "0000-00-00"),
          peso      = arr.reduce((a,b)=>a+Math.max(0, toNumber(b.peso ?? b.pontosMeta ?? 0)),0),
          pontosBr  = arr.reduce((a,b)=>a+Math.max(0, toNumber(b.pontosBrutos ?? b.pontos ?? 0)),0);
    const pontos = Math.max(0, Math.min(peso, pontosBr));
    const metaDiaria = diasTotais > 0 ? (meta / diasTotais) : 0;
    const referenciaHoje = diasDecorridos > 0 ? Math.min(meta, metaDiaria * diasDecorridos) : 0;
    const metaDiariaNecessaria = diasRestantes > 0 ? Math.max(0, (meta - realizado) / diasRestantes) : 0;
    const projecao = diasDecorridos > 0 ? (realizado / diasDecorridos) * diasTotais : realizado;
    return {
      realizado,
      meta,
      qtd,
      ating: meta? realizado/meta : 0,
      data,
      peso,
      pontos,
      pontosMeta: peso,
      pontosBrutos: pontosBr,
      metaDiaria,
      referenciaHoje,
      metaDiariaNecessaria,
      projecao
    };
  }

  function buildDetailGroups(arr){
    const map = new Map();
    arr.forEach(r => {
      const canal = r.canalVenda || "Canal não informado";
      const tipo = r.tipoVenda || "Tipo não informado";
      const gerenteLabel = r.gerenteLabel
        || resolveMapLabel(gerMap, r.gerenteId || r.gerente, r.gerenteNome, r.gerenteId || r.gerente);
      const gerente = gerenteLabel || r.gerenteNome || r.gerente || "—";
      const modalidade = r.modalidadePagamento || (r.subproduto || "Modalidade não informada");
      const key = `${canal}|${tipo}|${gerente}|${modalidade}`;
      const bucket = map.get(key) || [];
      bucket.push(r);
      map.set(key, bucket);
    });
    return [...map.entries()].map(([comboKey, subset]) => {
      const [canal, tipo, gerente, modalidade] = comboKey.split("|");
      const a = agg(subset);
      const dataVencimento = subset.reduce((curr, item) => {
        if (!item.dataVencimento) return curr;
        return !curr || item.dataVencimento > curr ? item.dataVencimento : curr;
      }, "");
      const dataCancelamento = subset.reduce((curr, item) => {
        if (!item.dataCancelamento) return curr;
        return !curr || item.dataCancelamento > curr ? item.dataCancelamento : curr;
      }, "");
      const motivoCancelamento = subset.reduce((curr, item) => curr || item.motivoCancelamento || "", "");
      return {
        canal,
        tipo,
        gerente,
        modalidade,
        realizado: a.realizado,
        meta: a.meta,
        qtd: a.qtd,
        ating: a.ating,
        data: a.data,
        dataVencimento,
        dataCancelamento,
        motivoCancelamento
      };
    }).sort((a,b)=> (b.realizado||0) - (a.realizado||0));
  }

  function buildLevel(arr, levelKey, level, lineage = []){
    if (!Array.isArray(arr) || !arr.length) return [];
    if (levelKey === "contrato") {
      return arr.flatMap(r => ensureContracts(r).map(c => {
        const detailGroups = buildDetailGroups([c]);
        const detailBase = detailGroups[0] || null;
        const detail = detailBase ? {
          canal: detailBase.canal,
          tipo: detailBase.tipo,
          gerente: detailBase.gerente,
          modalidade: detailBase.modalidade
        } : null;
        const diariaContrato = diasTotais > 0 ? (c.meta / diasTotais) : 0;
        const entryMeta = { levelKey, groupField: "contrato", value: c.id, label: c.id };
        const nextLineage = [...lineage, entryMeta];
        const breadcrumb = nextLineage.map(item => item.label || item.value).filter(Boolean);
        return {
          type:"contrato",
          level,
          label:c.id,
          realizado:c.realizado,
          meta:c.meta,
          qtd:c.qtd,
          ating:c.ating,
          data:c.data,
          metaDiaria: diariaContrato,
          referenciaHoje: diasDecorridos > 0 ? Math.min(c.meta, diariaContrato * diasDecorridos) : 0,
          metaDiariaNecessaria: diasRestantes > 0 ? Math.max(0, (c.meta - c.realizado) / diasRestantes) : 0,
          projecao: diasDecorridos > 0 ? (c.realizado / Math.max(diasDecorridos, 1)) * diasTotais : c.realizado,
          detail,
          detailGroups,
          levelKey,
          groupField:"contrato",
          groupValue:c.id,
          lineage: nextLineage.map(item => ({ ...item })),
          breadcrumb,
          children:[]
        };
      }));
    }
    const mapKey = keyMap[levelKey] || levelKey;
    const entries = group(arr, mapKey);
    const nodes = [];
    const handleSubset = (labelKey, subset) => {
      const a = agg(subset), next = NEXT[levelKey];
      const labelText = resolveTreeLabel(levelKey, subset, labelKey);
      const entryMeta = { levelKey, groupField: mapKey, value: labelKey, label: labelText };
      const nextLineage = [...lineage, entryMeta];
      const breadcrumb = nextLineage.map(item => item.label || item.value).filter(Boolean);
      return {
        type:"grupo", level, label:labelText, realizado:a.realizado, meta:a.meta, qtd:a.qtd, ating:a.ating, data:a.data,
        peso:a.peso, pontos:a.pontos, pontosMeta:a.pontosMeta, pontosBrutos:a.pontosBrutos,
        metaDiaria:a.metaDiaria, referenciaHoje:a.referenciaHoje, metaDiariaNecessaria:a.metaDiariaNecessaria, projecao:a.projecao,
        breadcrumb,
        detailGroups: [],
        levelKey,
        groupField: mapKey,
        groupValue: labelKey,
        lineage: nextLineage.map(item => ({ ...item })),
        children: next ? buildLevel(subset, next, level+1, nextLineage) : []
      };
    };
    entries.forEach(([k, subset]) => {
      if (levelKey === "prodsub") {
        const hasLabel = subset.some(row => {
          const id = row?.subIndicadorId || row?.subIndicador || row?.subIndicadorNome || row?.linhaProdutoId || row?.linhaProdutoNome || row?.subproduto;
          return id != null && String(id).trim() !== "" && String(id).trim() !== "—";
        });
        if (!hasLabel) {
          const skipKey = NEXT[levelKey];
          if (skipKey) {
            nodes.push(...buildLevel(subset, skipKey, level, lineage));
          }
          return;
        }
        if (k == null || String(k).trim() === "" || String(k).trim() === "—") {
          const skipKey = NEXT[levelKey];
          if (skipKey) {
            nodes.push(...buildLevel(subset, skipKey, level, lineage));
          }
          return;
        }
      }
      nodes.push(handleSubset(k, subset));
    });
    nodes.forEach(rollupFromChildren);
    return nodes;
  }
  return buildLevel(list, startKey, 0, []);
}

function getContractSearchInput(){
  return document.getElementById("busca");
}

function getContractSuggestPanel(){
  return document.getElementById("contract-suggest");
}

function bindContractSuggestOutsideClick(){
  if (contractSuggestDocBound) return;
  const closeIfOutside = (event) => {
    const wrap = document.querySelector(".card__search-autocomplete");
    if (!wrap) return;
    if (!wrap.contains(event.target)) closeContractSuggestions();
  };
  document.addEventListener("click", closeIfOutside);
  window.addEventListener("resize", closeContractSuggestions);
  document.addEventListener("scroll", closeContractSuggestions, true);
  contractSuggestDocBound = true;
}

function wireContractSuggestionPanel(){
  if (contractSuggestPanelBound) return;
  const panel = getContractSuggestPanel();
  if (!panel) return;
  panel.addEventListener("pointerdown", (event) => {
    const item = event.target.closest?.(".contract-suggest__item");
    if (!item) return;
    event.preventDefault();
    const value = item.dataset.value || item.getAttribute("data-value") || item.textContent || "";
    chooseContractSuggestion(value);
  });
  contractSuggestPanelBound = true;
}

function highlightContractTerm(text, term){
  const value = String(text || "");
  const lower = value.toLowerCase();
  const needle = term.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return escapeHTML(value);
  const before = escapeHTML(value.slice(0, idx));
  const match = escapeHTML(value.slice(idx, idx + term.length));
  const after = escapeHTML(value.slice(idx + term.length));
  return `${before}<mark>${match}</mark>${after}`;
}

function closeContractSuggestions(){
  const panel = getContractSuggestPanel();
  const input = getContractSearchInput();
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = "";
  }
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  contractSuggestState.open = false;
  contractSuggestState.items = [];
  contractSuggestState.highlight = -1;
}

function setContractSuggestionHighlight(index){
  const panel = getContractSuggestPanel();
  const input = getContractSearchInput();
  if (!panel || !contractSuggestState.open) return;
  const items = panel.querySelectorAll(".contract-suggest__item");
  if (!items.length) {
    contractSuggestState.highlight = -1;
    input?.removeAttribute("aria-activedescendant");
    return;
  }
  let next = index;
  if (next < 0) next = items.length - 1;
  if (next >= items.length) next = 0;
  contractSuggestState.highlight = next;
  items.forEach((btn, i) => {
    const highlighted = i === next;
    btn.classList.toggle("is-highlight", highlighted);
    btn.setAttribute("aria-selected", highlighted ? "true" : "false");
    const id = `contract-opt-${i}`;
    btn.id = id;
    if (highlighted && input) {
      input.setAttribute("aria-activedescendant", id);
      const top = btn.offsetTop;
      const bottom = top + btn.offsetHeight;
      if (top < panel.scrollTop) panel.scrollTop = top;
      else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
    }
  });
}

function moveContractSuggestionHighlight(delta){
  if (!contractSuggestState.open) return;
  const panel = getContractSuggestPanel();
  if (!panel || panel.hidden) return;
  const items = panel.querySelectorAll(".contract-suggest__item");
  if (!items.length) return;
  const next = contractSuggestState.highlight + delta;
  setContractSuggestionHighlight(next);
}

function getHighlightedContractSuggestion(){
  if (!contractSuggestState.open) return null;
  const idx = contractSuggestState.highlight;
  if (idx < 0) return null;
  return contractSuggestState.items[idx] || null;
}

function chooseContractSuggestion(value){
  const input = getContractSearchInput();
  const term = (value || "").trim();
  if (input) {
    input.value = term;
    input.focus();
  }
  closeContractSuggestions();
  requestAnimationFrame(() => {
    if (term) commitContractSearch(term);
    else commitContractSearch("", { showSpinner: true });
  });
}

function refreshContractSuggestions(query = ""){
  const input = getContractSearchInput();
  const panel = getContractSuggestPanel();
  if (!input || !panel) return;
  bindContractSuggestOutsideClick();
  wireContractSuggestionPanel();

  const term = (query || "").trim();
  contractSuggestState.term = term;
  if (!term){
    closeContractSuggestions();
    return;
  }

  const list = Array.isArray(state.contractIndex) ? state.contractIndex : [];
  const lowered = term.toLowerCase();
  const matches = list.filter(id => id.toLowerCase().includes(lowered)).slice(0, 12);

  if (!matches.length){
    contractSuggestState.items = [];
    contractSuggestState.highlight = -1;
    contractSuggestState.open = true;
    panel.innerHTML = `<div class="contract-suggest__empty">Nenhum contrato encontrado</div>`;
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");
    return;
  }

  contractSuggestState.items = matches;
  contractSuggestState.highlight = -1;
  contractSuggestState.open = true;
  panel.innerHTML = matches.map((id, index) => `
    <button type="button" class="contract-suggest__item" role="option" aria-selected="false" data-index="${index}" data-value="${escapeHTML(id)}">
      <span>${highlightContractTerm(id, term)}</span>
      <span class="contract-suggest__meta">Filtrar</span>
    </button>
  `).join("");
  panel.hidden = false;
  panel.scrollTop = 0;
  input.setAttribute("aria-expanded", "true");
  input.removeAttribute("aria-activedescendant");
}

function updateContractAutocomplete(){
  const input = getContractSearchInput();
  if (!input) return;
  bindContractSuggestOutsideClick();
  wireContractSuggestionPanel();

  const ids = new Set();
  (state._rankingRaw || []).forEach(row => {
    ensureContracts(row).forEach(contract => {
      if (contract?.id) ids.add(contract.id);
    });
  });

  state.contractIndex = [...ids].sort();
  if (input.value) refreshContractSuggestions(input.value);
  else closeContractSuggestions();
}

function setContractSearchLoading(isLoading){
  const wrap = document.querySelector(".card__search-autocomplete");
  if (!wrap) return;
  wrap.classList.toggle("is-loading", Boolean(isLoading));
}

async function commitContractSearch(rawTerm, opts = {}) {
  const { showSpinner = true } = opts || {};
  const term = (rawTerm || "").trim();

  contractSuggestState.pending = term;
  const run = async () => {
    if (term) {
      if (state.tableView !== "contrato") {
        state.lastNonContractView = state.tableView;
      }
      state.tableView = "contrato";
      setActiveChip("contrato");
    } else if (state.tableView === "contrato") {
      const fallback = state.lastNonContractView && state.lastNonContractView !== "contrato"
        ? state.lastNonContractView
        : "diretoria";
      state.tableView = fallback;
      setActiveChip(state.tableView);
    }

    state.tableSearchTerm = term;
    closeContractSuggestions();
    await Promise.resolve(applyFiltersAndRender());
    if (!term) refreshContractSuggestions("");
  };

  const label = term ? "Filtrando contratos…" : "Atualizando tabela…";

  if (showSpinner) {
    await withSpinner(async () => {
      setContractSearchLoading(true);
      try {
        await run();
      } finally {
        setContractSearchLoading(false);
        contractSuggestState.pending = null;
      }
    }, label);
  } else {
    setContractSearchLoading(true);
    try {
      await run();
    } finally {
      setContractSearchLoading(false);
      contractSuggestState.pending = null;
    }
  }
}

/* ===== Aqui eu cuido das interações gerais de UI que não se encaixaram em outro bloco ===== */
function initCombos() {
  ensureSegmentoField();

  const fill = (sel, arr) => {
    const el = $(sel); if (!el) return;
    const current = el.value;
    el.innerHTML = "";
    arr.forEach(v => {
      const o = document.createElement("option");
      o.value = v.value;
      o.textContent = v.label;
      el.appendChild(o);
    });
    if (arr.some(opt => opt.value === current)) {
      el.value = current;
    }
    if (el.dataset.search === "true") {
      ensureSelectSearch(el);
      const options = arr.map(opt => ({
        value: opt.value,
        label: opt.label,
        aliases: Array.isArray(opt.aliases) ? opt.aliases : [],
      }));
      storeSelectSearchOptions(el, options);
      syncSelectSearchInput(el);
    }
  };

  refreshHierarchyCombos();

  [
    { key: "segmento",  selector: "#f-segmento" },
    { key: "diretoria", selector: "#f-diretoria" },
    { key: "gerencia",  selector: "#f-gerencia" },
    { key: "agencia",   selector: "#f-agencia" },
    { key: "ggestao",   selector: "#f-ggestao" },
    { key: "gerente",   selector: "#f-gerente" },
  ].forEach(({ key, selector }) => {
    const el = $(selector);
    if (!el || el.dataset.hierBound) return;
    el.dataset.hierBound = "1";
    el.addEventListener("change", () => handleHierarchySelectionChange(key));
  });

  const secaoOptions = [{ value: "Todas", label: "Todas", aliases: ["Todas", "Todos"] }].concat(
    CARD_SECTIONS_DEF.map(sec => ({
      value: sec.id,
      label: formatTitleCase(sec.label || sec.id),
      aliases: [sec.id, sec.label, formatTitleCase(sec.label || sec.id)].filter(Boolean),
    }))
  );
  fill("#f-secao", secaoOptions);

  const familiaSelect = $("#f-familia");
  const secaoSelect = $("#f-secao");
  const produtoSelect = $("#f-produto");
  if (familiaSelect && familiaSelect.dataset.apiManaged === '1') {
    ensureSelectSearch(familiaSelect);
    refreshSelectSearchOptions(familiaSelect, resolveIndicadorSearchAliases);
    if (produtoSelect) {
      ensureSelectSearch(produtoSelect);
      refreshSelectSearchOptions(produtoSelect, resolveSubindicadorSearchAliases);
    }
  } else {
    const buildIndicatorOptions = (secaoId) => {
      const base = [{ value: "Todas", label: "Todos", aliases: ["Todos", "Todas"] }];
      const filtroSecao = secaoId && secaoId !== "Todas" ? secaoId : "";
      const added = new Set();
      const indicadores = [];
      const consider = (prod) => {
        if (!prod || !prod.id || added.has(prod.id)) return;
        if (filtroSecao && prod.secaoId && prod.secaoId !== filtroSecao) return;
        const cardMeta = INDICATOR_CARD_INDEX.get(prod.id) || PRODUCT_INDEX.get(prod.id) || {};
        const familiaMeta = PRODUTO_TO_FAMILIA.get(prod.id) || {};
        const prodSecao = cardMeta.sectionId || familiaMeta.secaoId || prod.secaoId || "";
        if (filtroSecao && prodSecao && prodSecao !== filtroSecao) return;
        const nome = cardMeta.nome || cardMeta.name || prod.nome || prod.id;
        const aliasList = new Set([prod.id, nome, cardMeta.nome, cardMeta.name]);
        if (Array.isArray(cardMeta.aliases)) {
          cardMeta.aliases.forEach(alias => aliasList.add(limparTexto(alias)));
        }
        const aliasSet = CARD_ALIAS_INDEX.get(prod.id);
        if (aliasSet instanceof Set) aliasSet.forEach(item => aliasList.add(item));
        indicadores.push({ value: prod.id, label: nome || prod.id, aliases: Array.from(aliasList).filter(Boolean) });
        added.add(prod.id);
      };
      if (filtroSecao) {
        (PRODUTOS_BY_FAMILIA.get(filtroSecao) || []).forEach(consider);
      } else {
        PRODUTOS_BY_FAMILIA.forEach(list => list.forEach(consider));
      }
      indicadores.sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "pt-BR", { sensitivity: "base" }));
      return base.concat(indicadores);
    };

    const buildSubIndicadorOptions = (indicadorId) => {
      const base = [{ value: "Todos", label: "Todos", aliases: ["Todos", "Todas"] }];
      const resolved = resolverIndicadorPorAlias(indicadorId) || limparTexto(indicadorId);
      if (!resolved || resolved === "Todas" || resolved === "Todos") return base;
      const entries = getFlatSubIndicatorOptions(resolved);
      if (!entries.length) return base;
      return base.concat(entries);
    };

    const applySubIndicadorOptions = (preserveValue = true) => {
      if (!produtoSelect) return;
      const indicadorVal = familiaSelect ? familiaSelect.value : "Todas";
      const previous = preserveValue ? produtoSelect.value : "Todos";
      const options = buildSubIndicadorOptions(indicadorVal);
      fill("#f-produto", options);
      const desired = preserveValue && options.some(opt => opt.value === previous) ? previous : "Todos";
      if (options.some(opt => opt.value === desired)) {
        produtoSelect.value = desired;
      }
      produtoSelect.disabled = options.length <= 1;
      if (produtoSelect.dataset.search === "true") syncSelectSearchInput(produtoSelect);
    };

    const applyIndicatorOptions = (preserveValue = true) => {
      if (!familiaSelect) return;
      const secVal = secaoSelect ? secaoSelect.value : "Todas";
      const previous = preserveValue ? familiaSelect.value : "Todas";
      const options = buildIndicatorOptions(secVal);
      fill("#f-familia", options);
      const desired = preserveValue && options.some(opt => opt.value === previous) ? previous : "Todas";
      if (options.some(opt => opt.value === desired)) {
        familiaSelect.value = desired;
      }
      if (familiaSelect.dataset.search === "true") syncSelectSearchInput(familiaSelect);
      applySubIndicadorOptions(preserveValue);
    };

    applyIndicatorOptions(true);

    if (familiaSelect && !familiaSelect.dataset.bound) {
      familiaSelect.dataset.bound = "1";
      familiaSelect.addEventListener("change", () => {
        applySubIndicadorOptions(false);
      });
    }

    if (secaoSelect && !secaoSelect.dataset.bound) {
      secaoSelect.dataset.bound = "1";
      secaoSelect.addEventListener("change", () => {
        applyIndicatorOptions(true);
      });
    }
  }

  updateStatusFilterOptions();

  const visaoSelect = $("#f-visao");
  if (visaoSelect) {
    const current = visaoSelect.value || state.accumulatedView || "mensal";
    visaoSelect.innerHTML = "";
    ACCUMULATED_VIEW_OPTIONS.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      visaoSelect.appendChild(option);
    });
    visaoSelect.value = ACCUMULATED_VIEW_OPTIONS.some(opt => opt.value === current)
      ? current
      : "mensal";
    state.accumulatedView = visaoSelect.value || "mensal";
    syncPeriodFromAccumulatedView(state.accumulatedView);
  }
}
function bindEvents() {
  $("#btn-consultar")?.addEventListener("click", async () => {
    await withSpinner(async () => {
      autoSnapViewToFilters();
      applyFiltersAndRender();
      renderAppliedFilters();
      renderCampanhasView();
      if (state.activeView === "ranking") renderRanking();
    }, "Aplicando filtros…");
    closeMobileFilters();
  });

  $("#btn-abrir-filtros")?.addEventListener("click", () => {
    const adv = $("#advanced-filters");
    const isOpen = adv.classList.toggle("is-open");
    adv.setAttribute("aria-hidden", String(!isOpen));
    $("#btn-abrir-filtros").setAttribute("aria-expanded", String(isOpen));
    $("#btn-abrir-filtros").innerHTML = isOpen
      ? `<i class="ti ti-chevron-up"></i> Fechar filtros`
      : `<i class="ti ti-chevron-down"></i> Abrir filtros`;
    if (isOpen) ensureStatusFilterInAdvanced();
  });

  ensureExtraTabs();
  setupResumoModeToggle();

  $$(".tab").forEach(t => {
    t.addEventListener("click", () => {
      const view = t.dataset.view || "cards";
      if (t.classList.contains("is-active") && state.activeView === view) return;
      switchView(view);
    });
  });

  ["#f-segmento","#f-diretoria","#f-gerencia","#f-agencia","#f-ggestao","#f-gerente","#f-secao","#f-familia","#f-produto","#f-status-kpi"].forEach(sel => {
    $(sel)?.addEventListener("change", async () => {
      await withSpinner(async () => {
        autoSnapViewToFilters();
        applyFiltersAndRender();
        renderAppliedFilters();
        renderCampanhasView();
        if (state.activeView === "ranking") renderRanking();
      }, "Atualizando filtros…");
    });
  });

  const visaoSelect = $("#f-visao");
  if (visaoSelect && !visaoSelect.dataset.bound) {
    visaoSelect.dataset.bound = "1";
    visaoSelect.addEventListener("change", async () => {
      const nextView = visaoSelect.value || "mensal";
      state.accumulatedView = nextView;
      syncPeriodFromAccumulatedView(nextView);
      await withSpinner(async () => {
        autoSnapViewToFilters();
        applyFiltersAndRender();
        renderAppliedFilters();
        renderCampanhasView();
        if (state.activeView === "ranking") renderRanking();
      }, "Atualizando visão acumulada…");
    });
  }

  const searchInput = $("#busca");
  if (searchInput) {
    searchInput.addEventListener("input", async (e) => {
      const value = e.target.value || "";
      refreshContractSuggestions(value);
      if (!value.trim() && state.tableSearchTerm) {
        await commitContractSearch("", { showSpinner: true });
      }
    });
    searchInput.addEventListener("keydown", async (e) => {
      if (e.key === "ArrowDown") {
        const value = e.currentTarget.value || "";
        if (!contractSuggestState.open) refreshContractSuggestions(value);
        if (contractSuggestState.open) moveContractSuggestionHighlight(1);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        const value = e.currentTarget.value || "";
        if (!contractSuggestState.open) refreshContractSuggestions(value);
        if (contractSuggestState.open) moveContractSuggestionHighlight(-1);
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const highlighted = getHighlightedContractSuggestion();
        const value = highlighted ?? e.currentTarget.value;
        await commitContractSearch(value);
        return;
      }
      if (e.key === "Escape") {
        closeContractSuggestions();
      }
    });
    searchInput.addEventListener("change", async (e) => {
      const value = e.target.value || "";
      const term = (value || "").trim();
      if (term === state.tableSearchTerm || term === contractSuggestState.pending) {
        closeContractSuggestions();
        return;
      }
      if (!term) {
        await commitContractSearch("", { showSpinner: true });
      } else {
        await commitContractSearch(term);
      }
    });
    searchInput.addEventListener("focus", (e) => {
      const value = e.target.value || "";
      if (value.trim()) refreshContractSuggestions(value);
    });
    searchInput.addEventListener("blur", () => {
      setTimeout(() => closeContractSuggestions(), 120);
    });
  }

  $("#btn-export")?.remove();
  setupMobileFilters();
}

/* Reordenar filtros */
function reorderFiltersUI() {
  const area = $(".filters"); if (!area) return;
  const adv = $("#advanced-filters .adv__grid") || $("#advanced-filters");

  const groupOf = (sel) => $(sel)?.closest?.(".filters__group") || null;

  const gSeg = groupOf("#f-segmento");
  const gDR  = groupOf("#f-diretoria");
  const gGR  = groupOf("#f-gerencia");
  const gAg  = groupOf("#f-agencia");
  const gGG  = groupOf("#f-ggestao");
  const gGer = groupOf("#f-gerente");
  const gSec = groupOf("#f-secao");
  const gFam = groupOf("#f-familia");
  const gProd= groupOf("#f-produto");
  const gStatus = groupOf("#f-status-kpi");
  const gVisao = groupOf("#f-visao");

  const actions = area.querySelector(".filters__actions") || area.lastElementChild;

  [gSeg,gDR,gGR].filter(Boolean).forEach(el => area.insertBefore(el, actions));
  [gAg,gGG,gGer,gSec,gFam,gProd,gStatus,gVisao].filter(Boolean).forEach(el => adv?.appendChild(el));

  const gStart = $("#f-inicio")?.closest(".filters__group"); if (gStart) gStart.remove();
}

/* ===== Aqui eu controlo o overlay de carregamento para indicar processamento ===== */   // <- COLE AQUI O BLOCO INTEIRO
function ensureLoader(){
  if (document.getElementById('__loader')) return;
  const el = document.createElement('div');
  el.id = '__loader';
  el.className = 'loader is-hide';
  el.innerHTML = `
    <div>
      <div class="loader__spinner" aria-hidden="true"></div>
      <div class="loader__text" id="__loader_text">Carregando…</div>
    </div>`;
  document.body.appendChild(el);
}
function showLoader(text='Carregando…'){
  ensureLoader();
  const el = document.getElementById('__loader');
  el.querySelector('#__loader_text').textContent = text;
  el.classList.remove('is-hide');
}
function hideLoader(){
  const el = document.getElementById('__loader');
  if (el) el.classList.add('is-hide');
}
async function withSpinner(fn, text='Carregando…'){
  showLoader(text);
  await new Promise(r => requestAnimationFrame(() => r()));
  await new Promise(r => setTimeout(r, 0));
  try { await fn(); } finally { hideLoader(); }
}

/* ===== Aqui eu monto o widget de chat flutuante e seus eventos ===== */
function ensureChatWidget(){
  if (document.getElementById("chat-widget")) return;

  const wrap = document.createElement("div");
  wrap.id = "chat-widget";
  wrap.className = "chatw";
  wrap.innerHTML = `
    <button id="chat-launcher" class="chatw__btn" aria-label="Abrir chat de dúvidas">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8.4l-3.6 3a1 1 0 0 1-1.6-.8V6a2 2 0 0 1 2-2zm2 4v2h12V8H6zm0 4v2h9v-2H6z"/></svg>
    </button>
    <section id="chat-panel" class="chatw__panel" aria-hidden="true" role="dialog" aria-label="Chat POBJ e campanhas">
      <header class="chatw__header">
        <div class="chatw__title">Assistente POBJ &amp; Campanhas</div>
        <button id="chat-close" class="chatw__close" aria-label="Fechar chat"><i class="ti ti-x"></i></button>
      </header>

      <p class="chatw__disclaimer">Assistente virtual com IA — respostas podem conter erros.</p>

      <div id="chat-body">
        <!-- Se modo iframe, eu coloco aqui; senão, uso a UI nativa abaixo -->
      </div>

      <div id="chat-ui-native" style="display:none;">
        <div id="chat-messages" class="chatw__msgs" aria-live="polite"></div>
        <form id="chat-form" class="chatw__form" autocomplete="off">
          <input id="chat-input" type="text" placeholder="Pergunte sobre o POBJ ou campanhas…" required />
          <button id="chat-send" type="submit">Enviar</button>
        </form>
      </div>
    </section>
  `;
  document.body.appendChild(wrap);

  const launcher = document.getElementById("chat-launcher");
  const panel    = document.getElementById("chat-panel");
  const closeBtn = document.getElementById("chat-close");
  const body     = document.getElementById("chat-body");
  const uiNative = document.getElementById("chat-ui-native");

  // Montagem conforme o modo
  if (CHAT_MODE === "iframe" && CHAT_IFRAME_URL){
    const iframe = document.createElement("iframe");
    iframe.src = CHAT_IFRAME_URL;
    iframe.style.cssText = "width:100%;height:calc(520px - 48px);border:0;";
    iframe.setAttribute("title", "Chat do Assistente POBJ");
    body.appendChild(iframe);
  } else {
    // UI nativa (mensagens + input)
    uiNative.style.display = "block";
    body.style.display = "none";
    wireNativeChat();
  }

  // Abertura/fechamento
  const open = () => {
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden","false");
    if (CHAT_MODE !== "iframe") setTimeout(()=> document.getElementById("chat-input")?.focus(), 50);
  };
  const close = () => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden","true");
    launcher.focus();
  };

  launcher.addEventListener("click", () => {
    if (panel.classList.contains("is-open")) close(); else open();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && panel.classList.contains("is-open")) close(); });

  /* ====== Nativa: UI + envio ====== */
  function wireNativeChat(){
    const msgs  = document.getElementById("chat-messages");
    const form  = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const send  = document.getElementById("chat-send");

    const scrollBottom = () => { msgs.scrollTop = msgs.scrollHeight; };

    const addMsg = (role, text, isTyping=false) => {
      const el = document.createElement("div");
      el.className = `msg msg--${role} ${isTyping?'msg--typing':''}`;
      el.innerHTML = isTyping
        ? `<div class="msg__bubble"><span class="dots"><i></i><i></i><i></i></span></div>`
        : `<div class="msg__bubble"></div>`;
      if (!isTyping) el.querySelector(".msg__bubble").textContent = text;
      msgs.appendChild(el);
      scrollBottom();
      return el;
    };

    const setTyping = (node, on) => {
      if (!node) return;
      node.classList.toggle("msg--typing", !!on);
      if (!on) node.innerHTML = `<div class="msg__bubble"></div>`;
    };

    // Mensagem de boas-vindas
    addMsg("bot","Olá! Posso ajudar com dúvidas sobre o POBJ e campanhas. O que você quer saber?");

    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      const q = (input.value || "").trim();
      if (!q) return;

      addMsg("user", q);
      input.value = "";
      input.focus();
      send.disabled = true;

      const typing = addMsg("bot","", true);
      try{
        const answer = await sendToAgent(q);
        setTyping(typing, false);
        typing.querySelector(".msg__bubble").textContent = answer || "Desculpe, não consegui responder agora.";
      }catch(err){
        setTyping(typing, false);
        console.error("[agent]", err);
        const fallback = (err && err.message) ? String(err.message) : "Falha ao falar com o agente. Tente novamente.";
        typing.querySelector(".msg__bubble").textContent = fallback;
      }finally{
        send.disabled = false;
        scrollBottom();
      }
    });
  }

  /* ====== Integração ====== */
  async function sendToAgent(userText){
    if (CHAT_MODE === "http"){
      if (!AGENT_ENDPOINT){
        throw new Error("Endpoint do agente não configurado");
      }
      const r = await fetch(AGENT_ENDPOINT, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ question: userText })
      });
      const raw = await r.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (err) {
        data = null;
      }
      if(!r.ok){
        const message = data && typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : `HTTP ${r.status}`;
        throw new Error(message);
      }
      if (!data || typeof data !== "object") return "";
      return data.answer || "";
    }
    // Em modo IFRAME a conversa acontece dentro do próprio iframe,
    // então aqui só devolvemos vazio (não é usado).
    return "";
  }
}

/* ===== Aqui eu gerencio a troca entre as abas principais mostrando um spinner decente ===== */
async function switchView(next) {
  const label =
    next === "table"        ? "Montando detalhamento…" :
    next === "ranking"      ? "Calculando ranking…"    :
    next === "exec"         ? "Abrindo visão executiva…" :
    next === "campanhas"    ? "Abrindo campanhas…" :
    next === "simuladores"  ? "Abrindo simuladores…" :
                               "Carregando…";

  definirAbaAtiva(next);

  await withSpinner(async () => {
    const views = {
      cards:"#view-cards",
      table:"#view-table",
      ranking:"#view-ranking",
      exec:"#view-exec",
      simuladores:"#view-simuladores",
      campanhas:"#view-campanhas"
    };

    if (next === "ranking" && !$("#view-ranking")) createRankingView();
    if (next === "exec") createExecutiveView();
    if (next === "campanhas") ensureCampanhasView();

    Object.values(views).forEach(sel => $(sel)?.classList.add("hidden"));

    if (next === "table" && !state.tableRendered) {
      ensureChipBarAndToolbar();
      autoSnapViewToFilters();
      renderTreeTable();
      state.tableRendered = true;
    } else if (next === "table") {
      renderTreeTable();
    }

    if (next === "ranking") renderRanking();
    if (next === "exec")    renderExecutiveView();   // <- ADICIONE ESTA LINHA
    if (next === "campanhas") renderCampanhasView();
    if (next === "simuladores") {
      ensureSimuladoresView();
      updateSimuladoresUI();
    }

    const targetSelector = views[next] || views.cards;
    const el = targetSelector ? $(targetSelector) : $("#view-cards");
    el.classList.remove("hidden");
    state.activeView = next;
  }, label);
}

/* ===== Simulador “E se?” ===== */
function collectSimulatorCatalog(sections = []) {
  const items = [];
  (sections || []).forEach(section => {
    const list = Array.isArray(section.items) ? section.items : [];
    list.forEach(item => {
      const metricRaw = typeof item.metric === "string" ? item.metric.toLowerCase() : "";
      if (!SIMULATOR_SUPPORTED_METRICS.has(metricRaw)) return;
      const meta = Math.max(0, toNumber(item.meta));
      if (!(meta > 0)) return;
      const realizado = Math.max(0, toNumber(item.realizado));
      const variavelMeta = Math.max(0, toNumber(item.variavelMeta));
      const variavelReal = Math.max(0, toNumber(item.variavelReal));
      const pontosMeta = Math.max(0, toNumber(item.pontosMeta ?? item.peso));
      const pontosBrutos = Math.max(0, toNumber(item.pontosBrutos ?? item.pontos ?? 0));
      const pontos = Math.max(0, toNumber(item.pontos ?? pontosBrutos));
      items.push({
        id: item.id,
        label: item.nome || item.id,
        sectionId: section.id,
        sectionLabel: section.label || section.id,
        metric: metricRaw || "valor",
        meta,
        realizado,
        variavelMeta,
        variavelReal,
        pontosMeta,
        pontosBrutos,
        pontos,
        ultimaAtualizacao: item.ultimaAtualizacao || ""
      });
    });
  });
  items.sort((a, b) => {
    const orderA = SECTION_ORDER_INDEX.has(a.sectionId) ? SECTION_ORDER_INDEX.get(a.sectionId) : 999;
    const orderB = SECTION_ORDER_INDEX.has(b.sectionId) ? SECTION_ORDER_INDEX.get(b.sectionId) : 999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.label || a.id).localeCompare(String(b.label || b.id), "pt-BR", { sensitivity: "base" });
  });
  return items;
}

function refreshSimulatorCatalog() {
  const sections = state.dashboard?.sections || [];
  const catalog = collectSimulatorCatalog(sections);
  SIMULATOR_STATE.catalog = catalog;
  if (!catalog.some(item => item.id === SIMULATOR_STATE.selectedId)) {
    SIMULATOR_STATE.selectedId = catalog[0]?.id || "";
    SIMULATOR_STATE.delta = 0;
  }
  updateSimuladoresUI();
}

function getSimulatorProduct(id) {
  if (!id) return null;
  return SIMULATOR_STATE.catalog.find(item => item.id === id) || null;
}

function ensureSimuladoresView() {
  const host = document.getElementById("sim-whatif");
  if (!host || host.dataset.bound) return;
  host.dataset.bound = "1";

  const select = document.getElementById("sim-whatif-indicador");
  if (select && !select.dataset.bound) {
    select.dataset.bound = "1";
    select.addEventListener("change", (ev) => {
      SIMULATOR_STATE.selectedId = ev.target.value || "";
      SIMULATOR_STATE.delta = 0;
      const inputField = document.getElementById("sim-whatif-extra");
      if (inputField) inputField.value = "0";
      const product = getSimulatorProduct(SIMULATOR_STATE.selectedId);
      updateSimuladorMetricHint(product);
      renderSimuladorShortcuts(product);
      updateSimuladorResults(product);
    });
  }

  const input = document.getElementById("sim-whatif-extra");
  if (input && !input.dataset.bound) {
    input.dataset.bound = "1";
    input.addEventListener("input", (ev) => {
      const value = Math.max(0, toNumber(ev.target.value));
      SIMULATOR_STATE.delta = Number.isFinite(value) ? value : 0;
      updateSimuladorResults();
    });
  }

  const shortcuts = document.getElementById("sim-whatif-shortcuts");
  if (shortcuts && !shortcuts.dataset.bound) {
    shortcuts.dataset.bound = "1";
    shortcuts.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-sim-shortcut]");
      if (!btn) return;
      const raw = toNumber(btn.dataset.simShortcut);
      if (!Number.isFinite(raw)) return;
      const inputField = document.getElementById("sim-whatif-extra");
      const stepValue = inputField ? Math.max(1, toNumber(inputField.step) || 1) : 1;
      const nextValue = Math.max(0, Math.round(raw / stepValue) * stepValue);
      SIMULATOR_STATE.delta = nextValue;
      if (inputField) {
        inputField.value = String(nextValue);
      }
      updateSimuladorResults();
    });
  }

  const form = document.getElementById("sim-whatif-form");
  if (form && !form.dataset.bound) {
    form.dataset.bound = "1";
    form.addEventListener("submit", (ev) => ev.preventDefault());
  }
}

function updateSimuladoresUI() {
  const select = document.getElementById("sim-whatif-indicador");
  if (!select) return;
  populateSimuladorSelect(select);
  const product = getSimulatorProduct(SIMULATOR_STATE.selectedId);
  updateSimuladorMetricHint(product);
  renderSimuladorShortcuts(product);
  updateSimuladorResults(product);
}

function populateSimuladorSelect(select) {
  const catalog = SIMULATOR_STATE.catalog;
  if (!catalog.length) {
    select.innerHTML = `<option value="" disabled selected>Nenhum indicador disponível para simular neste recorte.</option>`;
    select.disabled = true;
    return;
  }

  const groups = new Map();
  catalog.forEach(item => {
    const key = item.sectionId || item.sectionLabel || "__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const orderA = SECTION_ORDER_INDEX.has(a[0]) ? SECTION_ORDER_INDEX.get(a[0]) : 999;
    const orderB = SECTION_ORDER_INDEX.has(b[0]) ? SECTION_ORDER_INDEX.get(b[0]) : 999;
    if (orderA !== orderB) return orderA - orderB;
    const labelA = a[1][0]?.sectionLabel || a[0];
    const labelB = b[1][0]?.sectionLabel || b[0];
    return String(labelA).localeCompare(String(labelB), "pt-BR", { sensitivity: "base" });
  });

  let html = `<option value="" disabled${SIMULATOR_STATE.selectedId ? "" : " selected"}>Selecione um indicador</option>`;
  sortedGroups.forEach(([sectionId, list]) => {
    list.sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id), "pt-BR", { sensitivity: "base" }));
    const groupLabel = list[0]?.sectionLabel || sectionId || "Indicadores";
    const options = list.map(item => `<option value="${escapeHTML(item.id)}"${item.id === SIMULATOR_STATE.selectedId ? " selected" : ""}>${escapeHTML(item.label)}</option>`).join("");
    html += `<optgroup label="${escapeHTML(groupLabel)}">${options}</optgroup>`;
  });

  select.innerHTML = html;
  select.disabled = false;
}

function updateSimuladorMetricHint(product) {
  const hint = document.getElementById("sim-whatif-unit");
  const prefix = document.getElementById("sim-whatif-prefix");
  const input = document.getElementById("sim-whatif-extra");
  if (!hint || !prefix || !input) return;

  if (!product) {
    hint.textContent = "Selecione um indicador elegível.";
    prefix.textContent = "";
    input.disabled = true;
    if (document.activeElement !== input) input.value = "0";
    return;
  }

  input.disabled = false;
  const metric = product.metric || "valor";
  const metaLabel = formatByMetric(metric, product.meta);
  const realizadoLabel = formatByMetric(metric, product.realizado);
  const gap = Math.max(0, product.meta - product.realizado);
  const gapLabel = gap > 0 ? formatByMetric(metric, gap) : "";
  const pieces = [`Meta ${metaLabel}`, `Realizado ${realizadoLabel}`];
  if (gapLabel) pieces.push(`Falta ${gapLabel}`);
  hint.textContent = pieces.join(" · ");
  prefix.textContent = metric === "valor" ? CURRENCY_SYMBOL.trim() : "+";
  const step = metric === "valor" ? 1000 : 1;
  input.step = String(step);
  if (document.activeElement !== input) input.value = String(SIMULATOR_STATE.delta || 0);
}

function renderSimuladorShortcuts(product) {
  const container = document.getElementById("sim-whatif-shortcuts");
  if (!container) return;

  if (!product) {
    container.innerHTML = "";
    container.classList.add("is-empty");
    return;
  }

  const meta = Math.max(0, toNumber(product.meta));
  if (!(meta > 0)) {
    container.innerHTML = "";
    container.classList.add("is-empty");
    return;
  }

  const gap = Math.max(0, meta - toNumber(product.realizado));
  const suggestions = [
    { label: "+5% da meta", value: meta * 0.05 },
    { label: "+10% da meta", value: meta * 0.10 },
    { label: gap > 0 ? "Fechar a meta" : "+25% da meta", value: gap > 0 ? gap : meta * 0.25 }
  ];

  container.classList.remove("is-empty");
  container.innerHTML = `
    <span class="sim-quick__label">Atalhos</span>
    <div class="sim-quick__chips">
      ${suggestions.map(item => {
        const safeVal = Number.isFinite(item.value) ? item.value : 0;
        const title = formatByMetric(product.metric, safeVal);
        return `<button type="button" class="sim-chip" data-sim-shortcut="${safeVal}" title="${escapeHTML(title)}">${escapeHTML(item.label)}</button>`;
      }).join("")}
    </div>
  `;
}

function formatSimulatorCurrencyDelta(value) {
  const formatted = formatBRLReadable(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatSimulatorPointsDelta(value) {
  const formatted = formatPoints(value, { withUnit: true });
  return value > 0 ? `+${formatted}` : formatted;
}

function updateSimuladorResults(product = getSimulatorProduct(SIMULATOR_STATE.selectedId)) {
  const cards = document.getElementById("sim-whatif-cards");
  const title = document.getElementById("sim-whatif-title");
  const subtitle = document.getElementById("sim-whatif-subtitle");
  const foot = document.getElementById("sim-whatif-foot");
  const input = document.getElementById("sim-whatif-extra");
  if (!cards || !title || !subtitle || !foot) return;

  const catalog = SIMULATOR_STATE.catalog || [];
  const delta = Math.max(0, toNumber(SIMULATOR_STATE.delta));
  SIMULATOR_STATE.delta = delta;
  if (input && document.activeElement !== input) {
    input.value = String(delta);
  }

  if (!product) {
    if (!catalog.length) {
      title.textContent = "Sem indicadores elegíveis";
      subtitle.textContent = "Aplique outros filtros ou volte mais tarde para usar o simulador.";
      cards.innerHTML = `<p class="sim-whatif__empty">Nenhum indicador com meta em valor ou quantidade está disponível com os filtros atuais.</p>`;
    } else {
      title.textContent = "Escolha um indicador para iniciar";
      subtitle.textContent = "Os valores consideram os filtros aplicados na visão principal.";
      cards.innerHTML = `<p class="sim-whatif__empty">Selecione um indicador com meta em valor ou quantidade para liberar a simulação.</p>`;
    }
    foot.innerHTML = "";
    return;
  }

  const metric = product.metric || "valor";
  const meta = Math.max(0, toNumber(product.meta));
  const realizado = Math.max(0, toNumber(product.realizado));
  const variavelMeta = Math.max(0, toNumber(product.variavelMeta));
  const variavelReal = Math.max(0, toNumber(product.variavelReal));
  const pontosMeta = Math.max(0, toNumber(product.pontosMeta));
  const pontosBrutos = Math.max(0, toNumber(product.pontosBrutos));
  const pontosAtual = Math.max(0, Math.min(pontosMeta || pontosBrutos, toNumber(product.pontos)));
  const novoReal = realizado + delta;
  const ratioVar = meta > 0 ? ((variavelMeta || variavelReal) / meta) : 0;
  const ratioPontos = meta > 0 ? (pontosMeta / meta) : 0;
  const variavelProjBruta = variavelReal + (delta * ratioVar);
  const variavelProj = variavelMeta > 0 ? Math.min(variavelMeta, variavelProjBruta) : variavelProjBruta;
  const variavelDelta = Math.max(0, variavelProj - variavelReal);
  const pontosProjBrutos = pontosMeta > 0 ? ratioPontos * novoReal : pontosAtual + (delta * ratioPontos);
  const pontosProj = pontosMeta > 0 ? Math.max(0, Math.min(pontosMeta, pontosProjBrutos)) : Math.max(0, pontosProjBrutos);
  const pontosDelta = Math.max(0, pontosProj - pontosAtual);
  const atingAtual = meta > 0 ? (realizado / meta) * 100 : 0;
  const atingProj = meta > 0 ? (novoReal / meta) * 100 : 0;
  const atingDelta = Math.max(0, atingProj - atingAtual);

  title.textContent = `Impacto em ${product.label}`;
  subtitle.textContent = `${product.sectionLabel} • Meta de ${formatByMetric(metric, meta)}`;

  const variavelAtualLabel = formatBRLReadable(variavelReal);
  const variavelProjLabel = formatBRLReadable(variavelProj);
  const variavelDeltaLabel = formatSimulatorCurrencyDelta(variavelDelta);
  const pontosAtualLabel = formatPoints(pontosAtual, { withUnit: true });
  const pontosProjLabel = formatPoints(pontosProj, { withUnit: true });
  const pontosDeltaLabel = formatSimulatorPointsDelta(pontosDelta);
  const atingAtualLabel = `${atingAtual.toFixed(1)}%`;
  const atingProjLabel = `${atingProj.toFixed(1)}%`;
  const atingDeltaLabel = atingDelta > 0 ? `+${atingDelta.toFixed(1)} p.p.` : `${atingDelta.toFixed(1)} p.p.`;
  const deltaLabel = formatByMetric(metric, delta);
  const realizadoLabel = formatByMetric(metric, realizado);
  const novoRealLabel = formatByMetric(metric, novoReal);
  const metaLabel = formatByMetric(metric, meta);
  const pontosMetaLabel = pontosMeta ? formatPoints(pontosMeta, { withUnit: true }) : "";
  const variavelMetaLabel = variavelMeta ? formatBRLReadable(variavelMeta) : "";
  const atualizacao = product.ultimaAtualizacao ? `Última atualização: ${product.ultimaAtualizacao}` : "";

  cards.innerHTML = `
    <article class="sim-whatif-card sim-whatif-card--var">
      <header class="sim-whatif-card__head">
        <span class="sim-whatif-card__icon"><i class="ti ti-coin"></i></span>
        <h5>Remuneração variável</h5>
      </header>
      <dl class="sim-whatif-card__stats">
        <div><dt>Atual</dt><dd>${escapeHTML(variavelAtualLabel)}</dd></div>
        <div><dt>Projeção</dt><dd>${escapeHTML(variavelProjLabel)}</dd></div>
        <div><dt>Incremento</dt><dd class="sim-whatif-card__highlight">${escapeHTML(variavelDeltaLabel)}</dd></div>
      </dl>
      <p class="sim-whatif-card__meta">Meta de remuneração: ${escapeHTML(variavelMetaLabel || variavelProjLabel)}</p>
    </article>
    <article class="sim-whatif-card sim-whatif-card--points">
      <header class="sim-whatif-card__head">
        <span class="sim-whatif-card__icon"><i class="ti ti-medal"></i></span>
        <h5>Pontuação</h5>
      </header>
      <dl class="sim-whatif-card__stats">
        <div><dt>Atual</dt><dd>${escapeHTML(pontosAtualLabel)}</dd></div>
        <div><dt>Projeção</dt><dd>${escapeHTML(pontosProjLabel)}</dd></div>
        <div><dt>Incremento</dt><dd class="sim-whatif-card__highlight">${escapeHTML(pontosDeltaLabel)}</dd></div>
      </dl>
      <p class="sim-whatif-card__meta">Peso máximo: ${escapeHTML(pontosMetaLabel || pontosProjLabel)}</p>
    </article>
    <article class="sim-whatif-card sim-whatif-card--hit">
      <header class="sim-whatif-card__head">
        <span class="sim-whatif-card__icon"><i class="ti ti-target"></i></span>
        <h5>Atingimento</h5>
      </header>
      <dl class="sim-whatif-card__stats">
        <div><dt>Atual</dt><dd>${escapeHTML(atingAtualLabel)}</dd></div>
        <div><dt>Projeção</dt><dd>${escapeHTML(atingProjLabel)}</dd></div>
        <div><dt>Variação</dt><dd class="sim-whatif-card__highlight">${escapeHTML(atingDeltaLabel)}</dd></div>
      </dl>
      <p class="sim-whatif-card__meta">Realizado projetado: ${escapeHTML(novoRealLabel)}</p>
    </article>
  `;

  const footParts = [
    `Incremento informado: ${deltaLabel}`,
    `Realizado atual: ${realizadoLabel}`,
    `Meta vigente: ${metaLabel}`
  ];
  if (pontosMetaLabel) footParts.push(`Peso do indicador: ${pontosMetaLabel}`);
  if (atualizacao) footParts.push(atualizacao);

  foot.innerHTML = `
    <p>${footParts.map(part => escapeHTML(part)).join(" · ")}</p>
    <p class="sim-whatif__foot-note">Projeção linear considerando os filtros atuais. Resultados reais podem variar conforme regras específicas do indicador.</p>
  `;
}

/* ===== Aqui eu monto o resumo com os indicadores e pontos principais ===== */
function hitbarClass(p){ return p<50 ? "hitbar--low" : (p<100 ? "hitbar--warn" : "hitbar--ok"); }
function renderResumoKPI(summary, context = {}) {
  const {
    visibleItemsHitCount = null,
    visiblePointsHit = null,
    visibleVarAtingido = null,
    visibleVarMeta = null
  } = context || {};

  let kpi = $("#kpi-summary");
  if (!kpi) {
    const host = $("#resumo-summary") || $("#grid-familias");
    if (!host) return;
    kpi = document.createElement("div");
    kpi.id = "kpi-summary";
    kpi.className = "kpi-summary";
    host.prepend(kpi);
  } else {
    const summaryHost = $("#resumo-summary");
    if (summaryHost && kpi.parentElement !== summaryHost) {
      summaryHost.prepend(kpi);
    }
  }

  const indicadoresAtingidos = toNumber(summary.indicadoresAtingidos ?? visibleItemsHitCount ?? 0);
  const indicadoresTotal = toNumber(summary.indicadoresTotal ?? 0);
  const pontosAtingidos = toNumber(summary.pontosAtingidos ?? visiblePointsHit ?? 0);
  const pontosTotal = toNumber(summary.pontosPossiveis ?? 0);

  const varTotalBase = summary.varPossivel != null
    ? toNumber(summary.varPossivel)
    : (visibleVarMeta != null ? toNumber(visibleVarMeta) : 0);
  const varRealBase = summary.varAtingido != null
    ? toNumber(summary.varAtingido)
    : (visibleVarAtingido != null ? toNumber(visibleVarAtingido) : 0);

  const resumoAnim = state.animations?.resumo;
  const keyParts = [
    Math.round(indicadoresAtingidos || 0),
    Math.round(indicadoresTotal || 0),
    Math.round(pontosAtingidos || 0),
    Math.round(pontosTotal || 0),
    Math.round(varRealBase || 0),
    Math.round(varTotalBase || 0)
  ];
  const nextResumoKey = keyParts.join('|');
  const shouldAnimateResumo = resumoAnim?.kpiKey !== nextResumoKey;

  const formatDisplay = (type, value) => {
    if (type === "brl") return formatBRLReadable(value);
    if (type === "pts") return formatPoints(value);
    return formatIntReadable(value);
  };
  const formatFull = (type, value) => {
    if (type === "brl") {
      const n = Math.round(toNumber(value));
      return fmtBRL.format(n);
    }
    if (type === "pts") {
      return formatPoints(value, { withUnit: true });
    }
    const n = Math.round(toNumber(value));
    return fmtINT.format(n);
  };
  const buildTitle = (label, type, globalValue, visibleValue) => {
    let title = `${label}: ${formatFull(type, globalValue)}`;
    if (visibleValue != null && Math.round(toNumber(visibleValue)) !== Math.round(toNumber(globalValue))) {
      title += ` · Filtro atual: ${formatFull(type, visibleValue)}`;
    }
    return title;
  };

  const buildCard = (titulo, iconClass, atingidos, total, fmtType, visibleAting = null, visibleTotal = null, options = {}) => {
    const labelText = options.labelText || titulo;
    const labelTitle = escapeHTML(labelText);
    const labelHtml = options.labelHTML || escapeHTML(labelText);
    const pctRaw = total ? (atingidos / total) * 100 : 0;
    const pct100 = Math.max(0, Math.min(100, pctRaw));
    const hbClass = hitbarClass(pctRaw);
    const pctLabel = `${pctRaw.toFixed(1)}%`;
    const fillTarget = pct100.toFixed(2);
    const thumbPos = Math.max(0, Math.min(100, pctRaw));
    const atgTitle = buildTitle("Atingidos", fmtType, atingidos, visibleAting);
    const totTitle = buildTitle("Total", fmtType, total, visibleTotal);
    const hitbarClasses = ["hitbar", hbClass];
    if (options.emoji) hitbarClasses.push("hitbar--emoji");
    const trackStyle = `style="--target:${fillTarget}%; --thumb:${thumbPos.toFixed(2)}"`;
    const emojiHTML = options.emoji ? `<span class="hitbar__emoji" aria-hidden="true">${options.emoji}</span>` : "";

    return `
      <div class="kpi-pill">
        <div class="kpi-strip__main">
          <span class="kpi-icon"><i class="${iconClass}"></i></span>
          <div class="kpi-strip__text">
            <span class="kpi-strip__label" title="${labelTitle}">${labelHtml}</span>
            <div class="kpi-strip__stats">
              <span class="kpi-stat" title="${atgTitle}">Atg: <strong>${formatDisplay(fmtType, atingidos)}</strong></span>
              <span class="kpi-stat" title="${totTitle}">Total: <strong>${formatDisplay(fmtType, total)}</strong></span>
            </div>
          </div>
        </div>
        <div class="${hitbarClasses.join(' ')}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct100.toFixed(1)}" aria-valuetext="${titulo}: ${pctLabel}">
          <span class="hitbar__track" ${trackStyle}>
            <span class="hitbar__fill"></span>
            <span class="hitbar__thumb">${emojiHTML}<span class="hitbar__pct">${pctLabel}</span></span>
          </span>
        </div>
      </div>`;
  };

  kpi.innerHTML = [
    buildCard("Indicadores", "ti ti-list-check", indicadoresAtingidos, indicadoresTotal, "int", visibleItemsHitCount),
    buildCard("Pontos", "ti ti-medal", pontosAtingidos, pontosTotal, "pts", visiblePointsHit),
    buildCard(
      "Variável Estimada",
      "ti ti-cash",
      varRealBase,
      varTotalBase,
      "brl",
      visibleVarAtingido,
      visibleVarMeta,
      {
        labelText: "Variável Estimada",
        labelHTML: 'Variável <span class="kpi-label-emphasis">Estimada</span>'
      }
    )
  ].join("");

  triggerBarAnimation(kpi.querySelectorAll('.hitbar'), shouldAnimateResumo);
  if (resumoAnim) resumoAnim.kpiKey = nextResumoKey;
}

function buildResumoLegacyAnnualDataset(sections = []) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const period = state.period || { start: todayISO(), end: todayISO() };
  const monthKeys = buildMonthlyAxis(period);
  if (!safeSections.length || !monthKeys.length) {
    return { monthKeys: [], monthLabels: [], monthLongLabels: [], currentIdx: 0, sections: [] };
  }

  const monthCount = monthKeys.length;
  const monthLabels = monthKeys.map(monthKeyShortLabel);
  const monthLongLabels = monthKeys.map(monthKeyLabel);
  const monthIndex = new Map(monthKeys.map((key, idx) => [key, idx]));
  const rowsSource = Array.isArray(state._rankingRaw)
    ? filterRowsExcept(state._rankingRaw, {}, { searchTerm: state.tableSearchTerm, ignoreDate: true })
    : [];

  const normalizeKey = (value) => {
    if (value == null) return "";
    const slug = simplificarTexto(value);
    if (slug) return slug;
    const cleaned = limparTexto(value);
    if (cleaned) {
      const altSlug = simplificarTexto(cleaned);
      if (altSlug) return altSlug;
      return cleaned.toLowerCase();
    }
    const text = String(value).trim();
    return text ? text.toLowerCase() : "";
  };

  const buildKeyCandidates = (...values) => {
    const seen = new Set();
    const list = [];
    values.forEach(val => {
      const key = normalizeKey(val);
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push(key);
    });
    return list;
  };

  const productMonthly = new Map();
  const subMonthly = new Map();
  const lpMonthly = new Map();
  const hasDataByIndex = Array(monthCount).fill(false);

  const ensureProductEntry = (primaryKey, extra = {}, aliasKeys = []) => {
    if (!primaryKey) return { entry: null, key: "" };
    let entry = productMonthly.get(primaryKey);
    if (!entry) {
      entry = {
        id: extra.id || primaryKey,
        label: extra.label || extra.id || primaryKey,
        meta: Array(monthCount).fill(0),
        real: Array(monthCount).fill(0)
      };
      productMonthly.set(primaryKey, entry);
    } else {
      if (extra.id && !entry.id) entry.id = extra.id;
      if (extra.label && !entry.label) entry.label = extra.label;
    }
    aliasKeys.forEach(aliasKey => {
      if (!aliasKey || aliasKey === primaryKey) return;
      if (!productMonthly.has(aliasKey)) productMonthly.set(aliasKey, entry);
    });
    return { entry, key: primaryKey };
  };

  const ensureNestedEntry = (rootMap, productKey, nodeKey, extra = {}, nodeAliasKeys = [], productAliasKeys = []) => {
    if (!productKey || !nodeKey) return null;
    let childMap = rootMap.get(productKey);
    if (!childMap) {
      childMap = new Map();
      rootMap.set(productKey, childMap);
    }
    productAliasKeys.forEach(aliasKey => {
      if (!aliasKey || aliasKey === productKey) return;
      if (!rootMap.has(aliasKey)) rootMap.set(aliasKey, childMap);
    });
    let entry = childMap.get(nodeKey);
    if (!entry) {
      entry = {
        id: extra.id || nodeKey,
        label: extra.label || extra.id || nodeKey,
        meta: Array(monthCount).fill(0),
        real: Array(monthCount).fill(0)
      };
      childMap.set(nodeKey, entry);
    } else {
      if (extra.id && !entry.id) entry.id = extra.id;
      if (extra.label && !entry.label) entry.label = extra.label;
    }
    nodeAliasKeys.forEach(aliasKey => {
      if (!aliasKey || aliasKey === nodeKey) return;
      if (!childMap.has(aliasKey)) childMap.set(aliasKey, entry);
    });
    return entry;
  };

  rowsSource.forEach(row => {
    const rawDate = row?.competencia || row?.mes || row?.data || row?.dataReferencia || row?.dt;
    const key = normalizeMonthKey(rawDate);
    if (!monthIndex.has(key)) return;
    const idx = monthIndex.get(key);

    const metaVal = toNumber(row?.meta_mens ?? row?.meta ?? 0);
    const realVal = toNumber(row?.real_mens ?? row?.realizado ?? 0);
    if (metaVal || realVal) {
      hasDataByIndex[idx] = true;
    }

    const candidates = [
      row?.id_indicador,
      row?.indicadorId,
      row?.produtoId,
      row?.produto,
      row?.produtoNome,
      row?.prodOrSub,
      row?.ds_indicador
    ];
    let productId = "";
    for (const candidate of candidates) {
      if (!candidate) continue;
      const resolved = resolverIndicadorPorAlias(candidate);
      if (resolved) { productId = resolved; break; }
      const cleaned = limparTexto(candidate);
      if (cleaned) {
        const alt = resolverIndicadorPorAlias(cleaned);
        if (alt) { productId = alt; break; }
      }
    }
    if (!productId) {
      const fallback = limparTexto(row?.produtoId || row?.produto || row?.prodOrSub || row?.ds_indicador);
      if (fallback) productId = resolverIndicadorPorAlias(fallback) || fallback;
    }
    if (!productId) return;

    const productCandidates = buildKeyCandidates(
      productId,
      row?.id_indicador,
      row?.indicadorId,
      row?.produtoId,
      row?.produto,
      row?.produtoNome,
      row?.prodOrSub,
      row?.ds_indicador
    );
    if (!productCandidates.length) return;
    const [productKey, ...productAliasList] = productCandidates;
    const productLabelSource = row?.produtoNome || row?.produto || row?.prodOrSub || row?.ds_indicador || productId || productKey;
    const { entry: prodEntry, key: canonicalProductKey } = ensureProductEntry(
      productKey,
      {
        id: productId || productLabelSource || productKey,
        label: limparTexto(productLabelSource) || productLabelSource || productKey
      },
      productAliasList
    );
    if (!canonicalProductKey || !prodEntry) return;

    prodEntry.meta[idx] += metaVal;
    prodEntry.real[idx] += realVal;

    const productAliasRefs = buildKeyCandidates(canonicalProductKey, ...productAliasList);

    const subRawValues = [
      row?.subIndicadorId,
      row?.subIndicador,
      row?.subIndicadorNome,
      row?.linhaProdutoPai,
      row?.linhaProdutoParent
    ];
    const subCandidates = buildKeyCandidates(...subRawValues);
    if (subCandidates.length) {
      const [subKey, ...subAliasList] = subCandidates;
      const subLabelSource = row?.subIndicadorNome || row?.subIndicador || row?.subIndicadorId || subKey;
      const subEntry = ensureNestedEntry(
        subMonthly,
        canonicalProductKey,
        subKey,
        {
          id: subRawValues.find(val => val) || subKey,
          label: limparTexto(subLabelSource) || subLabelSource || subKey
        },
        subAliasList,
        productAliasRefs
      );
      if (subEntry) {
        subEntry.meta[idx] += metaVal;
        subEntry.real[idx] += realVal;
      }
    }

    const lpRawValues = [
      row?.linhaProdutoId,
      row?.lpId,
      row?.subproduto,
      row?.linhaProdutoNome,
      row?.lpNome
    ];
    const lpCandidates = buildKeyCandidates(...lpRawValues);
    if (lpCandidates.length) {
      const [lpKey, ...lpAliasList] = lpCandidates;
      const lpLabelSource = row?.linhaProdutoNome || row?.lpNome || row?.subproduto || row?.linhaProdutoId || row?.lpId || lpKey;
      const lpEntry = ensureNestedEntry(
        lpMonthly,
        canonicalProductKey,
        lpKey,
        {
          id: lpRawValues.find(val => val) || lpKey,
          label: limparTexto(lpLabelSource) || lpLabelSource || lpKey
        },
        lpAliasList,
        productAliasRefs
      );
      if (lpEntry) {
        lpEntry.meta[idx] += metaVal;
        lpEntry.real[idx] += realVal;
      }
    }
  });

  let currentIdx = monthCount ? monthCount - 1 : 0;
  for (let idx = monthCount - 1; idx >= 0; idx--) {
    if (hasDataByIndex[idx]) {
      currentIdx = idx;
      break;
    }
  }

  const aggregateChildrenMonths = (children) => {
    const totalsMeta = Array(monthCount).fill(0);
    const totalsReal = Array(monthCount).fill(0);
    let hasData = false;
    children.forEach(child => {
      const childMonths = Array.isArray(child?.months) ? child.months : [];
      childMonths.forEach((month, idx) => {
        const metaVal = Number(month?.meta) || 0;
        const realVal = Number(month?.real) || 0;
        if (metaVal || realVal) hasData = true;
        if (idx < totalsMeta.length) {
          totalsMeta[idx] += metaVal;
          totalsReal[idx] += realVal;
        }
      });
    });
    return { totalsMeta, totalsReal, hasData };
  };

  const buildNodeCandidateKeys = (node, extra = []) => {
    const values = [];
    if (node) {
      values.push(
        node.id,
        node.nome,
        node.label,
        node.produtoId,
        node.produtoNome,
        node.indicadorId,
        node.indicadorCodigo
      );
      if (Array.isArray(node.aliases)) values.push(...node.aliases);
      if (Array.isArray(node.subProdutos)) values.push(...node.subProdutos);
    }
    if (Array.isArray(extra)) values.push(...extra);
    return buildKeyCandidates(...values);
  };

  const resolveIndicatorKey = (item) => {
    const candidates = buildNodeCandidateKeys(item);
    for (const key of candidates) {
      if (productMonthly.has(key) || subMonthly.has(key) || lpMonthly.has(key)) return key;
    }
    return candidates[0] || "";
  };

  const makeMonthsFromEntry = (entry) => monthKeys.map((monthKey, idx) => {
    const metaVal = entry ? entry.meta[idx] : 0;
    const realVal = entry ? entry.real[idx] : 0;
    const ating = metaVal > 0 ? (realVal / metaVal) * 100 : NaN;
    return {
      key: monthKey,
      label: monthLongLabels[idx],
      short: monthLabels[idx],
      meta: metaVal,
      real: realVal,
      atingimento: ating
    };
  });

  const buildChildNodes = (children, indicatorKey) => {
    const safeChildren = Array.isArray(children) ? children : [];
    if (!safeChildren.length) return [];
    return safeChildren.map(child => {
      const candidates = buildNodeCandidateKeys(child);
      const preferSub = Array.isArray(child.children) && child.children.length > 0;
      let entry = null;
      if (indicatorKey) {
        const primaryMap = (preferSub ? subMonthly : lpMonthly).get(indicatorKey);
        if (primaryMap) {
          for (const key of candidates) {
            if (primaryMap.has(key)) { entry = primaryMap.get(key); break; }
          }
        }
        if (!entry) {
          const fallbackMap = (preferSub ? lpMonthly : subMonthly).get(indicatorKey);
          if (fallbackMap) {
            for (const key of candidates) {
              if (fallbackMap.has(key)) { entry = fallbackMap.get(key); break; }
            }
          }
        }
      }

      const months = makeMonthsFromEntry(entry);
      const nestedChildren = buildChildNodes(child.children, indicatorKey);
      if (nestedChildren.length) {
        const { totalsMeta, totalsReal, hasData } = aggregateChildrenMonths(nestedChildren);
        if (hasData) {
          months.forEach((month, idx) => {
            const metaVal = totalsMeta[idx];
            const realVal = totalsReal[idx];
            month.meta = metaVal;
            month.real = realVal;
            month.atingimento = metaVal > 0 ? (realVal / metaVal) * 100 : NaN;
          });
        }
      }
      const monthMeta = months[currentIdx]?.meta ?? 0;
      const monthReal = months[currentIdx]?.real ?? 0;
      return {
        ...child,
        months,
        monthMeta,
        monthReal,
        children: nestedChildren
      };
    });
  };

  const datasetSections = safeSections.map(section => {
    const items = (section.items || []).map(item => {
      const indicatorKey = resolveIndicatorKey(item);
      const entry = indicatorKey ? productMonthly.get(indicatorKey) || null : null;
      const months = makeMonthsFromEntry(entry);
      const children = buildChildNodes(item.children, indicatorKey);
      const { totalsMeta, totalsReal, hasData } = aggregateChildrenMonths(children);
      if (hasData) {
        months.forEach((month, idx) => {
          const metaVal = totalsMeta[idx];
          const realVal = totalsReal[idx];
          month.meta = metaVal;
          month.real = realVal;
          month.atingimento = metaVal > 0 ? (realVal / metaVal) * 100 : NaN;
        });
      }
      const monthMeta = months[currentIdx]?.meta ?? 0;
      const monthReal = months[currentIdx]?.real ?? 0;
      return {
        ...item,
        months,
        monthMeta,
        monthReal,
        children
      };
    });

    return {
      ...section,
      items
    };
  });

  return { monthKeys, monthLabels, monthLongLabels, currentIdx, sections: datasetSections };
}

function renderResumoLegacyAnnualMatrix(host, sections = [], summary = {}) {
  if (!host) return false;
  const dataset = buildResumoLegacyAnnualDataset(sections);
  const { monthLabels, monthLongLabels, currentIdx, sections: sectionData } = dataset;
  if (!sectionData.length) return false;

  const currentShort = monthLabels[currentIdx] || "";
  const currentLong = monthLongLabels[currentIdx] || currentShort || "";
  const metaHeader = currentShort ? `Meta ${currentShort}` : "Meta (Mês atual)";
  const metaHeaderTitle = currentLong ? `Meta do mês ${currentLong}` : "Meta do mês atual";
  const realHeader = currentShort ? `Realizado ${currentShort}` : "Realizado (Mês atual)";
  const realHeaderTitle = currentLong ? `Realizado do mês ${currentLong}` : "Realizado do mês atual";

  const metricInfo = {
    valor: { label: "Valor", title: "Indicador financeiro" },
    qtd:   { label: "Quantidade", title: "Indicador por quantidade" },
    perc:  { label: "Percentual", title: "Indicador percentual" }
  };

  sectionData.forEach(section => {
    const items = Array.isArray(section.items) ? section.items : [];
    const totals = section.totals || {};
    const pontosTotal = Number(totals.pontosTotal) || items.reduce((acc, item) => acc + (Number(item.pontosMeta ?? item.peso) || 0), 0);
    const pontosHit = Number(totals.pontosHit) || items.reduce((acc, item) => acc + Math.min(Number(item.pontos ?? 0) || 0, Number(item.pontosMeta ?? item.peso) || 0), 0);
    const metaTotal = Number(totals.metaTotal) || items.reduce((acc, item) => acc + (Number(item.meta) || 0), 0);
    const realizadoTotal = Number(totals.realizadoTotal) || items.reduce((acc, item) => acc + (Number(item.realizado) || 0), 0);

    const atingPctBase = Number.isFinite(totals.atingPct) ? totals.atingPct : (metaTotal ? (realizadoTotal / metaTotal) * 100 : 0);
    const hasMeta = metaTotal > 0;
    const atingSectionClamped = hasMeta ? Math.max(0, Math.min(200, atingPctBase)) : 0;
    const atingSectionLabel = hasMeta ? `${atingSectionClamped.toFixed(1)}%` : "—";

    const uniqueMetrics = new Set(items.map(item => item.metric));
    const singleMetric = uniqueMetrics.size === 1 ? (uniqueMetrics.values().next().value || "") : "";
    const normalizedMetric = typeof singleMetric === "string" ? singleMetric.toLowerCase() : "";
    const canAggregateMetric = normalizedMetric === "valor" || normalizedMetric === "qtd";
    const aggregatedLabel = normalizedMetric === "qtd" ? "Quantidade" : (normalizedMetric === "valor" ? "Realizado" : "");
    const aggregatedValue = canAggregateMetric ? formatByMetric(normalizedMetric, realizadoTotal) : "";

    const sectionEl = document.createElement("section");
    sectionEl.className = "resumo-legacy__section resumo-legacy__section--annual card card--legacy";
    const safeLabel = escapeHTML(section.label || "Indicadores");
    const chipPointsTitle = `Pontos: ${formatPoints(pontosHit, { withUnit: true })} / ${formatPoints(pontosTotal, { withUnit: true })}`;
    const pontosHitLabel = escapeHTML(fmtINT.format(Math.round(pontosHit || 0)));
    const pontosTotalLabel = escapeHTML(fmtINT.format(Math.round(pontosTotal || 0)));
    const sectionHasExpandableRows = items.some(item => Array.isArray(item.children) && item.children.length);
    const sectionToggleClass = `resumo-legacy__section-toggle${sectionHasExpandableRows ? "" : " is-disabled"}`;
    const sectionToggleAttrs = sectionHasExpandableRows ? "" : " disabled aria-disabled=\"true\"";

    const statsPieces = [
      `<div class=\"resumo-legacy__stat\"><span class=\"resumo-legacy__stat-label\">Peso total</span><strong class=\"resumo-legacy__stat-value\">${escapeHTML(fmtINT.format(Math.round(pontosTotal || 0)))}</strong></div>`
    ];
    if (canAggregateMetric && aggregatedLabel) {
      statsPieces.push(`<div class=\"resumo-legacy__stat\"><span class=\"resumo-legacy__stat-label\">${aggregatedLabel}</span><strong class=\"resumo-legacy__stat-value\">${escapeHTML(aggregatedValue)}</strong></div>`);
    }
    statsPieces.push(`<div class=\"resumo-legacy__stat\"><span class=\"resumo-legacy__stat-label\">Atingimento</span><strong class=\"resumo-legacy__stat-value\">${atingSectionLabel}</strong></div>`);

    const monthHeadCells = monthLabels.map((label, idx) => {
      const classes = ["resumo-legacy__col--month-head"];
      if (idx === currentIdx) classes.push("is-current");
      const headerLabel = label || `M${idx + 1}`;
      const headerTitle = monthLongLabels[idx] || headerLabel;
      return `<th scope=\"col\" class=\"${classes.join(" ")}\" title=\"${escapeHTML(headerTitle)}\">${escapeHTML(headerLabel)}</th>`;
    }).join("");

    sectionEl.innerHTML = `
      <header class="resumo-legacy__head">
        <div class="resumo-legacy__heading">
          <div class="resumo-legacy__title-row">
            <span class="resumo-legacy__name">${safeLabel}</span>
            <div class="resumo-legacy__section-actions">
              <button type="button" class="${sectionToggleClass}" data-expanded="false"${sectionToggleAttrs}>
                <i class="ti ti-filter" aria-hidden="true"></i>
                <span class="resumo-legacy__section-toggle-label">Abrir todos os filtros</span>
              </button>
            </div>
          </div>
          <div class="resumo-legacy__chips">
            <span class="resumo-legacy__chip"><i class="ti ti-box-multiple" aria-hidden="true"></i>${escapeHTML(fmtINT.format(items.length || 0))} indicadores</span>
            <span class="resumo-legacy__chip" title="${escapeHTML(chipPointsTitle)}">Pontos ${pontosHitLabel} / ${pontosTotalLabel}</span>
          </div>
        </div>
        <div class="resumo-legacy__stats">
          ${statsPieces.join("")}
        </div>
      </header>
      <div class="resumo-legacy__table-wrapper">
        <table class="resumo-legacy__table resumo-legacy__table--annual">
          <thead>
            <tr>
            <th scope="col">Subindicador</th>
              <th scope="col" class="resumo-legacy__col--peso">Peso</th>
              <th scope="col" class="resumo-legacy__col--meta" title="${escapeHTML(metaHeaderTitle)}">${escapeHTML(metaHeader)}</th>
              <th scope="col" class="resumo-legacy__col--real" title="${escapeHTML(realHeaderTitle)}">${escapeHTML(realHeader)}</th>
              ${monthHeadCells}
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    const tbody = sectionEl.querySelector("tbody");
    if (!tbody) return;

    let rowAutoId = 0;
    const rowToggleHandlers = new Map();
    const sectionToggle = sectionEl.querySelector(".resumo-legacy__section-toggle");
    const sectionToggleLabel = sectionEl.querySelector(".resumo-legacy__section-toggle-label");

    const syncSectionToggleState = () => {
      if (!sectionToggle) return;
      if (!rowToggleHandlers.size) {
        sectionToggle.setAttribute("data-expanded", "false");
        sectionToggle.classList.remove("is-expanded");
        if (!sectionHasExpandableRows) {
          sectionToggle.classList.add("is-disabled");
          sectionToggle.setAttribute("aria-disabled", "true");
          sectionToggle.setAttribute("disabled", "true");
        }
        if (sectionToggleLabel) sectionToggleLabel.textContent = "Abrir todos os filtros";
        return;
      }
      sectionToggle.classList.remove("is-disabled");
      sectionToggle.removeAttribute("aria-disabled");
      sectionToggle.removeAttribute("disabled");
      let expandedCount = 0;
      rowToggleHandlers.forEach((_, rowId) => {
        const rowEl = tbody.querySelector(`tr[data-row-id="${rowId}"]`);
        if (rowEl?.classList.contains("is-expanded")) expandedCount += 1;
      });
      const allExpanded = expandedCount > 0 && expandedCount === rowToggleHandlers.size;
      sectionToggle.setAttribute("data-expanded", String(allExpanded));
      sectionToggle.classList.toggle("is-expanded", allExpanded);
      if (sectionToggleLabel) sectionToggleLabel.textContent = allExpanded ? "Recolher filtros" : "Abrir todos os filtros";
    };

    items.forEach(item => {
      const pesoValor = Number(item.pontosMeta ?? item.peso ?? 0);
      const pesoLabel = escapeHTML(fmtINT.format(Math.round(pesoValor || 0)));
      const metricKeyRaw = typeof item.metric === "string" ? item.metric.toLowerCase() : "";
      const metricMeta = metricInfo[metricKeyRaw] || { label: item.metric || "—", title: "Métrica do indicador" };
      const metricLabel = escapeHTML(metricMeta.label || "—");
      const metricTitle = escapeHTML(metricMeta.title || "Métrica do indicador");

      const currentMeta = item.monthMeta ?? 0;
      const currentReal = item.monthReal ?? 0;
      const metaDisplay = formatByMetric(item.metric, currentMeta);
      const realizadoDisplay = formatByMetric(item.metric, currentReal);
      const metaFull = formatMetricFull(item.metric, currentMeta);
      const realizadoFull = formatMetricFull(item.metric, currentReal);
      const metaCell = escapeHTML(metaDisplay);
      const metaTitleSafe = escapeHTML(metaFull);
      const realizadoCell = escapeHTML(realizadoDisplay);
      const realizadoTitleSafe = escapeHTML(realizadoFull);

      const monthCellsHtml = (item.months || monthLabels.map(() => ({}))).map((month, idx) => {
        const pct = Number.isFinite(month?.atingimento) ? month.atingimento : NaN;
        const classes = ["resumo-legacy__col--month"];
        if (Number.isFinite(pct)) classes.push(pctBadgeCls(pct)); else classes.push("is-empty");
        if (idx === currentIdx) classes.push("is-current");
        const pctLabel = Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "—";
        const monthLabel = month?.label || month?.short || `Mês ${idx + 1}`;
        const tooltip = Number.isFinite(pct)
          ? `${monthLabel}: ${pctLabel}`
          : `${monthLabel}: sem dados disponíveis`;
        return `<td class="${classes.join(' ')}" title="${escapeHTML(tooltip)}"><span>${pctLabel}</span></td>`;
      }).join("");

      const hasChildren = nodeHasChildren(item);
      const rowId = `legacy-annual-${section.id || "sec"}-${rowAutoId++}`;
      const produtoCellHtml = hasChildren
        ? `<div class="resumo-legacy__prod"><button type="button" class="resumo-legacy__prod-toggle" aria-expanded="false"><i class="ti ti-chevron-right resumo-legacy__prod-toggle-icon" aria-hidden="true"></i><span class="resumo-legacy__prod-name" title="${escapeHTML(item.nome || "")}">${escapeHTML(item.nome || "—")}</span><span class="resumo-legacy__prod-meta" title="${metricTitle}">${metricLabel}</span></button></div>`
        : `<div class="resumo-legacy__prod"><span class="resumo-legacy__prod-name" title="${escapeHTML(item.nome || "")}">${escapeHTML(item.nome || "—")}</span><span class="resumo-legacy__prod-meta" title="${metricTitle}">${metricLabel}</span></div>`;

      let childRowsHtml = "";
      if (hasChildren) {
        childRowsHtml = item.children.map(child => {
          const childMetricKey = typeof child.metric === "string" ? child.metric.toLowerCase() : metricKeyRaw;
          const childMetricMeta = metricInfo[childMetricKey] || { label: child.metric || "—", title: "Métrica do indicador" };
          const childMetricLabel = escapeHTML(childMetricMeta.label || "—");
          const childMetricTitle = escapeHTML(childMetricMeta.title || "Métrica do indicador");
          const childMetaDisplay = formatByMetric(childMetricKey, child.monthMeta ?? 0);
          const childMetaFull = formatMetricFull(childMetricKey, child.monthMeta ?? 0);
          const childRealDisplay = formatByMetric(childMetricKey, child.monthReal ?? 0);
          const childRealFull = formatMetricFull(childMetricKey, child.monthReal ?? 0);
          const childMetaCell = escapeHTML(childMetaDisplay);
          const childMetaTitle = escapeHTML(childMetaFull);
          const childRealCell = escapeHTML(childRealDisplay);
          const childRealTitle = escapeHTML(childRealFull);
          const childPesoValor = Number(child.pontosMeta ?? child.peso ?? 0);
          const childPesoLabel = childPesoValor ? escapeHTML(fmtINT.format(Math.round(childPesoValor))) : "—";
          const childMonthsHtml = (child.months || monthLabels.map(() => ({}))).map((month, idx) => {
            const pct = Number.isFinite(month?.atingimento) ? month.atingimento : NaN;
            const classes = ["resumo-legacy__col--month"];
            if (Number.isFinite(pct)) classes.push(pctBadgeCls(pct)); else classes.push("is-empty");
            if (idx === currentIdx) classes.push("is-current");
            const pctLabel = Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "—";
            const monthLabel = month?.label || month?.short || `Mês ${idx + 1}`;
            const tooltip = Number.isFinite(pct)
              ? `${monthLabel}: ${pctLabel}`
              : `${monthLabel}: sem dados disponíveis`;
            return `<td class="${classes.join(' ')}" title="${escapeHTML(tooltip)}"><span>${pctLabel}</span></td>`;
          }).join("");

          return `
            <tr class=\"resumo-legacy__child-row\" data-parent-id=\"${rowId}\" hidden>
              <th scope=\"row\">
                <div class=\"resumo-legacy__prod resumo-legacy__prod--child\">
                  <span class=\"resumo-legacy__prod-name\" title=\"${escapeHTML(child.label || "")}\">${escapeHTML(child.label || "—")}</span>
                  <span class=\"resumo-legacy__prod-meta\" title=\"${childMetricTitle}\">${childMetricLabel}</span>
                </div>
              </th>
              <td class=\"resumo-legacy__col--peso\">${childPesoLabel}</td>
              <td class=\"resumo-legacy__col--meta\" title=\"${childMetaTitle}\">${childMetaCell}</td>
              <td class=\"resumo-legacy__col--real\" title=\"${childRealTitle}\">${childRealCell}</td>
              ${childMonthsHtml}
            </tr>`;
        }).join("");
      }

      tbody.insertAdjacentHTML("beforeend", `
        <tr class="resumo-legacy__row resumo-legacy__row--annual${hasChildren ? " has-children" : ""}" data-row-id="${rowId}">
          <th scope="row">
            ${produtoCellHtml}
          </th>
          <td class="resumo-legacy__col--peso" title="Peso do indicador">${pesoLabel}</td>
          <td class="resumo-legacy__col--meta" title="${metaTitleSafe}">${metaCell}</td>
          <td class="resumo-legacy__col--real" title="${realizadoTitleSafe}">${realizadoCell}</td>
          ${monthCellsHtml}
        </tr>
        ${childRowsHtml}
      `);

      if (hasChildren) {
        const mainRow = tbody.querySelector(`tr[data-row-id="${rowId}"]`);
        const toggleBtn = mainRow?.querySelector(".resumo-legacy__prod-toggle");
        if (mainRow && toggleBtn) {
          const toggleChildren = (expand) => {
            const nextState = typeof expand === "boolean" ? expand : toggleBtn.getAttribute("aria-expanded") !== "true";
            toggleBtn.setAttribute("aria-expanded", String(nextState));
            mainRow.classList.toggle("is-expanded", nextState);
            tbody.querySelectorAll(`tr[data-parent-id="${rowId}"]`).forEach(childRow => {
              childRow.hidden = !nextState;
            });
            syncSectionToggleState();
          };

          toggleBtn.addEventListener("click", ev => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleChildren();
          });

          mainRow.addEventListener("click", ev => {
            if (ev.target.closest(".resumo-legacy__prod-toggle")) return;
            toggleChildren();
          });

          rowToggleHandlers.set(rowId, toggleChildren);
        }
      }
    });

    if (sectionToggle) {
      if (sectionHasExpandableRows) {
        sectionToggle.addEventListener("click", ev => {
          ev.preventDefault();
          const targetState = sectionToggle.getAttribute("data-expanded") !== "true";
          rowToggleHandlers.forEach(toggleFn => {
            toggleFn(targetState);
          });
          sectionToggle.setAttribute("data-expanded", String(targetState));
          sectionToggle.classList.toggle("is-expanded", targetState);
          if (sectionToggleLabel) sectionToggleLabel.textContent = targetState ? "Recolher filtros" : "Abrir todos os filtros";
        });
      } else {
        sectionToggle.classList.add("is-disabled");
        sectionToggle.setAttribute("aria-disabled", "true");
        sectionToggle.setAttribute("disabled", "true");
      }
    }

    syncSectionToggleState();

    host.appendChild(sectionEl);
  });

  return true;
}

function buildResumoLegacySections(sections = []) {
  const hierarchy = getResumoHierarchy();
  if (!hierarchy.length) return [];

  const sanitizeLegacyChildren = (list, parentSlug = "") => {
    if (!Array.isArray(list) || !list.length) return [];
    const normalizedParent = simplificarTexto(parentSlug || "");
    const seen = new Set();
    return list.reduce((acc, entry) => {
      if (!entry) return acc;
      const slug = simplificarTexto(entry.nome || entry.label || entry.id || "");
      if (!slug) return acc;
      if (normalizedParent && slug === normalizedParent) return acc;
      if (seen.has(slug)) return acc;
      entry.children = sanitizeLegacyChildren(entry.children, slug);
      acc.push(entry);
      seen.add(slug);
      return acc;
    }, []);
  };

  const cloneNodeWithDepth = (node, depth = 0) => {
    if (!node) return null;
    const cloned = { ...node, __legacyDepth: depth };
    const children = Array.isArray(node.children) ? node.children : [];
    cloned.children = children.map(child => cloneNodeWithDepth(child, depth + 1));
    return cloned;
  };

  const periodStart = state.period?.start || "";
  const periodEnd = state.period?.end || "";
  const diasTotais = businessDaysBetweenInclusive(periodStart, periodEnd);
  const diasDecorridos = businessDaysElapsedUntilToday(periodStart, periodEnd);
  const diasRestantes = Math.max(0, diasTotais - diasDecorridos);

  const normalizeNodeMetrics = (node = {}, fallbackMetric = "valor") => {
    const metric = typeof node.metric === "string" && node.metric ? node.metric.toLowerCase() : fallbackMetric;
    const metaVal = Number(node.meta) || 0;
    const realVal = Number(node.realizado) || 0;
    const variavelMetaVal = Number(node.variavelMeta) || 0;
    const variavelRealVal = Number(node.variavelReal) || 0;
    const pesoVal = Number(node.peso ?? node.pontosMeta) || 0;
    const pontosMetaVal = Number(node.pontosMeta ?? node.peso) || pesoVal;
    const pontosBrutosVal = Number(node.pontos ?? Math.min(pesoVal, realVal)) || 0;
    const ultimaAtualizacao = node.ultimaAtualizacao || node.ultimaAtualizacaoTexto || "";
    const ating = metaVal ? realVal / metaVal : 0;
    const metaDiariaValCandidate = toNumber(node.metaDiaria);
    const metaDiariaVal = Number.isFinite(metaDiariaValCandidate)
      ? metaDiariaValCandidate
      : (diasTotais > 0 ? metaVal / diasTotais : 0);
    const referenciaCandidate = toNumber(
      node.referenciaHoje ?? node.referenciaDia ?? node.referencia ?? node.referenciaAtual
    );
    const referenciaHojeVal = Number.isFinite(referenciaCandidate)
      ? referenciaCandidate
      : (diasDecorridos > 0 ? Math.min(metaVal, metaDiariaVal * diasDecorridos) : 0);
    const metaNecCandidate = toNumber(
      node.metaDiariaNecessaria ?? node.metaNecessaria ?? node.metaDiaNecessaria ?? node.metaDiariaRestante
    );
    const metaDiariaNecessariaVal = Number.isFinite(metaNecCandidate)
      ? metaNecCandidate
      : (diasRestantes > 0 ? Math.max(0, (metaVal - realVal) / diasRestantes) : 0);
    const projecaoCandidate = toNumber(node.projecao ?? node.forecast ?? node.previsao);
    const projecaoVal = Number.isFinite(projecaoCandidate)
      ? projecaoCandidate
      : (diasDecorridos > 0 ? (realVal / Math.max(diasDecorridos, 1)) * diasTotais : realVal);
    return {
      ...node,
      metric,
      meta: metaVal,
      realizado: realVal,
      variavelMeta: variavelMetaVal,
      variavelReal: variavelRealVal,
      peso: pesoVal,
      pontosMeta: pontosMetaVal,
      pontosBrutos: pontosBrutosVal,
      pontos: Math.max(0, Math.min(pesoVal || pontosMetaVal, pontosBrutosVal)),
      metaDiaria: metaDiariaVal,
      referenciaHoje: referenciaHojeVal,
      metaDiariaNecessaria: metaDiariaNecessariaVal,
      projecao: projecaoVal,
      ating,
      atingido: metaVal ? realVal >= metaVal : false,
      ultimaAtualizacao
    };
  };

  const alignChildrenToDefinition = (defs = [], existing = [], fallbackMetric = "valor", options = {}) => {
    const normalizedDefs = Array.isArray(defs) ? defs : [];
    const allowOrphans = options.allowOrphans ?? (normalizedDefs.length === 0);
    const existingList = Array.isArray(existing) ? existing : [];
    const map = new Map(existingList.map(child => {
      const key = simplificarTexto(child.id || child.nome || child.label || "");
      return [key, normalizeNodeMetrics(child, fallbackMetric)];
    }));
    let result = normalizedDefs.map(def => {
      const key = simplificarTexto(def.id || def.nome);
      const existingNode = key ? map.get(key) : null;
      if (key) map.delete(key);
      const baseNode = existingNode || normalizeNodeMetrics({
        id: def.id,
        nome: def.nome,
        label: def.nome,
        metric: def.metric || fallbackMetric,
        meta: 0,
        realizado: 0,
        variavelMeta: 0,
        variavelReal: 0,
        peso: Number(def.peso) || 0,
        pontosMeta: Number(def.peso) || 0,
        pontos: 0,
        metaDiaria: 0,
        referenciaHoje: 0,
        metaDiariaNecessaria: 0,
        projecao: 0,
        ultimaAtualizacao: ""
      }, def.metric || fallbackMetric);
      baseNode.id = baseNode.id || def.id || key || baseNode.nome;
      baseNode.nome = def.nome || baseNode.nome;
      baseNode.label = baseNode.nome;
      const childDefs = Array.isArray(def.children) ? def.children : [];
      const existingChildren = existingNode?.children || [];
      baseNode.children = alignChildrenToDefinition(childDefs, existingChildren, baseNode.metric);
      if (childDefs.length > 0 && !baseNode.children.length) {
        baseNode.children = childDefs.map(child => normalizeNodeMetrics({
          id: child.id,
          nome: child.nome,
          label: child.nome,
          metric: child.metric || baseNode.metric,
          meta: 0,
          realizado: 0,
          variavelMeta: 0,
          variavelReal: 0,
          peso: Number(child.peso) || 0,
          pontosMeta: Number(child.peso) || 0,
          pontos: 0,
          metaDiaria: 0,
          referenciaHoje: 0,
          metaDiariaNecessaria: 0,
          projecao: 0,
          ultimaAtualizacao: ""
        }, child.metric || baseNode.metric));
        baseNode.children = baseNode.children.map(childNode => ({
          ...childNode,
          children: Array.isArray(child.children) ? alignChildrenToDefinition(child.children, [], childNode.metric) : []
        }));
      }
      baseNode.hasChildren = childDefs.length > 0 || nodeHasChildren(baseNode) ? 1 : normalizeHasChildrenFlag(baseNode.hasChildren);
      ensureHierarchyHasChildren(baseNode);
      return baseNode;
    });
    const leftover = Array.from(map.values());
    if (normalizedDefs.length && leftover.length) {
      const totals = leftover.reduce((acc, child) => {
        acc.meta += Number(child.meta) || 0;
        acc.realizado += Number(child.realizado) || 0;
        acc.variavelMeta += Number(child.variavelMeta) || 0;
        acc.variavelReal += Number(child.variavelReal) || 0;
        acc.peso += Number(child.peso) || 0;
        acc.pontos += Number(child.pontos) || 0;
        acc.pontosMeta += Number(child.pontosMeta) || 0;
        acc.pontosBrutos += Number(child.pontosBrutos) || 0;
        acc.metaDiaria += Number(child.metaDiaria) || 0;
        acc.referenciaHoje += Number(child.referenciaHoje) || 0;
        acc.metaDiariaNecessaria += Number(child.metaDiariaNecessaria) || 0;
        acc.projecao += Number(child.projecao) || 0;
        const ultima = child.ultimaAtualizacao || "";
        if (ultima && (!acc.ultimaAtualizacao || ultima > acc.ultimaAtualizacao)) {
          acc.ultimaAtualizacao = ultima;
        }
        return acc;
      }, {
        meta: 0,
        realizado: 0,
        variavelMeta: 0,
        variavelReal: 0,
        peso: 0,
        pontos: 0,
        pontosMeta: 0,
        pontosBrutos: 0,
        metaDiaria: 0,
        referenciaHoje: 0,
        metaDiariaNecessaria: 0,
        projecao: 0,
        ultimaAtualizacao: ""
      });
      const weightSum = normalizedDefs.reduce((acc, def) => acc + Math.max(0.01, Number(def.peso) || 1), 0);
      result = result.map((node, idx) => {
        const weight = Math.max(0.01, Number(normalizedDefs[idx]?.peso) || 1);
        const share = weightSum ? weight / weightSum : (1 / Math.max(1, normalizedDefs.length));
        const augmented = { ...node };
        augmented.meta += totals.meta * share;
        augmented.realizado += totals.realizado * share;
        augmented.variavelMeta += totals.variavelMeta * share;
        augmented.variavelReal += totals.variavelReal * share;
        augmented.peso += totals.peso * share;
        augmented.pontos += totals.pontos * share;
        augmented.pontosMeta += totals.pontosMeta * share;
        augmented.pontosBrutos += totals.pontosBrutos * share;
        augmented.metaDiaria += totals.metaDiaria * share;
        augmented.referenciaHoje += totals.referenciaHoje * share;
        augmented.metaDiariaNecessaria += totals.metaDiariaNecessaria * share;
        augmented.projecao += totals.projecao * share;
        if (totals.ultimaAtualizacao) {
          const currentUltima = augmented.ultimaAtualizacao || "";
          if (!currentUltima || totals.ultimaAtualizacao > currentUltima) {
            augmented.ultimaAtualizacao = totals.ultimaAtualizacao;
          }
        }
        return normalizeNodeMetrics(augmented, augmented.metric || fallbackMetric);
      });
    } else {
      result = result.map(node => normalizeNodeMetrics(node, node.metric || fallbackMetric));
    }
    if (allowOrphans) {
      leftover.forEach(child => {
        const fallback = normalizeNodeMetrics({
          ...child,
          nome: child.nome || child.label || child.id,
          label: child.nome || child.label || child.id,
          children: Array.isArray(child.children) ? child.children : []
        }, child.metric || fallbackMetric);
        fallback.children = alignChildrenToDefinition([], fallback.children, fallback.metric);
        ensureHierarchyHasChildren(fallback);
        result.push(fallback);
      });
    }
    return result;
  };

  const lookup = new Map();
  sections.forEach(sec => {
    const items = Array.isArray(sec.items) ? sec.items : [];
    items.forEach(item => {
      if (!item) return;
      const aliasSet = new Set([
        item.id,
        item.nome,
        item.produtoId,
        item.produtoNome,
        item.indicadorId,
        item.indicadorCodigo,
      ]);
      if (Array.isArray(item.aliases)) item.aliases.forEach(alias => aliasSet.add(alias));
      if (Array.isArray(item.subProdutos)) item.subProdutos.forEach(alias => aliasSet.add(alias));
      aliasSet.forEach(alias => {
        const slug = simplificarTexto(alias);
        if (slug && !lookup.has(slug)) {
          lookup.set(slug, item);
        }
      });
    });
  });

  const toISODate = (value = "") => {
    const text = limparTexto(value);
    if (!text) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return "";
  };

  const cloneItem = (item, fallbackNome) => {
    const cloned = { ...item };
    cloned.nome = fallbackNome || item.nome || item.id;
    if (Object.prototype.hasOwnProperty.call(item, "hasChildren")) {
      cloned.hasChildren = normalizeHasChildrenFlag(item.hasChildren);
    }
    if (Array.isArray(item.aliases)) cloned.aliases = item.aliases.slice();
    if (Array.isArray(item.subProdutos)) cloned.subProdutos = item.subProdutos.slice();
    if (Array.isArray(item.children)) {
      cloned.children = item.children.map(child => ({ ...child }));
    }
    ensureHierarchyHasChildren(cloned);
    return cloned;
  };

  const result = [];

  hierarchy.forEach(secDef => {
    if (!secDef || !Array.isArray(secDef.familias)) return;
    const sectionItems = [];
    let secMeta = 0;
    let secReal = 0;
    let secPontosMeta = 0;
    let secPontos = 0;
    let secVariavelMeta = 0;
    let secVariavelReal = 0;

    secDef.familias.forEach(famDef => {
      if (!famDef || !Array.isArray(famDef.indicadores)) return;
      let famMeta = 0;
      let famReal = 0;
      let famPontosMeta = 0;
      let famPontos = 0;
      let famVariavelMeta = 0;
      let famVariavelReal = 0;
      const familyIndicators = [];

      famDef.indicadores.forEach(indDef => {
        if (!indDef) return;
        const candidates = [indDef.id, indDef.slug, indDef.nome, ...(Array.isArray(indDef.aliases) ? indDef.aliases : [])];
        let match = null;
        for (const candidate of candidates) {
          const slug = simplificarTexto(candidate);
          if (slug && lookup.has(slug)) {
            match = lookup.get(slug);
            break;
          }
        }

        let rowItem;
        if (match) {
          rowItem = cloneItem(match, indDef.nome);
        } else {
          rowItem = {
            id: indDef.id || indDef.slug,
            nome: indDef.nome,
            metric: "valor",
            meta: 0,
            realizado: 0,
            variavelMeta: 0,
            variavelReal: 0,
            pontosMeta: 0,
            pontosBrutos: 0,
            pontos: 0,
            metaDiaria: 0,
            referenciaHoje: 0,
            metaDiariaNecessaria: 0,
            projecao: 0,
            ating: 0,
            atingVariavel: 0,
            atingido: false,
            ultimaAtualizacao: "",
            aliases: Array.isArray(indDef.aliases) ? indDef.aliases.slice() : []
          };
        }

        rowItem = normalizeNodeMetrics(rowItem, rowItem.metric || match?.metric || "valor");

        if (!rowItem.familiaId) rowItem.familiaId = famDef.id;
        rowItem.familiaNome = famDef.nome;
        rowItem.familiaNodeId = famDef.id;
        rowItem.familiaNodeNome = famDef.nome;
        if (!rowItem.secaoId) rowItem.secaoId = secDef.id;
        rowItem.secaoLabel = rowItem.secaoLabel || secDef.label;
        rowItem.secaoNodeId = secDef.id;
        rowItem.type = "indicator";
        rowItem.ating = rowItem.meta ? rowItem.realizado / rowItem.meta : 0;
        rowItem.atingVariavel = rowItem.variavelMeta ? rowItem.variavelReal / rowItem.variavelMeta : 0;

        const structureDefs = Array.isArray(indDef.subindicadores) ? indDef.subindicadores : [];
        const hasStructure = structureDefs.length > 0;
        const existingChildren = Array.isArray(rowItem.children)
          ? rowItem.children.map(child => normalizeNodeMetrics(child, rowItem.metric || match?.metric || "valor"))
          : [];
        const indicatorKeyRaw = rowItem.cardId || rowItem.id || indDef.id;
        const indicatorKey = limparTexto(indicatorKeyRaw);
        const indicatorSlug = simplificarTexto(indicatorKeyRaw);
        const forcedEmpty = !!(
          (indicatorKey && FORCED_EMPTY_SUBINDICADORES.has(indicatorKey)) ||
          (indicatorSlug && FORCED_EMPTY_SUBINDICADORES.has(indicatorSlug))
        );
        if (forcedEmpty) {
          rowItem.children = [];
        } else if (hasStructure) {
          rowItem.children = alignChildrenToDefinition(
            structureDefs,
            existingChildren,
            rowItem.metric || match?.metric || "valor",
            { allowOrphans: false }
          );
        } else if (existingChildren.length) {
          rowItem.children = existingChildren.map(child => ({
            ...child,
            children: Array.isArray(child.children)
              ? child.children.map(grand => normalizeNodeMetrics(grand, child.metric || rowItem.metric || "valor"))
              : []
          }));
        } else {
          rowItem.children = alignChildrenToDefinition([], [], rowItem.metric || match?.metric || "valor");
        }

        const shouldFlagChildren = hasStructure || nodeHasChildren(rowItem);
        rowItem.hasChildren = shouldFlagChildren ? 1 : normalizeHasChildrenFlag(rowItem.hasChildren);
        ensureHierarchyHasChildren(rowItem);

        const parentSlug = simplificarTexto(rowItem.nome || rowItem.label || rowItem.id || "");
        rowItem.children = sanitizeLegacyChildren(rowItem.children, parentSlug);

        ensureHierarchyHasChildren(rowItem);

        const pontosMeta = Number(rowItem.pontosMeta ?? rowItem.peso ?? 0) || 0;
        const pontosBrutos = Number(rowItem.pontosBrutos ?? rowItem.pontos ?? 0) || 0;
        const pontosReal = Math.max(0, Math.min(pontosMeta, pontosBrutos));
        const metaVal = Number(rowItem.meta) || 0;
        const realVal = Number(rowItem.realizado) || 0;
        const variavelMetaVal = Number(rowItem.variavelMeta) || 0;
        const variavelRealVal = Number(rowItem.variavelReal) || 0;

        famMeta += metaVal;
        famReal += realVal;
        famPontosMeta += pontosMeta;
        famPontos += pontosReal;
        famVariavelMeta += variavelMetaVal;
        famVariavelReal += variavelRealVal;


        familyIndicators.push(rowItem);
      });

      if (!familyIndicators.length) return;

      const familiaParentSlug = simplificarTexto(famDef.nome || famDef.id || "");
      const sanitizedIndicators = sanitizeLegacyChildren(
        familyIndicators.map(entry => ({ ...entry })),
        familiaParentSlug
      );

      const indicatorRows = sanitizedIndicators.map(indicator => {
        const clonedIndicator = cloneNodeWithDepth(indicator, 1);
        clonedIndicator.type = clonedIndicator.type === "family" ? "indicator" : (clonedIndicator.type || "indicator");
        clonedIndicator.familiaId = famDef.id;
        clonedIndicator.familiaNome = famDef.nome;
        clonedIndicator.familiaNodeId = famDef.id;
        clonedIndicator.familiaNodeNome = famDef.nome;
        clonedIndicator.secaoId = secDef.id;
        clonedIndicator.secaoLabel = secDef.label;
        clonedIndicator.secaoNodeId = secDef.id;
        if (!Array.isArray(clonedIndicator.children)) {
          clonedIndicator.children = [];
        }
        ensureHierarchyHasChildren(clonedIndicator);
        return clonedIndicator;
      });

      indicatorRows.forEach(indicator => {
        sectionItems.push(indicator);
      });

      secMeta += famMeta;
      secReal += famReal;
      secPontosMeta += famPontosMeta;
      secPontos += famPontos;
      secVariavelMeta += famVariavelMeta;
      secVariavelReal += famVariavelReal;
    });

    if (!sectionItems.length) return;

    result.push({
      id: secDef.id,
      label: secDef.label,
      items: sectionItems,
      totals: {
        metaTotal: secMeta,
        realizadoTotal: secReal,
        pontosTotal: secPontosMeta,
        pontosHit: secPontos,
        variavelMeta: secVariavelMeta,
        variavelReal: secVariavelReal,
        atingPct: secMeta ? (secReal / secMeta) * 100 : 0
      }
    });
  });

  return result;
}

function applyResumoMode(mode = "cards") {
  const normalized = mode === "legacy" ? "legacy" : "cards";
  const cardsView = $("#resumo-cards");
  const legacyView = $("#resumo-legacy");
  if (cardsView) cardsView.classList.toggle("hidden", normalized !== "cards");
  if (legacyView) legacyView.classList.toggle("hidden", normalized !== "legacy");

  const toggle = $("#resumo-mode-toggle");
  if (toggle) {
    toggle.querySelectorAll(".seg-btn").forEach(btn => {
      const btnMode = btn.dataset.mode === "legacy" ? "legacy" : "cards";
      const isActive = btnMode === normalized;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }
}

function setResumoMode(mode, { persist = true } = {}) {
  const normalized = mode === "legacy" ? "legacy" : "cards";
  if (state.resumoMode !== normalized) {
    state.resumoMode = normalized;
    if (persist) writeLocalStorageItem(RESUMO_MODE_STORAGE_KEY, normalized);
  }
  applyResumoMode(normalized);
}

function setupResumoModeToggle() {
  const container = $("#resumo-mode-toggle");
  if (!container || container.dataset.bound) return;
  container.dataset.bound = "1";
  container.querySelectorAll(".seg-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode === "legacy" ? "legacy" : "cards";
      setResumoMode(mode);
    });
  });
  applyResumoMode(state.resumoMode || "cards");
}
/* ===== Aqui eu cuido do tooltip dos cards para explicar cada indicador ===== */
function buildCardTooltipHTML(item) {
  const { total: diasTotais, elapsed: diasDecorridos, remaining: diasRestantes } = getCurrentMonthBusinessSnapshot();

  let meta = toNumber(item.meta);
  let realizado = toNumber(item.realizado);
  if (item.metric === "perc") meta = 100;

  const fmt = (m, v) => {
    if (!Number.isFinite(v)) v = 0;
    if (m === "perc") return `${v.toFixed(1)}%`;
    if (m === "qtd") return fmtINT.format(Math.round(v));
    return fmtBRL.format(Math.round(v));
  };

  const faltaTotal         = Math.max(0, meta - realizado);
  const necessarioPorDia   = diasRestantes > 0 ? (faltaTotal / diasRestantes) : 0;
  const mediaDiariaAtual   = diasDecorridos > 0 ? (realizado / diasDecorridos) : 0;
  const projecaoRitmoAtual = mediaDiariaAtual * (diasTotais || 0);
  const referenciaHoje     = diasTotais > 0 ? (meta / diasTotais) * diasDecorridos : 0;

  const necessarioPorDiaDisp = diasRestantes > 0 ? fmt(item.metric, necessarioPorDia) : "—";
  const referenciaHojeDisp   = diasDecorridos > 0 ? fmt(item.metric, referenciaHoje) : "—";

  return `
    <div class="kpi-tip" role="dialog" aria-label="Detalhes do indicador">
      <h5>Projeção e metas</h5>
      <div class="row"><span>Quantidade de dias úteis no mês</span><span>${fmtINT.format(diasTotais)}</span></div>
      <div class="row"><span>Dias úteis trabalhados</span><span>${fmtINT.format(diasDecorridos)}</span></div>
      <div class="row"><span>Dias úteis que faltam</span><span>${fmtINT.format(diasRestantes)}</span></div>
      <div class="row"><span>Falta para a meta</span><span>${fmt(item.metric, faltaTotal)}</span></div>
      <div class="row"><span>Referência para hoje</span><span>${referenciaHojeDisp}</span></div>
      <div class="row"><span>Meta diária necessária</span><span>${necessarioPorDiaDisp}</span></div>
      <div class="row"><span>Projeção (ritmo atual)</span><span>${fmt(item.metric, projecaoRitmoAtual)}</span></div>
    </div>
  `;
}
function positionTip(badge, tip) {
  const card = badge.closest(".prod-card") || badge.closest(".kpi-pill");
  if (!card) return;
  const b = badge.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;

  let top = (b.bottom - c.top) + 8;
  if (b.bottom + th + 12 > vh) top = (b.top - c.top) - th - 8;

  let left;
  if (card.classList.contains("kpi-pill")) {
    left = (b.left - c.left) + (b.width / 2) - (tw / 2);
    const minLeft = 12;
    const maxLeft = Math.max(minLeft, c.width - tw - 12);
    left = Math.min(Math.max(left, minLeft), maxLeft);
    const absLeft = c.left + left;
    if (absLeft < 12) left = 12;
    if (absLeft + tw > vw - 12) left = Math.max(12, vw - 12 - c.left - tw);
  } else {
    left = c.width - tw - 12;
    const absLeft = c.left + left;
    if (absLeft < 12) left = 12;
    if (absLeft + tw > vw - 12) left = Math.max(12, vw - 12 - c.left - tw);
  }

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}
function closeAllTips(){
  $$(".kpi-tip.is-open").forEach(t=>{ t.classList.remove("is-open"); t.style.left=""; t.style.top=""; });
  $$(".prod-card.is-tip-open, .kpi-pill.is-tip-open").forEach(c=>c.classList.remove("is-tip-open"));
}

/* listeners globais para tooltips (uma vez) */
let __tipGlobalsWired = false;
function wireTipGlobalsOnce(){
  if(__tipGlobalsWired) return;
  __tipGlobalsWired = true;
  const close = () => closeAllTips();
  document.addEventListener("click", (e)=>{ if(!e.target.closest(".prod-card")) close(); });
  document.addEventListener("touchstart", (e)=>{ if(!e.target.closest(".prod-card")) close(); }, {passive:true});
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") close(); });
  document.addEventListener("scroll", close, { capture:true, passive:true });
  window.addEventListener("resize", close);
}

function bindBadgeTooltip(card){
  const tip = card.querySelector(".kpi-tip");
  const badge = card.querySelector(".badge");
  if(!tip || !badge) return;

  const open = ()=>{
    closeAllTips();
    tip.classList.add("is-open");
    card.classList.add("is-tip-open");
    positionTip(badge, tip);
  };
  const close = ()=>{
    tip.classList.remove("is-open");
    card.classList.remove("is-tip-open");
    tip.style.left=""; tip.style.top="";
  };

  badge.addEventListener("mouseenter", open);
  card.addEventListener("mouseleave", close);
  badge.addEventListener("click",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); });
  badge.addEventListener("touchstart",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); }, {passive:true});

  wireTipGlobalsOnce();
}

/* ===== Aqui eu gero os cards de cada seção/família com métricas e metas ===== */
function getStatusFilter(){
  const raw = $("#f-status-kpi")?.value;
  return normalizarChaveStatus(raw) || "todos";
}
function buildDashboardDatasetFromRows(rows = [], period = state.period || {}) {
  SUBPRODUTO_TO_INDICADOR.clear();
  const productMeta = new Map();
  const aggregated = new Map();

  CARD_SECTIONS_DEF.forEach(sec => {
    const familiaMeta = FAMILIA_BY_ID.get(sec.id);
    sec.items.forEach(item => {
      const familiaInfo = PRODUTO_TO_FAMILIA.get(item.id) || familiaMeta || { id: sec.id, nome: sec.label };
      productMeta.set(item.id, {
        id: item.id,
        nome: item.nome,
        icon: item.icon,
        metric: item.metric,
        peso: item.peso,
        hiddenInCards: item.hiddenInCards,
        sectionId: sec.id,
        sectionLabel: sec.label,
        familiaId: familiaInfo?.id || sec.id,
        familiaLabel: familiaInfo?.nome || sec.label,
      });

      if (!aggregated.has(item.id)) {
        const aliasSet = new Set();
        aliasSet.add(item.id);
        if (item.nome) aliasSet.add(item.nome);
        if (Array.isArray(item.aliases)) {
          item.aliases.forEach(alias => {
            const texto = limparTexto(alias);
            if (texto) aliasSet.add(texto);
          });
        }

        const subIndicatorMap = new Map();
        const subDefs = SUBINDICADORES_BY_INDICADOR.get(item.id) || [];
        subDefs.forEach(sub => {
          const key = simplificarTexto(sub.id) || sub.id;
          subIndicatorMap.set(key, {
            id: sub.id,
            nome: sub.nome,
            metric: sub.metric || item.metric || "valor",
            meta: 0,
            realizado: 0,
            variavelMeta: 0,
            variavelReal: 0,
            peso: Number(sub.peso) || 0,
            pontos: 0,
            ultimaAtualizacao: "",
            children: new Map(),
            hasData: false,
          });
        });

        aggregated.set(item.id, {
          id: item.id,
          nome: item.nome,
          icon: item.icon || DEFAULT_CARD_ICON,
          metric: item.metric || "valor",
          peso: item.peso != null ? item.peso : 1,
          hiddenInCards: Boolean(item.hiddenInCards),
          secaoId: sec.id,
          secaoLabel: sec.label,
          familiaId: familiaInfo?.id || sec.id,
          familiaLabel: familiaInfo?.nome || sec.label,
          metaTotal: 0,
          realizadoTotal: 0,
          variavelMeta: 0,
          variavelReal: 0,
          pesoTotal: 0,
          pesoAtingido: 0,
          pontos: 0,
          ultimaAtualizacao: "",
          aliases: aliasSet,
          subIndicators: subIndicatorMap,
          subProdutos: new Set(),
          hasData: false,
          unknown: item.id === "desconhecido",
        });
      } else {
        const agg = aggregated.get(item.id);
        if (item.nome && !agg.aliases?.has(item.nome)) agg.aliases?.add(item.nome);
        agg.nome = item.nome || agg.nome;
        agg.icon = item.icon || agg.icon;
        agg.metric = item.metric || agg.metric;
        if (item.peso != null) agg.peso = item.peso;
        agg.secaoId = sec.id;
        agg.secaoLabel = sec.label;
        agg.familiaId = familiaInfo?.id || agg.familiaId;
        agg.familiaLabel = familiaInfo?.nome || agg.familiaLabel;
      }
    });
  });
  rows.forEach(row => {
    let productId = row.produtoId || row.produto || row.prodOrSub;
    if (!productId) return;
    const rawProductId = productId;
    let meta = productMeta.get(productId);
    let resolvedId = productId;
    let isUnknown = false;
    if (!meta) {
      isUnknown = true;
      resolvedId = "desconhecido";
      meta = productMeta.get(resolvedId) || {};
    }
    const secaoId = meta.sectionId || row.secaoId || row.familiaId || "outros";
    const secaoLabel = meta.sectionLabel || row.secaoNome || row.familiaNome || row.familia || getSectionLabel(secaoId) || "Outros";
    const familiaId = row.familiaId || row.familia || secaoId;
    const familiaLabel = row.familiaNome || row.familia || (familiaId === secaoId ? secaoLabel : familiaId) || secaoLabel;
    let agg = aggregated.get(resolvedId);
    if (!agg) {
      agg = {
        id: resolvedId,
        nome: meta.nome || row.produtoNome || row.produto || (isUnknown ? "Desconhecido" : resolvedId),
        icon: meta.icon || (isUnknown ? "ti ti-help" : "ti ti-dots"),
        metric: meta.metric || row.metric || "valor",
        peso: meta.peso || row.peso || 1,
        hiddenInCards: !!meta.hiddenInCards,
        secaoId,
        secaoLabel,
        familiaId,
        familiaLabel,
        metaTotal: 0,
        realizadoTotal: 0,
        variavelMeta: 0,
        variavelReal: 0,
        pesoTotal: 0,
        pesoAtingido: 0,
        pontos: 0,
        ultimaAtualizacao: "",
        unknown: isUnknown
      };
      aplicarIndicadorAliases(agg, agg.id, agg.nome);
      aggregated.set(resolvedId, agg);
    } else {
      if (!agg.familiaId && familiaId) {
        agg.familiaId = familiaId;
      }
      if ((!agg.familiaLabel || agg.familiaLabel === agg.familiaId) && familiaLabel) {
        agg.familiaLabel = familiaLabel;
      }
      if (!agg.secaoId && secaoId) {
        agg.secaoId = secaoId;
      }
      if ((!agg.secaoLabel || agg.secaoLabel === agg.secaoId) && secaoLabel) {
        agg.secaoLabel = secaoLabel;
      }
    }

    const metaValor = Number(row.meta) || 0;
    const realizadoValor = Number(row.realizado) || 0;
    agg.metaTotal += metaValor;
    agg.realizadoTotal += realizadoValor;
    agg.variavelMeta += Number(row.variavelMeta) || 0;
    agg.variavelReal += Number(row.variavelReal) || 0;
    const pesoLinha = Number(row.peso) || agg.peso;
    agg.pesoTotal += pesoLinha;
    if (metaValor > 0 && realizadoValor >= metaValor) {
      agg.pesoAtingido += pesoLinha;
    }
    agg.pontos += Number(row.pontos) || 0;
    if (row.data && row.data > agg.ultimaAtualizacao) {
      agg.ultimaAtualizacao = row.data;
    }

    const aliasCandidates = [
      row.id_indicador,
      row.ds_indicador,
      row.produtoId,
      row.produtoNome,
      row.produto,
      row.prodOrSub,
      rawProductId,
    ];
    if (!agg.aliases) agg.aliases = new Set();
    aliasCandidates.forEach(val => {
      const texto = limparTexto(val);
      if (!texto) return;
      agg.aliases.add(texto);
      registrarAliasIndicador(agg.id, texto);
    });
    if (agg.unknown) {
      if (!agg.children) agg.children = new Map();
      const unknownLabel = limparTexto(row.produtoNome || row.produto || row.prodOrSub || rawProductId) || "Produto fora do catálogo";
      const unknownKey = simplificarTexto(rawProductId || unknownLabel) || `desconhecido_${agg.children.size + 1}`;
      let childEntry = agg.children.get(unknownKey);
      if (!childEntry) {
        childEntry = {
          id: limparTexto(rawProductId) || unknownKey,
          label: unknownLabel,
          metric: typeof row.metric === "string" ? row.metric.toLowerCase() : (agg.metric || "valor"),
          meta: 0,
          realizado: 0,
          variavelMeta: 0,
          variavelReal: 0,
          peso: 0,
          pontos: 0,
          ultimaAtualizacao: "",
        };
        agg.children.set(unknownKey, childEntry);
      }
      childEntry.meta += metaValor;
      childEntry.realizado += realizadoValor;
      childEntry.variavelMeta += Number(row.variavelMeta) || 0;
      childEntry.variavelReal += Number(row.variavelReal) || 0;
      childEntry.peso += Number(row.peso) || agg.peso;
      childEntry.pontos += Number(row.pontos) || 0;
      if (row.data && row.data > childEntry.ultimaAtualizacao) {
        childEntry.ultimaAtualizacao = row.data;
      }
    }
    const subIndicadorOriginal = row.subIndicadorId || row.subIndicador || row.subindicadorId || row.subindicador || "";
    const subIndicadorNome = row.subIndicadorNome || row.subIndicador || row.subindicadorNome || subIndicadorOriginal;
    const subIndicadorSlug = simplificarTexto(subIndicadorOriginal || subIndicadorNome);
    const lpOriginal = row.linhaProdutoId || row.linhaProduto || row.lpId || row.subproduto || "";
    const lpNome = row.linhaProdutoNome || row.lpNome || row.subproduto || lpOriginal;
    const lpSlug = simplificarTexto(lpOriginal || lpNome);

    if (subIndicadorSlug) {
      if (!agg.subIndicators) agg.subIndicators = new Map();
      let subEntry = agg.subIndicators.get(subIndicadorSlug);
      if (!subEntry) {
        subEntry = {
          id: limparTexto(subIndicadorOriginal) || subIndicadorSlug,
          label: limparTexto(subIndicadorNome) || subIndicadorSlug,
          metric: typeof row.metric === "string" ? row.metric.toLowerCase() : (typeof agg.metric === "string" ? agg.metric.toLowerCase() : "valor"),
          meta: 0,
          realizado: 0,
          variavelMeta: 0,
          variavelReal: 0,
          peso: 0,
          pontos: 0,
          ultimaAtualizacao: "",
          children: new Map()
        };
        agg.subIndicators.set(subIndicadorSlug, subEntry);
      }
      if (!subEntry.metric && row.metric) subEntry.metric = String(row.metric).toLowerCase();
      subEntry.meta += metaValor;
      subEntry.realizado += realizadoValor;
      subEntry.variavelMeta += Number(row.variavelMeta) || 0;
      subEntry.variavelReal += Number(row.variavelReal) || 0;
      subEntry.peso += pesoLinha;
      subEntry.pontos += Number(row.pontos) || 0;
      if (row.data && row.data > subEntry.ultimaAtualizacao) {
        subEntry.ultimaAtualizacao = row.data;
      }

      if (lpSlug) {
        const childMap = subEntry.children instanceof Map ? subEntry.children : new Map();
        if (!(subEntry.children instanceof Map)) subEntry.children = childMap;
        let childEntry = childMap.get(lpSlug);
        if (!childEntry) {
          childEntry = {
            id: limparTexto(lpOriginal) || lpSlug,
            label: limparTexto(lpNome) || lpSlug,
            metric: typeof row.metric === "string" ? row.metric.toLowerCase() : (subEntry.metric || agg.metric || "valor"),
            meta: 0,
            realizado: 0,
            variavelMeta: 0,
            variavelReal: 0,
            peso: 0,
            pontos: 0,
            ultimaAtualizacao: ""
          };
          childMap.set(lpSlug, childEntry);
        }
        if (!childEntry.metric && row.metric) childEntry.metric = String(row.metric).toLowerCase();
        childEntry.meta += metaValor;
        childEntry.realizado += realizadoValor;
        childEntry.variavelMeta += Number(row.variavelMeta) || 0;
        childEntry.variavelReal += Number(row.variavelReal) || 0;
        childEntry.peso += pesoLinha;
        childEntry.pontos += Number(row.pontos) || 0;
        if (row.data && row.data > childEntry.ultimaAtualizacao) {
          childEntry.ultimaAtualizacao = row.data;
        }
      }
    } else {
      const subprodutoOriginal = row.subproduto || row.subProduto || "";
      const subprodutoTexto = limparTexto(subprodutoOriginal);
      if (subprodutoTexto) {
        if (!agg.subProdutos) agg.subProdutos = new Set();
        agg.subProdutos.add(subprodutoTexto);
        registrarAliasIndicador(agg.id, subprodutoTexto);
        SUBPRODUTO_TO_INDICADOR.set(simplificarTexto(subprodutoTexto), agg.id);
        if (!agg.children) agg.children = new Map();
        const childKey = simplificarTexto(subprodutoTexto) || subprodutoTexto.toLowerCase();
        let child = agg.children.get(childKey);
        if (!child) {
          child = {
            id: childKey || subprodutoTexto,
            label: limparTexto(subprodutoOriginal) || subprodutoTexto,
            metric: typeof row.metric === "string" ? row.metric.toLowerCase() : (typeof agg.metric === "string" ? agg.metric.toLowerCase() : "valor"),
            meta: 0,
            realizado: 0,
            variavelMeta: 0,
            variavelReal: 0,
            peso: 0,
            pontos: 0,
            ultimaAtualizacao: ""
          };
          agg.children.set(childKey, child);
        }
        if (!child.metric && row.metric) child.metric = String(row.metric).toLowerCase();
        child.meta += metaValor;
        child.realizado += realizadoValor;
        child.variavelMeta += Number(row.variavelMeta) || 0;
        child.variavelReal += Number(row.variavelReal) || 0;
        child.peso += pesoLinha;
        child.pontos += Number(row.pontos) || 0;
        if (row.data && row.data > child.ultimaAtualizacao) {
          child.ultimaAtualizacao = row.data;
        }
      }
    }
  });

  productMeta.forEach((meta, id) => {
    let agg = aggregated.get(id);
    if (!agg) {
      const aliasSet = new Set();
      aliasSet.add(id);
      if (meta.nome) aliasSet.add(meta.nome);
      agg = {
        id,
        nome: meta.nome || id,
        icon: meta.icon || DEFAULT_CARD_ICON,
        metric: meta.metric || "valor",
        peso: meta.peso != null ? meta.peso : 1,
        hiddenInCards: Boolean(meta.hiddenInCards),
        secaoId: meta.sectionId,
        secaoLabel: meta.sectionLabel,
        familiaId: meta.familiaId,
        familiaLabel: meta.familiaLabel,
        metaTotal: 0,
        realizadoTotal: 0,
        variavelMeta: 0,
        variavelReal: 0,
        pesoTotal: 0,
        pesoAtingido: 0,
        pontos: 0,
        ultimaAtualizacao: "",
        aliases: aliasSet,
        subIndicators: new Map(),
        subProdutos: new Set(),
        hasData: false,
        unknown: id === "desconhecido",
      };
      aggregated.set(id, agg);
    } else {
      if (!agg.aliases) {
        const aliasSet = new Set();
        aliasSet.add(id);
        if (meta.nome) aliasSet.add(meta.nome);
        agg.aliases = aliasSet;
      }
      if (!agg.metric && meta.metric) agg.metric = meta.metric;
      if (!agg.secaoId && meta.sectionId) agg.secaoId = meta.sectionId;
      if ((!agg.secaoLabel || agg.secaoLabel === agg.secaoId) && meta.sectionLabel) agg.secaoLabel = meta.sectionLabel;
      if (!agg.familiaId && meta.familiaId) agg.familiaId = meta.familiaId;
      if ((!agg.familiaLabel || agg.familiaLabel === agg.familiaId) && meta.familiaLabel) agg.familiaLabel = meta.familiaLabel;
    }
    if (!(agg.subIndicators instanceof Map)) agg.subIndicators = new Map();
    if (!(agg.subProdutos instanceof Set)) agg.subProdutos = new Set();
  });

  aggregated.forEach(agg => {
    if (!agg.aliases) {
      const aliasSet = new Set();
      aliasSet.add(agg.id);
      if (agg.nome) aliasSet.add(agg.nome);
      agg.aliases = aliasSet;
    }
    agg.hasData = Boolean(agg.hasData || agg.metaTotal || agg.realizadoTotal || agg.variavelMeta || agg.variavelReal || agg.pontos);
  });

  let sections = [];
  CARD_SECTIONS_DEF.forEach(sec => {
    const items = sec.items.map(item => {
      const agg = aggregated.get(item.id);
      if (!agg) return null;
      if (agg.secaoId && agg.secaoId !== sec.id) return null;
      const ating = agg.metaTotal ? (agg.realizadoTotal / agg.metaTotal) : 0;
      const variavelAting = agg.variavelMeta ? (agg.variavelReal / agg.variavelMeta) : ating;
      const pontosMeta = Number(item.peso) || 0;
      const pontosBrutos = Number.isFinite(agg.pontos) ? agg.pontos : 0;
      const pontosCumpridos = Math.max(0, Math.min(pontosMeta, pontosBrutos));
      const ultimaISO = agg.ultimaAtualizacao || period.end || period.start || todayISO();
      const cardBase = {
        id: agg.id,
        nome: agg.nome,
        icon: agg.icon,
        metric: agg.metric,
        peso: item.peso,
        secaoId: sec.id,
        secaoLabel: sec.label,
        familiaId: agg.familiaId,
        familiaLabel: agg.familiaLabel,
        meta: agg.metaTotal,
        realizado: agg.realizadoTotal,
        variavelMeta: agg.variavelMeta,
        variavelReal: agg.variavelReal,
        ating,
        atingVariavel: variavelAting,
        atingido: ating >= 1,
        pontos: pontosCumpridos,
        pontosMeta,
        pontosBrutos,
        ultimaAtualizacao: formatBRDate(ultimaISO)
      };
      aplicarIndicadorAliases(cardBase, agg.id, agg.nome);
      cardBase.prodOrSub = agg.produtoNome || agg.nome || agg.id;
      if (agg.aliases) cardBase.aliases = Array.from(agg.aliases);
      if (agg.subProdutos) cardBase.subProdutos = Array.from(agg.subProdutos);
      if (agg.subIndicators && agg.subIndicators.size) {
        cardBase.children = Array.from(agg.subIndicators.values()).map(sub => {
          const childList = sub.children instanceof Map
            ? Array.from(sub.children.values())
            : Array.isArray(sub.children) ? sub.children : [];
          const node = {
            id: sub.id,
            nome: sub.label,
            label: sub.label,
            metric: sub.metric || agg.metric,
            meta: sub.meta,
            realizado: sub.realizado,
            variavelMeta: sub.variavelMeta,
            variavelReal: sub.variavelReal,
            peso: sub.peso,
            pontos: sub.pontos,
            ultimaAtualizacao: sub.ultimaAtualizacao,
            children: childList.map(child => {
              const grandNode = {
                id: child.id,
                nome: child.label,
                label: child.label,
                metric: child.metric || sub.metric || agg.metric,
                meta: child.meta,
                realizado: child.realizado,
                variavelMeta: child.variavelMeta,
                variavelReal: child.variavelReal,
                peso: child.peso,
                pontos: child.pontos,
                ultimaAtualizacao: child.ultimaAtualizacao,
                children: []
              };
              ensureHierarchyHasChildren(grandNode);
              return grandNode;
            })
          };
          ensureHierarchyHasChildren(node);
          return node;
        });
      } else if (agg.children && agg.children.size) {
        cardBase.children = Array.from(agg.children.values()).map(child => {
          const node = {
            id: child.id,
            nome: child.label,
            label: child.label,
            metric: child.metric || agg.metric,
            meta: child.meta,
            realizado: child.realizado,
            variavelMeta: child.variavelMeta,
            variavelReal: child.variavelReal,
            peso: child.peso,
            pontos: child.pontos,
            ultimaAtualizacao: child.ultimaAtualizacao,
            children: []
          };
          ensureHierarchyHasChildren(node);
          return node;
        });
      }
      ensureHierarchyHasChildren(cardBase);
      return cardBase;
    }).filter(Boolean);
    if (items.length) {
      sections.push({ id: sec.id, label: sec.label, items });
    }
  });

  sections.forEach(section => {
    section.items.forEach(item => {
      const itemHasData = Boolean(item.meta || item.realizado || item.variavelMeta || item.variavelReal || item.pontos);
      item.hasData = itemHasData;
      if (Array.isArray(item.children)) {
        item.children.forEach(child => {
          const childHasData = Boolean(
            child.meta || child.realizado || child.variavelMeta || child.variavelReal || child.pontos
            || (Array.isArray(child.children) && child.children.some(grand => grand.meta || grand.realizado || grand.variavelMeta || grand.variavelReal || grand.pontos))
          );
          child.hasData = childHasData;
        });
      }
    });
  });

  sections = sections.filter(section => {
    if (section.id === "outros") {
      return section.items.some(item => item.hasData);
    }
    return true;
  });

  const allItems = sections.flatMap(sec => sec.items);
  const indicadoresTotal = allItems.length;
  const indicadoresAtingidos = allItems.filter(item => item.atingido).length;
  const pontosPossiveis = allItems.reduce((acc, item) => acc + (item.pontosMeta ?? item.peso ?? 0), 0);
  const pontosAtingidos = allItems.reduce((acc, item) => acc + (item.pontos ?? 0), 0);
  const metaTotal = allItems.reduce((acc, item) => acc + (item.meta || 0), 0);
  const realizadoTotal = allItems.reduce((acc, item) => acc + (item.realizado || 0), 0);
  const varPossivel = allItems.reduce((acc, item) => acc + (item.variavelMeta || 0), 0);
  const varAtingido = allItems.reduce((acc, item) => acc + (item.variavelReal || 0), 0);

  const summary = {
    indicadoresTotal,
    indicadoresAtingidos,
    indicadoresPct: indicadoresTotal ? indicadoresAtingidos / indicadoresTotal : 0,
    pontosPossiveis,
    pontosAtingidos,
    pontosPct: pontosPossiveis ? pontosAtingidos / pontosPossiveis : 0,
    metaTotal,
    realizadoTotal,
    metaPct: metaTotal ? realizadoTotal / metaTotal : 0,
    varPossivel,
    varAtingido,
    varPct: varPossivel ? varAtingido / varPossivel : 0
  };

  return { sections, summary };
}

function updateDashboardCards() {
  const factRows = state.facts?.dados || fDados;
  if (!Array.isArray(factRows) || !factRows.length) {
    const empty = buildDashboardDatasetFromRows([], state.period);
    state.dashboard = empty;
    refreshSimulatorCatalog();
    renderFamilias(empty.sections, empty.summary);
    return;
  }
  const filtered = filterRowsExcept(factRows, {}, { searchTerm: "" });
  const dataset = buildDashboardDatasetFromRows(filtered, state.period);
  state.dashboard = dataset;
  refreshSimulatorCatalog();
  renderFamilias(dataset.sections, dataset.summary);
}

function renderFamilias(sections, summary){
  const host = $("#grid-familias");
  host.innerHTML = "";
  host.style.display = "block";
  host.style.gap = "0";

  const resumoAnim = state.animations?.resumo;
  const prevVarRatios = resumoAnim?.varRatios instanceof Map ? resumoAnim.varRatios : new Map();
  const nextVarRatios = new Map();

  const visibleSections = [];

  const status = getStatusFilter();
  const secaoFilterId = $("#f-secao")?.value || "Todas";
  const indicadorFilterId = $("#f-familia")?.value || "Todas";
  const indicadorFilterResolved = resolverIndicadorPorAlias(indicadorFilterId) || indicadorFilterId;
  const produtoFilterId = $("#f-produto")?.value || "Todos";
  const produtoFilterSlug = simplificarTexto(produtoFilterId);
  const produtoFilterIndicator = produtoFilterSlug ? (SUBPRODUTO_TO_INDICADOR.get(produtoFilterSlug) || "") : "";

  let atingidosVisiveis = 0;
  let pontosAtingidosVisiveis = 0;
  let varMetaVisiveis = 0;
  let varRealVisiveis = 0;
  let hasVisibleVar = false;

  sections.forEach(sec=>{
    if (secaoFilterId !== "Todas" && sec.id !== secaoFilterId) {
      return;
    }

    const applyIndicadorFilter = indicadorFilterId !== "Todas";
    const applySubFilter = produtoFilterId !== "Todos" && produtoFilterId !== "Todas";

    const itemsFiltered = sec.items.filter(it=>{
      const okStatus = status === "atingidos" ? it.atingido : (status === "nao" ? !it.atingido : true);
      const indicatorMeta = INDICATOR_CARD_INDEX.get(it.id) || {};
      const indicatorAliases = [
        it.id,
        it.nome,
        it.produtoNome,
        it.ds_indicador,
        indicatorMeta.nome,
        indicatorMeta.aliases || [],
        it.aliases || []
      ];
      const okIndicador = !applyIndicadorFilter
        || matchesSelection(indicadorFilterResolved, indicatorAliases);
      if (!okIndicador) return false;

      if (!applySubFilter) return okStatus;

      const indicatorKey = resolverIndicadorPorAlias(it.id) || it.id;
      if (produtoFilterIndicator && indicatorKey !== produtoFilterIndicator) {
        return false;
      }
      const subOptions = getFlatSubIndicatorOptions(indicatorKey);
      if (!subOptions.length) {
        return false;
      }
      const normalized = produtoFilterSlug;
      const okSub = subOptions.some(opt => {
        if (opt.value === produtoFilterId) return true;
        const optSlug = simplificarTexto(opt.value);
        if (normalized && optSlug === normalized) return true;
        if (Array.isArray(opt.aliases)) {
          return opt.aliases.some(alias => {
            const clean = limparTexto(alias);
            if (!clean) return false;
            if (clean === produtoFilterId) return true;
            return normalized && simplificarTexto(clean) === normalized;
          });
        }
        return false;
      });
      return okStatus && okSub;
    });
    if (!itemsFiltered.length) return;

    const cardItems = itemsFiltered.filter(item => !item.hiddenInCards);

    const sectionTotalPoints = cardItems.reduce((acc,i)=> acc + (i.pontosMeta ?? i.peso ?? 0), 0);
    const sectionPointsHit   = cardItems.reduce((acc,i)=> acc + Math.max(0, Number(i.pontos ?? 0)), 0);
    const sectionPointsHitDisp = formatPoints(sectionPointsHit);
    const sectionPointsTotalDisp = formatPoints(sectionTotalPoints);
    const sectionPointsHitFull = formatPoints(sectionPointsHit, { withUnit: true });
    const sectionPointsTotalFull = formatPoints(sectionTotalPoints, { withUnit: true });

    const sectionMetaTotal = cardItems.reduce((acc, item) => acc + (Number(item.meta) || 0), 0);
    const sectionRealizadoTotal = cardItems.reduce((acc, item) => acc + (Number(item.realizado) || 0), 0);
    const sectionAtingPct = sectionMetaTotal ? (sectionRealizadoTotal / sectionMetaTotal) * 100 : 0;

    visibleSections.push({
      id: sec.id,
      label: sec.label,
      items: itemsFiltered,
      totals: {
        pontosTotal: sectionTotalPoints,
        pontosHit: sectionPointsHit,
        metaTotal: sectionMetaTotal,
        realizadoTotal: sectionRealizadoTotal,
        atingPct: sectionAtingPct
      }
    });

    const sectionEl = document.createElement("section");
    sectionEl.className = "fam-section";
    sectionEl.id = `sec-${sec.id}`;
    sectionEl.innerHTML = `
      <header class="fam-section__header">
        <div class="fam-section__title">
          <span>${sec.label}</span>
          <small class="fam-section__meta">
            <span class="fam-section__meta-item" title="Pontos: ${sectionPointsHitFull} / ${sectionPointsTotalFull}">Pontos: ${sectionPointsHitDisp} / ${sectionPointsTotalDisp}</span>
          </small>
        </div>
      </header>
      <div class="fam-section__grid"></div>`;
    const grid = sectionEl.querySelector(".fam-section__grid");

    cardItems.forEach(f=>{
      if (f.atingido){ atingidosVisiveis += 1; }
      const pontosMetaItem = Number(f.pontosMeta ?? f.peso) || 0;
      const pontosRealItem = Math.max(0, Number(f.pontos ?? 0));
      pontosAtingidosVisiveis += Math.min(pontosRealItem, pontosMetaItem);
      const variavelMeta = Number(f.variavelMeta) || 0;
      const variavelReal = Number(f.variavelReal) || 0;
      if (variavelMeta || variavelReal) hasVisibleVar = true;
      varMetaVisiveis += variavelMeta;
      varRealVisiveis += variavelReal;
      const prodMeta = PRODUCT_INDEX.get(f.id);
      const familiaMeta = PRODUTO_TO_FAMILIA.get(f.id);
      const familiaAttr = f.familiaId || familiaMeta?.id || prodMeta?.sectionId || sec.id;
      const familiaLabelAttr = f.familiaNome
        || familiaMeta?.nome
        || FAMILIA_BY_ID.get(familiaAttr)?.nome
        || sec.label
        || familiaAttr;
      const familiaAttrSafe = escapeHTML(familiaAttr || "");
      const familiaLabelSafe = escapeHTML(familiaLabelAttr || familiaAttr || "");
      const pct = Math.max(0, Math.min(100, f.ating*100)); /* clamp 0..100 */
      const badgeClass = pct < 50 ? "badge--low" : (pct < 100 ? "badge--warn" : "badge--ok");
      const badgeTxt   = pct >= 100 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
      const narrowStyle= badgeTxt.length >= 5 ? 'style="font-size:11px"' : '';

      const realizadoTxt = formatByMetric(f.metric, f.realizado);
      const metaTxt      = formatByMetric(f.metric, f.meta);
      const realizadoFull = formatMetricFull(f.metric, f.realizado);
      const metaFull      = formatMetricFull(f.metric, f.meta);

      const pontosMeta = pontosMetaItem;
      const pontosReal = pontosRealItem;
      const pontosRatio = pontosMeta ? (pontosReal / pontosMeta) : 0;
      const pontosPct = Math.max(0, pontosRatio * 100);
      const pontosPctLabel = `${pontosPct.toFixed(1)}%`;
      const pontosFill = Math.max(0, Math.min(100, pontosPct));
      const pontosFillRounded = Number(pontosFill.toFixed(2));
      const pontosTrackClass = pontosPct < 50 ? "var--low" : (pontosPct < 100 ? "var--warn" : "var--ok");
      const pontosMetaTxt = pontosMeta ? formatPoints(pontosMeta, { withUnit: true }) : "0 pts";
      const pontosRealTxt = formatPoints(pontosReal, { withUnit: true });
      const pontosAccessible = `${pontosPctLabel} (${pontosRealTxt} de ${pontosMetaTxt})`;

      grid.insertAdjacentHTML("beforeend", `
        <article class="prod-card" tabindex="0" data-prod-id="${f.id}" data-familia-id="${familiaAttrSafe}" data-familia-label="${familiaLabelSafe}">
          <div class="prod-card__title">
            <i class="${f.icon}"></i>
            <span class="prod-card__name has-ellipsis" title="${f.nome}">${f.nome}</span>
            <span class="badge ${badgeClass}" ${narrowStyle} aria-label="Atingimento" title="${badgeTxt}">${badgeTxt}</span>
          </div>

          <div class="prod-card__meta">
            <span class="pill">Pontos: ${formatPoints(pontosReal)} / ${formatPoints(pontosMeta)}</span>
            <span class="pill">Peso: ${formatPoints(pontosMeta)}</span>
            <span class="pill">${f.metric === "valor" ? "Valor" : f.metric === "qtd" ? "Quantidade" : "Percentual"}</span>
          </div>

          <div class="prod-card__kpis">
            <div class="kv"><small>Meta</small><strong class="has-ellipsis" title="${metaFull}">${metaTxt}</strong></div>
            <div class="kv"><small>Realizado</small><strong class="has-ellipsis" title="${realizadoFull}">${realizadoTxt}</strong></div>
          </div>

          <div class="prod-card__var">
            <div class="prod-card__var-head">
              <small>Atingimento de pontos</small>
            </div>
            <div class="prod-card__var-body">
              <span class="prod-card__var-goal" title="${pontosMetaTxt}">${pontosMetaTxt}</span>
              <div class="prod-card__var-track ${pontosTrackClass}" data-ratio="${pontosFillRounded}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pontosFillRounded)}" aria-valuetext="${pontosAccessible}">
                <span class="prod-card__var-fill" style="--target:${pontosFillRounded}%"></span>
                <span class="prod-card__var-label" title="Atingido: ${pontosRealTxt} · ${pontosPctLabel}">
                  <span class="prod-card__var-value">${pontosPctLabel}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="prod-card__foot">Atualizado em ${f.ultimaAtualizacao}</div>
          ${buildCardTooltipHTML(f)}
        </article>
      `);

      nextVarRatios.set(f.id, pontosFillRounded);
      const cardEl = grid.lastElementChild;
      if (cardEl) {
        const trackEl = cardEl.querySelector(".prod-card__var-track");
        if (trackEl) {
          const prevRatio = prevVarRatios.get(f.id);
          const animateVar = shouldAnimateDelta(prevRatio, pontosFillRounded, 0.25);
          triggerBarAnimation(trackEl, animateVar);
        }
      }
    });

    host.appendChild(sectionEl);
  });

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(layoutProdVarTracks);
  } else {
    layoutProdVarTracks();
  }
  ensureVarLabelResizeListener();

  if (resumoAnim) resumoAnim.varRatios = nextVarRatios;

  renderResumoKPI(summary, {
    visibleItemsHitCount: atingidosVisiveis,
    visiblePointsHit: pontosAtingidosVisiveis,
    visibleVarAtingido: hasVisibleVar ? varRealVisiveis : null,
    visibleVarMeta: hasVisibleVar ? varMetaVisiveis : null
  });

  const legacySections = buildResumoLegacySections(visibleSections);
  const sectionsForLegacy = legacySections.length ? legacySections : visibleSections;
  state.dashboardVisibleSections = sectionsForLegacy;
  renderResumoLegacyTable(sectionsForLegacy, summary, visibleSections);

  applyResumoMode(state.resumoMode || "cards");

  $$(".prod-card").forEach(card=>{
    const tip = card.querySelector(".kpi-tip");
    const badge = card.querySelector(".badge");
    if (badge && tip) bindBadgeTooltip(card);

    card.addEventListener("click", (ev)=>{
      if (ev.target?.classList.contains("badge")) return;
      const prodId = card.getAttribute("data-prod-id");
      const familiaSelect = $("#f-familia");
      if (familiaSelect && prodId) {
        familiaSelect.value = prodId;
        if (familiaSelect.dataset.search === "true") syncSelectSearchInput(familiaSelect);
      }

      const produtoSelect = $("#f-produto");
      if (produtoSelect && prodId) {
        const subOptions = [{ value: "Todos", label: "Todos", aliases: ["Todos", "Todas"] }]
          .concat(getFlatSubIndicatorOptions(prodId));
        setSelectOptions(produtoSelect, subOptions, "Todos", "Todos");
        produtoSelect.disabled = subOptions.length <= 1;
      }

      state.tableView = "familia";
      setActiveChip("familia");
      autoSnapViewToFilters();
      const tabDet = document.querySelector('.tab[data-view="table"]');
      if (tabDet && !tabDet.classList.contains("is-active")) tabDet.click(); else switchView("table");
      applyFiltersAndRender();
      renderAppliedFilters();
    });
  });
}

function renderResumoLegacyTable(sections = [], summary = {}, rawSections = null) {
  const host = $("#resumo-legacy");
  if (!host) return;

  host.innerHTML = "";

  const showAnnualMatrix = (state.accumulatedView || "mensal") === "anual";
  host.classList.toggle("resumo-legacy--annual", showAnnualMatrix);

  const activeSections = showAnnualMatrix
    ? (Array.isArray(rawSections) && rawSections.length ? rawSections : sections)
    : sections;

  if (!Array.isArray(activeSections) || !activeSections.length) {
    host.innerHTML = `<div class="resumo-legacy__empty">Nenhum indicador encontrado para os filtros selecionados.</div>`;
    return;
  }

  if (showAnnualMatrix) {
    const rendered = renderResumoLegacyAnnualMatrix(host, activeSections, summary);
    if (!rendered) {
      host.innerHTML = `<div class="resumo-legacy__empty">Nenhum indicador encontrado para os filtros selecionados.</div>`;
    }
    return;
  }

  const metricInfo = {
    valor: { label: "Valor", title: "Indicador financeiro" },
    qtd:   { label: "Quantidade", title: "Indicador por quantidade" },
    perc:  { label: "Percentual", title: "Indicador percentual" }
  };

  sections.forEach(section => {
    const items = Array.isArray(section.items) ? section.items : [];
    if (!items.length) return;

    const totals = section.totals || {};
    const pontosTotal = Number(totals.pontosTotal) || items.reduce((acc, item) => acc + (Number(item.pontosMeta ?? item.peso) || 0), 0);
    const pontosHit = Number(totals.pontosHit) || items.reduce((acc, item) => acc + Math.min(Number(item.pontos ?? 0) || 0, Number(item.pontosMeta ?? item.peso) || 0), 0);
    const metaTotal = Number(totals.metaTotal) || items.reduce((acc, item) => acc + (Number(item.meta) || 0), 0);
    const realizadoTotal = Number(totals.realizadoTotal) || items.reduce((acc, item) => acc + (Number(item.realizado) || 0), 0);

    const atingPctBase = Number.isFinite(totals.atingPct) ? totals.atingPct : (metaTotal ? (realizadoTotal / metaTotal) * 100 : 0);
    const hasMeta = metaTotal > 0;
    const atingSectionClamped = hasMeta ? Math.max(0, Math.min(200, atingPctBase)) : 0;
    const atingSectionLabel = hasMeta ? `${atingSectionClamped.toFixed(1)}%` : "—";

    const uniqueMetrics = new Set(items.map(item => item.metric));
    const singleMetric = uniqueMetrics.size === 1 ? (uniqueMetrics.values().next().value || "") : "";
    const normalizedMetric = typeof singleMetric === "string" ? singleMetric.toLowerCase() : "";
    const canAggregateMetric = normalizedMetric === "valor" || normalizedMetric === "qtd";
    const aggregatedLabel = normalizedMetric === "qtd" ? "Quantidade" : (normalizedMetric === "valor" ? "Realizado" : "");
    const aggregatedValue = canAggregateMetric ? formatByMetric(normalizedMetric, realizadoTotal) : "";

    const sectionEl = document.createElement("section");
    sectionEl.className = "resumo-legacy__section card card--legacy";
    const safeLabel = escapeHTML(section.label || "Indicadores");
    const chipPointsTitle = `Pontos: ${formatPoints(pontosHit, { withUnit: true })} / ${formatPoints(pontosTotal, { withUnit: true })}`;
    const pontosHitLabel = escapeHTML(fmtINT.format(Math.round(pontosHit || 0)));
    const pontosTotalLabel = escapeHTML(fmtINT.format(Math.round(pontosTotal || 0)));
    const sectionHasExpandableRows = items.some(item => Array.isArray(item.children) && item.children.length);
    const sectionToggleClass = `resumo-legacy__section-toggle${sectionHasExpandableRows ? "" : " is-disabled"}`;
    const sectionToggleAttrs = sectionHasExpandableRows ? "" : " disabled aria-disabled=\"true\"";

    const statsPieces = [
      `<div class=\"resumo-legacy__stat\"><span class=\"resumo-legacy__stat-label\">Peso total</span><strong class=\"resumo-legacy__stat-value\">${escapeHTML(fmtINT.format(Math.round(pontosTotal || 0)))}</strong></div>`
    ];
    if (canAggregateMetric && aggregatedLabel) {
      statsPieces.push(`<div class=\"resumo-legacy__stat\"><span class=\"resumo-legacy__stat-label\">${aggregatedLabel}</span><strong class=\"resumo-legacy__stat-value\">${escapeHTML(aggregatedValue)}</strong></div>`);
    }
    statsPieces.push(`<div class=\"resumo-legacy__stat\"><span class=\"resumo-legacy__stat-label\">Atingimento</span><strong class=\"resumo-legacy__stat-value\">${atingSectionLabel}</strong></div>`);

    sectionEl.innerHTML = `
      <header class="resumo-legacy__head">
        <div class="resumo-legacy__heading">
          <div class="resumo-legacy__title-row">
            <span class="resumo-legacy__name">${safeLabel}</span>
            <div class="resumo-legacy__section-actions">
              <button type="button" class="${sectionToggleClass}" data-expanded="false"${sectionToggleAttrs}>
                <i class="ti ti-filter" aria-hidden="true"></i>
                <span class="resumo-legacy__section-toggle-label">Abrir todos os filtros</span>
              </button>
            </div>
          </div>
          <div class="resumo-legacy__chips">
            <span class="resumo-legacy__chip"><i class="ti ti-box-multiple" aria-hidden="true"></i>${escapeHTML(fmtINT.format(items.length))} indicadores</span>
            <span class="resumo-legacy__chip" title="${escapeHTML(chipPointsTitle)}">Pontos ${pontosHitLabel} / ${pontosTotalLabel}</span>
          </div>
        </div>
        <div class="resumo-legacy__stats">
          ${statsPieces.join("")}
        </div>
      </header>
      <div class="resumo-legacy__table-wrapper">
        <table class="resumo-legacy__table">
          <thead>
            <tr>
              <th scope="col">Subindicador</th>
              <th scope="col" class="resumo-legacy__col--peso">Peso</th>
              <th scope="col">Métrica</th>
              <th scope="col" class="resumo-legacy__col--meta">Meta</th>
              <th scope="col" class="resumo-legacy__col--real">Realizado</th>
              <th scope="col" class="resumo-legacy__col--ref">Ref. do dia</th>
              <th scope="col" class="resumo-legacy__col--forecast">Forecast</th>
              <th scope="col" class="resumo-legacy__col--meta-dia">Meta diária nec.</th>
              <th scope="col" class="resumo-legacy__col--pontos">Pontos</th>
              <th scope="col" class="resumo-legacy__col--ating">Ating.</th>
              <th scope="col" class="resumo-legacy__col--update">Atualização</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    const tbody = sectionEl.querySelector("tbody");
    if (!tbody) return;

    let rowAutoId = 0;
    const rowToggleHandlers = new Map();
    const sectionToggle = sectionEl.querySelector(".resumo-legacy__section-toggle");
    const sectionToggleLabel = sectionEl.querySelector(".resumo-legacy__section-toggle-label");

    const syncSectionToggleState = () => {
      if (!sectionToggle) return;
      if (!rowToggleHandlers.size) {
        sectionToggle.setAttribute("data-expanded", "false");
        sectionToggle.classList.remove("is-expanded");
        if (!sectionHasExpandableRows) {
          sectionToggle.classList.add("is-disabled");
          sectionToggle.setAttribute("aria-disabled", "true");
          sectionToggle.setAttribute("disabled", "true");
        }
        if (sectionToggleLabel) sectionToggleLabel.textContent = "Abrir todos os filtros";
        return;
      }
      sectionToggle.classList.remove("is-disabled");
      sectionToggle.removeAttribute("aria-disabled");
      sectionToggle.removeAttribute("disabled");
      let expandedCount = 0;
      rowToggleHandlers.forEach((_, rowId) => {
        const rowEl = tbody.querySelector(`tr[data-row-id="${rowId}"]`);
        if (rowEl?.classList.contains("is-expanded")) expandedCount += 1;
      });
      const allExpanded = expandedCount > 0 && expandedCount === rowToggleHandlers.size;
      sectionToggle.setAttribute("data-expanded", String(allExpanded));
      sectionToggle.classList.toggle("is-expanded", allExpanded);
      if (sectionToggleLabel) sectionToggleLabel.textContent = allExpanded ? "Recolher filtros" : "Abrir todos os filtros";
    };

    const rows = [];

    const buildRow = (item, depth = 0, parentId = "") => {
      if (!item) return null;

      const rowId = `legacy-${section.id || "sec"}-${rowAutoId++}`;
      const hasChildren = nodeHasChildren(item);
      const visualDepth = typeof item.__legacyDepth === "number" ? item.__legacyDepth : depth;
      const metricKeyRaw = typeof item.metric === "string" ? item.metric.toLowerCase() : "";
      const metricEntry = metricInfo[metricKeyRaw] || null;
      const isKnownMetric = metricKeyRaw === "valor" || metricKeyRaw === "qtd" || metricKeyRaw === "perc";
      const metricLabelRaw = metricEntry ? metricEntry.label : "—";
      const metricTitleRaw = metricEntry ? metricEntry.title : "Métrica do indicador";
      const metricClasses = ["resumo-legacy__metric"];
      if (isKnownMetric) {
        metricClasses.push(`resumo-legacy__metric--${metricKeyRaw}`);
      }

      const pesoValor = Number(item.pontosMeta ?? item.peso ?? 0) || 0;
      const pesoLabelRaw = fmtINT.format(Math.round(pesoValor));

      let metaCellRaw = "—";
      let metaTitleRaw = "Sem meta agregada";
      let realizadoCellRaw = "—";
      let realizadoTitleRaw = "Sem realizado agregado";
      let referenciaCellRaw = "—";
      let referenciaTitleRaw = "Sem referência do dia";
      let forecastCellRaw = "—";
      let forecastTitleRaw = "Sem forecast calculado";
      let metaNecCellRaw = "—";
      let metaNecTitleRaw = "Sem meta diária necessária";
      if (isKnownMetric) {
        metaCellRaw = formatByMetric(metricKeyRaw, item.meta);
        metaTitleRaw = formatMetricFull(metricKeyRaw, item.meta);
        realizadoCellRaw = formatByMetric(metricKeyRaw, item.realizado);
        realizadoTitleRaw = formatMetricFull(metricKeyRaw, item.realizado);
        referenciaCellRaw = formatByMetric(metricKeyRaw, item.referenciaHoje);
        referenciaTitleRaw = formatMetricFull(metricKeyRaw, item.referenciaHoje);
        forecastCellRaw = formatByMetric(metricKeyRaw, item.projecao);
        forecastTitleRaw = formatMetricFull(metricKeyRaw, item.projecao);
        metaNecCellRaw = formatByMetric(metricKeyRaw, item.metaDiariaNecessaria);
        metaNecTitleRaw = formatMetricFull(metricKeyRaw, item.metaDiariaNecessaria);
      }

      const atingPct = Math.max(0, Math.min(200, toNumber(item.ating) * 100));
      const atingFill = Math.max(0, Math.min(1, atingPct / 100));
      const atingLabelRaw = `${atingPct.toFixed(1)}%`;
      const atingMeterClass = atingPct >= 100 ? "is-ok" : (atingPct >= 50 ? "is-warn" : "is-low");

      const pontosValor = Number(item.pontos ?? item.pontosBrutos ?? item.peso ?? 0) || 0;
      const pontosLabelRaw = formatPoints(pontosValor, { withUnit: true });
      const pontosTitleRaw = formatPoints(pontosValor, { withUnit: true });

      const updateRaw = item.ultimaAtualizacao || "";
      const updateLabelRaw = updateRaw
        ? (/^\d{4}-\d{2}-\d{2}$/.test(updateRaw) ? formatBRDate(updateRaw) : updateRaw)
        : "—";

      const prodClasses = ["resumo-legacy__prod"];
      if (visualDepth === 1) prodClasses.push("resumo-legacy__prod--child");
      if (visualDepth >= 2) prodClasses.push("resumo-legacy__prod--grandchild");

      const rowClasses = ["resumo-legacy__row"];
      if (hasChildren) rowClasses.push("has-children");
      if (visualDepth === 0) rowClasses.push("resumo-legacy__row--family");
      if (visualDepth === 1) rowClasses.push("resumo-legacy__row--indicator", "resumo-legacy__row--child");
      if (visualDepth >= 2) rowClasses.push("resumo-legacy__row--lp", "resumo-legacy__child-row", "resumo-legacy__row--grandchild");

      const attrParts = [`class="${rowClasses.join(" ")}"`, `data-row-id="${rowId}"`, `data-depth="${visualDepth}"`];
      if (parentId) attrParts.push(`data-parent-id="${parentId}"`);
      const hiddenAttr = parentId ? " hidden" : "";

      const nomeSafe = escapeHTML(item.nome || item.label || "—");
      const produtoCellHtml = hasChildren
        ? `<div class="${prodClasses.join(" ")}"><button type="button" class="resumo-legacy__prod-toggle" aria-expanded="false"><i class="ti ti-chevron-right resumo-legacy__prod-toggle-icon" aria-hidden="true"></i><span class="resumo-legacy__prod-name" title="${nomeSafe}">${nomeSafe}</span></button></div>`
        : `<div class="${prodClasses.join(" ")}"><span class="resumo-legacy__prod-name" title="${nomeSafe}">${nomeSafe}</span></div>`;

      const rowHtml = `
        <tr ${attrParts.join(" ")}${hiddenAttr}>
          <th scope="row">
            ${produtoCellHtml}
          </th>
          <td class="resumo-legacy__col--peso" title="Peso do indicador">${escapeHTML(pesoLabelRaw)}</td>
          <td>
            <span class="${metricClasses.join(" ")}" title="${escapeHTML(metricTitleRaw)}">${escapeHTML(metricLabelRaw || "—")}</span>
          </td>
          <td class="resumo-legacy__col--meta" title="${escapeHTML(metaTitleRaw)}">${escapeHTML(metaCellRaw)}</td>
          <td class="resumo-legacy__col--real" title="${escapeHTML(realizadoTitleRaw)}">${escapeHTML(realizadoCellRaw)}</td>
          <td class="resumo-legacy__col--ref" title="${escapeHTML(referenciaTitleRaw)}">${escapeHTML(referenciaCellRaw)}</td>
          <td class="resumo-legacy__col--forecast" title="${escapeHTML(forecastTitleRaw)}">${escapeHTML(forecastCellRaw)}</td>
          <td class="resumo-legacy__col--meta-dia" title="${escapeHTML(metaNecTitleRaw)}">${escapeHTML(metaNecCellRaw)}</td>
          <td class="resumo-legacy__col--pontos" title="${escapeHTML(pontosTitleRaw)}">${escapeHTML(pontosLabelRaw)}</td>
          <td class="resumo-legacy__col--ating">
            <div class="resumo-legacy__ating" title="Atingimento">
              <div class="resumo-legacy__ating-meter ${atingMeterClass}" style="--fill:${atingFill.toFixed(4)};" role="progressbar" aria-valuemin="0" aria-valuemax="200" aria-valuenow="${atingPct.toFixed(1)}" aria-valuetext="${escapeHTML(atingLabelRaw)}">
                <span class="resumo-legacy__ating-value">${escapeHTML(atingLabelRaw)}</span>
              </div>
            </div>
          </td>
          <td class="resumo-legacy__col--update">${escapeHTML(updateLabelRaw)}</td>
        </tr>
      `;

      const rowConfig = { rowId, parentId, depth, hasChildren, childrenIds: [], html: rowHtml };
      rows.push(rowConfig);

      if (hasChildren) {
        item.children.forEach(child => {
          const childId = buildRow(child, depth + 1, rowId);
          if (childId) rowConfig.childrenIds.push(childId);
        });
      }

      return rowId;
    };

    items.forEach(item => buildRow(item, 0, ""));

    if (!rows.length) return;

    tbody.innerHTML = rows.map(row => row.html).join("");

    rows.forEach(row => {
      const rowEl = tbody.querySelector(`tr[data-row-id="${row.rowId}"]`);
      if (!rowEl) return;
      row.element = rowEl;
      if (row.parentId) {
        rowEl.hidden = true;
      }
    });

    rows.forEach(row => {
      if (!row.hasChildren) return;
      const rowEl = row.element;
      if (!rowEl) return;
      const toggleBtn = rowEl.querySelector(".resumo-legacy__prod-toggle");
      if (!toggleBtn) return;
      toggleBtn.setAttribute("aria-expanded", "false");

      const toggleChildren = (expand) => {
        const current = rowEl.classList.contains("is-expanded");
        const nextState = typeof expand === "boolean" ? expand : !current;
        rowEl.classList.toggle("is-expanded", nextState);
        toggleBtn.setAttribute("aria-expanded", String(nextState));
        row.childrenIds.forEach(childId => {
          const childRow = tbody.querySelector(`tr[data-row-id="${childId}"]`);
          if (!childRow) return;
          childRow.hidden = !nextState;
        });
        if (!nextState) {
          row.childrenIds.forEach(childId => {
            const childToggle = rowToggleHandlers.get(childId);
            if (childToggle) childToggle(false);
          });
        }
        syncSectionToggleState();
      };

      toggleBtn.addEventListener("click", ev => {
        ev.preventDefault();
        ev.stopPropagation();
        toggleChildren();
      });

      rowEl.addEventListener("click", ev => {
        if (ev.target.closest(".resumo-legacy__prod-toggle")) return;
        toggleChildren();
      });

      rowToggleHandlers.set(row.rowId, toggleChildren);
    });

    if (sectionToggle) {
      if (sectionHasExpandableRows) {
        sectionToggle.addEventListener("click", ev => {
          ev.preventDefault();
          const targetState = sectionToggle.getAttribute("data-expanded") !== "true";
          rowToggleHandlers.forEach(toggleFn => {
            toggleFn(targetState);
          });
          sectionToggle.setAttribute("data-expanded", String(targetState));
          sectionToggle.classList.toggle("is-expanded", targetState);
          if (sectionToggleLabel) sectionToggleLabel.textContent = targetState ? "Recolher filtros" : "Abrir todos os filtros";
        });
      } else {
        sectionToggle.classList.add("is-disabled");
        sectionToggle.setAttribute("aria-disabled", "true");
        sectionToggle.setAttribute("disabled", "true");
      }
    }

    syncSectionToggleState();

    host.appendChild(sectionEl);
  });

  if (!host.children.length) {
    host.innerHTML = `<div class="resumo-legacy__empty">Nenhum indicador encontrado para os filtros selecionados.</div>`;
  }
}
/* ===== Aqui eu preparo comportamentos extras das abas quando surgirem novas ===== */
function ensureExtraTabs(){
  const tabs = document.querySelector(".tabs"); 
  if(!tabs) return;

  // Evita duplicar botões
  if(!tabs.querySelector('.tab[data-view="ranking"]')){
    const b = document.createElement("button");
    b.className="tab"; b.dataset.view="ranking"; b.textContent="Ranking";
    b.type = "button";
    tabs.insertBefore(b, tabs.querySelector(".tabs__aside"));
  }

  if(!tabs.querySelector('.tab[data-view="exec"]')){
    const b2 = document.createElement("button");
    b2.className="tab"; b2.dataset.view="exec"; b2.textContent="Visão executiva";
    b2.type = "button";
    tabs.insertBefore(b2, tabs.querySelector(".tabs__aside"));
  }
}

/* ===== Aqui eu injeto estilos extras da visão executiva direto via JS ===== */
function ensureExecStyles(){
  if (document.getElementById("exec-enhanced-styles")) return;
  const s = document.createElement("style");
  s.id = "exec-enhanced-styles";
  s.textContent = `
    .exec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
    .seg-mini.segmented{padding:2px;border-radius:8px}
    .seg-mini .seg-btn{padding:6px 8px;font-size:12px}
    .exec-chart{background:#fff;border:1px solid var(--stroke);border-radius:14px;box-shadow:var(--shadow);padding:20px;margin-bottom:20px}
    .chart{width:100%;overflow:hidden;padding:20px;border-radius:12px;background:#fff}
    .chart svg{display:block;width:100%;height:auto}
    .chart-legend{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
    .legend-item{display:inline-flex;align-items:center;gap:6px;color:#475569;font-weight:700}
    .legend-swatch{display:inline-block;width:14px;height:6px;border-radius:999px;background:#cbd5e1;border:1px solid #94a3b8;position:relative}
    .legend-swatch--bar-real{background:#2563eb;border-color:#1d4ed8;height:10px}
    .legend-swatch--meta-line{background:transparent;border:none;height:0;border-top:2.5px solid #60a5fa;width:18px;margin-top:4px;border-radius:0}
    .exec-panel .exec-h{display:flex;align-items:center;justify-content:space-between;gap:10px}
  `;
  document.head.appendChild(s);
}

/* ===== Aqui eu construo toda a visão executiva com gráficos, rankings e heatmap ===== */
function createExecutiveView(){
  ensureExecStyles();

  const host = document.getElementById("view-exec");
  if (!host) return;

  if (!state.exec) {
    state.exec = { heatmapMode: "secoes", seriesColors: new Map() };
  }
  state.exec.heatmapMode = state.exec.heatmapMode || "secoes";
  if (!(state.exec.seriesColors instanceof Map)) {
    state.exec.seriesColors = new Map();
  }

  const syncSegmented = (containerSelector, dataAttr, stateKey, fallback) => {
    const container = host.querySelector(containerSelector);
    if (!container) return;
    const buttons = container.querySelectorAll('.seg-btn');
    if (!buttons.length) return;
    const active = state.exec[stateKey] || fallback;
    buttons.forEach(btn => {
      const value = btn.dataset[dataAttr] || fallback;
      btn.classList.toggle('is-active', value === active);
      if (!btn.dataset.execBound) {
        btn.dataset.execBound = 'true';
        btn.addEventListener('click', () => {
          state.exec[stateKey] = value;
          buttons.forEach(b => b.classList.toggle('is-active', b === btn));
          if (state.activeView === 'exec') renderExecutiveView();
        });
      }
    });
  };

  syncSegmented('#exec-heatmap-toggle', 'hm', 'heatmapMode', 'secoes');

  if (!host.dataset.execFiltersBound) {
    const execSel = ["#f-segmento","#f-diretoria","#f-gerencia","#f-agencia","#f-ggestao","#f-gerente","#f-familia","#f-produto","#f-status-kpi"];
    execSel.forEach(sel => $(sel)?.addEventListener("change", () => {
      if (state.activeView === 'exec') renderExecutiveView();
    }));
    $("#btn-consultar")?.addEventListener("click", () => {
      if (state.activeView === 'exec') renderExecutiveView();
    });
    host.dataset.execFiltersBound = "true";
  }
}

/* Helpers de agregação para a Visão Executiva */
function resolveExecValueForKey(row, key, fallback = "—") {
  if (!row) return fallback;
  switch (key) {
    case "gerenciaRegional": return row.gerenciaRegional || row.diretoria || fallback;
    case "agencia":         return row.agencia || row.agenciaCodigo || fallback;
    case "gerenteGestao":   return row.gerenteGestao || fallback;
    case "gerente":         return row.gerente || fallback;
    case "prodOrSub":       return row.prodOrSub || row.produtoId || row.produto || fallback;
    case "diretoria":       return row.diretoria || fallback;
    default:                 return row[key] || fallback;
  }
}

function resolveExecLabelForKey(row, key, fallback = "") {
  if (!row) return fallback;
  const candidates = {
    gerenciaRegional: ["gerenciaNome", "regional", "gerenciaRegional"],
    agencia: ["agenciaNome", "agencia", "agenciaCodigo"],
    gerenteGestao: ["gerenteGestaoNome", "gerenteGestao"],
    gerente: ["gerenteNome", "gerente"],
    prodOrSub: ["produtoNome", "prodOrSub", "produto", "produtoId"],
    diretoria: ["diretoriaNome", "diretoria"],
    __total__: ["Consolidado"]
  };
  const fields = candidates[key] || [key];
  for (const field of fields) {
    if (field === "Consolidado") return "Consolidado";
    const value = row[field];
    if (value) return value;
  }
  return fallback || resolveExecValueForKey(row, key, "") || "";
}

function execAggBy(rows, key){
  const map = new Map();
  rows.forEach(r=>{
    const groupKey = key === "__total__" ? "__total__" : resolveExecValueForKey(r, key, "—");
    const current = map.get(groupKey) || { key: groupKey, label: "", real_mens:0, meta_mens:0, real_acum:0, meta_acum:0, qtd:0 };
    const labelCandidate = resolveExecLabelForKey(r, key, current.label || groupKey);
    if (labelCandidate && !current.label) current.label = labelCandidate;
    current.real_mens += (r.real_mens ?? r.realizado ?? 0);
    current.meta_mens += (r.meta_mens ?? r.meta ?? 0);
    current.real_acum += (r.real_acum ?? r.realizado ?? 0);
    current.meta_acum += (r.meta_acum ?? r.meta ?? 0);
    current.qtd       += (r.qtd ?? 0);
    map.set(groupKey, current);
  });
  return [...map.values()].map(x=>{
    if (!x.label) {
      x.label = key === "__total__" ? "Consolidado" : x.key;
    }
    const ating_mens = x.meta_mens ? x.real_mens/x.meta_mens : 0;
    const ating_acum = x.meta_acum ? x.real_acum/x.meta_acum : 0;
    const def_mens   = x.real_mens - x.meta_mens;
    return { ...x, ating_mens, ating_acum, def_mens, p_mens: ating_mens*100, p_acum: ating_acum*100 };
  });
}

const EXEC_FILTER_SELECTORS = {
  gerencia: "#f-gerencia",
  agencia:  "#f-agencia",
  gGestao:  "#f-ggestao",
  gerente:  "#f-gerente",
  prodsub:  "#f-produto"
};
function pctBadgeCls(p){ return p<50?"att-low":(p<100?"att-warn":"att-ok"); }
function moneyBadgeCls(v){ return v>=0?"def-pos":"def-neg"; }

// nível inicial conforme filtros (pra baixo)
function execStartLevelFromFilters(){
  const f = getFilterValues();
  if (f.produtoId && f.produtoId !== "Todos" && f.produtoId !== "Todas") return "prodsub";
  if (f.familiaId && f.familiaId !== "Todas") return "prodsub";
  if (f.gerente && f.gerente !== "Todos")   return "prodsub";
  if (f.ggestao && f.ggestao !== "Todos")   return "gerente";
  if (f.agencia && f.agencia !== "Todas")   return "gGestao";
  if (f.gerencia && f.gerencia !== "Todas") return "agencia";
  if (f.diretoria && f.diretoria !== "Todas") return "gerencia";
  return "gerencia";
}
function levelKeyFor(start){
  return {
    gerencia: "gerenciaRegional",
    agencia:  "agencia",
    gGestao:  "gerenteGestao",
    gerente:  "gerente",
    prodsub:  "prodOrSub"
  }[start] || "gerenciaRegional";
}
function levelLabel(start){
  return {
    gerencia: {sing:"Regional", plural:"Regionais", short:"GR"},
    agencia:  {sing:"Agência", plural:"Agências", short:"Agências"},
    gGestao:  {sing:"Ger. de Gestão", plural:"Ger. de Gestão", short:"GG"},
    gerente:  {sing:"Gerente", plural:"Gerentes", short:"Gerentes"},
    prodsub:  {sing:"Indicador/Subproduto", plural:"Indicadores", short:"Indicadores"}
  }[start];
}

function chartDimensions(container, fallbackW=900, fallbackH=260){
  if (!container) return { width: fallbackW, height: fallbackH };
  const styles = window.getComputedStyle(container);
  const padL = parseFloat(styles.paddingLeft) || 0;
  const padR = parseFloat(styles.paddingRight) || 0;
  const width = Math.max(320, (container.clientWidth || fallbackW) - padL - padR);
  return { width, height: fallbackH };
}
function monthKeyLabel(key){
  if (!key) return "—";
  const [y,m] = key.split('-');
  const year = Number(y);
  const month = Number(m);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  const dt = new Date(Date.UTC(year, month - 1, 1));
  return dt.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
}

function monthKeyShortLabel(key){
  if (!key) return "";
  const [y, m] = key.split('-');
  const year = Number(y);
  const month = Number(m);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  const dt = new Date(Date.UTC(year, month - 1, 1));
  return dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
}

function monthKeyFromDate(dt){
  if (!(dt instanceof Date) || Number.isNaN(dt)) return "";
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalizeMonthKey(value){
  if (!value) return "";
  if (value instanceof Date) return monthKeyFromDate(value);
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[\\/]/g, "-");
    const match = cleaned.match(/^(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;
  }
  return "";
}

function extractYearFromValue(value){
  if (!value) return "";
  if (value instanceof Date && Number.isFinite(value.getUTCFullYear())) {
    return String(value.getUTCFullYear());
  }
  const normalized = normalizeMonthKey(value);
  if (normalized) return normalized.slice(0, 4);
  const asString = String(value);
  const match = asString.match(/(\d{4})/);
  return match ? match[1] : "";
}

function buildMonthlyAxis(period){
  const startISO = period?.start || todayISO();
  const endISO = period?.end || startISO;

  let startDate = dateUTCFromISO(startISO);
  let endDate = dateUTCFromISO(endISO);
  if (!startDate) startDate = dateUTCFromISO(todayISO());
  if (!endDate) endDate = startDate;
  if (startDate > endDate) [startDate, endDate] = [endDate, startDate];

  const limit = new Date(endDate);
  limit.setUTCDate(1);

  const cursor = new Date(Date.UTC(limit.getUTCFullYear(), 0, 1));
  const keys = [];
  while (cursor <= limit) {
    keys.push(monthKeyFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  if (!keys.length) {
    keys.push(monthKeyFromDate(limit));
  }

  return keys;
}

function ensureExecSeriesColor(id){
  const palette = EXEC_SERIES_PALETTE;
  if (!palette.length) return '#2563eb';
  if (!id) return palette[0];
  if (state.exec?.seriesColors instanceof Map) {
    const map = state.exec.seriesColors;
    if (map.has(id)) return map.get(id);
    const color = palette[map.size % palette.length];
    map.set(id, color);
    return color;
  }
  return palette[0];
}

function makeMonthlySectionSeries(rows, period){
  const monthKeys = buildMonthlyAxis(period);
  const monthIndex = new Map(monthKeys.map((key, idx) => [key, idx]));
  const sections = new Map();
  const sectionOrder = new Map(CARD_SECTIONS_DEF.map((sec, idx) => [sec.id, idx]));

  rows.forEach(r => {
    const rawDate = r?.competencia || r?.mes || r?.data || r?.dataReferencia || r?.dt;
    const key = normalizeMonthKey(rawDate);
    if (!monthIndex.has(key)) return;
    const idx = monthIndex.get(key);
    const section = resolveSectionMetaFromRow(r);
    if (!section.id) return;

    let entry = sections.get(section.id);
    if (!entry) {
      entry = {
        id: section.id,
        label: section.label || getSectionLabel(section.id) || section.id,
        meta: Array(monthKeys.length).fill(0),
        real: Array(monthKeys.length).fill(0)
      };
      sections.set(section.id, entry);
    } else if (!entry.label && section.label) {
      entry.label = section.label;
    }

    entry.meta[idx] += toNumber(r.meta_mens ?? r.meta ?? 0);
    entry.real[idx] += toNumber(r.real_mens ?? r.realizado ?? 0);
  });

  const series = [...sections.values()].map(entry => {
    const values = entry.meta.map((meta, idx) => {
      if (!Number.isFinite(meta) || meta <= 0) return null;
      const realVal = entry.real[idx] ?? 0;
      return (realVal / meta) * 100;
    });
    if (!values.some(v => Number.isFinite(v))) return null;
    return {
      id: entry.id,
      label: entry.label || getSectionLabel(entry.id) || entry.id,
      values,
      color: ensureExecSeriesColor(entry.id)
    };
  }).filter(Boolean).sort((a, b) => {
    const ai = sectionOrder.has(a.id) ? sectionOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bi = sectionOrder.has(b.id) ? sectionOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' });
  });

  return {
    keys: monthKeys,
    labels: monthKeys.map(monthKeyLabel),
    series
  };
}

function makeAnnualSectionSeries(rows){
  if (!Array.isArray(rows) || !rows.length) {
    return { keys: [], labels: [], series: [] };
  }

  const sectionOrder = new Map(CARD_SECTIONS_DEF.map((sec, idx) => [sec.id, idx]));
  const yearsSet = new Set();
  rows.forEach(r => {
    const rawDate = r?.competencia || r?.mes || r?.data || r?.dataReferencia || r?.dt;
    const year = extractYearFromValue(rawDate);
    if (year) yearsSet.add(year);
  });

  const years = Array.from(yearsSet).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });
  if (!years.length) {
    return { keys: [], labels: [], series: [] };
  }

  const yearIndex = new Map(years.map((year, idx) => [year, idx]));
  const sections = new Map();

  rows.forEach(r => {
    const rawDate = r?.competencia || r?.mes || r?.data || r?.dataReferencia || r?.dt;
    const year = extractYearFromValue(rawDate);
    if (!yearIndex.has(year)) return;
    const idx = yearIndex.get(year);
    const section = resolveSectionMetaFromRow(r);
    if (!section.id) return;

    let entry = sections.get(section.id);
    if (!entry) {
      entry = {
        id: section.id,
        label: section.label || getSectionLabel(section.id) || section.id,
        meta: Array(years.length).fill(0),
        real: Array(years.length).fill(0)
      };
      sections.set(section.id, entry);
    } else if (!entry.label && section.label) {
      entry.label = section.label;
    }

    entry.meta[idx] += toNumber(r.meta_mens ?? r.meta ?? 0);
    entry.real[idx] += toNumber(r.real_mens ?? r.realizado ?? 0);
  });

  const series = [...sections.values()].map(entry => {
    const values = entry.meta.map((meta, idx) => {
      if (!Number.isFinite(meta) || meta <= 0) return null;
      const realVal = entry.real[idx] ?? 0;
      return (realVal / meta) * 100;
    });
    if (!values.some(v => Number.isFinite(v))) return null;
    return {
      id: entry.id,
      label: entry.label || getSectionLabel(entry.id) || entry.id,
      values,
      color: ensureExecSeriesColor(entry.id)
    };
  }).filter(Boolean).sort((a, b) => {
    const ai = sectionOrder.has(a.id) ? sectionOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bi = sectionOrder.has(b.id) ? sectionOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' });
  });

  return {
    keys: years,
    labels: years,
    series
  };
}

function buildExecMonthlyLines(container, dataset, options = {}){
  const ariaLabel = options?.ariaLabel || "Linhas de atingimento mensal por seção";
  if (!dataset || !dataset.series?.length) {
    container.innerHTML = `<div class="muted">Sem dados para exibir.</div>`;
    return;
  }

  const { width: W, height: H } = chartDimensions(container);
  const m = { t:28, r:36, b:48, l:64 };
  const iw = Math.max(0, W - m.l - m.r);
  const ih = Math.max(0, H - m.t - m.b);
  const n = dataset.labels.length;
  const x = (idx) => {
    if (n <= 1) return m.l + iw / 2;
    const step = iw / (n - 1);
    return m.l + step * idx;
  };

  const values = dataset.series.flatMap(s => s.values.filter(v => Number.isFinite(v)));
  const maxVal = values.length ? Math.max(...values) : 0;
  const yMax = Math.max(120, Math.ceil((maxVal || 100) / 10) * 10);
  const y = (val) => {
    const clamped = Math.min(Math.max(val, 0), yMax);
    return m.t + ih - (clamped / yMax) * ih;
  };

  const gridLines = [];
  const steps = 5;
  for (let k = 0; k <= steps; k++) {
    const val = (yMax / steps) * k;
    gridLines.push({ y: y(val), label: `${Math.round(val)}%` });
  }

  const paths = dataset.series.map(series => {
    let d = '';
    let started = false;
    series.values.forEach((value, idx) => {
      if (!Number.isFinite(value)) {
        started = false;
        return;
      }
      const cmd = started ? 'L' : 'M';
      d += `${cmd} ${x(idx)} ${y(value)} `;
      started = true;
    });
    return `<path class="exec-line" d="${d.trim()}" fill="none" stroke="${series.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><title>${escapeHTML(series.label)}</title></path>`;
  }).join('');

  const points = dataset.series.map(series => series.values.map((value, idx) => {
    if (!Number.isFinite(value)) return '';
    const monthLabel = dataset.labels[idx] || String(idx + 1);
    const valueLabel = `${value.toFixed(1)}%`;
    return `<circle class="exec-line__point" cx="${x(idx)}" cy="${y(value)}" r="3.4" fill="${series.color}" stroke="#fff" stroke-width="1.2"><title>${escapeHTML(series.label)} • ${monthLabel}: ${valueLabel}</title></circle>`;
  }).join('')).join('');

  const gridY = gridLines.map(line =>
    `<line x1="${m.l}" y1="${line.y}" x2="${W - m.r}" y2="${line.y}" stroke="#eef2f7"/>
     <text x="${m.l - 6}" y="${line.y + 3}" font-size="10" text-anchor="end" fill="#6b7280">${line.label}</text>`
  ).join('');

  const xlabels = dataset.labels.map((lab, idx) =>
    `<text x="${x(idx)}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#6b7280">${escapeHTML(lab)}</text>`
  ).join('');

  const safeAria = escapeHTML(ariaLabel);
  container.innerHTML = `
    <svg class="exec-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${safeAria}">
      <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
      ${gridY}
      ${paths}
      ${points}
      <line x1="${m.l}" y1="${H - m.b}" x2="${W - m.r}" y2="${H - m.b}" stroke="#e5e7eb"/>
      ${xlabels}
    </svg>`;
}

/* ===== Aqui eu orquestro o render principal da visão executiva ===== */
function renderExecutiveView(){
  const host = document.getElementById("view-exec"); 
  if(!host) return;

  const ctx    = document.getElementById("exec-context");
  const kpis   = document.getElementById("exec-kpis");
  const chartC = document.getElementById("exec-chart");
  const chartTitleEl = document.getElementById("exec-chart-title");
  const chartLegend = document.getElementById("exec-chart-legend");
  const hm     = document.getElementById("exec-heatmap");
  const rankTopEl = document.getElementById("exec-rank-top");
  const rankBottomEl = document.getElementById("exec-rank-bottom");
  const statusHitEl = document.getElementById("exec-status-hit");
  const statusQuaseEl = document.getElementById("exec-status-quase");
  const statusLongeEl = document.getElementById("exec-status-longe");
  const exportBtn = document.getElementById("btn-export-onepage");

  if (exportBtn && !exportBtn.dataset.bound){
    exportBtn.dataset.bound = "1";
    exportBtn.addEventListener("click", () => window.print());
  }

  if (!Array.isArray(state._rankingRaw) || !state._rankingRaw.length){
    ctx && (ctx.textContent = "Carregando dados…");
    return;
  }

  // base com TODOS os filtros aplicados
  const rowsBase = filterRows(state._rankingRaw);
  const execMonthlyPeriod = getExecutiveMonthlyPeriod();
  const rowsMonthly = filterRowsExcept(state._rankingRaw, {}, {
    searchTerm: state.tableSearchTerm,
    dateStart: execMonthlyPeriod.start,
    dateEnd: execMonthlyPeriod.end,
  });

  // nível inicial
  const start = execStartLevelFromFilters();
  const startKey = levelKeyFor(start);
  const L = levelLabel(start);

  // títulos conforme nível
  document.getElementById("exec-rank-title").textContent   = `Desempenho por ${L.sing}`;
  document.getElementById("exec-heatmap-title").textContent= `Heatmap — ${L.short} × Seções`;
  document.getElementById("exec-status-title").textContent = `Status das ${L.plural}`;

  // contexto
  if (ctx){
    const f = getFilterValues();
    const foco =
      f.gerente  && f.gerente  !== "Todos" ? `Gerente: ${f.gerente}` :
      f.ggestao  && f.ggestao  !== "Todos" ? `GG: ${f.ggestao}` :
      f.agencia  && f.agencia  !== "Todas" ? `Agência: ${f.agencia}` :
      f.gerencia && f.gerencia !== "Todas" ? `GR: ${f.gerencia}` :
      f.diretoria&& f.diretoria!== "Todas" ? `Diretoria: ${f.diretoria}` : `Todas as Diretorias`;
    ctx.innerHTML = `<strong>${foco}</strong> · Período: ${formatBRDate(state.period.start)} a ${formatBRDate(state.period.end)}`;
  }

  // KPIs gerais
  const total = execAggBy(rowsBase, "__total__").reduce((a,b)=>({
    real_mens:a.real_mens + b.real_mens, meta_mens:a.meta_mens + b.meta_mens,
    real_acum:a.real_acum + b.real_acum, meta_acum:a.meta_acum + b.meta_acum
  }), {real_mens:0,meta_mens:0,real_acum:0,meta_acum:0});

  const ating = total.meta_mens ? total.real_mens/total.meta_mens : 0;
  const defas = total.real_mens - total.meta_mens;

  const diasTotais     = businessDaysBetweenInclusive(state.period.start, state.period.end);
  const diasDecorridos = businessDaysElapsedUntilToday(state.period.start, state.period.end);
  const diasRestantes  = Math.max(0, diasTotais - diasDecorridos);
  const mediaDiaria    = diasDecorridos>0 ? (total.real_mens/diasDecorridos) : 0;
  const necessarioDia  = diasRestantes>0 ? Math.max(0, (total.meta_mens-total.real_mens)/diasRestantes) : 0;
  const forecast       = mediaDiaria * diasTotais;
  const forecastPct    = total.meta_mens ? (forecast/total.meta_mens)*100 : 0;

  if (kpis){
    const realMensFull = fmtBRL.format(Math.round(total.real_mens));
    const realMensDisplay = formatBRLReadable(total.real_mens);
    const metaMensFull = fmtBRL.format(Math.round(total.meta_mens));
    const metaMensDisplay = formatBRLReadable(total.meta_mens);
    const defasFull = fmtBRL.format(Math.round(defas));
    const defasDisplay = formatBRLReadable(defas);
    const forecastFull = fmtBRL.format(Math.round(forecast));
    const forecastDisplay = formatBRLReadable(forecast);

    kpis.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-card__title">Atingimento mensal</div>
        <div class="kpi-card__value"><span title="${realMensFull}">${realMensDisplay}</span> <small>/ <span title="${metaMensFull}">${metaMensDisplay}</span></small></div>
        <div class="kpi-card__bar">
          <div class="kpi-card__fill ${pctBadgeCls(ating*100)}" style="width:${Math.min(100, Math.max(0, ating*100))}%"></div>
        </div>
        <div class="kpi-card__pct"><span class="att-badge ${pctBadgeCls(ating*100)}">${(ating*100).toFixed(1)}%</span></div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card__title">Defasagem do mês</div>
        <div class="kpi-card__value ${moneyBadgeCls(defas)}" title="${defasFull}">${defasDisplay}</div>
        <div class="kpi-sub muted">Real – Meta (mês)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-card__title">Forecast x Meta</div>
        <div class="kpi-card__value"><span title="${forecastFull}">${forecastDisplay}</span> <small>/ <span title="${metaMensFull}">${metaMensDisplay}</span></small></div>
        <div class="kpi-card__bar">
          <div class="kpi-card__fill ${pctBadgeCls(forecastPct)}" style="width:${Math.min(100, Math.max(0, forecastPct))}%"></div>
        </div>
        <div class="kpi-card__pct"><span class="att-badge ${pctBadgeCls(forecastPct)}">${forecastPct.toFixed(1)}%</span></div>
      </div>`;
  }

  const heatmapMode = state.exec.heatmapMode || "secoes";
  const heatmapTitleEl = document.getElementById("exec-heatmap-title");
  if (heatmapTitleEl){
    heatmapTitleEl.textContent = heatmapMode === "meta"
      ? "Heatmap — Variação da meta (mês a mês)"
      : `Heatmap — ${L.short} × Seções`;
  }

  // Gráfico
  if (chartC){
    const monthlySeries = makeMonthlySectionSeries(rowsMonthly, execMonthlyPeriod);
    const ariaLabel = "Linhas mensais de atingimento por seção";
    chartC.setAttribute("aria-label", ariaLabel);
    if (chartTitleEl) chartTitleEl.textContent = "Evolução mensal por seção";

    if (chartLegend){
      const seriesList = monthlySeries.series || [];
      if (seriesList.length){
        chartLegend.innerHTML = seriesList.map(serie => `
          <span class="legend-item">
            <span class="legend-swatch legend-swatch--line" style="background:${serie.color};border-color:${serie.color};"></span>${escapeHTML(serie.label)}
          </span>`).join("");
      } else {
        chartLegend.innerHTML = `<span class="legend-item muted">Sem seções para exibir.</span>`;
      }
    }

    const renderChart = () => buildExecMonthlyLines(chartC, monthlySeries, { ariaLabel });
    host.__execChartDataset = monthlySeries;
    host.__execChartRender = renderChart;
    renderChart();

    if (!host.__execResize){
      let raf = null;
      host.__execResize = () => {
        if (state.activeView !== 'exec') return;
        if (raf) cancelAnimationFrame(raf);
        const fn = host.__execChartRender;
        raf = requestAnimationFrame(()=> fn && fn());
      };
      window.addEventListener('resize', host.__execResize);
    }
  }

  // Ranking Top/Bottom
  const grouped = execAggBy(rowsBase, startKey)
    .filter(item => item.key !== "__total__")
    .sort((a,b)=> b.p_mens - a.p_mens);
  const rankIndex = new Map();
  grouped.forEach((row, idx) => rankIndex.set(row.key, idx));
  const myUnit = currentUnitForLevel(start);

  const renderRankList = (container, list) => {
    if (!container) return;
    const rows = list.slice(0, 5);
    while (rows.length < 5) {
      rows.push({ placeholder:true, key:`placeholder-${rows.length}` });
    }

    container.innerHTML = rows.map(row => {
      if (row.placeholder) {
        return `
          <div class="rank-mini__row rank-mini__row--empty" data-placeholder="true">
            <div class="rank-mini__name"><span class="rank-mini__label">Sem dados disponíveis</span></div>
            <div class="rank-mini__bar"><span style="width:0%"></span></div>
            <div class="rank-mini__pct">—</div>
            <div class="rank-mini__vals">—</div>
          </div>`;
      }
      const rankNumber = (rankIndex.get(row.key) ?? 0) + 1;
      const safeKey = escapeHTML(row.key);
      const label = row.label || row.key;
      const pctClass = pctBadgeCls(row.p_mens);
      const realFull = fmtBRL.format(Math.round(row.real_mens));
      const metaFull = fmtBRL.format(Math.round(row.meta_mens));
      const realDisplay = formatBRLReadable(row.real_mens);
      const metaDisplay = formatBRLReadable(row.meta_mens);
      return `
        <div class="rank-mini__row${row.key === myUnit ? ' rank-mini__row--mine' : ''}" data-key="${safeKey}" data-rank="${rankNumber}" title="${escapeHTML(`Ranking #${rankNumber} — ${label}`)}">
          <div class="rank-mini__name"><span class="rank-mini__label">${escapeHTML(label)}</span></div>
          <div class="rank-mini__bar"><span style="width:${Math.min(100, Math.max(0, row.p_mens))}%"></span></div>
          <div class="rank-mini__pct"><span class="att-badge ${pctClass}">${row.p_mens.toFixed(1)}%</span></div>
          <div class="rank-mini__vals"><strong title="${realFull}">${realDisplay}</strong> <small title="${metaFull}">/ ${metaDisplay}</small></div>
        </div>`;
    }).join("");

    container.querySelectorAll(".rank-mini__row").forEach(rowEl => {
      if (rowEl.dataset.placeholder === "true") return;
      rowEl.addEventListener("click", () => {
        const keyVal = rowEl.getAttribute("data-key");
        const selector = EXEC_FILTER_SELECTORS[start];
        if (selector && keyVal){
          const sel = document.querySelector(selector);
          const option = sel && [...sel.options].find(opt => opt.value === keyVal);
          if (sel && option){
            sel.value = keyVal;
            sel.dispatchEvent(new Event("change"));
          }
        }
        document.querySelector('.tab[data-view="table"]')?.click();
      });
    });
  };

  if (rankTopEl) renderRankList(rankTopEl, grouped.slice(0, 5));
  if (rankBottomEl) renderRankList(rankBottomEl, grouped.slice(-5).reverse());

  // Status das unidades
  const statusBase = execAggBy(rowsBase, startKey).filter(item => item.key !== "__total__");
  const hitList = statusBase.filter(item => item.p_mens >= 100).slice(0, 5);
  const quaseList = statusBase.filter(item => item.p_mens >= 90 && item.p_mens < 100).slice(0, 5);
  const longeList = statusBase
    .map(item => ({ ...item, gap: item.real_mens - item.meta_mens }))
    .sort((a,b) => a.gap - b.gap)
    .slice(0, 5);

  const renderStatusList = (container, list, type) => {
    if (!container) return;
    const rows = list.slice(0, 5);
    while (rows.length < 5) {
      rows.push({ placeholder:true, key:`placeholder-${rows.length}` });
    }
    container.innerHTML = rows.map(row => {
      if (row.placeholder) {
        return `
          <div class="list-mini__row list-mini__row--empty" data-placeholder="true">
            <div class="list-mini__name">Sem dados disponíveis</div>
            <div class="list-mini__val">—</div>
          </div>`;
      }
      const safeKey = escapeHTML(row.key);
      const label = escapeHTML(row.label || row.key);
      let valueHTML = "";
      if (type === "hit") {
        valueHTML = `<span class="att-badge att-ok">${row.p_mens.toFixed(1)}%</span>`;
      } else if (type === "quase") {
        valueHTML = `<span class="att-badge att-warn">${row.p_mens.toFixed(1)}%</span>`;
      } else {
        valueHTML = `<span class="def-badge def-neg">${fmtBRL.format(row.gap)}</span>`;
      }
      return `
        <div class="list-mini__row" data-key="${safeKey}" title="${label}">
          <div class="list-mini__name">${label}</div>
          <div class="list-mini__val">${valueHTML}</div>
        </div>`;
    }).join("");

    container.querySelectorAll(".list-mini__row").forEach(rowEl => {
      if (rowEl.dataset.placeholder === "true") return;
      rowEl.addEventListener("click", () => {
        const keyVal = rowEl.getAttribute("data-key");
        const selector = EXEC_FILTER_SELECTORS[start];
        if (selector && keyVal){
          const sel = document.querySelector(selector);
          const option = sel && [...sel.options].find(opt => opt.value === keyVal);
          if (sel && option){
            sel.value = keyVal;
            sel.dispatchEvent(new Event("change"));
          }
        }
        document.querySelector('.tab[data-view="table"]')?.click();
      });
    });
  };

  renderStatusList(statusHitEl, hitList, "hit");
  renderStatusList(statusQuaseEl, quaseList, "quase");
  renderStatusList(statusLongeEl, longeList, "longe");

  // Heatmap
  if (hm){
    if (heatmapMode === "meta") {
      renderExecHeatmapMeta(hm, rowsMonthly, execMonthlyPeriod);
    } else {
      renderExecHeatmapSections(hm, rowsBase, startKey, start, L);
    }
  }
}

function renderExecHeatmapSections(hm, rows, startKey, start, levelMeta){
  if (!hm) return;
  const unitMeta = new Map();
  const sectionEntries = CARD_SECTIONS_DEF.map(sec => ({ id: sec.id, label: sec.label || sec.id }));
  const aggregates = new Map();

  rows.forEach(row => {
    const unitValue = resolveExecValueForKey(row, startKey, "");
    if (!unitValue) return;
    const unitLabel = resolveExecLabelForKey(row, startKey, unitValue);
    if (!unitMeta.has(unitValue)) {
      const title = unitLabel && unitLabel !== unitValue ? `${unitLabel} (${unitValue})` : unitLabel || unitValue;
      unitMeta.set(unitValue, { label: unitLabel || unitValue, title });
    }

    const section = resolveSectionMetaFromRow(row);
    if (!section.id) return;
    const bucketKey = `${unitValue}|${section.id}`;
    const bucket = aggregates.get(bucketKey) || { real:0, meta:0 };
    bucket.real += toNumber(row.real_mens ?? row.realizado ?? 0);
    bucket.meta += toNumber(row.meta_mens ?? row.meta ?? 0);
    aggregates.set(bucketKey, bucket);
  });

  if (!unitMeta.size) {
    hm.innerHTML = `<div class="muted">Sem dados para exibir.</div>`;
    return;
  }

  const units = [...unitMeta.entries()].map(([value, meta]) => ({
    value,
    label: meta.label,
    title: meta.title
  })).sort((a,b)=> a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));

  const columnCount = Math.max(1, sectionEntries.length);
  const rowStyle = ` style="--hm-cols:${columnCount}; --hm-first:240px; --hm-cell:136px"`;
  let html = `<div class="hm-row hm-head"${rowStyle}><div class="hm-cell hm-corner">${escapeHTML(levelMeta.short)} \\ Família</div>${
    sectionEntries.map(sec => `<div class="hm-cell hm-col" title="${escapeHTML(sec.label)}">${escapeHTML(sec.label)}</div>`).join("")
  }</div>`;

  units.forEach(unit => {
    html += `<div class="hm-row"${rowStyle}><div class="hm-cell hm-rowh"${unit.title ? ` title="${escapeHTML(unit.title)}"` : ""}>${escapeHTML(unit.label)}</div>`;
    sectionEntries.forEach(sec => {
      const bucket = aggregates.get(`${unit.value}|${sec.id}`) || { real:0, meta:0 };
      const realVal = toNumber(bucket.real);
      const metaVal = toNumber(bucket.meta);
      let cls = "hm-cell hm-val";
      let text = "—";
      let title = "";

      if (metaVal > 0){
        const pct = (realVal / metaVal) * 100;
        const pctDisplay = Math.round(pct);
        cls += pct < 50 ? " hm-bad" : (pct < 100 ? " hm-warn" : " hm-ok");
        text = `${pctDisplay}%`;
        title = `Atingimento: ${pct.toFixed(1)}%`;
      } else if (realVal > 0){
        cls += " hm-empty";
        title = "Meta não informada";
      } else {
        cls += " hm-empty";
        title = "Sem dados";
      }

      html += `<div class="${cls}" data-u="${escapeHTML(unit.value)}"${title ? ` title="${escapeHTML(title)}"` : ""}>${text}</div>`;
    });
    html += `</div>`;
  });

  hm.innerHTML = html;

  const selector = EXEC_FILTER_SELECTORS[start];
  hm.querySelectorAll(".hm-val").forEach(cell => {
    if (cell.classList.contains("hm-empty")) return;
    cell.addEventListener("click", () => {
      const unitValue = cell.getAttribute("data-u");
      if (selector && unitValue){
        const sel = document.querySelector(selector);
        const option = sel && [...sel.options].find(opt => opt.value === unitValue);
        if (sel && option){
          sel.value = unitValue;
          sel.dispatchEvent(new Event("change"));
        }
      }
      state.tableView = "prodsub";
      document.querySelector('.tab[data-view="table"]')?.click();
    });
  });
}

function renderExecHeatmapMeta(hm, rows, period){
  if (!hm) return;
  const monthKeys = buildMonthlyAxis(period);
  if (!monthKeys.length){
    hm.innerHTML = `<div class="muted">Sem dados para exibir.</div>`;
    return;
  }

  const monthLabels = monthKeys.map(monthKeyLabel);
  const template = () => monthKeys.reduce((acc, key) => (acc[key] = 0, acc), {});
  const monthSet = new Set(monthKeys);

  const levels = [
    { key: "diretoria",       filterKey: "diretoria", label: "Diretoria", plural: "Diretorias" },
    { key: "gerenciaRegional", filterKey: "gerencia",  label: "Regional",  plural: "Regionais" },
    { key: "agencia",         filterKey: "agencia",   label: "Agência",   plural: "Agências" },
    { key: "gerenteGestao",   filterKey: "ggestao",   label: "Ger. de Gestão", plural: "Ger. de Gestão" },
    { key: "gerente",         filterKey: "gerente",   label: "Gerente",   plural: "Gerentes" }
  ];

  const dataByLevel = new Map(levels.map(level => [
    level.key,
    new Map([["__total__", { id: "__total__", label: `Todas as ${level.plural}`, meta: template() }]])
  ]));

  rows.forEach(row => {
    const monthKey = normalizeMonthKey(row.competencia || row.mes || row.data || row.dataReferencia || row.dt);
    if (!monthSet.has(monthKey)) return;
    const metaValue = toNumber(row.meta_mens ?? row.meta ?? 0);
    levels.forEach(level => {
      const levelMap = dataByLevel.get(level.key);
      if (!levelMap) return;
      const totalEntry = levelMap.get("__total__");
      totalEntry.meta[monthKey] += metaValue;
      const value = resolveExecValueForKey(row, level.key, "");
      if (!value) return;
      let entry = levelMap.get(value);
      if (!entry) {
        entry = { id: value, label: resolveExecLabelForKey(row, level.key, value) || value, meta: template() };
        levelMap.set(value, entry);
      }
      entry.meta[monthKey] += metaValue;
    });
  });

  const filters = getFilterValues();
  const rowStyle = ` style="--hm-cols:${monthKeys.length}; --hm-first:220px; --hm-cell:120px"`;
  let html = `<div class="hm-row hm-head"${rowStyle}><div class="hm-cell hm-corner">Hierarquia \\ Mês</div>${
    monthLabels.map(label => `<div class="hm-cell hm-col">${escapeHTML(label)}</div>`).join("")
  }</div>`;

  levels.forEach(level => {
    const levelMap = dataByLevel.get(level.key);
    if (!levelMap) return;
    const filterValue = filters[level.filterKey];
    const normalizedFilter = filterValue && filterValue !== "Todos" && filterValue !== "Todas" ? filterValue : "";
    let entry = normalizedFilter && levelMap.get(normalizedFilter);
    if (!entry){
      const candidates = [...levelMap.keys()].filter(key => key !== "__total__");
      if (candidates.length === 1) {
        entry = levelMap.get(candidates[0]);
      }
    }
    if (!entry) entry = levelMap.get("__total__");
    if (!entry) return;

    html += `<div class="hm-row hm-meta"${rowStyle}><div class="hm-cell hm-rowh">${escapeHTML(entry.label)}</div>`;
    monthKeys.forEach((key, idx) => {
      const currentMeta = entry.meta[key] ?? 0;
      const prevKey = idx > 0 ? monthKeys[idx - 1] : null;
      const prevMeta = prevKey ? entry.meta[prevKey] ?? 0 : null;
      let delta = null;
      if (prevKey){
        if (prevMeta > 0) {
          delta = ((currentMeta - prevMeta) / prevMeta) * 100;
        } else if (currentMeta === 0) {
          delta = 0;
        }
      }

      let cls = "hm-cell hm-meta";
      let text = "—";
      if (delta == null) {
        cls += " hm-empty";
      } else if (delta < 0) {
        cls += " hm-down";
        text = `${delta.toFixed(1)}%`;
      } else if (delta === 0) {
        cls += " hm-ok";
        text = `0.0%`;
      } else if (delta <= 5) {
        cls += " hm-ok";
        text = `+${delta.toFixed(1)}%`;
      } else if (delta <= 10) {
        cls += " hm-warn";
        text = `+${delta.toFixed(1)}%`;
      } else {
        cls += " hm-alert";
        text = `+${delta.toFixed(1)}%`;
      }

      const monthLabel = monthLabels[idx];
      const prevLabel = prevKey ? monthLabels[idx - 1] : "";
      let title = `Meta ${monthLabel}: ${fmtBRL.format(Math.round(currentMeta))}`;
      if (prevKey){
        title += ` · Anterior (${prevLabel}): ${fmtBRL.format(Math.round(prevMeta ?? 0))}`;
        title += delta != null ? ` · Variação: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%` : ` · Variação: —`;
      }

      html += `<div class="${cls}" title="${escapeHTML(title)}">${text}</div>`;
    });
    html += `</div>`;
  });

  hm.innerHTML = html;
}

/* ===== Aqui eu calculo e exibo os rankings de cada nível ===== */
/* ===== Aqui eu trato toda a lógica das campanhas e simuladores ===== */
function currentSprintConfig(){
  if (!Array.isArray(CAMPAIGN_SPRINTS) || !CAMPAIGN_SPRINTS.length) return null;
  const id = state.campanhas?.sprintId;
  return CAMPAIGN_SPRINTS.find(s => s.id === id) || CAMPAIGN_SPRINTS[0];
}

function ensureCampanhasView(){
  const host = document.getElementById("view-campanhas");
  if (!host) return;
  if (!CAMPAIGN_SPRINTS.length) {
    host.innerHTML = `<section class="card card--campanhas"><p class="muted">Nenhuma campanha disponível.</p></section>`;
    return;
  }

  const select = document.getElementById("campanha-sprint");
  if (select && !select.dataset.bound) {
    select.dataset.bound = "1";
    select.addEventListener("change", (ev) => {
      state.campanhas.sprintId = ev.target.value;
      renderCampanhasView();
    });
  }
}

function ensureTeamValuesForSprint(sprint){
  if (!sprint || !state.campanhas) return {};
  const store = state.campanhas.teamValues;
  if (!store[sprint.id]) {
    const base = {};
    (sprint.team?.indicators || []).forEach(ind => {
      base[ind.id] = toNumber(ind.default ?? 100);
    });
    store[sprint.id] = base;
    const defaultPreset = sprint.team?.defaultPreset || (sprint.team?.presets?.[0]?.id || "custom");
    state.campanhas.teamPreset[sprint.id] = defaultPreset;
  }
  return store[sprint.id];
}

function ensureIndividualValuesForProfile(sprint, profile){
  if (!sprint || !profile || !state.campanhas) return {};
  const bySprint = state.campanhas.individualValues[sprint.id] || (state.campanhas.individualValues[sprint.id] = {});
  if (!bySprint[profile.id]) {
    const base = {};
    (profile.indicators || []).forEach(ind => {
      base[ind.id] = toNumber(ind.default ?? 100);
    });
    bySprint[profile.id] = base;
    const key = `${sprint.id}:${profile.id}`;
    const defaultPreset = profile.defaultPreset || (profile.presets?.[0]?.id || "custom");
    state.campanhas.individualPreset[key] = defaultPreset;
  }
  return bySprint[profile.id];
}

function detectPresetMatch(values, presets){
  if (!values || !Array.isArray(presets)) return null;
  return presets.find(preset => {
    const pairs = Object.entries(preset.values || {});
    return pairs.every(([key, val]) => Math.round(toNumber(val)) === Math.round(toNumber(values[key])));
  })?.id || null;
}

function formatCampPoints(value){
  return `${fmtINT.format(Math.round(toNumber(value)))} pts`;
}

function formatCampPercent(value){
  return `${fmtONE.format(toNumber(value))}%`;
}

function computeCampaignScore(config, values){
  const indicators = config?.indicators || [];
  const min = toNumber(config?.minThreshold ?? 90);
  const stretch = toNumber(config?.superThreshold ?? (min + 20));
  const cap = toNumber(config?.cap ?? 150);
  const minTotal = toNumber(config?.eligibilityMinimum ?? 100) || 100;

  const rows = indicators.map(ind => {
    const raw = Math.max(0, toNumber(values?.[ind.id] ?? ind.default ?? 0));
    const capped = Math.min(cap, raw);
    const points = (toNumber(ind.weight) * capped) / 100;
    let statusText = "Crítico";
    let statusClass = "status-pill--alert";
    if (raw >= stretch) {
      statusText = "Parabéns";
      statusClass = "status-pill--great";
    } else if (raw >= min) {
      statusText = "Elegível";
      statusClass = "status-pill--ok";
    } else if (raw >= Math.max(0, min - 10)) {
      statusText = "Ajustar";
      statusClass = "status-pill--warn";
    }
    return { ...ind, pct: raw, capped, points, statusText, statusClass };
  });

  const totalPoints = rows.reduce((acc, row) => acc + row.points, 0);
  const hasAllMin = rows.every(row => row.pct >= min);
  const hasAllStretch = rows.every(row => row.pct >= stretch);
  const eligible = hasAllMin && totalPoints >= minTotal;

  let finalStatus = "Não elegível";
  let finalClass = "status-tag--alert";
  if (hasAllStretch && totalPoints >= minTotal) {
    finalStatus = "Parabéns";
    finalClass = "status-tag--great";
  } else if (eligible) {
    finalStatus = "Elegível";
    finalClass = "status-tag--ok";
  } else if (hasAllMin) {
    finalStatus = "Ajustar foco";
    finalClass = "status-tag--warn";
  }

  const shortfall = Math.max(0, minTotal - totalPoints);
  const progressPct = minTotal ? Math.max(0, Math.min(1, totalPoints / minTotal)) : 0;
  const progressLabel = shortfall > 0
    ? `${fmtINT.format(Math.round(shortfall))} pts para elegibilidade`
    : (hasAllStretch ? "Acima do stretch" : "Meta mínima atingida");

  return { rows, totalPoints, finalStatus, finalClass, progressPct, progressLabel, shortfall, hasAllMin, hasAllStretch, minThreshold: min, superThreshold: stretch, cap, eligibilityMinimum: minTotal };
}

function teamPresetForSprint(sprint){
  return state.campanhas.teamPreset[sprint.id] || "custom";
}

function setTeamPresetForSprint(sprint, presetId){
  state.campanhas.teamPreset[sprint.id] = presetId || "custom";
}

function individualPresetKey(sprint, profile){
  return `${sprint.id}:${profile.id}`;
}

function individualPresetForProfile(sprint, profile){
  return state.campanhas.individualPreset[individualPresetKey(sprint, profile)] || "custom";
}

function setIndividualPresetForProfile(sprint, profile, presetId){
  state.campanhas.individualPreset[individualPresetKey(sprint, profile)] = presetId || "custom";
}

function buildTeamSimulator(container, sprint){
  if (!container || !sprint?.team) return;
  if (container.dataset.sprintId === sprint.id) return;
  container.dataset.sprintId = sprint.id;

  const indicators = sprint.team.indicators || [];
  const presets = sprint.team.presets || [];

  container.innerHTML = `
    <div class="sim-card__head">
      <div class="sim-card__title">
        <h5>Simulador de equipe</h5>
        <button type="button" class="sim-help" aria-label="Como funciona o simulador de equipe" data-tip="Ajuste os percentuais de cada indicador entre 0% e 150%. A equipe se torna elegível com todos os indicadores a partir de 90% e somando pelo menos 100 pontos.">
          <i class="ti ti-info-circle"></i>
        </button>
      </div>
      <p>Defina o atingimento de cada indicador para estimar a pontuação e a elegibilidade da equipe.</p>
      <p class="sim-hint">Elegível com todos os indicadores ≥ 90% e pelo menos 100 pontos.</p>
    </div>
    <div class="sim-presets" id="team-presets">
      ${presets.map(p => `<button type="button" class="sim-chip" data-team-preset="${p.id}">${p.label}</button>`).join("")}
    </div>
    <table class="sim-table">
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Peso</th>
          <th>Atingimento</th>
          <th>Pontos</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${indicators.map(ind => `
          <tr data-row="${ind.id}">
            <td class="sim-indicator" data-label="Subindicador">
              <strong>${ind.label}</strong>
              ${ind.hint ? `<div class="muted" style="font-size:12px;">${ind.hint}</div>` : ""}
            </td>
            <td class="sim-weight" data-label="Peso">${fmtONE.format(toNumber(ind.weight))}%</td>
            <td data-label="Atingimento">
              <div class="sim-slider">
                <input type="range" min="0" max="160" step="1" data-indicator="${ind.id}" aria-label="${ind.label}" />
                <span class="sim-slider-value" data-output="${ind.id}"></span>
              </div>
            </td>
            <td class="sim-points" data-label="Pontos" data-points="${ind.id}"></td>
            <td data-label="Resultado"><span class="status-pill" data-status="${ind.id}"></span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="sim-summary">
      <div class="sim-total">
        <span>Pontuação total</span>
        <strong id="team-total-points"></strong>
      </div>
      <div class="sim-progress">
        <div class="sim-progress__track"><span class="sim-progress__fill" id="team-progress-bar"></span></div>
        <small id="team-progress-label"></small>
      </div>
      <div class="sim-outcome">
        <span id="team-status" class="status-tag"></span>
      </div>
    </div>
  `;

  container.querySelectorAll("input[type=range]").forEach(input => {
    input.addEventListener("input", (ev) => {
      const id = ev.currentTarget.dataset.indicator;
      const values = ensureTeamValuesForSprint(sprint);
      values[id] = toNumber(ev.currentTarget.value);
      updateTeamSimulator(container, sprint);
    });
  });

  container.querySelectorAll("[data-team-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetId = btn.dataset.teamPreset;
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;
      const values = ensureTeamValuesForSprint(sprint);
      Object.entries(preset.values || {}).forEach(([key, val]) => {
        values[key] = toNumber(val);
      });
      setTeamPresetForSprint(sprint, presetId);
      updateTeamSimulator(container, sprint);
    });
  });
}

function updateTeamSimulator(container, sprint){
  if (!container || !sprint?.team) return;
  const values = ensureTeamValuesForSprint(sprint);
  const result = computeCampaignScore(sprint.team, values);

  (sprint.team.indicators || []).forEach(ind => {
    const row = container.querySelector(`tr[data-row="${ind.id}"]`);
    if (!row) return;
    const slider = row.querySelector("input[type=range]");
    if (slider && slider.value !== String(values[ind.id])) slider.value = String(values[ind.id]);
    const output = row.querySelector(`[data-output="${ind.id}"]`);
    if (output) output.textContent = formatCampPercent(values[ind.id] ?? 0);
    const pointsCell = row.querySelector(`[data-points="${ind.id}"]`);
    const rowData = result.rows.find(r => r.id === ind.id);
    if (pointsCell && rowData) pointsCell.textContent = formatCampPoints(rowData.points);
    const statusEl = row.querySelector(`[data-status="${ind.id}"]`);
    if (statusEl && rowData) {
      statusEl.textContent = rowData.statusText;
      statusEl.className = `status-pill ${rowData.statusClass}`;
    }
  });

  const presetMatch = detectPresetMatch(values, sprint.team.presets);
  setTeamPresetForSprint(sprint, presetMatch || "custom");
  const activePreset = teamPresetForSprint(sprint);
  container.querySelectorAll("[data-team-preset]").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.teamPreset === activePreset);
  });

  const totalEl = container.querySelector("#team-total-points");
  if (totalEl) totalEl.textContent = formatCampPoints(result.totalPoints);
  const statusEl = container.querySelector("#team-status");
  if (statusEl) {
    statusEl.textContent = result.finalStatus;
    statusEl.className = `status-tag ${result.finalClass}`;
  }
  const progressBar = container.querySelector("#team-progress-bar");
  if (progressBar) {
    const pct = Math.max(0, Math.min(100, Math.round(result.progressPct * 100)));
    progressBar.style.width = "";
    progressBar.style.setProperty("--target", `${pct}%`);
    const trackEl = progressBar.parentElement;
    if (trackEl) {
      let animateBar = true;
      const teamMap = state.animations?.campanhas?.team;
      const sprintKey = sprint?.id || "__default__";
      if (teamMap instanceof Map) {
        const prev = teamMap.get(sprintKey);
        animateBar = shouldAnimateDelta(prev, pct, 0.5);
        teamMap.set(sprintKey, pct);
      }
      triggerBarAnimation(trackEl, animateBar);
    }
  }
  const progressLabel = container.querySelector("#team-progress-label");
  if (progressLabel) progressLabel.textContent = result.progressLabel;
}

function buildIndividualSimulator(container, sprint, profile){
  if (!container || !sprint || !profile) return;
  const key = `${sprint.id}:${profile.id}`;
  if (container.dataset.profileKey === key) return;
  container.dataset.profileKey = key;

  const profiles = sprint.individual?.profiles || [];
  const presets = profile.presets || [];

  container.innerHTML = `
    <div class="sim-card__head">
      <div class="sim-card__title">
        <h5>Simulador individual</h5>
        <button type="button" class="sim-help" aria-label="Como funciona o simulador individual" data-tip="Escolha um perfil, use os presets ou ajuste manualmente. Para elegibilidade é necessário atingir 90% em cada indicador e acumular 100 pontos ou mais.">
          <i class="ti ti-info-circle"></i>
        </button>
      </div>
      <p>Simule o desempenho de um gerente considerando os mesmos pesos da campanha.</p>
      <p id="individual-description" class="sim-hint">${profile.description || ""}</p>
    </div>
    <div class="segmented seg-mini" role="tablist" id="individual-profiles">
      ${profiles.map(p => `<button type="button" class="seg-btn" data-profile="${p.id}">${p.label}</button>`).join("")}
    </div>
    <div class="sim-presets" id="individual-presets">
      ${presets.map(p => `<button type="button" class="sim-chip" data-individual-preset="${p.id}">${p.label}</button>`).join("")}
    </div>
    <table class="sim-table">
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Peso</th>
          <th>Atingimento</th>
          <th>Pontos</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${(profile.indicators || []).map(ind => `
          <tr data-row="${ind.id}">
            <td class="sim-indicator" data-label="Subindicador">
              <strong>${ind.label}</strong>
            </td>
            <td class="sim-weight" data-label="Peso">${fmtONE.format(toNumber(ind.weight))}%</td>
            <td data-label="Atingimento">
              <div class="sim-slider">
                <input type="range" min="0" max="160" step="1" data-indicator="${ind.id}" aria-label="${ind.label}" />
                <span class="sim-slider-value" data-output="${ind.id}"></span>
              </div>
            </td>
            <td class="sim-points" data-label="Pontos" data-points="${ind.id}"></td>
            <td data-label="Resultado"><span class="status-pill" data-status="${ind.id}"></span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div class="sim-summary">
      <div class="sim-total">
        <span>Pontuação total</span>
        <strong id="individual-total-points"></strong>
      </div>
      <div class="sim-progress">
        <div class="sim-progress__track"><span class="sim-progress__fill" id="individual-progress-bar"></span></div>
        <small id="individual-progress-label"></small>
      </div>
      <div class="sim-outcome">
        <span id="individual-status" class="status-tag"></span>
      </div>
    </div>
  `;

  container.querySelectorAll("#individual-profiles .seg-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const profileId = btn.dataset.profile;
      if (!profileId) return;
      state.campanhas.individualProfile = profileId;
      renderCampanhasView();
    });
  });

  container.querySelectorAll("input[type=range]").forEach(input => {
    input.addEventListener("input", (ev) => {
      const id = ev.currentTarget.dataset.indicator;
      const values = ensureIndividualValuesForProfile(sprint, profile);
      values[id] = toNumber(ev.currentTarget.value);
      updateIndividualSimulator(container, sprint, profile);
    });
  });

  container.querySelectorAll("[data-individual-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetId = btn.dataset.individualPreset;
      const preset = presets.find(p => p.id === presetId);
      if (!preset) return;
      const values = ensureIndividualValuesForProfile(sprint, profile);
      Object.entries(preset.values || {}).forEach(([key, val]) => {
        values[key] = toNumber(val);
      });
      setIndividualPresetForProfile(sprint, profile, presetId);
      updateIndividualSimulator(container, sprint, profile);
    });
  });

}

function updateIndividualSimulator(container, sprint, profile){
  if (!container || !sprint || !profile) return;
  const values = ensureIndividualValuesForProfile(sprint, profile);
  const result = computeCampaignScore(profile, values);

  container.querySelectorAll("#individual-profiles .seg-btn").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.profile === profile.id);
  });

  const desc = container.querySelector("#individual-description");
  if (desc) desc.textContent = profile.description || "";

  (profile.indicators || []).forEach(ind => {
    const row = container.querySelector(`tr[data-row="${ind.id}"]`);
    if (!row) return;
    const slider = row.querySelector("input[type=range]");
    if (slider && slider.value !== String(values[ind.id])) slider.value = String(values[ind.id]);
    const output = row.querySelector(`[data-output="${ind.id}"]`);
    if (output) output.textContent = formatCampPercent(values[ind.id] ?? 0);
    const rowData = result.rows.find(r => r.id === ind.id);
    const pointsCell = row.querySelector(`[data-points="${ind.id}"]`);
    if (pointsCell && rowData) pointsCell.textContent = formatCampPoints(rowData.points);
    const statusEl = row.querySelector(`[data-status="${ind.id}"]`);
    if (statusEl && rowData) {
      statusEl.textContent = rowData.statusText;
      statusEl.className = `status-pill ${rowData.statusClass}`;
    }
  });

  const presetMatch = detectPresetMatch(values, profile.presets);
  setIndividualPresetForProfile(sprint, profile, presetMatch || "custom");
  const activePreset = individualPresetForProfile(sprint, profile);
  container.querySelectorAll("[data-individual-preset]").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.individualPreset === activePreset);
  });

  const totalEl = container.querySelector("#individual-total-points");
  if (totalEl) totalEl.textContent = formatCampPoints(result.totalPoints);
  const statusEl = container.querySelector("#individual-status");
  if (statusEl) {
    statusEl.textContent = result.finalStatus;
    statusEl.className = `status-tag ${result.finalClass}`;
  }
  const progressBar = container.querySelector("#individual-progress-bar");
  if (progressBar) {
    const pct = Math.max(0, Math.min(100, Math.round(result.progressPct * 100)));
    progressBar.style.width = "";
    progressBar.style.setProperty("--target", `${pct}%`);
    const trackEl = progressBar.parentElement;
    if (trackEl) {
      let animateBar = true;
      const individualMap = state.animations?.campanhas?.individual;
      const sprintKey = sprint?.id || "__default__";
      const profileKey = profile?.id || "__profile__";
      const animKey = `${sprintKey}:${profileKey}`;
      if (individualMap instanceof Map) {
        const prev = individualMap.get(animKey);
        animateBar = shouldAnimateDelta(prev, pct, 0.5);
        individualMap.set(animKey, pct);
      }
      triggerBarAnimation(trackEl, animateBar);
    }
  }
  const progressLabel = container.querySelector("#individual-progress-label");
  if (progressLabel) progressLabel.textContent = result.progressLabel;

}

function badgeClassFromStatus(status){
  const norm = (status || "").toLowerCase();
  if (norm.includes("parab")) return "elegibility-badge elegibility-badge--great";
  if (norm.includes("não") || norm.includes("nao")) return "elegibility-badge elegibility-badge--warn";
  if (norm.includes("ajust")) return "elegibility-badge elegibility-badge--warn";
  return "elegibility-badge elegibility-badge--ok";
}

function renderCampaignRanking(container, sprint, options = {}){
  if (!container) return;
  const rows = options.rows || [];
  if (!rows.length) {
    container.innerHTML = `<p class="muted">Nenhum resultado disponível.</p>`;
    return;
  }

  const columnLabel = options.columnLabel || "Unidade";
  const config = sprint.team;
  const cap = Math.max(1, toNumber(config?.cap ?? 150));
  const prevRanking = (state.animations?.campanhas?.ranking instanceof Map)
    ? state.animations.campanhas.ranking
    : new Map();
  const nextRanking = new Map();

  const computeFill = (indicatorRow) => {
    const capped = toNumber(indicatorRow?.capped);
    if (!cap) return 0;
    const pct = (capped / cap) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const body = rows.map((row, idx) => {
    const result = row.result || computeCampaignScore(config, { linhas: row.linhas, cash: row.cash, conquista: row.conquista });
    const linhas = result.rows.find(r => r.id === "linhas");
    const cash = result.rows.find(r => r.id === "cash");
    const conquista = result.rows.find(r => r.id === "conquista");
    const badgeClass = badgeClassFromStatus(row.finalStatus || result.finalStatus);
    const statusText = escapeHTML(row.finalStatus || result.finalStatus || "—");
    const rank = row.rank != null ? row.rank : (idx + 1);
    const unitKey = row.key || row.name || `row-${idx}`;
    const safeUnitKey = escapeHTML(unitKey);
    const safeName = escapeHTML(row.name || row.key || "—");

    const linhasFill = Number(computeFill(linhas).toFixed(2));
    const cashFill = Number(computeFill(cash).toFixed(2));
    const conquistaFill = Number(computeFill(conquista).toFixed(2));

    nextRanking.set(`${unitKey}|linhas`, linhasFill);
    nextRanking.set(`${unitKey}|cash`, cashFill);
    nextRanking.set(`${unitKey}|conquista`, conquistaFill);

    const linhasPctLabel = escapeHTML(formatCampPercent(row.linhas));
    const cashPctLabel = escapeHTML(formatCampPercent(row.cash));
    const conquistaPctLabel = escapeHTML(formatCampPercent(row.conquista));

    const linhasPoints = formatCampPoints(linhas?.points || 0);
    const cashPoints = formatCampPoints(cash?.points || 0);
    const conquistaPoints = formatCampPoints(conquista?.points || 0);
    const totalPoints = formatCampPoints(result.totalPoints);

    return `
      <tr data-unit-key="${safeUnitKey}" data-rank="${rank}">
        <td class="pos-col">${rank}</td>
        <td class="regional-col">${safeName}</td>
        <td>
          <div class="indicator-bar">
            <div class="indicator-bar__track" data-metric="linhas" data-fill="${linhasFill.toFixed(2)}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(linhasFill)}" aria-valuetext="${linhasPctLabel}">
              <span style="--target:${linhasFill.toFixed(2)}%;"></span>
            </div>
            <div class="indicator-bar__value">${linhasPctLabel}</div>
          </div>
          <div class="indicator-bar__points">${linhasPoints}</div>
        </td>
        <td>
          <div class="indicator-bar">
            <div class="indicator-bar__track" data-metric="cash" data-fill="${cashFill.toFixed(2)}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(cashFill)}" aria-valuetext="${cashPctLabel}">
              <span style="--target:${cashFill.toFixed(2)}%;"></span>
            </div>
            <div class="indicator-bar__value">${cashPctLabel}</div>
          </div>
          <div class="indicator-bar__points">${cashPoints}</div>
        </td>
        <td>
          <div class="indicator-bar">
            <div class="indicator-bar__track" data-metric="conquista" data-fill="${conquistaFill.toFixed(2)}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(conquistaFill)}" aria-valuetext="${conquistaPctLabel}">
              <span style="--target:${conquistaFill.toFixed(2)}%;"></span>
            </div>
            <div class="indicator-bar__value">${conquistaPctLabel}</div>
          </div>
          <div class="indicator-bar__points">${conquistaPoints}</div>
        </td>
        <td>${totalPoints}</td>
        <td>${row.atividade ? "Sim" : "Não"}</td>
        <td><span class="${badgeClass}">${statusText}</span></td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table class="camp-ranking-table">
      <thead>
        <tr>
          <th class="pos-col">#</th>
          <th class="regional-col">${columnLabel}</th>
          <th>Linhas governamentais</th>
          <th>Cash (TPV)</th>
          <th>Abertura de contas</th>
          <th>Pontuação final</th>
          <th>Atividade comercial</th>
          <th>Elegibilidade</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;

  const rowEls = container.querySelectorAll("tbody tr[data-unit-key]");
  rowEls.forEach(tr => {
    const unitKey = tr.dataset.unitKey || "";
    ["linhas", "cash", "conquista"].forEach(metric => {
      const track = tr.querySelector(`.indicator-bar__track[data-metric="${metric}"]`);
      if (!track) return;
      const fillValue = Number(track.dataset.fill || track.getAttribute("data-fill") || "0");
      const prevValue = prevRanking.get(`${unitKey}|${metric}`);
      const animateBar = shouldAnimateDelta(prevValue, fillValue, 0.25);
      triggerBarAnimation(track, animateBar);
    });
  });

  state.animations.campanhas.ranking = nextRanking;
}

function formatCampaignValidity(period) {
  const startISO = period?.start ? converterDataISO(period.start) : "";
  const endISO = period?.end ? converterDataISO(period.end) : "";
  if (!startISO && !endISO) return "";
  const startDate = startISO ? dateUTCFromISO(startISO) : null;
  const endDate = endISO ? dateUTCFromISO(endISO) : null;
  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });
  const endFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const capitalize = (txt) => txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : "";
  const startLabelRaw = startDate ? monthFormatter.format(startDate) : (startISO ? formatBRDate(startISO) : "");
  const startLabel = capitalize(startLabelRaw);
  const endLabel = endDate ? endFormatter.format(endDate) : (endISO ? formatBRDate(endISO) : "");
  if (startLabel && endLabel) return `Vigência da campanha: de ${startLabel} até ${endLabel}`;
  if (startLabel) return `Vigência da campanha a partir de ${startLabel}`;
  if (endLabel) return `Vigência da campanha até ${endLabel}`;
  return "";
}

function renderCampanhasView(){
  const host = document.getElementById("view-campanhas");
  if (!host) return;
  if (!Array.isArray(CAMPAIGN_SPRINTS) || !CAMPAIGN_SPRINTS.length) return;

  const sprint = currentSprintConfig();
  if (!sprint) return;

  const rankingContext = buildCampaignRankingContext(sprint);
  const summaryInfo = summarizeCampaignUnitResults(rankingContext.unitResults);
  const aggregatedRows = rankingContext.aggregated.slice().sort((a, b) => b.totalPoints - a.totalPoints);
  aggregatedRows.forEach((row, idx) => { row.rank = idx + 1; });

  const select = document.getElementById("campanha-sprint");
  if (select) {
    select.innerHTML = CAMPAIGN_SPRINTS.map(sp => `<option value="${sp.id}">${sp.label}</option>`).join("");
    select.value = sprint.id;
  }

  const cycleEl = document.getElementById("camp-cycle");
  if (cycleEl) {
    const selectedLabel = sprint.label || sprint.cycle || "";
    cycleEl.textContent = selectedLabel;
    if (sprint.cycle && sprint.cycle !== selectedLabel) {
      cycleEl.setAttribute("title", sprint.cycle);
    } else {
      cycleEl.removeAttribute("title");
    }
  }

  const noteEl = document.getElementById("camp-note");
  if (noteEl) {
    const metaInfo = rankingContext.levelInfo?.meta;
    const pluralLabel = metaInfo?.plural || "unidades";
    const visibleUnits = aggregatedRows.length;
    const base = sprint.note || "";
    const suffix = visibleUnits
      ? ` Exibindo ${fmtINT.format(visibleUnits)} ${pluralLabel} filtradas.`
      : " Nenhuma unidade encontrada para o filtro atual.";
    noteEl.textContent = `${base}${suffix}`.trim();
  }

  const validityEl = document.getElementById("camp-validity");
  if (validityEl) {
    const validityText = formatCampaignValidity(sprint.period || {});
    validityEl.textContent = validityText || "Vigência não informada";
  }

  const headline = document.getElementById("camp-headline");
  if (headline) {
    headline.innerHTML = (sprint.headStats || []).map(stat => `
      <div class="camp-hero__stat">
        <span>${stat.label}</span>
        <strong>${stat.value}</strong>
        ${stat.sub ? `<small>${stat.sub}</small>` : ""}
      </div>`).join("");
  }

  const kpiGrid = document.getElementById("camp-kpis");
  if (kpiGrid) {
    const summaryData = (sprint.summary || []).map(item => {
      if (item.id === "equipes") {
        return { ...item, value: summaryInfo.elegiveis, total: summaryInfo.total };
      }
      if (item.id === "media") {
        return { ...item, value: summaryInfo.media };
      }
      if (item.id === "recorde") {
        return { ...item, value: summaryInfo.recorde, complement: summaryInfo.destaque || item.complement || "" };
      }
      return item;
    });

    kpiGrid.innerHTML = summaryData.map(item => {
      if (item.total != null) {
        return `<div class="camp-kpi"><span>${item.label}</span><strong>${fmtINT.format(item.value)} / ${fmtINT.format(item.total)}</strong><small>de ${fmtINT.format(item.total)} monitoradas</small></div>`;
      }
      if (item.unit === "pts") {
        return `<div class="camp-kpi"><span>${item.label}</span><strong>${formatCampPoints(item.value)}</strong>${item.complement ? `<small>${item.complement}</small>` : ""}</div>`;
      }
      if (item.text) {
        return `<div class="camp-kpi"><span>${item.label}</span><strong>${item.text}</strong></div>`;
      }
      return `<div class="camp-kpi"><span>${item.label}</span><strong>${fmtONE.format(item.value)}</strong>${item.complement ? `<small>${item.complement}</small>` : ""}</div>`;
    }).join("");
  }

  const teamContainer = document.getElementById("sim-equipe");
  buildTeamSimulator(teamContainer, sprint);
  updateTeamSimulator(teamContainer, sprint);

  const profiles = sprint.individual?.profiles || [];
  if (!profiles.length) state.campanhas.individualProfile = null;
  if (profiles.length && !profiles.find(p => p.id === state.campanhas.individualProfile)) {
    state.campanhas.individualProfile = profiles[0].id;
  }
  const profile = profiles.find(p => p.id === state.campanhas.individualProfile) || profiles[0] || null;
  const individualContainer = document.getElementById("sim-individual");
  buildIndividualSimulator(individualContainer, sprint, profile);
  updateIndividualSimulator(individualContainer, sprint, profile);

  const rankingContainer = document.getElementById("camp-ranking");
  const rankingDesc = document.getElementById("camp-ranking-desc");
  if (rankingDesc) {
    const meta = rankingContext.levelInfo?.meta;
    const plural = meta?.plural || "unidades";
    const pluralLabel = plural.charAt(0).toUpperCase() + plural.slice(1);
    rankingDesc.textContent = `Acompanhe a performance das ${pluralLabel} e a elegibilidade frente aos critérios mínimos.`;
  }
  renderCampaignRanking(rankingContainer, sprint, {
    rows: aggregatedRows,
    columnLabel: rankingContext.levelInfo?.meta?.singular || "Unidade"
  });
}

function createRankingView(){
  const main = document.querySelector(".container"); 
  if(!main) return;
  if (document.getElementById("view-ranking")) return;

  const section = document.createElement("section");
  section.id="view-ranking"; section.className="hidden view-panel";
  section.innerHTML = `
    <section class="card card--ranking">
      <header class="card__header rk-head">
        <div class="title-subtitle">
          <h3>Rankings</h3>
          <p class="muted">Compare diferentes visões respeitando os filtros aplicados.</p>
        </div>
        <div class="rk-head__controls">
          <div class="rk-control">
            <label for="rk-type" class="muted">Tipo de ranking</label>
            <select id="rk-type" class="input input--sm">
              <option value="pobj">Ranking POBJ</option>
              <option value="produto">Ranking por produto</option>
              <option value="historico">Histórico anual</option>
            </select>
          </div>
          <div class="rk-product-controls" id="rk-product-wrapper" hidden>
            <div class="rk-control">
              <label for="rk-product-level" class="muted">Visão por</label>
              <select id="rk-product-level" class="input input--sm">
                <option value="gerente">Gerente</option>
                <option value="gerenteGestao">Gerente de gestão</option>
                <option value="agencia">Agência</option>
                <option value="gerencia">Regional</option>
              </select>
            </div>
            <div class="segmented seg-mini" id="rk-product-mode" role="group" aria-label="Modo do ranking por produto">
              <button type="button" class="seg-btn" data-mode="melhores">Melhores</button>
              <button type="button" class="seg-btn" data-mode="piores">Piores</button>
            </div>
          </div>
        </div>
      </header>

      <div class="rk-summary" id="rk-summary"></div>
      <div id="rk-table"></div>
    </section>`;
  main.appendChild(section);

  const typeSelect = section.querySelector('#rk-type');
  const modeGroup = section.querySelector('#rk-product-mode');
  const levelSelect = section.querySelector('#rk-product-level');

  typeSelect?.addEventListener('change', () => {
    state.rk.type = typeSelect.value;
    renderRanking();
  });

  modeGroup?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-mode]');
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (!mode || mode === state.rk.productMode) return;
    state.rk.productMode = mode;
    renderRanking();
  });

  levelSelect?.addEventListener('change', () => {
    const value = levelSelect.value;
    const normalized = normalizeProductRankLevel(value);
    if (state.rk.productLevel === normalized) return;
    state.rk.productLevel = normalized;
    renderRanking();
  });
}
function currentUnitForLevel(level){
  const f=getFilterValues();
  switch(level){
    case "gerente":
      if (f.gerente && f.gerente!=="Todos") return f.gerente;
      return CURRENT_USER_CONTEXT.gerente || "";
    case "gerenteGestao":
      if (f.ggestao && f.ggestao!=="Todos") return f.ggestao;
      return CURRENT_USER_CONTEXT.gerenteGestao || "";
    case "agencia":
      if (f.agencia && f.agencia!=="Todas") return f.agencia;
      return CURRENT_USER_CONTEXT.agencia || "";
    case "gerencia":
      if (f.gerencia && f.gerencia!=="Todas") return f.gerencia;
      return CURRENT_USER_CONTEXT.gerencia || "";
    case "diretoria":
      if (f.diretoria && f.diretoria!=="Todas") return f.diretoria;
      return CURRENT_USER_CONTEXT.diretoria || "";
    default:
      return "";
  }
}
function rkGroupCount(level){
  if(level==="diretoria") return 4;
  if(level==="gerencia")  return 8;
  if(level==="agencia")   return 15;
  if(level==="gerenteGestao") return 12;
  return 12;
}
function deriveRankingLevelFromFilters(){
  const f = getFilterValues();
  if(f.gerente && f.gerente!=="Todos")   return "gerente";
  if(f.ggestao && f.ggestao!=="Todos")   return "gerenteGestao";
  if(f.agencia && f.agencia!=="Todas")   return "agencia";
  if(f.gerencia && f.gerencia!=="Todas") return "gerencia";
  if(f.diretoria && f.diretoria!=="Todas") return "diretoria";
  return "agencia";
}

function getRankingSelectionForLevel(level, filters = {}){
  switch(level){
    case "diretoria":
      return filters?.diretoria || "";
    case "gerencia":
      return filters?.gerencia || "";
    case "agencia":
      return filters?.agencia || "";
    case "gerenteGestao":
      return filters?.ggestao || "";
    case "gerente":
      return filters?.gerente || "";
    default:
      return "";
  }
}
const RANKING_KEY_FIELDS = { diretoria:"diretoria", gerencia:"gerenciaRegional", agencia:"agencia", gerente:"gerente", gerenteGestao:"gerenteGestao" };
const RANKING_LABEL_FIELDS = { diretoria:"diretoriaNome", gerencia:"gerenciaNome", agencia:"agenciaNome", gerente:"gerenteNome", gerenteGestao:"gerenteGestaoNome" };

function aggRanking(rows, level){
  const k = RANKING_KEY_FIELDS[level] || "agencia";
  const labelField = RANKING_LABEL_FIELDS[level] || k;
  const map = new Map();
  rows.forEach(r=>{
    const key=r[k] || "—";
    const label = r[labelField] || key;
    const obj = map.get(key) || { unidade:key, label, real_mens:0, meta_mens:0, real_acum:0, meta_acum:0, qtd:0 };
    obj.label = label;
    obj.real_mens += (r.real_mens ?? r.realizado ?? 0);
    obj.meta_mens += (r.meta_mens ?? r.meta ?? 0);
    obj.real_acum += (r.real_acum ?? r.realizado ?? 0);
    obj.meta_acum += (r.meta_acum ?? r.meta ?? 0);
    obj.qtd       += (r.qtd ?? 0);
    map.set(key,obj);
  });
  return [...map.values()].map(x=>{
    const ating_mens = x.meta_mens ? x.real_mens/x.meta_mens : 0;
    const ating_acum = x.meta_acum ? x.real_acum/x.meta_acum : 0;
    return { ...x, ating_mens, ating_acum, p_mens: ating_mens*100, p_acum: ating_acum*100 };
  });
}

function extractRankingRowYear(row){
  if (!row) return null;
  const tryNumber = (value) => {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  const direct = tryNumber(row.ano || row.year || row.anoReferencia);
  if (direct) return direct;
  const dateCandidates = [row.competencia, row.data, row.periodo, row.mes, row.dataReferencia, row.dt];
  for (const candidate of dateCandidates) {
    if (!candidate) continue;
    let text = candidate;
    if (candidate instanceof Date) {
      text = isoFromUTCDate(candidate);
    }
    const str = String(text);
    if (str.length < 4) continue;
    const slice = str.slice(0, 4);
    const maybe = Number(slice);
    if (Number.isFinite(maybe)) return maybe;
  }
  return null;
}
function renderRanking(){
  const hostSum = document.getElementById("rk-summary");
  const hostTbl = document.getElementById("rk-table");
  if(!hostSum || !hostTbl) return;

  const typeSelect = document.getElementById("rk-type");
  const productWrapper = document.getElementById("rk-product-wrapper");
  const modeGroup = document.getElementById("rk-product-mode");
  const levelSelect = document.getElementById("rk-product-level");

  const type = state.rk.type || "pobj";
  if (typeSelect) typeSelect.value = type;
  if (productWrapper) productWrapper.hidden = (type !== "produto");

  let level;
  if (type === "produto") {
    const normalized = normalizeProductRankLevel(state.rk.productLevel);
    if (state.rk.productLevel !== normalized) state.rk.productLevel = normalized;
    level = normalized;
  } else {
    level = deriveRankingLevelFromFilters();
  }
  state.rk.level = level;
  if (levelSelect) {
    const selectValue = (type === "produto") ? level : normalizeProductRankLevel(state.rk.productLevel);
    levelSelect.value = normalizeProductRankLevel(selectValue);
  }

  const except = { [level]: true };
  const rowsBase = filterRowsExcept(state._rankingRaw, except, { searchTerm: "" });

  const gruposLimite = rkGroupCount(level);
  const myUnit = currentUnitForLevel(level);
  const levelNames = {
    diretoria: "Diretoria",
    gerencia: "Regional",
    agencia: "Agência",
    gerente: "Gerente",
    gerenteGestao: "Gerente de gestão"
  };
  const nivelNome = levelNames[level] || (level.charAt(0).toUpperCase() + level.slice(1));
  const filterValues = getFilterValues();
  const selectionForLevel = getRankingSelectionForLevel(level, filterValues);
  const hasSelectionForLevel = !!selectionForLevel && !selecaoPadrao(selectionForLevel);

  let data = [];
  let visibleRows = [];
  let summaryBadges = [];
  let myRankFull = "—";

  if (type === "historico") {
    if (modeGroup) {
      modeGroup.querySelectorAll('.seg-btn').forEach(btn => btn.classList.remove('is-active'));
    }
    if (!myUnit) {
      hostSum.innerHTML = `<div class="rk-badges"><span class="rk-badge rk-badge--warn">Selecione um(a) ${nivelNome.toLowerCase()} para ver o histórico anual.</span></div>`;
      hostTbl.innerHTML = `<p class="rk-empty">Escolha um(a) ${nivelNome.toLowerCase()} nos filtros para visualizar a evolução dos últimos anos.</p>`;
      return;
    }

    const historySource = Array.isArray(state.facts?.historico) && state.facts.historico.length
      ? state.facts.historico
      : FACT_HISTORICO_RANKING_POBJ;

    if (!historySource.length) {
      hostSum.innerHTML = `<div class="rk-badges"><span class="rk-badge rk-badge--warn">Sem dados históricos para o contexto selecionado.</span></div>`;
      hostTbl.innerHTML = `<p class="rk-empty">Ainda não há registros para montar o histórico anual.</p>`;
      return;
    }

    const filters = getFilterValues();
    const normalizedUnit = simplificarTexto(myUnit);
    const keyField = RANKING_KEY_FIELDS[level] || "agencia";
    const labelField = RANKING_LABEL_FIELDS[level] || keyField;

    const matchesHierarchy = (filterValue, ...candidates) => {
      if (selecaoPadrao(filterValue)) return true;
      return matchesSelection(filterValue, ...candidates);
    };

    const rowsHistory = historySource.filter(entry => {
      if (!entry || typeof entry !== "object") return false;
      const rowLevel = simplificarTexto(entry.nivel || "");
      if (rowLevel && rowLevel !== level) return false;
      if (!matchesHierarchy(filters.segmento, entry.segmento, entry.segmentoId)) return false;
      if (!except.gerenteGestao && !matchesHierarchy(filters.ggestao, entry.gerenteGestao, entry.gerenteGestaoId, entry.gerenteGestaoNome, entry.gerenteGestaoLabel)) return false;
      if (!except.diretoria && !matchesHierarchy(filters.diretoria, entry.diretoria, entry.diretoriaNome)) return false;
      if (!except.gerencia && !matchesHierarchy(filters.gerencia, entry.gerenciaRegional, entry.gerenciaNome)) return false;
      if (!except.agencia && !matchesHierarchy(filters.agencia, entry.agencia, entry.agenciaCodigo, entry.agenciaNome)) return false;
      if (!except.gerente && !matchesHierarchy(filters.gerente, entry.gerente, entry.gerenteId, entry.gerenteNome, entry.gerenteLabel)) return false;
      return true;
    });

    if (!rowsHistory.length) {
      hostSum.innerHTML = `<div class="rk-badges"><span class="rk-badge rk-badge--warn">Sem dados históricos para o contexto selecionado.</span></div>`;
      hostTbl.innerHTML = `<p class="rk-empty">Ainda não há registros para montar o histórico anual.</p>`;
      return;
    }

    const yearsSet = new Set();
    rowsHistory.forEach(row => {
      const year = Number(row.ano ?? extractRankingRowYear(row));
      if (Number.isFinite(year)) yearsSet.add(year);
    });
    const sortedYears = [...yearsSet].sort((a, b) => b - a).slice(0, 5);
    if (!sortedYears.length) {
      hostSum.innerHTML = `<div class="rk-badges"><span class="rk-badge rk-badge--warn">Sem dados históricos para o contexto selecionado.</span></div>`;
      hostTbl.innerHTML = `<p class="rk-empty">Ainda não há registros para montar o histórico anual.</p>`;
      return;
    }

    const unitMatcher = (row = {}) => {
      const keyMatch = simplificarTexto(row[keyField]);
      const labelMatch = simplificarTexto(row[labelField]);
      return keyMatch === normalizedUnit || labelMatch === normalizedUnit;
    };

    let unitLabel = "";

    const scoreValue = (row = {}) => {
      const pontos = Number(row.pontos);
      if (Number.isFinite(pontos)) return pontos;
      const realizado = Number(row.realizado);
      if (Number.isFinite(realizado)) return realizado;
      const metaValor = Number(row.meta);
      if (Number.isFinite(realizado) && Number.isFinite(metaValor) && metaValor) {
        return (realizado / metaValor) * 100;
      }
      return 0;
    };

    const previewYear = (sortedYears[0] || 0) >= CURRENT_CALENDAR_YEAR ? sortedYears[0] : 0;

    const records = sortedYears.map(year => {
      const yearRows = rowsHistory.filter(row => Number(row.ano ?? extractRankingRowYear(row)) === year);
      if (!yearRows.length) {
        return { year, rank: null, points: null, participants: 0 };
      }

      const uniqueParticipants = new Set();
      yearRows.forEach(row => {
        const normalized = simplificarTexto(row[keyField]) || simplificarTexto(row[labelField]);
        if (normalized) uniqueParticipants.add(normalized);
      });
      const participants = uniqueParticipants.size || yearRows.length;

      const entry = yearRows.find(unitMatcher) || null;
      if (entry && !unitLabel) {
        unitLabel = entry[labelField] || entry[keyField] || myUnit;
      }

      let rank = Number.isFinite(Number(entry?.rank)) ? Number(entry.rank) : null;
      if (!Number.isFinite(rank) && entry) {
        const ordered = yearRows.slice().sort((a, b) => scoreValue(b) - scoreValue(a));
        const idx = ordered.findIndex(unitMatcher);
        if (idx >= 0) rank = idx + 1;
      }

      let points = Number.isFinite(Number(entry?.pontos)) ? Number(entry.pontos) : null;
      if (points == null && entry && Number.isFinite(Number(entry.realizado))) {
        points = Number(entry.realizado);
      } else if (points == null && entry && Number.isFinite(Number(entry.meta)) && Number(entry.meta)) {
        points = (Number(entry.realizado) / Number(entry.meta)) * 100;
      }

      return { year, rank: Number.isFinite(rank) ? rank : null, points, participants };
    });

    if (!unitLabel) {
      const fallback = rowsHistory.find(unitMatcher);
      unitLabel = fallback?.[labelField] || fallback?.[keyField] || myUnit;
    }

    const rangeLabel = sortedYears.length > 1
      ? `${sortedYears[sortedYears.length - 1]} a ${sortedYears[0]}`
      : `${sortedYears[0]}`;
    const latestParticipants = records[0]?.participants || 0;
    const participantsYearLabel = previewYear && sortedYears[0] === previewYear
      ? `${sortedYears[0]} (prévia)`
      : `${sortedYears[0]}`;
    const summaryItems = [
      `<span class="rk-badge"><strong>Nível:</strong> ${nivelNome}</span>`,
      `<span class="rk-badge"><strong>Unidade:</strong> ${escapeHTML(unitLabel || myUnit)}</span>`,
      `<span class="rk-badge"><strong>Período:</strong> ${rangeLabel}</span>`,
      `<span class="rk-badge"><strong>Participantes (${participantsYearLabel}):</strong> ${fmtINT.format(latestParticipants)}</span>`,
    ];
    hostSum.innerHTML = `<div class="rk-badges">${summaryItems.join("")}</div>`;

    const table = document.createElement("table");
    table.className = "rk-table rk-history-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="year-col">Ano</th>
          <th class="rank-col">Classificação</th>
          <th>Pontuação acumulada</th>
          <th>Participantes</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    records.forEach(record => {
      const rankText = typeof record.rank === "number" ? `${fmtINT.format(record.rank)}º` : "—";
      const pointsText = (typeof record.points === "number") ? fmtONE.format(record.points) : "—";
      const participantsText = record.participants ? fmtINT.format(record.participants) : "—";
      const isPreviewYear = previewYear && record.year === previewYear;
      const yearLabel = isPreviewYear ? `${record.year} (prévia)` : record.year;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="year-col">${yearLabel}</td>
        <td class="rank-col">${rankText}</td>
        <td>${pointsText}</td>
        <td>${participantsText}</td>
      `;
      if (record.rank === 1) {
        row.classList.add("rk-history-row--top");
      }
      tbody.appendChild(row);
    });
    hostTbl.innerHTML = "";
    hostTbl.appendChild(table);
    return;
  }

  if (type === "produto") {
    const mode = state.rk.productMode === "piores" ? "piores" : "melhores";
    if (state.rk.productMode !== mode) state.rk.productMode = mode;
    if (modeGroup) {
      modeGroup.querySelectorAll('.seg-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.mode === mode);
      });
    }

    const filters = getFilterValues();
    const hasProductFilter = !selecaoPadrao(filters.produtoId);
    const hasFamilyFilter = !selecaoPadrao(filters.familiaId);
    state.rk.product = hasProductFilter ? filters.produtoId : "";

    const selectLabel = (selector, value) => {
      if (!value || selecaoPadrao(value)) return "";
      const select = document.querySelector(selector);
      if (!select) return "";
      const options = Array.from(select.options || []);
      const desired = limparTexto(value);
      const match = options.find(opt => limparTexto(opt.value) === desired);
      return match?.textContent?.trim() || "";
    };

    const productLabelFromRow = (row = {}) => row?.subIndicadorNome || row?.subIndicador || row?.subproduto || row?.prodOrSub || row?.produtoNome || "";
    const indicatorLabelFromRow = (row = {}) => row?.produtoNome || row?.produto || row?.ds_indicador || row?.indicadorNome || row?.produtoId || "";

    const hasAnyProductData = rowsBase.some(row =>
      Boolean(row?.produtoId || row?.prodOrSub || row?.produto || row?.subproduto)
    );
    if (!hasAnyProductData) {
      const badges = [
        `<span class="rk-badge"><strong>Nível:</strong> ${nivelNome}</span>`,
        `<span class="rk-badge"><strong>Modo:</strong> ${mode === 'piores' ? 'Piores resultados' : 'Melhores resultados'}</span>`
      ];
      hostSum.innerHTML = `<div class="rk-badges">${badges.join("")}</div>`;
      hostTbl.innerHTML = `<p class="rk-empty">Sem dados disponíveis para o ranking por produto com os filtros atuais.</p>`;
      return;
    }

    let contextBadge = "";
    let emptyMessage = "Sem dados disponíveis para o contexto selecionado.";
    let filteredRows = rowsBase.slice();

    if (hasProductFilter) {
      filteredRows = filteredRows.filter(row =>
        matchesSelection(
          filters.produtoId,
          row.subIndicadorId,
          row.subIndicador,
          row.subIndicadorNome,
          row.subproduto,
          row.prodOrSub,
          row.produtoNome
        )
      );
      const label = selectLabel('#f-produto', filters.produtoId)
        || productLabelFromRow(filteredRows.find(row => productLabelFromRow(row)))
        || filters.produtoId;
      contextBadge = `<span class="rk-badge"><strong>Subindicador:</strong> ${escapeHTML(label || filters.produtoId)}</span>`;
      emptyMessage = "Ainda não há dados para o subindicador selecionado.";
    } else if (hasFamilyFilter) {
      filteredRows = filteredRows.filter(row =>
        matchesSelection(
          filters.familiaId,
          row.produtoId,
          row.indicadorId,
          row.produto,
          row.produtoNome,
          row.ds_indicador,
          row.indicadorNome
        )
      );
      const label = selectLabel('#f-familia', filters.familiaId)
        || indicatorLabelFromRow(filteredRows.find(row => indicatorLabelFromRow(row)))
        || filters.familiaId;
      contextBadge = `<span class="rk-badge"><strong>Indicador:</strong> ${escapeHTML(label || filters.familiaId)}</span>`;
      emptyMessage = "Ainda não há dados para o indicador selecionado.";
    } else {
      contextBadge = `<span class="rk-badge"><strong>Contexto:</strong> Todos os indicadores</span>`;
      emptyMessage = "Sem dados disponíveis para o ranking selecionado.";
    }

    if (!filteredRows.length) {
      summaryBadges = [
        `<span class="rk-badge"><strong>Nível:</strong> ${nivelNome}</span>`,
        contextBadge,
        `<span class="rk-badge"><strong>Modo:</strong> ${mode === 'piores' ? 'Piores resultados' : 'Melhores resultados'}</span>`
      ].filter(Boolean);
      hostSum.innerHTML = summaryBadges.length ? `<div class="rk-badges">${summaryBadges.join("")}</div>` : "";
      hostTbl.innerHTML = `<p class="rk-empty">${emptyMessage}</p>`;
      return;
    }

    data = aggRanking(filteredRows, level);
    data.sort((a,b) => mode === 'piores' ? (a.p_acum - b.p_acum) : (b.p_acum - a.p_acum));
    visibleRows = data.slice(0, gruposLimite);

    const myIndexFull = myUnit ? data.findIndex(d => d.unidade === myUnit) : -1;
    if (myUnit && myIndexFull >= 0 && !visibleRows.some(r => r.unidade === myUnit)) {
      visibleRows.push(data[myIndexFull]);
    }
    myRankFull = myIndexFull >= 0 ? myIndexFull + 1 : "—";

    summaryBadges = [
      `<span class="rk-badge"><strong>Nível:</strong> ${nivelNome}</span>`,
      typeof myRankFull === "number" ? `<span class="rk-badge"><strong>Posição:</strong> ${fmtINT.format(myRankFull)}</span>` : "",
      contextBadge,
      `<span class="rk-badge"><strong>Modo:</strong> ${mode === 'piores' ? 'Piores resultados' : 'Melhores resultados'}</span>`,
      `<span class="rk-badge"><strong>Quantidade de participantes:</strong> ${fmtINT.format(data.length)}</span>`,
    ].filter(Boolean);
  } else {
    if (modeGroup) {
      modeGroup.querySelectorAll('.seg-btn').forEach(btn => btn.classList.remove('is-active'));
    }

    data = aggRanking(rowsBase, level);
    data.sort((a,b)=> (b.p_acum - a.p_acum));
    visibleRows = data.slice(0, gruposLimite);

    const myIndexFull = myUnit ? data.findIndex(d => d.unidade===myUnit) : -1;
    myRankFull = myIndexFull>=0 ? (myIndexFull+1) : "—";

    if (myUnit && myIndexFull >= 0 && !visibleRows.some(r => r.unidade === myUnit)) {
      visibleRows.push(data[myIndexFull]);
    }

    const grupoTexto = typeof myRankFull === "number" ? fmtINT.format(myRankFull) : myRankFull;
    summaryBadges = [
      `<span class="rk-badge"><strong>Nível:</strong> ${nivelNome}</span>`,
      `<span class="rk-badge"><strong>Número do grupo:</strong> ${grupoTexto}</span>`,
      `<span class="rk-badge"><strong>Quantidade de participantes:</strong> ${fmtINT.format(data.length)}</span>`,
    ];
  }

  hostSum.innerHTML = summaryBadges.length ? `<div class="rk-badges">${summaryBadges.join("")}</div>` : "";

  hostTbl.innerHTML = "";
  if (!visibleRows.length) {
    hostTbl.innerHTML = `<p class="rk-empty">Sem dados disponíveis para o ranking selecionado.</p>`;
    return;
  }

  const tbl = document.createElement("table");
  tbl.className = "rk-table";
  tbl.innerHTML = `
    <thead>
      <tr>
        <th class="pos-col">#</th>
        <th class="unit-col">Unidade</th>
        <th>Pontos (mensal)</th>
        <th>Pontos (acumulado)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tb = tbl.querySelector("tbody");

  const shouldMaskNames = (type !== "produto");
  visibleRows.forEach((r,idx)=>{
    const fullIndex = data.findIndex(d => d.unidade === r.unidade);
    const rankNumber = fullIndex >= 0 ? (fullIndex + 1) : (idx + 1);
    const isMine = (myUnit && r.unidade === myUnit);
    const rawName = r.label || r.unidade || "—";
    const shouldReveal = (!shouldMaskNames)
      || isMine
      || (hasSelectionForLevel && matchesSelection(selectionForLevel, r.unidade, rawName, r.label));
    const visibleName = shouldReveal ? rawName : "*****";
    const nomeSafe = escapeHTML(visibleName);
    const titleSafe = escapeHTML(shouldReveal ? rawName : "Participante oculto");
    const tr = document.createElement("tr");
    tr.className = `rk-row ${isMine? "rk-row--mine":""}`;
    tr.innerHTML = `
      <td class="pos-col">${rankNumber}</td>
      <td class="unit-col rk-name" title="${titleSafe}">${nomeSafe}</td>
      <td>${r.p_mens.toFixed(1)}</td>
      <td>${r.p_acum.toFixed(1)}</td>
    `;
    tb.appendChild(tr);
  });

  hostTbl.appendChild(tbl);
}

/* ===== Aqui eu renderizo a tabela em árvore usada no detalhamento ===== */
function openDetailTicket(node = {}, trail = [], triggerEvent = null){
  const detail = {
    node,
    trail: Array.isArray(trail) ? [...trail] : [],
    label: node?.label || "",
    type: node?.type || "",
    level: node?.level ?? null,
    levelKey: node?.levelKey || "",
    lineage: Array.isArray(node?.lineage) ? node.lineage.map(entry => ({ ...entry })) : [],
  };
  const preferStandalone = !!(triggerEvent && (triggerEvent.ctrlKey || triggerEvent.metaKey || triggerEvent.shiftKey));
  detail.openDrawer = true;
  detail.intent = "new-ticket";
  detail.preferredQueue = "POBJ";
  detail.queue = "POBJ";
  if (preferStandalone) {
    detail.launchStandalone = true;
  }
  let handled = false;
  try {
    const event = new CustomEvent("detail:open-ticket", { detail, cancelable: true });
    handled = !document.dispatchEvent(event);
  } catch (err) {
    console.warn("Não foi possível notificar o módulo de chamados:", err);
  }
  console.info("Detalhamento — chamado", detail);
  if (!handled) {
    try {
      if (preferStandalone) {
        if (typeof window.launchOmegaStandalone === "function") {
          window.launchOmegaStandalone(detail);
        } else {
          window.open(TICKET_URL, "_blank");
        }
      } else {
        if (typeof window.openOmegaModule === "function") {
          window.openOmegaModule(detail);
        } else if (typeof window.openOmega === "function") {
          window.openOmega(detail);
        } else if (typeof window.launchOmegaStandalone === "function") {
          window.launchOmegaStandalone(detail);
        } else {
          window.open(TICKET_URL, "_blank");
        }
      }
    } catch (err) {
      console.warn("Falha ao abrir Omega; usando fallback padrão.", err);
      window.open(TICKET_URL, "_blank");
    }
  }
}

function openDetailOpportunities(node = {}, trail = []){
  const detail = {
    node,
    trail: Array.isArray(trail) ? [...trail] : [],
    label: node?.label || "",
    type: node?.type || "",
    level: node?.level ?? null,
    levelKey: node?.levelKey || "",
    lineage: Array.isArray(node?.lineage) ? node.lineage.map(entry => ({ ...entry })) : [],
  };
  try {
    document.dispatchEvent(new CustomEvent("detail:open-opportunities", { detail }));
  } catch (err) {
    console.warn("Não foi possível notificar oportunidades personalizadas:", err);
  }
  console.info("Detalhamento — oportunidades", detail);
  openLeadsWithoutFilters();
}

function ensureSyntheticDashboardRowsForTree(rows = [], sections = []) {
  const baseRows = Array.isArray(rows) ? rows.slice() : [];
  const existingKeys = new Set();
  baseRows.forEach(row => {
    if (!row || typeof row !== "object") return;
    const produtoKey = simplificarTexto(
      row.produtoId
      || row.indicadorId
      || row.prodOrSub
      || row.produtoNome
      || row.ds_indicador
      || ""
    );
    const familiaKey = simplificarTexto(row.familiaId || row.secaoId || "");
    if (produtoKey) {
      existingKeys.add(`${familiaKey}::${produtoKey}`);
    }
  });

  const filters = getFilterValues();
  const segmentoValor = selecaoPadrao(filters.segmento) ? "" : filters.segmento;
  const periodStart = state.period?.start || "";
  const periodEnd = state.period?.end || "";
  const diasTotais = businessDaysBetweenInclusive(periodStart, periodEnd);
  const diasDecorridos = businessDaysElapsedUntilToday(periodStart, periodEnd);
  const diasRestantes = Math.max(0, diasTotais - diasDecorridos);
  const dataISO = periodEnd || periodStart || todayISO();
  const competenciaISO = dataISO ? `${String(dataISO).slice(0, 7)}-01` : "";

  const sectionList = Array.isArray(sections) ? sections : [];
  sectionList.forEach(section => {
    if (!section || section.id === "outros") return;
    const secaoId = limparTexto(section.id) || simplificarTexto(section.label) || "secao";
    const secaoNome = section.label || getSectionLabel(secaoId) || secaoId;
    const items = Array.isArray(section.items) ? section.items : [];
    items.forEach(item => {
      if (!item || item.hiddenInCards) return;
      if (item.unknown) return;
      const indicadorId = limparTexto(item.id);
      if (!indicadorId) return;
      const familiaId = limparTexto(item.familiaId) || secaoId;
      const familiaNome = item.familiaLabel || getSectionLabel(familiaId) || secaoNome;
      const produtoKey = simplificarTexto(indicadorId);
      const familiaKey = simplificarTexto(familiaId);
      const compositeKey = `${familiaKey}::${produtoKey}`;
      if (existingKeys.has(compositeKey)) return;
      existingKeys.add(compositeKey);

      const nome = item.nome || indicadorId;
      const meta = toNumber(item.meta);
      const realizado = toNumber(item.realizado);
      const variavelMeta = toNumber(item.variavelMeta);
      const variavelReal = toNumber(item.variavelReal);
      const pontosMeta = toNumber(item.pontosMeta ?? item.peso);
      const peso = toNumber(item.peso ?? item.pontosMeta ?? pontosMeta);
      const pontosBrutos = toNumber(item.pontosBrutos ?? item.pontos ?? 0);
      const pontos = Math.max(0, Math.min(peso || pontosMeta, pontosBrutos || 0));
      const ating = meta ? (realizado / meta) : 0;
      const atingVariavel = variavelMeta ? (variavelReal / variavelMeta) : ating;
      const metaDiaria = diasTotais > 0 ? meta / diasTotais : 0;
      const referenciaHoje = diasDecorridos > 0 ? Math.min(meta, metaDiaria * diasDecorridos) : 0;
      const metaDiariaNecessaria = diasRestantes > 0 ? Math.max(0, (meta - realizado) / diasRestantes) : 0;
      const projecao = diasDecorridos > 0 ? (realizado / Math.max(diasDecorridos, 1)) * diasTotais : realizado;

      const syntheticRow = {
        registroId: `synthetic::${secaoId}::${indicadorId}`,
        synthetic: true,
        syntheticSource: "dashboard",
        segmento: segmentoValor,
        segmentoId: segmentoValor,
        diretoria: "",
        diretoriaNome: "",
        gerenciaRegional: "",
        gerenciaNome: "",
        regional: "",
        agencia: "",
        agenciaNome: "",
        agenciaCodigo: "",
        gerenteGestao: "",
        gerenteGestaoNome: "",
        gerente: "",
        gerenteNome: "",
        secaoId,
        secao: secaoNome,
        secaoNome,
        familiaId,
        familia: familiaNome,
        familiaNome,
        produtoId: indicadorId,
        produto: nome,
        produtoNome: nome,
        prodOrSub: nome,
        subproduto: "",
        subIndicadorId: "",
        subIndicadorNome: "",
        data: dataISO,
        competencia: competenciaISO,
        realizado,
        real_mens: realizado,
        real_acum: realizado,
        meta,
        meta_mens: meta,
        meta_acum: meta,
        variavelMeta,
        variavelReal,
        ating,
        atingVariavel,
        qtd: 0,
        peso,
        pontos,
        pontosMeta,
        pontosBrutos,
        metaDiaria,
        referenciaHoje,
        metaDiariaNecessaria,
        projecao,
        ultimaAtualizacao: dataISO,
        ultimaAtualizacaoTexto: item.ultimaAtualizacao || "",
        hasData: Boolean(item.hasData),
      };

      aplicarIndicadorAliases(syntheticRow, indicadorId, nome);
      baseRows.push(syntheticRow);
    });
  });

  return baseRows;
}

function renderTreeTable() {
  ensureChipBarAndToolbar();
  renderDetailViewBar();

  const def = TABLE_VIEWS.find(v=> v.id === state.tableView) || TABLE_VIEWS[0];
  let rowsFiltered = filterRows(state._rankingRaw);
  const dashboardSections = Array.isArray(state.dashboardVisibleSections) && state.dashboardVisibleSections.length
    ? state.dashboardVisibleSections
    : state.dashboard?.sections;
  if (dashboardSections && dashboardSections.length) {
    rowsFiltered = ensureSyntheticDashboardRowsForTree(rowsFiltered, dashboardSections);
  }
  const nodes = buildTree(rowsFiltered, def.id);
  const activeColumns = getActiveDetailColumns();
  const activeIds = new Set(activeColumns.map(col => col.id));

  let currentSortId = state.detailSort?.id || null;
  let currentSortDirection = state.detailSort?.direction || null;
  if (currentSortId && currentSortDirection) {
    if (currentSortId !== "__label__" && !activeIds.has(currentSortId)) {
      currentSortId = null;
      currentSortDirection = null;
      state.detailSort = { id: null, direction: null };
    }
  }

  const sortMeta = getDetailSortMeta(currentSortId);
  if (!sortMeta || !currentSortDirection) {
    currentSortId = null;
    currentSortDirection = null;
  }

  applyDetailSort(nodes, sortMeta, currentSortDirection);

  const host = document.getElementById("gridRanking");
  if (!host) return;
  host.innerHTML = "";

  const table = document.createElement("table");
  table.className = "tree-table";
  const iconFor = (columnId) => {
    if (currentSortId === columnId) {
      if (currentSortDirection === "asc") return "ti ti-arrow-up";
      if (currentSortDirection === "desc") return "ti ti-arrow-down";
    }
    return "ti ti-arrows-up-down";
  };
  const buildSortControl = (label, columnId, { sortable = true } = {}) => {
    const safeLabel = escapeHTML(label);
    const iconClass = iconFor(columnId);
    if (!sortable) {
      return `<button type="button" class="tree-sort" disabled aria-disabled="true">${safeLabel}<span class="tree-sort__icon"><i class="${iconClass}"></i></span></button>`;
    }
    const safeId = escapeHTML(columnId);
    const isActive = currentSortId === columnId && !!currentSortDirection;
    const ariaPressed = isActive ? "true" : "false";
    return `<button type="button" class="tree-sort" data-sort-id="${safeId}" aria-pressed="${ariaPressed}">${safeLabel}<span class="tree-sort__icon"><i class="${iconClass}"></i></span></button>`;
  };
  const buildHeaderCell = (label, columnId, { sortable = true, thClass = "" } = {}) => {
    const classAttr = thClass ? ` class="${thClass}"` : "";
    return `<th${classAttr}>${buildSortControl(label, columnId, { sortable })}</th>`;
  };
  const headerCells = [
    buildHeaderCell(def.label, "__label__"),
    ...activeColumns.map(col => buildHeaderCell(col.label, col.id)),
    buildHeaderCell("Ações", "__actions__", { sortable: false, thClass: "col-actions" }),
  ].join("");
  table.innerHTML = `
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  host.appendChild(table);

  table.querySelector("thead")?.addEventListener("click", (event) => {
    const btn = event.target.closest(".tree-sort");
    if (!btn || btn.disabled) return;
    const sortId = btn.dataset.sortId;
    if (!sortId) return;
    const meta = getDetailSortMeta(sortId);
    if (!meta) return;
    const prev = state.detailSort || { id: null, direction: null };
    const defaultDir = meta.defaultDirection || (meta.sortType === "string" ? "asc" : "desc");
    const oppositeDir = defaultDir === "asc" ? "desc" : "asc";
    let nextDirection;
    if (prev.id !== sortId || !prev.direction) {
      nextDirection = defaultDir;
    } else if (prev.direction === defaultDir) {
      nextDirection = oppositeDir;
    } else if (prev.direction === oppositeDir) {
      nextDirection = null;
    } else {
      nextDirection = defaultDir;
    }
    if (nextDirection) {
      state.detailSort = { id: sortId, direction: nextDirection };
    } else {
      state.detailSort = { id: null, direction: null };
    }
    renderTreeTable();
  });

  if (state.compact) document.getElementById("table-section")?.classList.add("is-compact");
  else document.getElementById("table-section")?.classList.remove("is-compact");

  let seq=0; const mkId=()=>`n${++seq}`;

  const buildDetailTableHTML = (node = null) => {
    const groups = Array.isArray(node?.detailGroups) ? node.detailGroups : [];
    if (!groups.length) return "";
    const columns = DETAIL_SUBTABLE_COLUMNS;
    const rows = groups.map(group => {
      const cells = columns.map(col => `<td>${col.render(group)}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const cancelGroup = groups.find(g => g.dataCancelamento || g.motivoCancelamento);
    let alertHtml = "";
    if (cancelGroup) {
      const dateText = cancelGroup.dataCancelamento ? `Cancelado em ${formatBRDate(cancelGroup.dataCancelamento)}` : "";
      const reasonText = cancelGroup.motivoCancelamento ? cancelGroup.motivoCancelamento : "";
      const descriptionParts = [];
      if (dateText) descriptionParts.push(escapeHTML(dateText));
      if (reasonText) descriptionParts.push(escapeHTML(reasonText));
      const descriptionHtml = descriptionParts.join(" • ");
      alertHtml = `<div class="tree-detail__alert"><i class="ti ti-alert-triangle"></i><div><strong>Venda cancelada</strong>${descriptionHtml ? `<span>${descriptionHtml}</span>` : ""}</div></div>`;
    }

    return `
      <div class="tree-detail-wrapper">
        ${alertHtml}
        <table class="detail-table">
          <thead>
            <tr>${columns.map(col => `<th>${escapeHTML(col.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  function renderNode(node, parentId=null, parentTrail=[]){
    const id=mkId(), has=!!(node.children&&node.children.length);
    const tr=document.createElement("tr");
    tr.className=`tree-row ${node.type==="contrato"?"type-contrato":""} lvl-${node.level}`;
    tr.dataset.id=id; if(parentId) tr.dataset.parent=parentId;
    const trail=[...parentTrail, node.label];
    const hasDetails = node.type === "contrato" && Array.isArray(node.detailGroups) && node.detailGroups.length > 0;
    let detailTr=null;

    const cancelGroup = hasDetails ? node.detailGroups.find(g => g.dataCancelamento || g.motivoCancelamento) : null;
    const isCancelled = !!cancelGroup;

    if (hasDetails) tr.classList.add("has-detail");
    if (isCancelled) {
      tr.classList.add("is-cancelled");
      tr.dataset.cancelled = "1";
    }

    const rawLabelBase = (node.type === "contrato" || !node.detail?.gerente)
      ? (node.label || "—")
      : `Gerente: ${node.detail.gerente}`;
    const labelBase = escapeHTML(rawLabelBase);
    const fallbackLabel = escapeHTML(node.label || "—");

    let statusBadge = "";
    if (isCancelled) {
      const titleText = cancelGroup?.motivoCancelamento
        ? `Cancelado — ${cancelGroup.motivoCancelamento}`
        : "Cancelado";
      const safeTitle = escapeHTML(titleText);
      statusBadge = `<span class="tree-status tree-status--cancelled" title="${safeTitle}"><i class="ti ti-alert-triangle"></i> Cancelado</span>`;
    }

    const labelHtml = node.detail
      ? `<div class="tree-label"><span class="label-strong">${labelBase}</span>${statusBadge}</div>`
      : (statusBadge
        ? `<div class="tree-label"><span class="label-strong">${fallbackLabel}</span>${statusBadge}</div>`
        : `<span class="label-strong">${fallbackLabel}</span>`);

    const dataCells = activeColumns.map(col => {
      const cls = col.cellClass ? ` class="${col.cellClass}"` : "";
      const content = col.render(node);
      return `<td${cls}>${content}</td>`;
    }).join("");

    const canOpenOpportunities = node.levelKey !== "contrato" && node.type !== "contrato";
    const opportunityButtonHtml = canOpenOpportunities
      ? `<button type="button" class="icon-btn" title="Ver oportunidades"><i class="ti ti-bulb"></i></button>`
      : "";

    tr.innerHTML=`
      <td><div class="tree-cell">
        <button class="toggle" type="button" ${has?"":"disabled"} aria-label="${has?"Expandir/colapsar":""}"><i class="ti ${has?"ti-chevron-right":"ti-dot"}"></i></button>
        ${labelHtml}</div></td>
      ${dataCells}
      <td class="actions-cell">
        <span class="actions-group">
          <button type="button" class="icon-btn" title="Abrir chamado"><i class="ti ti-ticket"></i></button>
          ${opportunityButtonHtml}
        </span>
      </td>`;

    const [btnTicket, btnOpportunity] = tr.querySelectorAll(".icon-btn");
    btnTicket?.addEventListener("click",(ev)=>{
      ev.stopPropagation();
      openDetailTicket(node, trail, ev);
    });
    btnOpportunity?.addEventListener("click",(ev)=>{
      ev.stopPropagation();
      openDetailOpportunities(node, trail);
    });

    const btn=tr.querySelector(".toggle");
    if(btn && has){
      btn.addEventListener("click", ()=>{
        const isOpen=btn.dataset.open==="1";
        btn.dataset.open=isOpen?"0":"1";
        btn.querySelector("i").className=`ti ${isOpen?"ti-chevron-right":"ti-chevron-down"}`;
        toggleChildren(id, !isOpen);
      });
    }

    tbody.appendChild(tr);

    if (hasDetails){
      const detailHTML = buildDetailTableHTML(node);
      if (detailHTML){
        detailTr=document.createElement("tr");
        detailTr.className="tree-row tree-detail-row";
        detailTr.dataset.detailParent=id;
        detailTr.style.display="none";
        if (isCancelled) {
          detailTr.classList.add("is-cancelled-detail");
          detailTr.dataset.cancelled = "1";
        }
        const detailColspan = activeColumns.length + 2;
        detailTr.innerHTML=`<td colspan="${detailColspan}">${detailHTML}</td>`;
        tbody.appendChild(detailTr);

        tr.addEventListener("click", (ev)=>{
          if (ev.target.closest('.toggle') || ev.target.closest('.icon-btn')) return;
          const open = detailTr.style.display === "table-row";
          if (open){
            detailTr.style.display="none";
            tr.classList.remove("is-detail-open");
          } else {
            detailTr.style.display="table-row";
            tr.classList.add("is-detail-open");
          }
        });
      }
    }

    if(has){
      node.children.forEach(ch=>renderNode(ch, id, trail));
      toggleChildren(id, false);
    }
  }

  function toggleChildren(parentId, show){
    const kids=[...tbody.querySelectorAll(`tr[data-parent="${parentId}"]`)];
    kids.forEach(ch=>{
      ch.style.display=show?"table-row":"none";
      if(!show){
        const b=ch.querySelector(".toggle[data-open='1']");
        if(b){ b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"; }
        toggleChildren(ch.dataset.id,false);
      }
    });
    if(!show){
      const detail=tbody.querySelector(`tr.tree-detail-row[data-detail-parent="${parentId}"]`);
      if(detail){
        detail.style.display="none";
        const parentRow=tbody.querySelector(`tr[data-id="${parentId}"]`);
        parentRow?.classList.remove("is-detail-open");
      }
    }
  }

  nodes.forEach(n=>renderNode(n,null,[]));
}
function applyFiltersAndRender(){
  updatePeriodLabels();
  updateDashboardCards();
  if(state.tableRendered) renderTreeTable();
  if (state.activeView === "campanhas") renderCampanhasView();
}
function expandAllRows(){
  const tb=document.querySelector("#gridRanking tbody"); if(!tb) return;
  tb.querySelectorAll("tr").forEach(tr=>{
    const b=tr.querySelector("i.ti-chevron-right")?.parentElement;
    if(b && !b.disabled){ b.dataset.open="1"; b.querySelector("i").className="ti ti-chevron-down"; }
    if(tr.dataset.parent) tr.style.display="table-row";
  });
}
function collapseAllRows(){
  const tb=document.querySelector("#gridRanking tbody"); if(!tb) return;
  tb.querySelectorAll("tr").forEach(tr=>{
    const b=tr.querySelector("i.ti-chevron-down")?.parentElement || tr.querySelector(".toggle");
    if(b && !b.disabled){ b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"; }
    if(tr.dataset.parent) tr.style.display="none";
  });
}

/* ===== Aqui eu crio um tooltip simples para qualquer campo com elipse ===== */
function enableSimpleTooltip(){
  let tip = document.getElementById("__tip");
  if(!tip){
    tip = document.createElement("div");
    tip.id = "__tip";
    tip.className = "tip";
    document.body.appendChild(tip);
  }

  const moveTitlesToDataTip = (root = document) => {
    root.querySelectorAll('[title]').forEach(el => {
      if (
        el.closest('.kpi-tip') ||
        el.tagName === 'SVG' || el.tagName === 'USE' ||
        el.hasAttribute('data-native-title')
      ) return;

      const t = el.getAttribute('title');
      if (!t) return;
      el.setAttribute('data-tip', t);
      if(!el.hasAttribute('aria-label')) el.setAttribute('aria-label', t);
      el.removeAttribute('title');
    });
  };

  moveTitlesToDataTip();

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'title') {
        const el = m.target;
        if (el.getAttribute && el.hasAttribute('title')) {
          moveTitlesToDataTip(el.parentNode || document);
        }
      }
      if (m.type === 'childList' && m.addedNodes?.length) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1) moveTitlesToDataTip(node);
        });
      }
    }
  });
  obs.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['title']
  });

  let raf = null;
  const show = (e) => {
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      const t = e.target.closest('[data-tip]');
      if(!t){ tip.classList.remove('is-on'); return; }
      tip.textContent = t.getAttribute('data-tip') || '';
      tip.classList.add('is-on');
      const pad = 12;
      const x = Math.min(window.innerWidth - tip.offsetWidth - pad, e.clientX + 14);
      const y = Math.min(window.innerHeight - tip.offsetHeight - pad, e.clientY + 16);
      tip.style.left = `${x}px`;
      tip.style.top  = `${y}px`;
    });
  };
  const hide = () => tip.classList.remove('is-on');

  document.addEventListener('mousemove', show, {passive:true});
  document.addEventListener('mouseleave', hide, true);
  window.addEventListener('scroll', hide, {passive:true});
}

/* ===== Aqui eu faço o refresh geral: carrego dados e redesenho tudo ===== */
async function refresh(){
  try{
    const dataset = await getData();
    state._dataset = dataset;
    state.facts = dataset.facts || state.facts;
    state._rankingRaw = (state.facts?.dados && state.facts.dados.length)
      ? state.facts.dados
      : (dataset.ranking || []);
    rebuildOpportunityLeads();
    updateContractAutocomplete();

    const right = document.getElementById("lbl-atualizacao");
    if(right){
      right.innerHTML = `
        <div class="period-inline">
          <span class="txt">
            De
            <strong><span id="lbl-periodo-inicio">${formatBRDate(state.period.start)}</span></strong>
            até
            <strong><span id="lbl-periodo-fim">${formatBRDate(state.period.end)}</span></strong>
          </span>
          <button id="btn-alterar-data" type="button" class="link-action">
            <i class="ti ti-chevron-down"></i> Alterar data
          </button>
        </div>`;
      document.getElementById("btn-alterar-data")?.addEventListener("click", (e)=> openDatePopover(e.currentTarget));
      updatePeriodLabels();
    }

    updateDashboardCards();
    reorderFiltersUI();
    renderAppliedFilters();
    if(state.tableRendered) renderTreeTable();

    if (state.activeView==="ranking") renderRanking();
    if (state.activeView==="exec")    renderExecutiveView();
    if (state.activeView==="campanhas") renderCampanhasView();

  }catch(e){
    console.error(e);
    throw e;
  }
}

/* ===== Aqui eu escrevi um loader de CSV que aguenta diferentes codificações e separadores ===== */
async function loadCSVAuto(url) {
  // Busca como binário para poder detectar a codificação.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();

  // Tenta decodificar como UTF-8; se vier com � (replacement char), refaz como latin-1.
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("\uFFFD")) {
    text = new TextDecoder("iso-8859-1").decode(buf);
  }
  text = text.trim();
  if (!text) return [];

  // Se o Papa ainda não carregou (ex.: offline ou CDN bloqueada), faz o parse manual.
  if (typeof Papa === "undefined" || typeof Papa.parse !== "function") {
    return converterCSV(text);
  }

  // Descobre o separador pela 1ª linha (conta ; e ,)
  const first = (text.split(/\r?\n/)[0] || "");
  const semis = (first.match(/;/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  const delimiter = semis > commas ? ";" : ",";

  // Faz o parse com cabeçalho
  const parsed = Papa.parse(text, {
    header: true,
    delimiter,
    skipEmptyLines: true
  });

  if (!parsed || !Array.isArray(parsed.data)) {
    return converterCSV(text);
  }

  if (parsed.errors && parsed.errors.length) {
    const simplified = parsed.errors.map(err => ({
      type: err?.type,
      code: err?.code,
      row: err?.row,
      message: err?.message,
    }));
    console.warn(`Avisos ao ler ${url}:`, simplified);
  }

  return parsed.data.map(record => {
    if (!record || typeof record !== "object") return record;
    const normalized = {};
    Object.keys(record).forEach(key => {
      const safeKey = typeof key === "string" ? key.trim() : key;
      const value = record[key];
      normalized[safeKey] = typeof value === "string" ? value.trim() : value;
    });
    return normalized;
  });
}

/* ===== Aqui eu disparo o boot do painel assim que a página carrega ===== */
(async function(){
  ensureLoader();
  enableSimpleTooltip();
  injectStyles();
  setupUserMenu();
  setupTopbarNotifications();

  try {
    await loadBaseData();
  } catch (error) {
    handleBootstrapError(error);
    return;
  }

  initCombos();
  bindEvents();
  initMobileCarousel();
  wireClearFiltersButton();
  ensureStatusFilterInAdvanced();
  reorderFiltersUI();
  if (typeof setupOpportunityModal === "function") {
    setupOpportunityModal();
  }

  try {
    await refresh();
  } catch (error) {
    handleBootstrapError(error);
    return;
  }

  ensureChatWidget();
})();

function ensureFatalErrorOverlay(){
  let host = document.getElementById(FATAL_ERROR_ID);
  if (host) return host;
  host = document.createElement("div");
  host.id = FATAL_ERROR_ID;
  host.className = "fatal-error";
  host.innerHTML = `
    <div class="fatal-error__card" role="alert" aria-live="assertive">
      <h2 class="fatal-error__title"></h2>
      <p class="fatal-error__subtitle"></p>
      <div class="fatal-error__steps-wrap">
        <p class="fatal-error__label">Verifique os passos abaixo:</p>
        <ol class="fatal-error__steps"></ol>
      </div>
      <details class="fatal-error__details">
        <summary>Detalhes técnicos</summary>
        <pre class="fatal-error__trace"></pre>
      </details>
    </div>
  `;
  document.body.appendChild(host);
  return host;
}

function showFatalError(options){
  const { title, subtitle, steps, details } = options || {};
  const host = ensureFatalErrorOverlay();
  const card = host.querySelector(".fatal-error__card");
  const titleEl = card.querySelector(".fatal-error__title");
  const subtitleEl = card.querySelector(".fatal-error__subtitle");
  const stepsWrap = card.querySelector(".fatal-error__steps-wrap");
  const stepsEl = card.querySelector(".fatal-error__steps");
  const detailsEl = card.querySelector(".fatal-error__details");
  const traceEl = card.querySelector(".fatal-error__trace");

  titleEl.textContent = title || "Não foi possível carregar os dados";
  subtitleEl.textContent = subtitle || "";

  stepsEl.innerHTML = "";
  const stepList = Array.isArray(steps) ? steps.filter(Boolean) : [];
  if (stepList.length) {
    stepList.forEach(step => {
      const item = document.createElement("li");
      item.textContent = step;
      stepsEl.appendChild(item);
    });
    if (stepsWrap) stepsWrap.style.display = "block";
  } else {
    if (stepsWrap) stepsWrap.style.display = "none";
  }

  if (details) {
    traceEl.textContent = details;
    if (detailsEl) detailsEl.style.display = "block";
  } else {
    traceEl.textContent = "";
    if (detailsEl) detailsEl.style.display = "none";
  }

  host.classList.add("is-visible");
  FATAL_ERROR_VISIBLE = true;
}

function buildBootstrapHelpSteps(error){
  const steps = [];
  if (window.location.protocol === "file:") {
    steps.push("Mova a pasta 'POBJ SQL php71' para o diretório htdocs do XAMPP ou publique via Apache.");
    steps.push("Abra o painel pelo endereço http://localhost/POBJ%20SQL%20php71/ (não use file:// ou extensões sem PHP).");
    steps.push("Caso use outro endereço/porta, defina window.API_HTTP_BASE antes de carregar script.js.");
    return steps;
  }

  steps.push("Confira se o Apache (servidor web) e o MySQL estão iniciados no XAMPP.");
  steps.push("Acesse http://localhost/POBJ%20SQL%20php71/config/api/index.php?endpoint=health e confirme que retorna {\"status\":\"ok\"}.");
  steps.push("Revise o arquivo config/.env com host, usuário e senha do banco (ex.: host=localhost, user=root, sem senha no XAMPP).");
  steps.push("Execute docs/schema_mysql.sql no banco para garantir que todas as tabelas existem.");
  steps.push("Se publicar em outro domínio/porta, adicione <script>window.API_HTTP_BASE='URL-do-seu-site';</script> antes de script.js.");

  if (error && error.code === "HTTP_ERROR") {
    steps.push("Verifique se o usuário do banco tem permissão de SELECT nas tabelas informadas.");
  }

  return steps;
}

function handleBootstrapError(error){
  console.error("Falha ao iniciar o painel", error);
  hideLoader();

  if (FATAL_ERROR_VISIBLE) {
    return;
  }

  const detailMessage = error && error.stack
    ? error.stack
    : (error && error.message ? error.message : "");
  const subtitle = "O painel precisa acessar o PHP do XAMPP para ler o MySQL.";
  const steps = buildBootstrapHelpSteps(error);

  showFatalError({
    title: "Não foi possível conectar ao banco de dados",
    subtitle,
    steps,
    details: detailMessage,
  });
}

if (typeof window !== "undefined") {
  window.DEBUG = window.DEBUG || {};
  window.DEBUG.check = function debugCheck(){
    const factRows = (state?.facts?.dados && Array.isArray(state.facts.dados)) ? state.facts.dados : fDados;
    const filtered = Array.isArray(factRows) ? filterRowsExcept(factRows, {}, { searchTerm: "" }) : [];
    const grouped = filtered.reduce((acc, row) => {
      const gerente = row.gerente_id || row.gerenteId || row.gerente || "";
      const indicador = row.indicadorId || row.id_indicador || row.produtoId || "";
      const sub = row.subindicadorId || row.id_subindicador || row.subproduto || "";
      const key = `${gerente}|${indicador}|${sub}`;
      acc[key] = (acc[key] || 0) + Number(row.realizado || 0);
      return acc;
    }, {});
    const rows = Object.entries(grouped).map(([key, valor]) => {
      const [gerente, indicador, sub] = key.split("|");
      return { gerente_id: gerente || null, indicador: indicador || null, subindicador: sub || null, valor };
    });
    console.table(rows);
    return rows;
  };
}

/*
Checklist de Smoke Test
* [ ] Ao abrir a página, o período aparece como "De 01/mm/aaaa até hoje" (mês vigente).
* [ ] Selecionar um gerente de gestão altera os valores exibidos.
* [ ] Selecionar um gerente específico altera os valores exibidos.
* [ ] Filtro por agência ajusta os totais e (quando aplicável) reduz as opções de gerente.
* [ ] Botão "Limpar filtros" restaura o período padrão do mês vigente e limpa os campos de gerente.
*/