# Certta Competitive Authority Dashboard

Dashboard de monitoramento competitivo de autoridade digital para Certta vs concorrentes do mercado de Identity Verification / KYC.

## 🚀 Deploy na Vercel (Passo a Passo)

### Pré-requisitos
1. Conta no GitHub (gratuita): https://github.com
2. Conta na Vercel (gratuita): https://vercel.com

---

### PASSO 1: Criar conta no GitHub (se não tiver)

1. Acesse https://github.com
2. Clique em "Sign up"
3. Siga o processo de criação de conta

---

### PASSO 2: Instalar Git no seu computador

**Windows:**
1. Baixe: https://git-scm.com/download/windows
2. Execute o instalador, aceite todas as opções padrão

**Mac:**
1. Abra o Terminal
2. Digite: `xcode-select --install`

---

### PASSO 3: Subir o projeto para o GitHub

1. Abra o terminal/prompt de comando
2. Navegue até a pasta do projeto:
   ```bash
   cd caminho/para/certta-dashboard
   ```

3. Inicialize o Git e faça o primeiro commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Certta Dashboard"
   ```

4. Vá para https://github.com/new e crie um novo repositório:
   - Nome: `certta-dashboard`
   - Deixe como "Public" ou "Private" (sua escolha)
   - NÃO marque "Add a README file"
   - Clique "Create repository"

5. Conecte seu projeto local ao GitHub (substitua SEU_USUARIO pelo seu username):
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/certta-dashboard.git
   git branch -M main
   git push -u origin main
   ```

---

### PASSO 4: Deploy na Vercel

1. Acesse https://vercel.com
2. Clique "Sign Up" e escolha "Continue with GitHub"
3. Autorize a Vercel a acessar seu GitHub
4. Clique em "Add New..." → "Project"
5. Encontre o repositório `certta-dashboard` e clique "Import"
6. Nas configurações:
   - Framework Preset: `Create React App` (deve detectar automaticamente)
   - Deixe o resto como está
7. Clique "Deploy"
8. Aguarde ~2 minutos

**PRONTO!** Sua URL será algo como: `https://certta-dashboard.vercel.app`

---

## 📊 Como Atualizar os Dados Mensalmente

1. Abra o arquivo `src/App.js`
2. Encontre a seção `DASHBOARD_DATA` no início do arquivo
3. Atualize os números com os novos dados do Semrush
4. Salve o arquivo
5. No terminal, execute:
   ```bash
   git add .
   git commit -m "Atualização dados Março 2026"
   git push
   ```
6. A Vercel detecta automaticamente e faz o deploy em ~1 minuto

---

## 🎨 Estrutura do Projeto

```
certta-dashboard/
├── public/
│   └── index.html      # HTML base
├── src/
│   ├── App.js          # Componente principal (AQUI FICAM OS DADOS)
│   └── index.js        # Entry point
├── package.json        # Dependências
└── README.md           # Este arquivo
```

---

## 🔧 Desenvolvimento Local (Opcional)

Se quiser ver o dashboard localmente antes de publicar:

1. Instale Node.js: https://nodejs.org (versão LTS)
2. No terminal, na pasta do projeto:
   ```bash
   npm install
   npm start
   ```
3. Acesse http://localhost:3000

---

## 📞 Suporte

Dúvidas? Fale com a equipe AdRoq.
