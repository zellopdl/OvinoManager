# Manual do Usuário - OviManager 🐑

O **OviManager** é uma plataforma completa de gestão para ovinocultura, projetada para integrar a visão estratégica da gerência com a execução operacional de campo. Este manual descreve as funcionalidades de cada módulo, as regras de negócio e a lógica por trás do sistema.

---

## 1. Arquitetura e Conceitos Fundamentais

### 1.1. Papéis de Usuário
O sistema opera com dois perfis principais:
*   **Gerente:** Possui controle total sobre o planejamento, cadastros, auditoria e análises. Acesso protegido por senha para configurações sensíveis.
*   **Operador:** Focado na execução das tarefas diárias. Recebe as ordens de serviço através do "Mural de Operações" e registra a conclusão das atividades.

### 1.2. Sincronização em Tempo Real
O sistema utiliza **Supabase** para garantir que qualquer alteração feita pelo gerente (como um novo agendamento) apareça instantaneamente para o operador no campo, e vice-versa.

---

## 2. Módulos do Sistema

### 2.1. Dashboard (Painel Principal)
*   **Função:** Oferece uma visão panorâmica do rebanho.
*   **Indicadores:** Total de animais, distribuição por sexo, média de peso e status de saúde.
*   **Inteligência Artificial:** Integração com o **Gemini AI** para gerar "Insights do Rebanho", analisando dados e sugerindo ações preventivas.

### 2.2. Gestão de Rebanho
*   **Ficha do Animal:** Cadastro detalhado com brinco, raca, linhagem (pai/mãe), localização (piquete) e grupo.
*   **Histórico Individual:** O sistema mantém o histórico completo de pesagens, avaliações de ECC (Escore de Condição Corporal) e Famacha para cada animal.

### 2.3. Agenda e Manejo (Coração do Sistema)
Este módulo permite o planejamento sistemático das atividades da fazenda.
*   **Tipos de Recorrência:**
    *   **Diária:** Tarefas que se repetem todos os dias.
    *   **Semanal:** Escolha os dias específicos da semana (ex: Seg, Qua, Sex).
    *   **Mensal:** Tarefas em dias fixos do mês.
    *   **Anual:** Planejamento de vacinações ou manejos sazonais.
*   **Protocolos Técnicos:** Ao agendar um manejo, o gerente pode vincular um protocolo (Pesagem, Famacha, ECC, Reprodução). Isso "desbloqueia" ferramentas específicas para o operador durante a execução.
*   **Auditoria Master:** O gerente pode desfazer tarefas marcadas como concluídas erroneamente, retornando-as ao status pendente mediante senha.

### 2.4. Mural de Operações (Visão do Operador)
*   **Interface Simplificada:** O operador vê apenas o que precisa ser feito "Hoje" ou o que está "Atrasado".
*   **Registro de Execução:** Ao concluir uma tarefa, o operador registra quem fez e pode adicionar observações de campo.
*   **Mural de Avisos:** Comunicação direta onde o gerente posta avisos rápidos e o operador confirma a leitura.

### 2.5. Cadastros Base
*   **Piquetes:** Gestão de áreas de pastagem com controle de lotação automática.
*   **Grupos/Lotes:** Organização dos animais por categorias produtivas.
*   **Raças e Fornecedores:** Padronização dos dados de entrada.

### 2.6. Análises e Gráficos
*   **Visualização de Dados:** Gráficos de evolução de peso, distribuição de sanidade e ocupação de piquetes.
*   **Tomada de Decisão:** Ajuda a identificar animais com baixo desempenho ou áreas da fazenda sobrecarregadas.

---

## 3. Regras de Negócio e Raciocínio

### 3.1. Lógica de Recorrência
Quando uma tarefa recorrente é concluída pelo operador, o sistema calcula automaticamente a **próxima data planejada** com base na configuração definida pelo gerente (intervalo de dias, próximo mês, etc.) e cria um novo registro pendente.

### 3.2. Controle de Lotação
O sistema calcula a lotação de cada piquete em tempo real, somando os animais vinculados a ele. Isso permite ao gerente visualizar rapidamente quais áreas estão próximas do limite de suporte.

### 3.3. Protocolos de Campo
A lógica de protocolos foi desenhada para evitar erros de digitação. Ao iniciar um protocolo de pesagem, por exemplo, o sistema já lista os animais do grupo selecionado, permitindo que o operador apenas insira os valores, que são salvos diretamente no histórico individual de cada animal.

---

## 4. Segurança e Manutenção
*   **Senha de Gerência:** Protege a exclusão de dados, reversão de tarefas e configurações de sistema.
*   **Modo Offline:** O sistema possui uma camada de persistência local (LocalStorage) para garantir que os dados não sejam perdidos caso a conexão com a internet oscile durante o manejo.

---
*Manual gerado automaticamente pelo Assistente OviManager em 04/03/2026.*
