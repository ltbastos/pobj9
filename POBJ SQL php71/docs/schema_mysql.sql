-- Esquema MySQL para o painel POBJ
-- Execute no schema oficial `POBJ`.
-- Todas as tabelas utilizam UTF-8 e armazenam datas no formato ISO (DATE).

CREATE DATABASE IF NOT EXISTS `POBJ`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `POBJ`;

SET NAMES utf8mb4;
SET lc_time_names = 'pt_BR';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `omega_chamados`;
DROP TABLE IF EXISTS `omega_usuarios`;
DROP TABLE IF EXISTS `omega_departamentos`;
DROP TABLE IF EXISTS `omega_status`;
DROP TABLE IF EXISTS `f_historico_ranking_pobj`;
DROP TABLE IF EXISTS `f_leads_propensos`;
DROP TABLE IF EXISTS `d_calendario`;
DROP TABLE IF EXISTS `f_campanhas`;
DROP TABLE IF EXISTS `f_variavel`;
DROP TABLE IF EXISTS `f_detalhes`;
DROP TABLE IF EXISTS `f_metas`;
DROP TABLE IF EXISTS `f_realizados`;
DROP TABLE IF EXISTS `d_status_indicadores`;
DROP TABLE IF EXISTS `d_unidades`;
DROP TABLE IF EXISTS `d_produtos`;

