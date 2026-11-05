# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [1.1.0] - 2026-11-06

Portal com a cara e o jeito do app Android oficial da HOTNET (v2.5.5): telas,
textos, cores, ícones e comportamento copiados do código do app. Para levar
estas mudanças a outro portal (SUPERSONIC), veja `docs/PORTE_SUPERSONIC.md`.

### Adicionado

- **Perfil** (aba nova na barra): foto ou inicial, CPF/CNPJ mascarado e os
  grupos Minha conta (Meus dados, Contratos, Consumo, Declaração de quitação),
  Preferências (Aparência Sistema/Claro/Escuro, Segurança, Instalar o app),
  Ajuda (Dúvidas, WhatsApp, Sobre com a versão) e Sair da conta.
- **Botão Pagar** no centro da barra, com o símbolo do Pix: abre os boletos
  em aberto.
- **Declaração anual de quitação** (Lei nº 12.007/2009): anos encerrados e
  totalmente pagos, com a mesma regra do app; PDF compartilhado como arquivo.
  Atalho em Boletos → Pago e no Perfil.
- **Recibo em PDF** de verdade, no desenho do PDF do app (Manrope, carimbo
  PAGO, demonstrativo com acréscimos, assinatura eletrônica): Compartilhar
  envia o arquivo; Salvar PDF baixa.
- **Teste de velocidade**: confere a rede do celular e o roteador HOTNET antes
  de medir; a medição é do fast.com, como no app.
- **Segurança**: proteção do app por PIN de 4 dígitos, só neste aparelho;
  pede o PIN ao abrir e depois de 5 minutos fora; 5 erros encerram a sessão.
- **Login**: contas já usadas no aparelho (toque preenche o CPF; a senha nunca
  fica guardada) e "Não consigo entrar?" com as três opções do app.
- **Lembrete de senha padrão** no Início; "Agora não" adia por 30 dias.
- **Foto de perfil** (só no aparelho), mostrada no Perfil, Início, Meus dados,
  login e na barra.
- **Guia da Início** na primeira vez (conexão, Pagar e atalhos) e "Primeira vez
  no app?" em Dúvidas.
- **Selo central de "copiado"** (Pix, código de barras, telefone, e-mail).
- **Consumo**: tocar no período abre a escolha de mês e ano.
- **"Já paguei este boleto"** também no cartão do Início.
- **Dúvidas**: as perguntas e respostas do app, com atalho direto para a tela
  de cada assunto (Boletos, Suporte, Contratos, Consumo, Segurança, Alterar
  senha, Teste de velocidade).

### Alterado

- **Visual do app Android**: fonte Manrope, cores e cantos do Material 3 do
  app, títulos de tela, blocos brancos com linhas e ícone em círculo, cartões
  grafite e abas em pílula, em todas as telas.
- **Ícones**: os mesmos do app (vetores convertidos de `res/drawable`, mais os
  Material Icons do Compose).
- **Início**: saudação com a inicial, faixa da conexão que abre os detalhes,
  cartão grafite do próximo boleto com Copiar código Pix, acesso rápido em
  círculos e cartão do WhatsApp.
- **Boletos**: o mais urgente em cartão grafite (prazo em dias, conta de multa
  e juros, menu ⋯ com compartilhar, PDF e Já paguei); os demais compactos;
  pagos em linhas com Recibo.
- **Meus dados, Contratos, Consumo, Suporte, chat, Sobre, Alterar senha e
  Login** no layout das telas do app.
- **Janelas**: todas centralizadas como os diálogos do app (sem folhas que
  sobem de baixo); o voltar do celular fecha a janela aberta.
- **Navegação**: sem botão de voltar nas telas (só no chat do Suporte); telas
  que abrem por cima têm X. O voltar do celular leva de qualquer aba ao Início
  e, do Início, sai do app.
- **Jeito de app nativo**: troca de tela deslizando, sem zoom, sem a página
  esticar, toque que afunda o botão, seleção de texto só em campos de entrada,
  imagens sem arrastar, aviso no estilo Snackbar.
- **Barras do sistema** na cor do fundo da tela (laranja só no login).
- **Versão nova** do app é aplicada na próxima troca de tela.

### Corrigido

- Cartão do próximo boleto saía sem fundo (texto branco invisível) quando o
  app abria direto no Início.
- Puxar para atualizar esticava a tela; agora a bolinha desce por cima.
- Foto de perfil: leitura mais robusta e aviso claro para fotos em HEIC.
- "Testar velocidade" e botões do cartão de boleto quebravam em duas linhas
  em celulares estreitos.
- Selo "Hoje" do Consumo sem contraste.

### Segurança

- jsPDF 4.2.1 (o 3.x tinha falhas críticas conhecidas) e `npm audit fix`
  (Vite e outras dependências de build); o CI voltou a passar.

## [1.0.1] - 2026-10-16

### Corrigido

- Recibo de pagamento (Boletos → Pago → Imprimir / PDF): a folha do recibo
  passou a sair da própria página, só na impressão, com o logotipo em tamanho
  fixo e a folha sempre clara.

## [1.0.0] - 2026-10-16

### Adicionado

- Funções do app no portal: cartão de conexão no Início, diagnóstico de
  conexão, novo chamado em duas etapas, recibo de pagamento e alterar senha.

### Corrigido

- Número do contrato na conexão, mensagens de erro de rede e de sessão, QR
  Code inválido, nome de anexo e CPF no WhatsApp do login.

[Não lançado]: https://github.com/jmanoelslva/HOTNET_CLIENTE_PWA_APP/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/jmanoelslva/HOTNET_CLIENTE_PWA_APP/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/jmanoelslva/HOTNET_CLIENTE_PWA_APP/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jmanoelslva/HOTNET_CLIENTE_PWA_APP/releases/tag/v1.0.0
