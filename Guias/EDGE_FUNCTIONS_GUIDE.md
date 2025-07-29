Guia Completo: Como Configurar e Fazer Deploy de Edge Functions na Supabase
Este guia serve como um manual passo a passo para criar, configurar e publicar (fazer deploy) de Edge Functions para o seu projeto PostaCanga em um ambiente de produção.

O que são Edge Functions e por que usá-las?
Pense nas Edge Functions como pequenos pedaços de código que rodam nos servidores da Supabase, e não no navegador do seu utilizador. Elas são essenciais para a segurança.

Problema: Algumas operações, como buscar a lista completa de emails dos funcionários, exigem uma chave de administrador (service_role_key). Se essa chave ficasse no seu código React, ela estaria exposta no navegador, o que seria um risco de segurança gravíssimo.

Solução: Nós movemos essa lógica para uma Edge Function. O seu aplicativo React (frontend) faz uma chamada segura para a função, e a função, que roda no ambiente seguro da Supabase, executa a operação com a chave de administrador e devolve apenas os dados necessários.

Pré-requisitos
Antes de começar, garanta que você tem as seguintes ferramentas instaladas:

Node.js: Essencial para o ambiente JavaScript. Você já o tem, pois usa o Vite/React.

Supabase CLI: A ferramenta de linha de comando para interagir com o seu projeto Supabase.

Passo a Passo para o Deploy
Passo 1: Instalar a Supabase CLI
Se for a primeira vez ou se quiser garantir que tem a versão mais recente, abra o seu terminal (PowerShell, CMD, etc.) e execute:

npm install supabase@latest -g

Passo 2: Fazer Login e Vincular o Projeto de Produção
No terminal, navegue até a pasta raiz do seu projeto de produção e execute os seguintes comandos:

Login:

supabase login

Isto irá abrir o seu navegador para que você autorize a CLI a aceder à sua conta Supabase.

Vincular o Projeto:

supabase link --project-ref SEU_PROJECT_REF_DE_PRODUCAO

O que é o project-ref? É o identificador único do seu projeto na Supabase. Você pode encontrá-lo na URL do seu painel (app.supabase.com/project/ESTA_PARTE_AQUI/...) ou nas configurações do projeto, em "General Settings".

Após executar o comando, a CLI irá pedir a senha do seu banco de dados de produção.

Passo 3: Criar a Estrutura de Pastas da Função
Todas as suas funções devem ficar dentro de uma pasta supabase/functions. Para cada função, você cria uma nova pasta. Por exemplo, para a nossa função get-employees:

seu-projeto/
└── supabase/
    └── functions/
        ├── _shared/
        │   └── cors.ts
        └── get-employees/
            └── index.ts

O ficheiro index.ts contém o código principal da sua função.

A pasta _shared é para código que pode ser reutilizado por várias funções, como o nosso cors.ts.

Passo 4: Configurar os Segredos (Secrets)
Esta é a etapa de segurança mais importante. A sua service_role_key (ou qualquer outra chave secreta) nunca deve ser escrita diretamente no código da função. Em vez disso, nós a guardamos como um "segredo" no projeto Supabase.

Copie a sua Chave: Vá ao seu painel Supabase, em "Project Settings" > "API". Encontre a chave no campo service_role e copie-a.

Defina o Segredo via Terminal: Volte ao terminal e execute o comando abaixo, substituindo SUA_CHAVE_COPIADA_AQUI.

supabase secrets set ADMIN_SERVICE_ROLE_KEY=SUA_CHAVE_COPIADA_AQUI

Importante: Nunca use o prefixo SUPABASE_ para os seus segredos, pois ele é reservado para o sistema. Usar um nome como ADMIN_SERVICE_ROLE_KEY é uma ótima prática.

Passo 5: Fazer o Deploy da Função
Com a estrutura de pastas criada e os segredos configurados, você está pronto para publicar a sua função. No terminal, execute:

supabase functions deploy nome-da-funcao --no-verify-jwt

Substitua nome-da-funcao pelo nome da pasta da sua função. Para o nosso exemplo:

supabase functions deploy get-employees --no-verify-jwt

O que significa --no-verify-jwt? Esta opção permite que a sua função seja chamada a partir do navegador sem exigir um token de autenticação de utilizador. A segurança é mantida porque a função em si é controlada por si, e as suas políticas de RLS no banco de dados continuam a proteger o acesso direto.

Após a execução, você verá uma mensagem de sucesso, confirmando que a função está ativa.

Passo 6: Chamar a Função no seu Código React
No seu frontend, para chamar a função que acabou de publicar, use o seguinte código:

// Exemplo dentro de um componente React

const { data, error } = await supabase.functions.invoke('get-employees');

if (error) {
  // Tratar o erro
} else {
  // Usar os dados (data)
}

E é isso! Seguindo estes passos, você pode criar e fazer deploy de quantas Edge Functions precisar, mantendo o seu aplicativo seguro e performático.