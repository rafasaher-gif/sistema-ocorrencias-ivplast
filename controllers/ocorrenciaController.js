-- =========================================
-- FASE 2 - EVOLUÇÃO DO BANCO
-- =========================================

-- STATUS
CREATE TABLE IF NOT EXISTS status (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ordem_fluxo INTEGER NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    empresa VARCHAR(20) NOT NULL CHECK (empresa IN ('IVPLAST', 'VENANI')),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GARANTE UNICIDADE DE CÓDIGO POR EMPRESA
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'idx_produtos_codigo_empresa_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_produtos_codigo_empresa_unique
        ON produtos (codigo, empresa);
    END IF;
END $$;

-- EVOLUÇÃO DA TABELA OCORRENCIAS
ALTER TABLE ocorrencias
    ADD COLUMN IF NOT EXISTS razao_social VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
    ADD COLUMN IF NOT EXISTS numero_pedido VARCHAR(100),
    ADD COLUMN IF NOT EXISTS numero_nf VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tem_nfd BOOLEAN,
    ADD COLUMN IF NOT EXISTS numero_nfd VARCHAR(100),
    ADD COLUMN IF NOT EXISTS faturado_por VARCHAR(20),
    ADD COLUMN IF NOT EXISTS responsavel_usuario_id INTEGER,
    ADD COLUMN IF NOT EXISTS origem_erro VARCHAR(100),
    ADD COLUMN IF NOT EXISTS titulo VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status_id INTEGER,
    ADD COLUMN IF NOT EXISTS resolvido_aprovado_por_usuario_id INTEGER,
    ADD COLUMN IF NOT EXISTS resolvido_aprovado_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS excluida BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS excluida_por_usuario_id INTEGER,
    ADD COLUMN IF NOT EXISTS excluida_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS motivo_exclusao TEXT;

-- FOREIGN KEYS EM OCORRENCIAS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ocorrencias_criado_por'
    ) THEN
        ALTER TABLE ocorrencias
        ADD CONSTRAINT fk_ocorrencias_criado_por
        FOREIGN KEY (criado_por) REFERENCES usuarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ocorrencias_responsavel_usuario'
    ) THEN
        ALTER TABLE ocorrencias
        ADD CONSTRAINT fk_ocorrencias_responsavel_usuario
        FOREIGN KEY (responsavel_usuario_id) REFERENCES usuarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ocorrencias_status'
    ) THEN
        ALTER TABLE ocorrencias
        ADD CONSTRAINT fk_ocorrencias_status
        FOREIGN KEY (status_id) REFERENCES status(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ocorrencias_resolvido_aprovado_por'
    ) THEN
        ALTER TABLE ocorrencias
        ADD CONSTRAINT fk_ocorrencias_resolvido_aprovado_por
        FOREIGN KEY (resolvido_aprovado_por_usuario_id) REFERENCES usuarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_ocorrencias_excluida_por'
    ) THEN
        ALTER TABLE ocorrencias
        ADD CONSTRAINT fk_ocorrencias_excluida_por
        FOREIGN KEY (excluida_por_usuario_id) REFERENCES usuarios(id);
    END IF;
END $$;

