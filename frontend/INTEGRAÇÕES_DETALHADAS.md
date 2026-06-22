# 🔌 Análise Detalhada das Integrações - SpendWise

## 1️⃣ INTEGRAÇÃO COM BACKEND (HTTP/REST API)

### Configuração do Cliente HTTP

```typescript
// src/api/axios.ts
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

**O que faz:**
- ✅ Cria instância Axios com base URL fixa (backend local)
- ✅ **Interceptador automático**: Adiciona JWT token em TODOS os headers `Authorization: Bearer {token}`
- ✅ Token vem do localStorage (salvo no login)
- ✅ Todas as requisições subsequentes já têm autenticação

**Vantagem:** Não precisa adicionar token manualmente em cada chamada

---

## 2️⃣ FLUXO DE AUTENTICAÇÃO

### Login (`src/pages/Login.tsx:17-20`)

```typescript
const res = await api.post('/auth/login', { email, password })
localStorage.setItem('token', res.data.access_token)
localStorage.setItem('user', JSON.stringify(res.data.user))
navigate('/dashboard')
```

### Registo (`src/pages/Register.tsx:18-21`)

```typescript
const res = await api.post('/auth/register', { name, email, password })
localStorage.setItem('token', res.data.access_token)
localStorage.setItem('user', JSON.stringify(res.data.user))
navigate('/dashboard')
```

### Logout (`src/components/Navbar.tsx:20-24`)

```typescript
handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  navigate('/login')
}
```

### Proteção de Rotas (`src/main.tsx:17-26`)

```typescript
function PrivateLayout({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
```

**Fluxo:**
1. Utilizador faz login → Backend retorna `access_token` + dados do utilizador
2. Ambos são armazenados em localStorage
3. Navbar lê os dados de localStorage para exibir o nome
4. Todas as rotas privadas verificam se existe token
5. No logout, token é removido

---

## 3️⃣ PADRÃO DE INTEGRAÇÃO COM O BACKEND

Todas as páginas seguem o mesmo padrão:

### Pattern Padrão

```typescript
// 1. Estado de dados
const [data, setData] = useState<Type[]>([])

// 2. Função fetch
const fetchData = useCallback(async () => {
  try {
    const res = await api.get('/endpoint/')
    setData(res.data)
  } catch {
    navigate('/login')  // Se falhar, volta ao login
  }
}, [])

// 3. Executar ao montar
useEffect(() => { fetchData() }, [fetchData])

// 4. Operações CRUD
const handleAdd = async (e: React.FormEvent) => {
  try {
    await api.post('/endpoint/', form)
    fetchData()  // Recarrega dados
  } catch {
    alert('Erro ao criar')
  }
}

const handleDelete = async (id: number) => {
  await api.delete(`/endpoint/${id}`)
  fetchData()
}

const handleEdit = async (id: number, data: any) => {
  await api.put(`/endpoint/${id}`, data)
  fetchData()
}
```




```typescript
// Dashboard.tsx:55-68
const fetchData = useCallback(async () => {
  try {
    const [summaryRes, transactionsRes, categoriesRes] = await Promise.all([
      api.get(`/transactions/summary/monthly?month=${month}&year=${year}`),
      api.get(`/transactions/?month=${month}&year=${year}`),
      api.get('/categories/'),
    ])
    setSummary(summaryRes.data)
    setTransactions(transactionsRes.data)
    setCategories(categoriesRes.data)
  } catch {
    navigate('/login')
  }
}, [month, year])
```

---

## 5️⃣ INTEGRAÇÃO COM IA (GROQ API)

### Fluxo especial do Chat IA

```typescript
// AIChat.tsx - Integração com Groq API
const parseWithGroq = async (text: string): Promise<ParsedTransaction> => {
  // 1. Preparar prompt com categorias disponíveis
  const categoryNames = categories.map(c => c.name).join(', ')

  const prompt = `Analisa este texto e extrai informação de uma transação...
  Categorias disponíveis: ${categoryNames}
  ...`

  // 2. Chamar API externa Groq
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`  // ⚠️ CHAVE HARDCODED!
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 200,
    })
  })

  // 3. Parse resultado JSON
  const data = await response.json()
  const rawText = data.choices[0].message.content.trim()
  const cleaned = rawText.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}
```

### Fluxo Completo do Chat IA

```
┌─────────────────────────────────────────┐
│ Utilizador escreve: "Netflix 17€ mês"   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌────────────────────┐
        │ handleSubmit()     │
        │ (setLoading=true)  │
        └────────┬───────────┘
                 │
                 ▼
        ┌─────────────────────────────────┐
        │ parseWithGroq(text)             │
        │ Envia para Groq API + prompt    │
        └────────┬────────────────────────┘
                 │
                 ▼
        Groq processa com llama-3.3-70b
        (Temperature 0.1 = determinístico)
                 │
                 ▼
        Retorna JSON parsado:
        {
          "description": "Netflix",
          "amount": 17,
          "type": "expense",
          "category_name": "Subscrições",
          "is_recurring": true
        }
                 │
                 ▼
        ┌─────────────────────────────────┐
        │ setResult(parsed)               │
        │ Mostra preview para confirmar   │
        └────────┬────────────────────────┘
                 │
                 ▼
    Utilizador pode editar campos antes
    de confirmar (toggles, inputs, etc)
                 │
                 ▼
        ┌─────────────────────────────────┐
        │ handleConfirm()                 │
        │ api.post('/transactions/', {})  │
        └────────┬────────────────────────┘
                 │
                 ▼
    Salva no backend com kategoria correta
        is_recurring=true ➜ Adiciona à tabela
                     recurring_transactions
                 │
                 ▼
        setConfirmed=true, onTransactionAdded()
        Dashboard recarrega automaticamente
```

### Código do Parsing e Confirmação

```typescript
// AIChat.tsx:77-93 - Parsing
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const parsed = await parseWithGroq(input)  // Chamar IA
    setResult(parsed)                           // Mostrar resultado
  } catch {
    setError('Não consegui interpretar...')
  }
}

// AIChat.tsx:95-117 - Confirmação e save
const handleConfirm = async () => {
  const category = categories.find(c => c.name === result.category_name)
  await api.post('/transactions/', {
    description: result.description,
    amount: result.amount,
    type: result.type,
    category_id: category?.id || null,
    date: new Date().toISOString(),
    is_recurring: result.is_recurring,  // ◄── Se IA detectou "todo mês"
  })
  onTransactionAdded()  // Callback para Dashboard recarregar
}
```

---

## 6️⃣ PADRÃO REPEAT EM OUTRAS PÁGINAS

### Categories.tsx

```typescript
// GET
const res = await api.get('/categories/')

// POST
await api.post('/categories/', form)

// DELETE
await api.delete(`/categories/${id}`)
```

### Budgets.tsx

```typescript
// GET múltiplos em paralelo
const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
  api.get(`/budgets/?month=${month}&year=${year}`),
  api.get('/categories/'),
  api.get(`/transactions/?month=${month}&year=${year}`),
])

// POST
await api.post('/budgets/', {
  category_id: parseInt(form.category_id),
  amount_limit: parseFloat(form.amount_limit),
  month, year
})
```

---

## 7️⃣ TRATAMENTO DE ERROS

### Padrão geral

```typescript
try {
  // Operação
  const res = await api.get('/endpoint/')
  setData(res.data)
} catch (error) {
  // Se 401 (Unauthorized) → volta ao login
  navigate('/login')

  // Ou mostra mensagem de erro
  setError('Erro ao carregar dados')
  alert('Erro ao adicionar')
}