CREATE TABLE `d_produtos` (
  `id_familia` TINYINT NOT NULL,
  `familia` VARCHAR(100) NOT NULL,
  `familia_slug` VARCHAR(100) NOT NULL,
  `id_indicador` VARCHAR(50) NOT NULL,
  `indicador` VARCHAR(150) NOT NULL,
  `indicador_slug` VARCHAR(150) NOT NULL,
  `id_subindicador` VARCHAR(50) NOT NULL DEFAULT '0',
  `subindicador` VARCHAR(150) DEFAULT NULL,
  `subindicador_slug` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id_indicador`, `id_subindicador`),
  KEY `idx_d_produtos_familia` (`familia_slug`),
  UNIQUE KEY `uq_d_produtos_indicador_slug` (`indicador_slug`),
  UNIQUE KEY `uq_d_produtos_sub_slug` (`id_indicador`, `subindicador_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `d_unidades` (
  `segmento` VARCHAR(100) NOT NULL,
  `segmento_id` VARCHAR(50) NOT NULL,
  `diretoria_regional` VARCHAR(150) NOT NULL,
  `diretoria_id` VARCHAR(50) NOT NULL,
  `gerencia_regional` VARCHAR(150) NOT NULL,
  `gerencia_regional_id` VARCHAR(50) NOT NULL,
  `agencia` VARCHAR(150) NOT NULL,
  `agencia_id` VARCHAR(50) NOT NULL,
  `gerente_gestao` VARCHAR(150) DEFAULT NULL,
  `gerente_gestao_id` VARCHAR(50) DEFAULT NULL,
  `gerente` VARCHAR(150) DEFAULT NULL,
  `gerente_id` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  UNIQUE KEY `uq_d_unidades_agencia` (`agencia_id`),
  KEY `idx_d_unidades_diretoria` (`diretoria_id`),
  KEY `idx_d_unidades_gerencia` (`gerencia_regional_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `d_status_indicadores` (
  `id` VARCHAR(20) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_d_status_nome` (`status`),
  CONSTRAINT `ck_d_status_indicadores_status`
    CHECK (`status` IN ('Atingido','Não Atingido','Todos')),
  CONSTRAINT `ck_d_status_indicadores_id`
    CHECK (`id` IN ('01','02','03'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `f_realizados` (
  `registro_id` VARCHAR(60) NOT NULL,
  `segmento` VARCHAR(100) NOT NULL,
  `segmento_id` VARCHAR(50) NOT NULL,
  `diretoria_id` VARCHAR(50) NOT NULL,
  `diretoria_nome` VARCHAR(150) NOT NULL,
  `gerencia_regional_id` VARCHAR(50) NOT NULL,
  `gerencia_regional_nome` VARCHAR(150) NOT NULL,
  `regional_nome` VARCHAR(150) NOT NULL,
  `agencia_id` VARCHAR(50) NOT NULL,
  `agencia_nome` VARCHAR(150) NOT NULL,
  `gerente_gestao_id` VARCHAR(50) DEFAULT NULL,
  `gerente_gestao_nome` VARCHAR(150) DEFAULT NULL,
  `gerente_id` VARCHAR(50) DEFAULT NULL,
  `gerente_nome` VARCHAR(150) DEFAULT NULL,
  `familia_id` VARCHAR(20) NOT NULL,
  `familia_nome` VARCHAR(150) NOT NULL,
  `id_indicador` VARCHAR(80) NOT NULL,
  `ds_indicador` VARCHAR(150) NOT NULL,
  `subproduto` VARCHAR(150) DEFAULT NULL,
  `id_subindicador` VARCHAR(80) NOT NULL DEFAULT '0',
  `status_id` VARCHAR(20) DEFAULT NULL,
  `carteira` VARCHAR(150) DEFAULT NULL,
  `canal_venda` VARCHAR(150) DEFAULT NULL,
  `tipo_venda` VARCHAR(100) DEFAULT NULL,
  `modalidade_pagamento` VARCHAR(100) DEFAULT NULL,
  `data` DATE NOT NULL,
  `competencia` DATE NOT NULL,
  `realizado_mensal` DECIMAL(18,2) NOT NULL,
  `realizado_acumulado` DECIMAL(18,2) DEFAULT NULL,
  `quantidade` INT DEFAULT NULL,
  `variavel_real` DECIMAL(18,2) DEFAULT NULL,
  `familia_codigo` VARCHAR(20) DEFAULT NULL,
  `indicador_codigo` VARCHAR(20) DEFAULT NULL,
  `subindicador_codigo` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`registro_id`),
  KEY `idx_f_realizados_status` (`status_id`),
  KEY `idx_f_realizados_data` (`data`),
  KEY `idx_f_realizados_competencia` (`competencia`),
  KEY `idx_f_realizados_segmento` (`segmento_id`),
  KEY `idx_f_realizados_diretoria` (`diretoria_id`),
  KEY `idx_f_realizados_gerencia` (`gerencia_regional_id`),
  KEY `idx_f_realizados_agencia` (`agencia_id`),
  KEY `idx_f_realizados_indicador` (`id_indicador`),
  KEY `idx_f_realizados_subindicador` (`id_subindicador`),
  CONSTRAINT `fk_realizados_produtos` FOREIGN KEY (`id_indicador`, `id_subindicador`) REFERENCES `d_produtos` (`id_indicador`, `id_subindicador`),
  CONSTRAINT `fk_realizados_unidade` FOREIGN KEY (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`) REFERENCES `d_unidades` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  CONSTRAINT `fk_realizados_calendario_data` FOREIGN KEY (`data`) REFERENCES `d_calendario` (`data`),
  CONSTRAINT `fk_realizados_calendario_comp` FOREIGN KEY (`competencia`) REFERENCES `d_calendario` (`data`),
  CONSTRAINT `fk_realizados_status` FOREIGN KEY (`status_id`) REFERENCES `d_status_indicadores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `f_metas` (
  `registro_id` VARCHAR(60) NOT NULL,
  `segmento` VARCHAR(100) NOT NULL,
  `segmento_id` VARCHAR(50) NOT NULL,
  `diretoria_id` VARCHAR(50) NOT NULL,
  `diretoria_nome` VARCHAR(150) NOT NULL,
  `gerencia_regional_id` VARCHAR(50) NOT NULL,
  `gerencia_regional_nome` VARCHAR(150) NOT NULL,
  `regional_nome` VARCHAR(150) NOT NULL,
  `agencia_id` VARCHAR(50) NOT NULL,
  `agencia_nome` VARCHAR(150) NOT NULL,
  `gerente_gestao_id` VARCHAR(50) DEFAULT NULL,
  `gerente_gestao_nome` VARCHAR(150) DEFAULT NULL,
  `gerente_id` VARCHAR(50) DEFAULT NULL,
  `gerente_nome` VARCHAR(150) DEFAULT NULL,
  `familia_id` VARCHAR(20) NOT NULL,
  `familia_nome` VARCHAR(150) NOT NULL,
  `id_indicador` VARCHAR(80) NOT NULL,
  `ds_indicador` VARCHAR(150) NOT NULL,
  `subproduto` VARCHAR(150) DEFAULT NULL,
  `id_subindicador` VARCHAR(80) NOT NULL DEFAULT '0',
  `carteira` VARCHAR(150) DEFAULT NULL,
  `canal_venda` VARCHAR(150) DEFAULT NULL,
  `tipo_venda` VARCHAR(100) DEFAULT NULL,
  `modalidade_pagamento` VARCHAR(100) DEFAULT NULL,
  `data` DATE NOT NULL,
  `competencia` DATE NOT NULL,
  `meta_mensal` DECIMAL(18,2) NOT NULL,
  `meta_acumulada` DECIMAL(18,2) DEFAULT NULL,
  `variavel_meta` DECIMAL(18,2) DEFAULT NULL,
  `peso` DECIMAL(9,4) DEFAULT NULL,
  `familia_codigo` VARCHAR(20) DEFAULT NULL,
  `indicador_codigo` VARCHAR(20) DEFAULT NULL,
  `subindicador_codigo` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`registro_id`),
  KEY `idx_f_metas_data` (`data`),
  KEY `idx_f_metas_competencia` (`competencia`),
  KEY `idx_f_metas_segmento` (`segmento_id`),
  KEY `idx_f_metas_diretoria` (`diretoria_id`),
  KEY `idx_f_metas_gerencia` (`gerencia_regional_id`),
  KEY `idx_f_metas_agencia` (`agencia_id`),
  KEY `idx_f_metas_indicador` (`id_indicador`),
  KEY `idx_f_metas_subindicador` (`id_subindicador`),
  CONSTRAINT `fk_metas_produtos` FOREIGN KEY (`id_indicador`, `id_subindicador`) REFERENCES `d_produtos` (`id_indicador`, `id_subindicador`),
  CONSTRAINT `fk_metas_unidade` FOREIGN KEY (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`) REFERENCES `d_unidades` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  CONSTRAINT `fk_metas_calendario_data` FOREIGN KEY (`data`) REFERENCES `d_calendario` (`data`),
  CONSTRAINT `fk_metas_calendario_comp` FOREIGN KEY (`competencia`) REFERENCES `d_calendario` (`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `f_variavel` (
  `registro_id` VARCHAR(60) NOT NULL,
  `id_indicador` VARCHAR(80) NOT NULL,
  `ds_indicador` VARCHAR(150) NOT NULL,
  `familia_id` VARCHAR(20) NOT NULL,
  `familia_nome` VARCHAR(150) NOT NULL,
  `data` DATE NOT NULL,
  `competencia` DATE NOT NULL,
  `variavel_meta` DECIMAL(18,2) DEFAULT NULL,
  `variavel_real` DECIMAL(18,2) DEFAULT NULL,
  `id_subindicador` VARCHAR(80) NOT NULL DEFAULT '0',
  `familia_codigo` VARCHAR(20) DEFAULT NULL,
  `indicador_codigo` VARCHAR(20) DEFAULT NULL,
  `subindicador_codigo` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`registro_id`),
  KEY `idx_f_variavel_data` (`data`),
  KEY `idx_f_variavel_competencia` (`competencia`),
  KEY `idx_f_variavel_indicador` (`id_indicador`),
  KEY `idx_f_variavel_subindicador` (`id_subindicador`),
  CONSTRAINT `fk_variavel_produtos` FOREIGN KEY (`id_indicador`, `id_subindicador`) REFERENCES `d_produtos` (`id_indicador`, `id_subindicador`),
  CONSTRAINT `fk_variavel_calendario_data` FOREIGN KEY (`data`) REFERENCES `d_calendario` (`data`),
  CONSTRAINT `fk_variavel_calendario_comp` FOREIGN KEY (`competencia`) REFERENCES `d_calendario` (`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `f_detalhes` (
  `contrato_id` VARCHAR(80) NOT NULL,
  `registro_id` VARCHAR(60) NOT NULL,
  `segmento` VARCHAR(100) DEFAULT NULL,
  `segmento_id` VARCHAR(50) NOT NULL,
  `diretoria_id` VARCHAR(50) NOT NULL,
  `diretoria_nome` VARCHAR(150) DEFAULT NULL,
  `gerencia_regional_id` VARCHAR(50) NOT NULL,
  `gerencia_regional_nome` VARCHAR(150) DEFAULT NULL,
  `agencia_id` VARCHAR(50) NOT NULL,
  `agencia_nome` VARCHAR(150) DEFAULT NULL,
  `gerente_gestao_id` VARCHAR(50) DEFAULT NULL,
  `gerente_gestao_nome` VARCHAR(150) DEFAULT NULL,
  `gerente_id` VARCHAR(50) DEFAULT NULL,
  `gerente_nome` VARCHAR(150) DEFAULT NULL,
  `familia_id` VARCHAR(20) NOT NULL,
  `familia_nome` VARCHAR(150) DEFAULT NULL,
  `id_indicador` VARCHAR(80) NOT NULL,
  `ds_indicador` VARCHAR(150) DEFAULT NULL,
  `id_subindicador` VARCHAR(80) NOT NULL DEFAULT '0',
  `subindicador` VARCHAR(150) DEFAULT NULL,
  `carteira` VARCHAR(150) DEFAULT NULL,
  `canal_venda` VARCHAR(150) DEFAULT NULL,
  `tipo_venda` VARCHAR(100) DEFAULT NULL,
  `modalidade_pagamento` VARCHAR(100) DEFAULT NULL,
  `data` DATE NOT NULL,
  `competencia` DATE NOT NULL,
  `valor_meta` DECIMAL(18,2) DEFAULT NULL,
  `valor_realizado` DECIMAL(18,2) DEFAULT NULL,
  `quantidade` DECIMAL(18,4) DEFAULT NULL,
  `peso` DECIMAL(18,4) DEFAULT NULL,
  `pontos` DECIMAL(18,4) DEFAULT NULL,
  `data_vencimento` DATE DEFAULT NULL,
  `data_cancelamento` DATE DEFAULT NULL,
  `motivo_cancelamento` VARCHAR(255) DEFAULT NULL,
  `status_id` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`contrato_id`),
  KEY `idx_f_detalhes_registro` (`registro_id`),
  KEY `idx_f_detalhes_indicador` (`id_indicador`, `id_subindicador`),
  KEY `idx_f_detalhes_unidade` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  KEY `idx_f_detalhes_data` (`data`),
  KEY `idx_f_detalhes_competencia` (`competencia`),
  CONSTRAINT `fk_detalhes_produtos` FOREIGN KEY (`id_indicador`, `id_subindicador`) REFERENCES `d_produtos` (`id_indicador`, `id_subindicador`),
  CONSTRAINT `fk_detalhes_unidade` FOREIGN KEY (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`) REFERENCES `d_unidades` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  CONSTRAINT `fk_detalhes_calendario_data` FOREIGN KEY (`data`) REFERENCES `d_calendario` (`data`),
  CONSTRAINT `fk_detalhes_calendario_comp` FOREIGN KEY (`competencia`) REFERENCES `d_calendario` (`data`),
  CONSTRAINT `fk_detalhes_status` FOREIGN KEY (`status_id`) REFERENCES `d_status_indicadores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `f_campanhas` (
  `campanha_id` VARCHAR(60) NOT NULL,
  `sprint_id` VARCHAR(60) NOT NULL,
  `diretoria_id` VARCHAR(50) NOT NULL,
  `diretoria_nome` VARCHAR(150) NOT NULL,
  `gerencia_regional_id` VARCHAR(50) NOT NULL,
  `regional_nome` VARCHAR(150) NOT NULL,
  `agencia_id` VARCHAR(50) NOT NULL,
  `agencia_nome` VARCHAR(150) NOT NULL,
  `gerente_gestao_id` VARCHAR(50) DEFAULT NULL,
  `gerente_gestao_nome` VARCHAR(150) DEFAULT NULL,
  `gerente_id` VARCHAR(50) DEFAULT NULL,
  `gerente_nome` VARCHAR(150) DEFAULT NULL,
  `segmento` VARCHAR(100) NOT NULL,
  `segmento_id` VARCHAR(50) NOT NULL,
  `familia_id` VARCHAR(20) NOT NULL,
  `id_indicador` VARCHAR(80) NOT NULL,
  `ds_indicador` VARCHAR(150) NOT NULL,
  `subproduto` VARCHAR(150) DEFAULT NULL,
  `id_subindicador` VARCHAR(80) NOT NULL DEFAULT '0',
  `carteira` VARCHAR(150) DEFAULT NULL,
  `linhas` DECIMAL(18,2) DEFAULT NULL,
  `cash` DECIMAL(18,2) DEFAULT NULL,
  `conquista` DECIMAL(18,2) DEFAULT NULL,
  `atividade` VARCHAR(100) DEFAULT NULL,
  `data` DATE NOT NULL,
  `familia_codigo` VARCHAR(20) DEFAULT NULL,
  `indicador_codigo` VARCHAR(20) DEFAULT NULL,
  `subindicador_codigo` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`campanha_id`),
  KEY `idx_f_campanhas_data` (`data`),
  KEY `idx_f_campanhas_diretoria` (`diretoria_id`),
  KEY `idx_f_campanhas_gerencia` (`gerencia_regional_id`),
  KEY `idx_f_campanhas_indicador` (`id_indicador`),
  KEY `idx_f_campanhas_unidade` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  CONSTRAINT `fk_campanhas_produtos` FOREIGN KEY (`id_indicador`, `id_subindicador`) REFERENCES `d_produtos` (`id_indicador`, `id_subindicador`),
  CONSTRAINT `fk_campanhas_unidades` FOREIGN KEY (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`) REFERENCES `d_unidades` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  CONSTRAINT `fk_campanhas_calendario_data` FOREIGN KEY (`data`) REFERENCES `d_calendario` (`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `d_calendario` (
  `data` DATE NOT NULL,
  `competencia` DATE NOT NULL,
  `ano` INT NOT NULL,
  `mes` TINYINT NOT NULL,
  `mes_nome` VARCHAR(20) NOT NULL,
  `dia` TINYINT NOT NULL,
  `dia_da_semana` VARCHAR(20) NOT NULL,
  `semana` TINYINT NOT NULL,
  `trimestre` TINYINT NOT NULL,
  `semestre` TINYINT NOT NULL,
  `eh_dia_util` TINYINT(1) NOT NULL,
  PRIMARY KEY (`data`),
  KEY `idx_d_calendario_competencia` (`competencia`),
  KEY `idx_d_calendario_mes` (`ano`, `mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `f_leads_propensos` (
  `database` DATE NOT NULL,
  `nome_empresa` VARCHAR(200) NOT NULL,
  `cnae` VARCHAR(20) DEFAULT NULL,
  `segmento_cliente` VARCHAR(100) DEFAULT NULL,
  `segmento_cliente_id` VARCHAR(50) DEFAULT NULL,
  `produto_propenso` VARCHAR(150) NOT NULL,
  `familia_produto_propenso` VARCHAR(150) NOT NULL,
  `secao_produto_propenso` VARCHAR(150) DEFAULT NULL,
  `id_indicador` VARCHAR(80) DEFAULT NULL,
  `id_subindicador` VARCHAR(80) DEFAULT '0',
  `data_contato` DATE DEFAULT NULL,
  `comentario` TEXT,
  `responsavel_contato` VARCHAR(150) DEFAULT NULL,
  `diretoria_cliente` VARCHAR(150) DEFAULT NULL,
  `diretoria_cliente_id` VARCHAR(50) DEFAULT NULL,
  `regional_cliente` VARCHAR(150) DEFAULT NULL,
  `regional_cliente_id` VARCHAR(50) DEFAULT NULL,
  `agencia_cliente` VARCHAR(150) DEFAULT NULL,
  `agencia_cliente_id` VARCHAR(50) DEFAULT NULL,
  `gerente_gestao_cliente` VARCHAR(150) DEFAULT NULL,
  `gerente_gestao_cliente_id` VARCHAR(50) DEFAULT NULL,
  `gerente_cliente` VARCHAR(150) DEFAULT NULL,
  `gerente_cliente_id` VARCHAR(50) DEFAULT NULL,
  `credito_pre_aprovado` DECIMAL(18,2) DEFAULT NULL,
  `origem_lead` VARCHAR(50) DEFAULT NULL,
  PRIMARY KEY (`database`, `nome_empresa`),
  KEY `idx_f_leads_calendario` (`database`),
  KEY `idx_f_leads_contato` (`data_contato`),
  KEY `idx_f_leads_unidade` (`segmento_cliente_id`, `diretoria_cliente_id`, `regional_cliente_id`, `agencia_cliente_id`),
  KEY `idx_f_leads_produto` (`id_indicador`, `id_subindicador`),
  KEY `idx_f_leads_diretoria` (`diretoria_cliente_id`),
  KEY `idx_f_leads_regional` (`regional_cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `f_leads_propensos`
  ADD CONSTRAINT `fk_leads_calendario_base` FOREIGN KEY (`database`) REFERENCES `d_calendario` (`data`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_leads_calendario_contato` FOREIGN KEY (`data_contato`) REFERENCES `d_calendario` (`data`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_leads_unidade` FOREIGN KEY (`segmento_cliente_id`, `diretoria_cliente_id`, `regional_cliente_id`, `agencia_cliente_id`) REFERENCES `d_unidades` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`),
  ADD CONSTRAINT `fk_leads_produtos` FOREIGN KEY (`id_indicador`, `id_subindicador`) REFERENCES `d_produtos` (`id_indicador`, `id_subindicador`);

CREATE TABLE `f_historico_ranking_pobj` (
  `nivel` VARCHAR(30) NOT NULL,
  `ano` INT NOT NULL,
  `database` DATE NOT NULL,
  `segmento` VARCHAR(100) DEFAULT NULL,
  `segmento_id` VARCHAR(50) DEFAULT NULL,
  `diretoria` VARCHAR(50) DEFAULT NULL,
  `diretoria_nome` VARCHAR(150) DEFAULT NULL,
  `gerencia_regional` VARCHAR(50) DEFAULT NULL,
  `gerencia_regional_nome` VARCHAR(150) DEFAULT NULL,
  `agencia` VARCHAR(50) DEFAULT NULL,
  `agencia_nome` VARCHAR(150) DEFAULT NULL,
  `gerente_gestao` VARCHAR(50) DEFAULT NULL,
  `gerente_gestao_nome` VARCHAR(150) DEFAULT NULL,
  `gerente` VARCHAR(50) DEFAULT NULL,
  `gerente_nome` VARCHAR(150) DEFAULT NULL,
  `participantes` INT DEFAULT NULL,
  `rank` INT DEFAULT NULL,
  `pontos` DECIMAL(18,2) DEFAULT NULL,
  `realizado` DECIMAL(18,2) DEFAULT NULL,
  `meta` DECIMAL(18,2) DEFAULT NULL,
  PRIMARY KEY (`nivel`, `ano`, `database`),
  KEY `idx_f_hist_calendario` (`database`),
  KEY `idx_f_hist_unidade` (`segmento_id`, `diretoria`, `gerencia_regional`, `agencia`),
  KEY `idx_f_hist_ranking_diretoria` (`diretoria`),
  KEY `idx_f_hist_ranking_segmento` (`segmento_id`),
  CONSTRAINT `fk_hist_calendario` FOREIGN KEY (`database`) REFERENCES `d_calendario` (`data`),
  CONSTRAINT `fk_hist_unidades` FOREIGN KEY (`segmento_id`, `diretoria`, `gerencia_regional`, `agencia`) REFERENCES `d_unidades` (`segmento_id`, `diretoria_id`, `gerencia_regional_id`, `agencia_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `omega_status` (
  `id` VARCHAR(40) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `tone` VARCHAR(20) DEFAULT 'neutral',
  `descricao` VARCHAR(255) DEFAULT NULL,
  `ordem` INT DEFAULT NULL,
  `departamento_id` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_omega_status_departamento` (`departamento_id`),
  CONSTRAINT `fk_omega_status_departamento` FOREIGN KEY (`departamento_id`) REFERENCES `omega_departamentos` (`departamento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `omega_departamentos` (
  `departamento` VARCHAR(120) NOT NULL,
  `departamento_id` VARCHAR(30) NOT NULL,
  `ordem_departamento` INT DEFAULT NULL,
  `tipo` VARCHAR(120) NOT NULL,
  `ordem_tipo` INT DEFAULT NULL,
  PRIMARY KEY (`departamento`, `tipo`),
  UNIQUE KEY `uq_omega_departamento_id` (`departamento_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `omega_usuarios` (
  `id` VARCHAR(40) NOT NULL,
  `nome` VARCHAR(150) NOT NULL,
  `funcional` VARCHAR(20) DEFAULT NULL,
  `matricula` VARCHAR(20) DEFAULT NULL,
  `cargo` VARCHAR(150) DEFAULT NULL,
  `usuario` TINYINT(1) DEFAULT 1,
  `analista` TINYINT(1) DEFAULT 0,
  `supervisor` TINYINT(1) DEFAULT 0,
  `admin` TINYINT(1) DEFAULT 0,
  `encarteiramento` TINYINT(1) DEFAULT 0,
  `meta` TINYINT(1) DEFAULT 0,
  `orcamento` TINYINT(1) DEFAULT 0,
  `pobj` TINYINT(1) DEFAULT 0,
  `matriz` TINYINT(1) DEFAULT 0,
  `outros` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `omega_chamados` (
  `id` VARCHAR(60) NOT NULL,
  `subject` VARCHAR(255) DEFAULT NULL,
  `company` VARCHAR(200) DEFAULT NULL,
  `product_id` VARCHAR(80) DEFAULT NULL,
  `product_label` VARCHAR(150) DEFAULT NULL,
  `family` VARCHAR(150) DEFAULT NULL,
  `section` VARCHAR(150) DEFAULT NULL,
  `queue` VARCHAR(120) DEFAULT NULL,
  `category` VARCHAR(120) DEFAULT NULL,
  `status` VARCHAR(40) DEFAULT NULL,
  `priority` VARCHAR(40) DEFAULT NULL,
  `opened` DATETIME DEFAULT NULL,
  `updated` DATETIME DEFAULT NULL,
  `due_date` DATETIME DEFAULT NULL,
  `requester_id` VARCHAR(60) DEFAULT NULL,
  `owner_id` VARCHAR(60) DEFAULT NULL,
  `team_id` VARCHAR(60) DEFAULT NULL,
  `history` LONGTEXT,
  `diretoria` VARCHAR(150) DEFAULT NULL,
  `gerencia` VARCHAR(150) DEFAULT NULL,
  `agencia` VARCHAR(150) DEFAULT NULL,
  `gerente_gestao` VARCHAR(150) DEFAULT NULL,
  `gerente` VARCHAR(150) DEFAULT NULL,
  `credit` VARCHAR(100) DEFAULT NULL,
  `attachment` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_omega_chamados_status` (`status`),
  KEY `idx_omega_chamados_team` (`team_id`),
  KEY `idx_omega_chamados_requester` (`requester_id`),
  KEY `idx_omega_chamados_owner` (`owner_id`),
  CONSTRAINT `fk_omega_chamados_status` FOREIGN KEY (`status`) REFERENCES `omega_status` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_omega_chamados_team` FOREIGN KEY (`team_id`) REFERENCES `omega_departamentos` (`departamento_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_omega_chamados_requester` FOREIGN KEY (`requester_id`) REFERENCES `omega_usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_omega_chamados_owner` FOREIGN KEY (`owner_id`) REFERENCES `omega_usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP EVENT IF EXISTS `pobj_refresh_calendario_daily`;
CREATE EVENT `pobj_refresh_calendario_daily`
  ON SCHEDULE EVERY 1 DAY
  STARTS CURRENT_DATE + INTERVAL 5 MINUTE
  ON COMPLETION PRESERVE
  DO
    INSERT INTO `d_calendario` (
      `data`, `competencia`, `ano`, `mes`, `mes_nome`, `dia`,
      `dia_da_semana`, `semana`, `trimestre`, `semestre`, `eh_dia_util`
    )
    SELECT
      dias.dia,
      DATE_FORMAT(dias.dia, '%Y-%m-01'),
      YEAR(dias.dia),
      MONTH(dias.dia),
      ELT(MONTH(dias.dia), 'Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'),
      DAY(dias.dia),
      ELT(WEEKDAY(dias.dia) + 1, 'segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'),
      WEEKOFYEAR(dias.dia),
      QUARTER(dias.dia),
      IF(MONTH(dias.dia) <= 6, 1, 2),
      CASE WHEN WEEKDAY(dias.dia) IN (5, 6) THEN 0 ELSE 1 END
    FROM (
      SELECT DATE_ADD(params.inicio, INTERVAL seq.num DAY) AS dia
      FROM (
        SELECT DATE('2024-01-01') AS inicio,
               DATE(CONCAT(GREATEST(YEAR(CURDATE()), 2024), '-12-31')) AS fim
      ) AS params
      JOIN (
        SELECT unidades.n
             + dezenas.n * 10
             + centenas.n * 100
             + milhares.n * 1000 AS num
        FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS unidades
        CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS dezenas
        CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS centenas
        CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS milhares
      ) AS seq
      WHERE seq.num <= DATEDIFF(params.fim, params.inicio)
    ) AS dias
    ON DUPLICATE KEY UPDATE
      `competencia` = VALUES(`competencia`),
      `ano` = VALUES(`ano`),
      `mes` = VALUES(`mes`),
      `mes_nome` = VALUES(`mes_nome`),
      `dia` = VALUES(`dia`),
      `dia_da_semana` = VALUES(`dia_da_semana`),
      `semana` = VALUES(`semana`),
      `trimestre` = VALUES(`trimestre`),
      `semestre` = VALUES(`semestre`),
      `eh_dia_util` = VALUES(`eh_dia_util`);

INSERT INTO `d_calendario` (
  `data`, `competencia`, `ano`, `mes`, `mes_nome`, `dia`,
  `dia_da_semana`, `semana`, `trimestre`, `semestre`, `eh_dia_util`
)
SELECT
  dias.dia,
  DATE_FORMAT(dias.dia, '%Y-%m-01'),
  YEAR(dias.dia),
  MONTH(dias.dia),
  ELT(MONTH(dias.dia), 'Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'),
  DAY(dias.dia),
  ELT(WEEKDAY(dias.dia) + 1, 'segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'),
  WEEKOFYEAR(dias.dia),
  QUARTER(dias.dia),
  IF(MONTH(dias.dia) <= 6, 1, 2),
  CASE WHEN WEEKDAY(dias.dia) IN (5, 6) THEN 0 ELSE 1 END
FROM (
  SELECT DATE_ADD(params.inicio, INTERVAL seq.num DAY) AS dia
  FROM (
    SELECT DATE('2024-01-01') AS inicio,
           DATE(CONCAT(GREATEST(YEAR(CURDATE()), 2024), '-12-31')) AS fim
  ) AS params
  JOIN (
    SELECT unidades.n
         + dezenas.n * 10
         + centenas.n * 100
         + milhares.n * 1000 AS num
    FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS unidades
    CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS dezenas
    CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS centenas
    CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS milhares
  ) AS seq
  WHERE seq.num <= DATEDIFF(params.fim, params.inicio)
) AS dias
ON DUPLICATE KEY UPDATE
  `competencia` = VALUES(`competencia`),
  `ano` = VALUES(`ano`),
  `mes` = VALUES(`mes`),
  `mes_nome` = VALUES(`mes_nome`),
  `dia` = VALUES(`dia`),
  `dia_da_semana` = VALUES(`dia_da_semana`),
  `semana` = VALUES(`semana`),
  `trimestre` = VALUES(`trimestre`),
  `semestre` = VALUES(`semestre`),
  `eh_dia_util` = VALUES(`eh_dia_util`);

SET FOREIGN_KEY_CHECKS = 1;