-- ITENS DA OCORRÊNCIA
CREATE TABLE IF NOT EXISTS ocorrencia_itens (
    id SERIAL PRIMARY KEY,
    ocorrencia_id INTEGER NOT NULL,
    tipo_bloco VARCHAR(50),
    empresa VARCHAR(20),
    produto_id INTEGER,
    codigo_produto VARCHAR(50),
    nome_produto VARCHAR(255),
    quantidade NUMERIC(14,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ocorrencia_itens_ocorrencia
        FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE CASCADE,
    CONSTRAINT fk_ocorrencia_itens_produto
        FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- QUESTIONÁRIO DINÂMICO
CREATE TABLE IF NOT EXISTS ocorrencia_questionario (
    id SERIAL PRIMARY KEY,
    ocorrencia_id INTEGER NOT NULL UNIQUE,
    faltou_volume BOOLEAN,
    quantidade_volumes_faltantes INTEGER,
    volume_saiu_correto_fabrica BOOLEAN,
    volume_saiu_correto_transmac BOOLEAN,
    faltou_item BOOLEAN,
    sobrou_item BOOLEAN,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ocorrencia_questionario_ocorrencia
        FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE CASCADE
);

-- FINANCEIRO
CREATE TABLE IF NOT EXISTS financeiro_ocorrencia (
    id SERIAL PRIMARY KEY,
    ocorrencia_id INTEGER NOT NULL UNIQUE,
    houve_custo_financeiro BOOLEAN,
    valor_total_custo NUMERIC(14,2),
    responsaveis_custo TEXT,
    desconto_comissao BOOLEAN,
    valor_desconto_comissao NUMERIC(14,2),
    custo_frete BOOLEAN,
    valor_frete NUMERIC(14,2),
    observacao TEXT,
    atualizado_por_usuario_id INTEGER,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_financeiro_ocorrencia_ocorrencia
        FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE CASCADE,
    CONSTRAINT fk_financeiro_ocorrencia_usuario
        FOREIGN KEY (atualizado_por_usuario_id) REFERENCES usuarios(id)
);

-- ANEXOS
CREATE TABLE IF NOT EXISTS anexos (
    id SERIAL PRIMARY KEY,
    ocorrencia_id INTEGER NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    nome_armazenado VARCHAR(255),
    url_arquivo TEXT NOT NULL,
    tamanho_bytes BIGINT,
    enviado_por_usuario_id INTEGER,
    enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anexos_ocorrencia
        FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE CASCADE,
    CONSTRAINT fk_anexos_usuario
        FOREIGN KEY (enviado_por_usuario_id) REFERENCES usuarios(id)
);

-- HISTÓRICO EVOLUÍDO
ALTER TABLE historico_ocorrencias
    ADD COLUMN IF NOT EXISTS tipo_evento VARCHAR(100),
    ADD COLUMN IF NOT EXISTS titulo_evento VARCHAR(255),
    ADD COLUMN IF NOT EXISTS descricao_evento TEXT,
    ADD COLUMN IF NOT EXISTS editado_por_usuario_id INTEGER,
    ADD COLUMN IF NOT EXISTS editado_em TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_historico_ocorrencias_ocorrencia'
    ) THEN
        ALTER TABLE historico_ocorrencias
        ADD CONSTRAINT fk_historico_ocorrencias_ocorrencia
        FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_historico_ocorrencias_usuario'
    ) THEN
        ALTER TABLE historico_ocorrencias
        ADD CONSTRAINT fk_historico_ocorrencias_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_historico_ocorrencias_editado_por'
    ) THEN
        ALTER TABLE historico_ocorrencias
        ADD CONSTRAINT fk_historico_ocorrencias_editado_por
        FOREIGN KEY (editado_por_usuario_id) REFERENCES usuarios(id);
    END IF;
END $$;

-- AUDITORIA EVOLUÍDA
ALTER TABLE auditoria
    ADD COLUMN IF NOT EXISTS descricao TEXT,
    ADD COLUMN IF NOT EXISTS modulo VARCHAR(100),
    ADD COLUMN IF NOT EXISTS referencia_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_auditoria_usuario'
    ) THEN
        ALTER TABLE auditoria
        ADD CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
    END IF;
END $$;

-- EMAILS ENVIADOS
CREATE TABLE IF NOT EXISTS emails_enviados (
    id SERIAL PRIMARY KEY,
    ocorrencia_id INTEGER NOT NULL,
    enviado_por_usuario_id INTEGER,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assunto VARCHAR(255),
    corpo_resumo TEXT,
    para_emails TEXT,
    cc_emails TEXT,
    tipo_envio VARCHAR(50),
    CONSTRAINT fk_emails_enviados_ocorrencia
        FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE CASCADE,
    CONSTRAINT fk_emails_enviados_usuario
        FOREIGN KEY (enviado_por_usuario_id) REFERENCES usuarios(id)
);

-- INSERIR STATUS INICIAIS
INSERT INTO status (nome, ordem_fluxo, ativo)
VALUES
    ('Aberto', 1, TRUE),
    ('Em análise', 2, TRUE),
    ('Aguardando retorno cliente/representante', 3, TRUE),
    ('Aguardando Fábrica', 4, TRUE),
    ('Aguardando financeiro', 5, TRUE),
    ('Resolvido', 6, TRUE),
    ('Resolvido Aprovado', 7, TRUE)
ON CONFLICT (nome) DO NOTHING;
