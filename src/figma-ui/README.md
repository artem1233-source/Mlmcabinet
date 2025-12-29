# 📦 Figma UI Components

## ⚠️ ВАЖНО: Эта папка синхронизируется с GitHub!

Эта директория содержит **ТОЛЬКО UI компоненты** из Figma Make.

### Правила:

✅ **Можно:**
- Чистый JSX/TSX код
- Props интерфейсы
- Стили (Tailwind классы)
- UI логика (открыть/закрыть модалку, переключить таб)
- Импорты из `../ui/` (shadcn компоненты)
- Импорты из `lucide-react` (иконки)

❌ **НЕЛЬЗЯ:**
- `useEffect` с API запросами
- `fetch()` или `axios` вызовы
- Прямая работа с Supabase
- Бизнес-логика (расчёты комиссий, MLM формулы)
- localStorage/sessionStorage (кроме UI состояний)

### Структура:

```
/figma-ui/
├── components/
│   ├── dashboard/        # Dashboard UI компоненты
│   ├── admin/            # Admin panel UI
│   └── shared/           # Переиспользуемые UI компоненты
└── ui/                   # shadcn/ui компоненты
```

### Паттерн компонента:

```tsx
// ✅ ПРАВИЛЬНО: Чистый UI компонент
export function DashboardView({ 
  loading, 
  stats, 
  onRefresh 
}: DashboardViewProps) {
  if (loading) return <Spinner />;
  
  return (
    <div>
      <h1>Revenue: {stats.revenue}</h1>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  );
}

// ❌ НЕПРАВИЛЬНО: Компонент с логикой
export function Dashboard() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch('/api/stats').then(setStats); // ❌ API запрос
  }, []);
  
  return <div>{stats.revenue}</div>;
}
```

### Workflow:

1. **Figma Make** создаёт UI компоненты здесь
2. **GitHub** синхронизирует эту папку
3. **Replit** импортирует в `/src/figma-ui/`
4. **Replit** создаёт Container компоненты с логикой
5. **Vercel** деплоит финальное приложение

---

**Последнее обновление:** ${new Date().toLocaleDateString('ru-RU')}
