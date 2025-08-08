O que é uma Branch?
Imagine o histórico do seu projeto como uma linha do tempo. A branch main é a linha do tempo principal. Criar uma nova branch é como criar uma linha do tempo paralela que começa a partir de um ponto da principal.

Isso permite que você trabalhe em uma nova funcionalidade (ex: feature-nova-tela) ou corrija um bug (ex: fix-bug-login) de forma isolada.

Passo a Passo: Criando sua Branch develop
Vamos criar uma branch chamada develop. Você pode usar qualquer nome, mas develop (desenvolvimento) é um nome muito comum e recomendado.

Pré-requisito: Abra o terminal ou o prompt de comando na pasta do seu projeto.

Passo 1: Verifique em qual branch você está

Antes de mais nada, confirme que você está na sua branch de produção.

git branch

O terminal vai listar todas as suas branches, e a que você está no momento terá um asterisco (*) ao lado, geralmente * main.

Passo 2: Crie a nova branch

Agora, vamos criar a branch develop a partir da sua branch main atual.

git branch develop

Este comando cria a nova branch, mas não te move para ela ainda. Se você rodar git branch de novo, verá:

* main
  develop

Passo 3: Mude para a nova branch

Para começar a trabalhar na sua nova branch, você precisa "entrar" nela.

git checkout develop

Agora, se rodar git branch novamente, o resultado será:

  main
* develop

Dica de Atalho: Você pode criar e já mudar para a nova branch com um único comando usando a flag -b:

git checkout -b develop

(Este comando faz os Passos 2 e 3 de uma só vez).

Passo 4: Envie a nova branch para o repositório remoto (Netlify/GitHub)

Até agora, a branch develop só existe no seu computador. Para que outras pessoas (ou serviços como o Netlify) saibam dela, você precisa enviá-la.

git push -u origin develop

git push: Envia as alterações.

origin: É o nome padrão do seu repositório remoto.

develop: O nome da branch que você está enviando.

-u: É um atalho que "conecta" a sua branch local develop com a branch remota develop. Você só precisa usar o -u na primeira vez que enviar a branch. Das próximas vezes, um simples git push será suficiente.

Pronto! E agora?
Agora você está na sua branch develop e pode fazer todas as alterações, commits e testes que precisar sem afetar a main.

Para voltar para a branch de produção: git checkout main

Para ir para a branch de desenvolvimento: git checkout develop

Quando as alterações na develop estiverem prontas e testadas, o próximo passo seria fazer um "Pull Request" (no GitHub/GitLab) ou um "Merge" para levar o código da develop para a main, atualizando assim a sua aplicação em produção.